import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {google} from "googleapis";
import {defineSecret} from "firebase-functions/params";

// Define Secrets
export const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
export const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
export const googleRedirectUri = defineSecret("GOOGLE_REDIRECT_URI");

/**
 * Creates an OAuth2 client using secrets.
 * @return {any} The OAuth2 client.
 */
function createOAuthClient() {
  return new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    googleRedirectUri.value()
  );
}

/**
 * Internal helper to register a Google Calendar Watch channel.
 */
async function performCalendarWatch(userId: string) {
  const db = getFirestore();
  const clientId = googleClientId.value();
  const clientSecret = googleClientSecret.value();
  const redirectUri = googleRedirectUri.value();

  const auth = await getAuthenticatedClient(userId, clientId, clientSecret, redirectUri);
  if (!auth) {
    logger.warn(`Cannot register watch for user ${userId}: Not authenticated.`);
    return null;
  }

  const calendar = google.calendar({version: "v3", auth});
  const channelId = `lumina-cal-${userId}-${Date.now()}`;
  const projectId = process.env.GCLOUD_PROJECT;
  const region = "us-central1"; 
  // Ensure the URL is correct for your deployed functions
  const webhookUrl = `https://${region}-${projectId}.cloudfunctions.net/handleCalendarWebhook`;

  try {
    const res = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
      },
    });

    await db.collection("users").doc(userId).collection("system").doc("google_calendar_sync").set({
      channelId: res.data.id,
      resourceId: res.data.resourceId,
      expiration: res.data.expiration,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`Calendar Watch registered for user ${userId}. Channel: ${res.data.id}`);
    return res.data;
  } catch (error) {
    logger.error(`Failed to register watch for user ${userId}`, error);
    throw error;
  }
}

export const registerCalendarWebhook = onCall({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  try {
    const result = await performCalendarWatch(request.auth.uid);
    return { success: true, channelId: result?.id };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

export const handleCalendarWebhook = onRequest({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (req, res) => {
  const channelId = req.headers["x-goog-channel-id"] as string;
  const resourceId = req.headers["x-goog-resource-id"] as string;
  const resourceState = req.headers["x-goog-resource-state"] as string;

  if (resourceState === "sync") {
    res.status(200).send("Sync OK");
    return;
  }

  if (!channelId) {
    res.status(400).send("Missing Channel ID");
    return;
  }

  // Extract userId from channelId: lumina-cal-{userId}-{timestamp}
  const parts = channelId.split("-");
  const userId = parts.slice(2, parts.length - 1).join("-");

  logger.info(`Received Calendar Webhook for User ${userId}. Resource: ${resourceId}, State: ${resourceState}`);

  const db = getFirestore();

  try {
    const auth = await getAuthenticatedClient(userId, googleClientId.value(), googleClientSecret.value(), googleRedirectUri.value());
    if (!auth) {
      res.status(200).send("User disconnected");
      return;
    }

    const calendar = google.calendar({ version: "v3", auth });
    
    // Fetch recently updated events (including deleted ones to handle cancellations)
    const listRes = await calendar.events.list({
      calendarId: "primary",
      orderBy: "updated",
      maxResults: 20,
      showDeleted: true, // IMPORTANT: Now showing deleted
      singleEvents: true
    });

    const events = listRes.data.items || [];

    for (const event of events) {
      // We identify our bookings by the private extended property
      const bookingId = event.extendedProperties?.private?.bookingId;
      if (!bookingId) continue;

      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await bookingRef.get();

      if (!bookingSnap.exists) continue;
      const booking = bookingSnap.data();
      if (!booking) continue;

      // 1. Handle Deletion (Cancellation)
      if (event.status === "cancelled") {
          if (booking.status !== "CANCELLED") {
              await bookingRef.update({
                  status: "CANCELLED",
                  updatedBy: "GOOGLE_CALENDAR_SYNC",
                  notes: (booking.notes || "") + "\n[System] Cancelled via Google Calendar."
              });
              logger.info(`Booking ${bookingId} CANCELLED via Google Calendar Sync.`);
          }
          continue;
      }

      // 2. Handle Reschedule
      if (event.start?.dateTime) {
        const gDate = new Date(event.start.dateTime);
        const newDate = gDate.toISOString().split("T")[0];
        const newTime = gDate.toTimeString().split(" ")[0].substring(0, 5); // HH:mm

        if (newDate !== booking.date || newTime !== booking.timeStart) {
          await bookingRef.update({
            date: newDate,
            timeStart: newTime,
            updatedBy: "GOOGLE_CALENDAR_SYNC"
          });
          logger.info(`Updated Booking ${bookingId} from Google Calendar Change: ${newDate} @ ${newTime}`);
        }
      }
    }

    res.status(200).send("Processed");
  } catch (error: any) {
    logger.error("Webhook processing failed", error);
    res.status(500).send("Error");
  }
});

export const disconnectGoogle = onCall({
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;
  const db = getFirestore();

  try {
    // 0. Revoke the token if it exists
    const docRef = db.collection("users").doc(userId).collection("system").doc("google_auth");
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data?.accessToken) {
        const oauth2Client = createOAuthClient();
        try {
          await oauth2Client.revokeToken(data.accessToken);
          logger.info(`Revoked Google token for user ${userId}`);
        } catch (revokeError) {
          logger.warn(`Failed to revoke token for user ${userId}`, revokeError);
        }
      }
    }

    // Optional: Stop the watch channel on Google side if we have channelId/resourceId stored
    
    // 1. Delete the auth document
    await docRef.delete();

    // 2. Update the user profile flag
    await db.collection("users").doc(userId).update({
      isGoogleConnected: false,
    });

    return {success: true};
  } catch (error) {
    logger.error("Error disconnecting Google account", error);
    throw new HttpsError("internal", "Failed to disconnect Google account.");
  }
});

export const getGoogleAuthURL = onCall({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
  invoker: "public",
}, (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const oauth2Client = createOAuthClient();
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: request.auth.uid,
    prompt: "consent", 
    include_granted_scopes: true,
  });

  return {url};
});

