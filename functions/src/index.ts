import {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
// import * as nodemailer from "nodemailer";

import { getGoogleAuthURL, googleAuthCallback, disconnectGoogle, getGoogleAccessToken, googleClientId, googleClientSecret, googleRedirectUri, getAuthenticatedClient } from "./googleIntegration";

initializeApp();
const db = getFirestore();

// Export Google Auth Functions
import { getPortalFiles } from "./portalIntegration";

export { getGoogleAuthURL, googleAuthCallback, disconnectGoogle, getGoogleAccessToken, getPortalFiles };

// ... (existing imports and code)

// Ethereal Email Configuration (For Testing Only)
// In production, replace with SendGrid, Mailgun, or Gmail OAuth
// const transporter = nodemailer.createTransport({
//     host: 'smtp.ethereal.email',
//     port: 587,
//     auth: {
//         user: 'karelle.brakus@ethereal.email',
//         pass: '6G2QyYq2qQ2qQ2qQ2q' // Fake password, for demo structure only
//     }
// });

export const sendBookingNotification = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const booking = snapshot.data();
  const bookingId = event.params.bookingId;

  // Only send for new bookings that are not cancelled
  if (booking.status === "CANCELLED") return;

  try {
    // 1. Get Owner Email (to notify the studio owner)
    // In a real app, you'd fetch the user profile:
    // const userDoc = await db.collection('users').doc(booking.ownerId).get();
    // const ownerEmail = userDoc.data()?.email;

    // For prototype, we'll just log that we would send it
    const subject = `New Booking: ${booking.clientName} - ${booking.package}`;
    const html = `
            <h3>New Booking Received!</h3>
            <p><strong>Client:</strong> ${booking.clientName}</p>
            <p><strong>Package:</strong> ${booking.package}</p>
            <p><strong>Date:</strong> ${booking.date} @ ${booking.timeStart}</p>
            <p><strong>Studio:</strong> ${booking.studio}</p>
            <br/>
            <a href="https://lumina-studio.web.app/dashboard">View in Dashboard</a>
        `;

    // Send Email (Simulated)
    // const info = await transporter.sendMail({
    //     from: '"Lumina System" <system@lumina.id>',
    //     to: "owner@example.com", // Replace with ownerEmail
    //     subject: subject,
    //     html: html,
    // });

    logger.info(`[MOCK EMAIL] Subject: ${subject}`);
    logger.info(`[MOCK EMAIL] Body: ${html}`);

    logger.info(`Email notification processed for booking ${bookingId}`);

    // Optional: Update the booking doc to say notification sent
    // await snapshot.ref.update({ notificationSent: true });
  } catch (error) {
    logger.error("Failed to send notification email", error);
  }
});

interface CreateBookingData {
  booking: any;
  paymentDetails?: {
    amount: number;
    accountId: string;
  };
}

