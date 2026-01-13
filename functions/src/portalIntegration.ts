
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
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

    // 3. Security: Check if client is allowed?
    // Ideally we check if request.auth.uid matches booking.clientId or if it's a public portal access.
    // For now, we assume public portal logic where having the Booking ID (and maybe a hash) is enough.
    // We do strictly ensure we only look at the folderId linked to THIS booking.

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

    // 6. Return Clean Data
    return {
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbnail: f.thumbnailLink,
        downloadUrl: f.webContentLink, // This forces download of original quality
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
