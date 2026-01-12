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

export const disconnectGoogle = onCall({
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;
  const db = getFirestore();

  try {
    // 1. Delete the auth document
    await db.collection("users").doc(userId).collection("system").doc("google_auth").delete();

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

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1 style="color: #10b981;">Success!</h1>
        <p>Google Account connected securely. You can close this window and return to Lumina.</p>
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
  });

  oauth2Client.on("tokens", async (tokens) => {
    const updateData: any = {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
    };
    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }
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

    return { accessToken: token };
  } catch (error) {
    logger.error("Error retrieving Google Access Token", error);
    throw new HttpsError("internal", "Failed to get access token.");
  }
});