export const createBooking = onCall({
  cors: true,
  invoker: "public", // Allow public access to handle CORS preflight
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const {booking, paymentDetails} = request.data as CreateBookingData;
  const ownerId = request.auth.uid;

  // Basic Validation
  if (!booking || !booking.date || !booking.timeStart || !booking.studio || !booking.duration) {
    throw new HttpsError("invalid-argument", "Missing required booking fields.");
  }

  // Force ownerId to be the authenticated user
  const newBooking = {
    ...booking,
    ownerId: ownerId,
    photographerId: booking.photographerId || ownerId,
    createdAt: new Date().toISOString(),
  };

  // 2. Transaction for Race Condition Handling
  try {
    await db.runTransaction(async (transaction) => {
      // 1. ALL READS
      // A. Check for Conflicts
      const bookingsRef = db.collection("bookings");
      const q = bookingsRef
        .where("ownerId", "==", ownerId)
        .where("date", "==", newBooking.date)
        .where("studio", "==", newBooking.studio);

      const snapshot = await transaction.get(q);
      const existingBookings = snapshot.docs.map((doc) => doc.data());

      // Fetch Studio Config for buffer settings
      const studioRef = db.collection("studios").doc(ownerId);
      const studioDoc = await transaction.get(studioRef);

      // Payment Read
      let accountDoc;
      let accountRef;
      if (paymentDetails && paymentDetails.amount > 0) {
        if (!paymentDetails.accountId) {
          throw new HttpsError("invalid-argument", "Payment amount provided but missing Account ID.");
        }
        accountRef = db.collection("accounts").doc(paymentDetails.accountId);
        accountDoc = await transaction.get(accountRef);

        // Auto-update status to BOOKED if payment is made
        if (newBooking.status === "INQUIRY") {
          newBooking.status = "BOOKED";
        }
        newBooking.paidAmount = paymentDetails.amount;
      }

      // 2. LOGIC & WRITES
      const studioConfig = studioDoc.data();
      const bufferMins = studioConfig?.bufferMinutes || 0;

      // Calculate time ranges (in minutes from midnight)
      const [newStartH, newStartM] = newBooking.timeStart.split(":").map(Number);
      const newStartMins = newStartH * 60 + newStartM;
      const newEndMins = newStartMins + (newBooking.duration * 60) + bufferMins;

      const conflict = existingBookings.find((b) => {
        if (b.status === "CANCELLED" || b.id === newBooking.id) return false;

        const [bStartH, bStartM] = b.timeStart.split(":").map(Number);
        const bStartMins = bStartH * 60 + bStartM;
        const bEndMins = bStartMins + (b.duration * 60) + bufferMins;

        // Overlap logic: StartA < EndB && StartB < EndA
        return (newStartMins < bEndMins) && (newEndMins > bStartMins);
      });

      if (conflict) {
        throw new HttpsError("aborted", `Conflict detected! Room occupied by client: ${conflict.clientName}`);
      }

      // B. Create Booking
      const bookingRef = bookingsRef.doc(newBooking.id);
      transaction.set(bookingRef, newBooking);

      // C. Handle Payment (if applicable)
      if (paymentDetails && paymentDetails.amount > 0 && accountRef && accountDoc) {
        if (!accountDoc.exists) {
          throw new HttpsError("not-found", "Payment account not found.");
        }

        const accountData = accountDoc.data();
        if (accountData?.ownerId !== ownerId) {
          throw new HttpsError("permission-denied", "You do not own this account.");
        }

        const newBalance = (accountData?.balance || 0) + paymentDetails.amount;
        transaction.update(accountRef, {balance: newBalance});

        const transactionRef = db.collection("transactions").doc(`t-${Date.now()}`);
        const newTransaction = {
          id: transactionRef.id,
          date: new Date().toISOString(),
          description: `Deposit - ${newBooking.clientName} (${newBooking.package})`,
          amount: Number(paymentDetails.amount),
          type: "INCOME",
          accountId: paymentDetails.accountId,
          category: "Sales / Booking",
          status: "COMPLETED",
          bookingId: newBooking.id,
          ownerId: ownerId,
        };
        transaction.set(transactionRef, newTransaction);
      }
    });

    // --- GOOGLE CALENDAR SYNC (BACKEND) ---
    // This happens asynchronously AFTER the booking is committed to Firestore.
    // If it fails, we log it but don't fail the booking.
    if (newBooking.googleSync !== false) {
      try {
        const clientId = googleClientId.value();
        const clientSecret = googleClientSecret.value();
        const redirectUri = googleRedirectUri.value();

        if (!clientId || !clientSecret || !redirectUri) {
          logger.warn("Google OAuth secrets not configured. Skipping Calendar Sync.");
        } else {
          const oauthClient = await getAuthenticatedClient(
            ownerId,
            clientId,
            clientSecret,
            redirectUri
          );
          if (oauthClient) {
            const calendar = (await import("googleapis")).google.calendar({version: "v3", auth: oauthClient});

            const startTime = new Date(`${newBooking.date}T${newBooking.timeStart}:00`);
            const endTime = new Date(startTime.getTime() + newBooking.duration * 60 * 60 * 1000);

            const insertResult = await calendar.events.insert({
              calendarId: "primary",
              requestBody: {
                summary: `Lumina: ${newBooking.clientName} - ${newBooking.package}`,
                location: newBooking.studio,
                description: `Client Phone: ${newBooking.clientPhone}\nPackage: ${newBooking.package}\nNotes: ${newBooking.notes || "-"}`,
                start: {dateTime: startTime.toISOString()},
                end: {dateTime: endTime.toISOString()},
              },
            });

            if (insertResult.data.id) {
              await db.collection("bookings").doc(newBooking.id).update({ googleEventId: insertResult.data.id });
              logger.info(`Google Calendar Event created: ${insertResult.data.id}`);
            }
          }
        }
      } catch (gError: any) {
        logger.error("Google Calendar Sync Failed:", gError);
        // We do not fail the booking; we just skip the sync
      }
    }

    logger.info("Booking created successfully", {bookingId: newBooking.id, user: ownerId});
    return {success: true, bookingId: newBooking.id};
  } catch (error: any) {
    logger.error("Booking creation failed", error);
    // Re-throw HttpsErrors, wrap others
    if (error instanceof HttpsError || error.code?.startsWith("functions/")) {
      throw error;
    }
    // Generic error for client
    throw new HttpsError("internal", "An internal error occurred while creating the booking.");
  }
});


