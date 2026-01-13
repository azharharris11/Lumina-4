
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import archiver from "archiver";
import * as nodemailer from "nodemailer";
import sharp from "sharp";
import { getAuthenticatedClient, googleClientId, googleClientSecret, googleRedirectUri } from "./googleIntegration";

// Ethereal Email Configuration (For Testing Only)
// In production, replace with SendGrid, Mailgun, or your actual SMTP provider
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "karelle.brakus@ethereal.email",
    pass: "6G2QyYq2qQ2qQ2qQ2q",
  },
});

/**
 * Proxy Function to stream Google Drive files with a permanent watermark.
 * Used for the Client Portal gallery when the project is not yet paid.
 */
export const proxyWatermarkedImage = onRequest({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (req, res) => {
  const fileId = req.query.fileId as string;
  const bookingId = req.query.bookingId as string;
  const studioName = (req.query.studioName as string) || "LUMINA PROOF";

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

    // 3. Stream File from Drive
    const drive = google.drive({ version: "v3", auth: oauthClient });
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // 4. Create Watermark Overlay (SVG)
    const svg = `
            <svg width="400" height="300">
                <style>
                    .text { fill: rgba(255,255,255,0.2); font-family: sans-serif; font-weight: bold; font-size: 24px; text-transform: uppercase; }
                </style>
                <text x="50%" y="50%" text-anchor="middle" class="text" transform="rotate(-30, 200, 150)">
                    ${studioName}
                </text>
            </svg>
        `;

    const watermarkBuffer = Buffer.from(svg);

    // 5. Process with Sharp
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24h

    const pipeline = sharp();

    pipeline
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .composite([{
        input: watermarkBuffer,
        gravity: "center",
        tile: true,
      }])
      .jpeg({ quality: 75 })
      .pipe(res);

    response.data.pipe(pipeline);
  } catch (error: any) {
    logger.error("Watermark Proxy Error", error);
    if (!res.headersSent) res.status(500).send("Failed to process image");
  }
});

/**
 * Trigger: Runs when a Booking document is updated.
 * Goal: Detect when a client confirms their selection and notify the photographer.
 */
export const onBookingUpdate = onDocumentUpdated("bookings/{bookingId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Check if selectionSubmitted changed from false (or undefined) to true
  if (!before.selectionSubmitted && after.selectionSubmitted) {
    const db = getFirestore();
    const booking = after;

    try {
      // 1. Create In-App Notification
      const notification = {
        id: `n-sel-${Date.now()}`,
        title: "Selection Confirmed",
        message: `${booking.clientName} has finalized their photo selection.`,
        time: new Date().toISOString(),
        read: false,
        type: "SUCCESS",
        link: "dashboard",
        ownerId: booking.ownerId,
      };

      await db.collection("notifications").add(notification);

      // 2. Fetch Owner Email
      const ownerSnap = await db.collection("users").doc(booking.ownerId).get();
      const ownerData = ownerSnap.data();
      const ownerEmail = ownerData?.email;

      if (ownerEmail) {
        // 3. Send Email Notification
        const subject = `Selection Confirmed: ${booking.clientName}`;
        const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #10b981;">Selection Finalized!</h2>
                        <p>Hi there,</p>
                        <p><strong>${booking.clientName}</strong> has just submitted their photo selection for the project <strong>"${booking.package}"</strong>.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                            <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Awaiting Post-Production</p>
                        </div>
                        <p>You can now view the selected photos in the project dashboard and proceed with the editing workflow.</p>
                        <a href="https://lumina-studio.web.app/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Dashboard</a>
                        <p style="font-size: 12px; color: #777; margin-top: 30px;">This is an automated notification from Lumina.</p>
                    </div>
                `;

        await transporter.sendMail({
          from: "\"Lumina System\" <system@lumina.id>",
          to: ownerEmail,
          subject: subject,
          html: html,
        });

        logger.info(`[Email] Notification sent to ${ownerEmail} for Booking ${event.params.bookingId}.`);
      } else {
        logger.warn(`[Email] Could not find email for Owner ${booking.ownerId}. Skipping email notification.`);
      }

      logger.info(`[Notification] Selection confirmed for Booking ${event.params.bookingId}. Notification created.`);
    } catch (error) {
      logger.error("Failed to process booking update trigger", error);
    }
  }
});

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
    const part = parseInt(req.query.part as string || "1");
    const chunkSize = parseInt(req.query.size as string || "50");

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
    const filename = `Gallery-${booking.clientName.replace(/[^a-zA-Z0-9]/g, "_")}-Part${part}.zip`;
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

    // 5. Fetch File List
    // We fetch all (up to reasonable limit) then slice, to ensure consistent ordering (orderBy name)
    const query = `'${booking.driveFolderId}' in parents and trashed = false`;
    const listRes = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType)",
      orderBy: "name",
      pageSize: 1000, // Fetch up to 1000 to handle large galleries
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const allFiles = listRes.data.files || [];
    const startIndex = (part - 1) * chunkSize;
    const endIndex = startIndex + chunkSize;
    const filesToZip = allFiles.slice(startIndex, endIndex);

    if (filesToZip.length === 0) {
      // Handle empty range
      archive.finalize();
      return;
    }

    // 6. Iterate and Append to Archive
    for (const file of filesToZip) {
      // Skip folders inside zip for now to avoid complexity
      if (file.mimeType === "application/vnd.google-apps.folder") continue;

      // Get Stream
      try {
        const streamRes = await drive.files.get(
          { fileId: file.id!, alt: "media" },
          { responseType: "stream" }
        );
        archive.append(streamRes.data, { name: file.name || "file" });
      } catch (err) {
        logger.warn(`Failed to download file ${file.id}`, err);
        // Continue zipping others
      }
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