export const googleAuthCallback = onRequest({secrets: [googleClientId, googleClientSecret, googleRedirectUri]}, async (req, res) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code || !userId) {
    res.status(400).send("Missing code or state");
    return;
  }

  const db = getFirestore();
  const oauth2Client = createOAuthClient();

  try {
    const {tokens} = await oauth2Client.getToken(code);

    const receivedScopes = tokens.scope || "";
    const hasDriveScope = receivedScopes.includes("https://www.googleapis.com/auth/drive");

    await db.collection("users").doc(userId).collection("system").doc("google_auth").set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      updatedAt: new Date().toISOString(),
    }, {merge: true});

    await db.collection("users").doc(userId).update({
      isGoogleConnected: true,
    });

    // --- AUTOMATION: Register Calendar Webhook Immediately ---
    try {
        await performCalendarWatch(userId);
    } catch (watchError) {
        logger.error(`Automatic watch registration failed for ${userId}`, watchError);
        // We don't fail the whole callback, user is at least connected.
    }

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1 style="color: #10b981;">Success!</h1>
        <p>Google Account connected securely.</p>
        ${!hasDriveScope ? "<p style=\"color: #f59e0b; font-weight: bold;\">Warning: You did not grant full Drive access. Some features may not work.</p>" : ""}
        <p>Syncing your calendar now...</p>
        <p>You can close this window and return to Lumina.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </div>
    `);
  } catch (error) {
    logger.error("Error exchanging code for token", error);
    res.status(500).send("Authentication failed.");
  }
});

/**
 * Retrieves an authenticated Google OAuth2 client for a specific user.
 * @param {string} userId - The ID of the user.
 * @param {string} clientId - Google Client ID.
 * @param {string} clientSecret - Google Client Secret.
 * @param {string} redirectUri - Google Redirect URI.
 * @return {Promise<any>} Authenticated OAuth2 client or null.
 */
export async function getAuthenticatedClient(
  userId: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const db = getFirestore();
  const docSnap = await db.collection("users").doc(userId).collection("system").doc("google_auth").get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    access_token: data?.accessToken,
    refresh_token: data?.refreshToken,
    expiry_date: data?.expiryDate,
    scope: data?.scope, // Set scope
  });

  oauth2Client.on("tokens", async (tokens) => {
    const updateData: any = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };
    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }
    // Note: scope is usually not returned in refresh unless it changed
    await db.collection("users").doc(userId).collection("system").doc("google_auth").set(updateData, {merge: true});
  });

  return oauth2Client;
}

export const getGoogleAccessToken = onCall({
  cors: true,
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;

  try {
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const client = await getAuthenticatedClient(userId, clientId, clientSecret, redirectUri);

    if (!client) {
      throw new HttpsError("not-found", "Google account not connected.");
    }

    // Force a token check (will refresh if needed via the listener setup in getAuthenticatedClient)
    const { token } = await client.getAccessToken();

    if (!token) {
      throw new HttpsError("unavailable", "Failed to retrieve access token.");
    }

    // Check Scope
    const db = getFirestore();
    const docSnap = await db.collection("users").doc(userId).collection("system").doc("google_auth").get();
    const scopes = docSnap.data()?.scope || "";

    // Check specifically for drive scope
    if (!scopes.includes("https://www.googleapis.com/auth/drive")) {
      throw new HttpsError("permission-denied", "Missing 'Full Drive Access'. Please reconnect in Settings and ensure you tick all boxes.");
    }

    return { accessToken: token };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Error retrieving Google Access Token", error);
    throw new HttpsError("internal", "Failed to get access token.");
  }
});

export const deleteDriveFile = onCall({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const { fileId } = request.data;
  if (!fileId) throw new HttpsError("invalid-argument", "fileId required");

  try {
    const auth = await getAuthenticatedClient(request.auth.uid, googleClientId.value(), googleClientSecret.value(), googleRedirectUri.value());
    if (!auth) throw new HttpsError("failed-precondition", "Google not connected");

    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId });
    return { success: true };
  } catch (error: any) {
    logger.error("Delete Drive File Error", error);
    throw new HttpsError("internal", error.message);
  }
});

export const renameDriveFile = onCall({
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
  cors: true,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");
  const { fileId, newName } = request.data;
  if (!fileId || !newName) throw new HttpsError("invalid-argument", "fileId and newName required");

  try {
    const auth = await getAuthenticatedClient(request.auth.uid, googleClientId.value(), googleClientSecret.value(), googleRedirectUri.value());
    if (!auth) throw new HttpsError("failed-precondition", "Google not connected");

    const drive = google.drive({ version: "v3", auth });
    await drive.files.update({
      fileId,
      requestBody: { name: newName }
    });
    return { success: true };
  } catch (error: any) {
    logger.error("Rename Drive File Error", error);
    throw new HttpsError("internal", error.message);
  }
});