export const claimSubdomain = onCall({ cors: true, invoker: "public" }, async (request) => {
  // 1. Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const {subdomain} = request.data;
  const userId = request.auth.uid;

  // 2. Validation
  if (!subdomain || typeof subdomain !== "string") {
    throw new HttpsError("invalid-argument", "Subdomain is required.");
  }

  const cleanSubdomain = subdomain.toLowerCase().trim();
  const RESERVED = ["www", "app", "admin", "api", "mail", "support", "staging", "test", "login", "signup", "register"];

  if (cleanSubdomain.length < 3) {
    throw new HttpsError("invalid-argument", "Subdomain must be at least 3 characters.");
  }

  if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
    throw new HttpsError("invalid-argument", "Subdomain can only contain letters, numbers, and hyphens.");
  }

  if (RESERVED.includes(cleanSubdomain)) {
    throw new HttpsError("invalid-argument", "This subdomain is reserved by the system.");
  }

  // 3. Atomically Claim
  // We use a dedicated collection 'subdomain_registry' where the document ID IS the subdomain.
  // This guarantees uniqueness at the database level.
  const registryRef = db.collection("subdomain_registry").doc(cleanSubdomain);

  try {
    await db.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(registryRef);

      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        // If it exists, check if it belongs to the current user
        if (data?.ownerId === userId) {
          return; // Already owned by requester, success
        } else {
          throw new HttpsError("already-exists", `Subdomain '${cleanSubdomain}' is already taken.`);
        }
      }

      // If available, reserve it
      transaction.set(registryRef, {
        ownerId: userId,
        claimedAt: new Date().toISOString(),
      });

      // Also update the user's studio config
      const studioRef = db.collection("studios").doc(userId);
      transaction.set(studioRef, {site: {subdomain: cleanSubdomain}}, {merge: true});
    });

    logger.info(`Subdomain '${cleanSubdomain}' claimed by ${userId}`);
    return {success: true, subdomain: cleanSubdomain};
  } catch (error: any) {
    logger.error("Claim subdomain failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Internal error claiming subdomain.");
  }
});

interface TransactionData {
    type: "EXPENSE" | "TRANSFER" | "INCOME";
    amount: number;
    accountId: string; // Source account for EXPENSE/TRANSFER, Target for INCOME
    toAccountId?: string; // Target for TRANSFER
    category?: string;
    description: string;
    bookingId?: string;
    date?: string;
}

