
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import archiver from "archiver";
import { getAuthenticatedClient, googleClientId, googleClientSecret, googleRedirectUri } from "./googleIntegration";

/**
 * Retrieves file list from a Booking's linked Google Drive folder.
 * This function acts as a proxy, using the Photographer's credentials
 * to serve the content to the Client Portal.
 */
export const getPortalFiles = onCall({
  cors: true,
  invoker: "public",
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (request) => {
  // 1. Inputs
  const { bookingId } = request.data;
  if (!bookingId) {
    throw new HttpsError("invalid-argument", "Booking ID is required.");
  }

  const db = getFirestore();

  try {
    // 2. Fetch Booking to get Folder ID and Owner ID
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      throw new HttpsError("not-found", "Booking not found.");
    }

    const booking = bookingSnap.data();
    if (!booking) throw new HttpsError("not-found", "Booking data empty.");

    const driveFolderId = booking.driveFolderId;
    const ownerId = booking.ownerId; // The photographer/studio owner

    if (!driveFolderId) {
      return { files: [] }; // No folder linked yet
    }

    // 4. Authenticate as the Owner
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const oauthClient = await getAuthenticatedClient(ownerId, clientId, clientSecret, redirectUri);

    if (!oauthClient) {
      throw new HttpsError("unavailable", "Studio owner has disconnected their Google Account.");
    }

    // 5. Call Drive API
    const drive = google.drive({ version: "v3", auth: oauthClient });

    // Query: Inside parent folder, not trashed.
    const query = `'${driveFolderId}' in parents and trashed = false`;

    const res = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, imageMediaMetadata, size)",
      orderBy: "name",
      pageSize: 100, // Limit for now
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    const projectId = process.env.GCLOUD_PROJECT;
    const region = "us-central1"; // Standard Firebase region, hardcoded for now or derived
    const proxyBaseUrl = `https://${region}-${projectId}.cloudfunctions.net/proxyDriveDownload`;

    // 6. Return Clean Data
    return {
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        // FIX: Force High-Res Thumbnail
        thumbnail: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+/, "=s1600") : undefined,
        // Use Proxy URL instead of webContentLink
        downloadUrl: `${proxyBaseUrl}?fileId=${f.id}&bookingId=${bookingId}`,
        viewUrl: f.webViewLink,
        size: f.size,
        // Simple logic to detect if it's an image for the gallery
        isImage: f.mimeType?.startsWith("image/"),
      })),
    };
  } catch (error: any) {
    logger.error("Portal File Fetch Error", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to load gallery files.");
  }
});

/**
 * Proxy Function to stream Google Drive files to the client without
 * requiring the client to have Google permissions.
 */
export const proxyDriveDownload = onRequest({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (req, res) => {
  const fileId = req.query.fileId as string;
  const bookingId = req.query.bookingId as string;

  if (!fileId || !bookingId) {
    res.status(400).send("Missing fileId or bookingId");
    return;
  }

  const db = getFirestore();

  try {
    // 1. Verify Booking (Security Check)
    const bookingSnap = await db.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) {
      res.status(404).send("Booking not found");
      return;
    }

    const booking = bookingSnap.data();
    const ownerId = booking?.ownerId;

    // 2. Auth Owner
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const oauthClient = await getAuthenticatedClient(ownerId, clientId, clientSecret, redirectUri);
    if (!oauthClient) {
      res.status(503).send("Owner Google Account disconnected");
      return;
    }

    // 3. Stream File
    const drive = google.drive({ version: "v3", auth: oauthClient });

    // Get Metadata first for Content-Type and Filename
    const meta = await drive.files.get({ fileId, fields: "name,mimeType,size" });

    res.setHeader("Content-Type", meta.data.mimeType || "application/octet-stream");
    // FIX: Handle special characters in filename safely
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(meta.data.name || "file")}`);

    if (meta.data.size) res.setHeader("Content-Length", meta.data.size);

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    response.data
      .on("end", () => {
        res.end();
      })
      .on("error", (err) => {
        logger.error("Stream Error", err);
        res.status(500).end();
      })
      .pipe(res);
  } catch (error: any) {
    logger.error("Proxy Download Error", error);
    res.status(500).send("Download failed");
  }
});

/**
 * Downloads all files from the booking folder as a ZIP archive.
 */
export const downloadGalleryZip = onRequest({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (req, res) => {
  const bookingId = req.query.bookingId as string;

  if (!bookingId) {
    res.status(400).send("Missing bookingId");
    return;
  }

  const db = getFirestore();

  try {
    // 1. Verify Booking
    const bookingSnap = await db.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) {
      res.status(404).send("Booking not found");
      return;
    }

    const booking = bookingSnap.data();
    if (!booking?.driveFolderId) {
      res.status(404).send("No folder linked");
      return;
    }

    const ownerId = booking.ownerId;

    // 2. Auth Owner
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const oauthClient = await getAuthenticatedClient(ownerId, clientId, clientSecret, redirectUri);
    if (!oauthClient) {
      res.status(503).send("Owner Google Account disconnected");
      return;
    }

    const drive = google.drive({ version: "v3", auth: oauthClient });

    // 3. Set ZIP Headers
    const filename = `Gallery-${booking.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 4. Initialize Archiver
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // Good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", (err: any) => {
      if (err.code === "ENOENT") {
        logger.warn("Archiver warning", err);
      } else {
        throw err;
      }
    });

    archive.on("error", (err: any) => {
      throw err;
    });

    // Pipe archive data to the response
    archive.pipe(res);

    // 5. Fetch File List (Recursive or Flat?) - Flat for now
    const query = `'${booking.driveFolderId}' in parents and trashed = false`;
    const listRes = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType)",
      pageSize: 100, // Limit to prevent timeout
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = listRes.data.files || [];

    // 6. Iterate and Append to Archive
    for (const file of files) {
      // Skip folders inside zip for now to avoid complexity
      if (file.mimeType === "application/vnd.google-apps.folder") continue;

      // Get Stream
      const streamRes = await drive.files.get(
        { fileId: file.id!, alt: "media" },
        { responseType: "stream" }
      );

      archive.append(streamRes.data, { name: file.name || "file" });
    }

    // 7. Finalize
    await archive.finalize();
  } catch (error: any) {
    logger.error("ZIP Download Error", error);
    if (!res.headersSent) {
      res.status(500).send("Failed to create zip archive");
    } else {
      res.end(); // End valid stream if error mid-stream
    }
  }
});