export const processTransaction = onCall({ cors: true, invoker: "public" }, async (request) => {
  // 1. Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }
  const userId = request.auth.uid;
  const data = request.data as TransactionData;

  // 2. Validation
  if (!data.amount || data.amount <= 0) {
    throw new HttpsError("invalid-argument", "Amount must be positive.");
  }
  if (!data.accountId) {
    throw new HttpsError("invalid-argument", "Account ID is required.");
  }

  try {
    await db.runTransaction(async (transaction) => {
      const accountRef = db.collection("accounts").doc(data.accountId);
      const accountDoc = await transaction.get(accountRef);

      if (!accountDoc.exists) throw new HttpsError("not-found", "Account not found.");
      if (accountDoc.data()?.ownerId !== userId) throw new HttpsError("permission-denied", "Not your account.");

      const currentBalance = accountDoc.data()?.balance || 0;
      const transRef = db.collection("transactions").doc(`t-${Date.now()}`);

      if (data.type === "EXPENSE") {
        if (currentBalance < data.amount) {
          throw new HttpsError("failed-precondition", "Insufficient funds.");
        }
        transaction.update(accountRef, {balance: currentBalance - data.amount});

        transaction.set(transRef, {
          id: transRef.id,
          ownerId: userId,
          type: "EXPENSE",
          amount: data.amount,
          accountId: data.accountId,
          description: data.description,
          category: data.category || "General",
          date: data.date || new Date().toISOString(),
          status: "COMPLETED",
          bookingId: data.bookingId || null,
        });
      } else if (data.type === "INCOME") {
        transaction.update(accountRef, {balance: currentBalance + data.amount});

        transaction.set(transRef, {
          id: transRef.id,
          ownerId: userId,
          type: "INCOME",
          amount: data.amount,
          accountId: data.accountId,
          description: data.description,
          category: data.category || "General",
          date: data.date || new Date().toISOString(),
          status: "COMPLETED",
          bookingId: data.bookingId || null,
        });
      } else if (data.type === "TRANSFER") {
        if (!data.toAccountId) throw new HttpsError("invalid-argument", "Destination account required for transfer.");

        const toAccountRef = db.collection("accounts").doc(data.toAccountId);
        const toAccountDoc = await transaction.get(toAccountRef);

        if (!toAccountDoc.exists) throw new HttpsError("not-found", "Destination account not found.");
        // Optional: Check if destination also belongs to user, or allow transfers to others?
        // For now assuming internal transfer
        if (toAccountDoc.data()?.ownerId !== userId) throw new HttpsError("permission-denied", "Destination not your account.");

        if (currentBalance < data.amount) {
          throw new HttpsError("failed-precondition", "Insufficient funds.");
        }

        transaction.update(accountRef, {balance: currentBalance - data.amount});
        transaction.update(toAccountRef, {balance: (toAccountDoc.data()?.balance || 0) + data.amount});

        transaction.set(transRef, {
          id: transRef.id,
          ownerId: userId,
          type: "TRANSFER",
          amount: data.amount,
          accountId: data.accountId, // From Account
          toAccountId: data.toAccountId,
          description: data.description || `Transfer to ${toAccountDoc.data()?.name}`,
          category: "Transfer",
          date: data.date || new Date().toISOString(),
          status: "COMPLETED",
        });
      }
    });

    return {success: true};
  } catch (error: any) {
    logger.error("Transaction failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Transaction failed.");
  }
});

// --- AUTOMATIC CALENDAR SYNC (UPDATES & DELETES) ---

export const onBookingUpdated = onDocumentUpdated({
  document: "bookings/{bookingId}",
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Check if connected to Google Calendar
  const googleEventId = after.googleEventId || before.googleEventId;
  if (!googleEventId) return;

  const ownerId = after.ownerId;

  // Detect Changes
  const isCancelled = after.status === "CANCELLED" && before.status !== "CANCELLED";
  const isRescheduled = after.date !== before.date || after.timeStart !== before.timeStart || after.duration !== before.duration;

  if (!isCancelled && !isRescheduled) return;

  try {
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const oauthClient = await getAuthenticatedClient(ownerId, clientId, clientSecret, redirectUri);
    if (!oauthClient) return;

    const calendar = (await import("googleapis")).google.calendar({version: "v3", auth: oauthClient});

    if (isCancelled) {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
      });
      logger.info(`Google Calendar Event ${googleEventId} deleted (Booking Cancelled).`);
    } else if (isRescheduled) {
      const startTime = new Date(`${after.date}T${after.timeStart}:00`);
      const endTime = new Date(startTime.getTime() + (after.duration * 60 * 60 * 1000));

      await calendar.events.patch({
        calendarId: "primary",
        eventId: googleEventId,
        requestBody: {
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          summary: `Lumina: ${after.clientName} - ${after.package} (Updated)`,
          description: `[UPDATED] Client Phone: ${after.clientPhone}\nPackage: ${after.package}\nNotes: ${after.notes || "-"}`,
        },
      });
      logger.info(`Google Calendar Event ${googleEventId} updated.`);
    }
  } catch (error) {
    logger.error("Failed to sync booking update to Google Calendar", error);
  }
});

export const onBookingDeleted = onDocumentDeleted({
  document: "bookings/{bookingId}",
  secrets: [googleClientId, googleClientSecret, googleRedirectUri],
}, async (event) => {
  const booking = event.data?.data();
  if (!booking || !booking.googleEventId) return;

  const ownerId = booking.ownerId;

  try {
    const clientId = googleClientId.value();
    const clientSecret = googleClientSecret.value();
    const redirectUri = googleRedirectUri.value();

    const oauthClient = await getAuthenticatedClient(ownerId, clientId, clientSecret, redirectUri);
    if (!oauthClient) return;

    const calendar = (await import("googleapis")).google.calendar({version: "v3", auth: oauthClient});

    await calendar.events.delete({
      calendarId: "primary",
      eventId: booking.googleEventId,
    });
    logger.info(`Google Calendar Event ${booking.googleEventId} deleted (Booking Removed).`);
  } catch (error) {
    logger.error("Failed to delete Google Calendar event", error);
  }
});
