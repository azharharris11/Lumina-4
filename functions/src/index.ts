import {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";

import { getGoogleAuthURL, googleAuthCallback, disconnectGoogle, getGoogleAccessToken, googleClientId, googleClientSecret, googleRedirectUri, getAuthenticatedClient } from "./googleIntegration";

initializeApp();
const db = getFirestore();

// Ethereal Email Configuration (For Testing Only)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "karelle.brakus@ethereal.email",
    pass: "6G2QyYq2qQ2qQ2qQ2q",
  },
});

// Export Google Auth Functions
import { getPortalFiles, proxyDriveDownload, downloadGalleryZip, proxyWatermarkedImage } from "./portalIntegration";

export { getGoogleAuthURL, googleAuthCallback, disconnectGoogle, getGoogleAccessToken, getPortalFiles, proxyDriveDownload, downloadGalleryZip, proxyWatermarkedImage };

// ... (existing imports and code)

/**
 * Scheduled Function: Runs on the 1st of every month at 01:00 AM.
 * Goal: Aggregate financial data for the previous month and store in 'metrics'.
 */
/**
 * Scheduled Function: Runs every day at 09:00 AM.
 * Goal: Find clients with upcoming special dates (birthdays, etc.) and send a discount.
 */
export const specialMomentCron = onSchedule("0 9 * * *", async (event) => {
  const db = getFirestore();
  const today = new Date();
  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);

  const targetMonthDay = `${String(inSevenDays.getMonth() + 1).padStart(2, "0")}-${String(inSevenDays.getDate()).padStart(2, "0")}`;

  logger.info(`Checking Special Moments for Month-Day: ${targetMonthDay}`);

  try {
    const clientsSnap = await db.collection("clients").get();

    for (const clientDoc of clientsSnap.docs) {
      const client = clientDoc.data();
      if (!client.specialDates || !Array.isArray(client.specialDates)) continue;

      const matchingMoment = client.specialDates.find((m: any) => m.date.includes(targetMonthDay));

      if (matchingMoment && client.email) {
        const discountCode = `CELEBRATE-${client.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random()*1000)}`;
        const subject = `A special gift for your ${matchingMoment.label}!`;
        const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
                        <h1 style="color: #f472b6;">Happy ${matchingMoment.label}! 🎂</h1>
                        <p>Hi ${client.name},</p>
                        <p>To celebrate your upcoming special day, we want to give you a special gift!</p>
                        <div style="background: #fdf2f8; padding: 20px; border-radius: 15px; margin: 25px 0; border: 2px dashed #f472b6;">
                            <p style="margin: 0; color: #db2777; font-weight: bold; font-size: 18px;">20% DISCOUNT</p>
                            <p style="margin: 5px 0; font-size: 12px; color: #be185d;">Valid for any session booked this month</p>
                            <h2 style="margin: 15px 0 0 0; letter-spacing: 5px; color: #000;">${discountCode}</h2>
                        </div>
                        <p>We'd love to capture your special moments again.</p>
                        <a href="https://lumina-studio.web.app/" style="display: inline-block; background: #f472b6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">Book Your Session</a>
                        <p style="font-size: 10px; color: #999; margin-top: 30px;">Sent automatically with ❤️ from Lumina.</p>
                    </div>
                `;

        await transporter.sendMail({
          from: "\"Lumina Studio\" <marketing@lumina.id>",
          to: client.email,
          subject: subject,
          html: html,
        });

        logger.info(`Special moment email sent to ${client.email} for ${matchingMoment.label}`);
      }
    }
  } catch (error) {
    logger.error("Special Moment Cron Failed", error);
  }
});

export const monthlyFinancialAggregator = onSchedule("0 1 1 * *", async (event) => {
  const db = getFirestore();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const year = lastMonth.getFullYear();
  const month = lastMonth.getMonth(); // 0-indexed
  const monthLabel = lastMonth.toLocaleString("default", { month: "short" });
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  logger.info(`Running Monthly Aggregator for ${monthKey}`);

  try {
    // We need to do this for EACH owner (studio)
    const studiosSnap = await db.collection("studios").get();

    for (const studioDoc of studiosSnap.docs) {
      const ownerId = studioDoc.id;

      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const transSnap = await db.collection("transactions")
        .where("ownerId", "==", ownerId)
        .where("date", ">=", startOfMonth)
        .where("date", "<=", endOfMonth)
        .get();

      let revenue = 0;
      let expenses = 0;
      let bookingsCount = 0;

      transSnap.forEach((doc) => {
        const t = doc.data();
        if (t.type === "INCOME") revenue += t.amount;
        if (t.type === "EXPENSE") expenses += t.amount;
      });

      const bookingsSnap = await db.collection("bookings")
        .where("ownerId", "==", ownerId)
        .where("date", ">=", startOfMonth)
        .where("date", "<=", endOfMonth)
        .where("status", "!=", "CANCELLED")
        .get();

      bookingsCount = bookingsSnap.size;

      const metric = {
        id: monthKey,
        month: monthLabel,
        revenue,
        expenses,
        profit: revenue - expenses,
        bookings: bookingsCount,
        updatedAt: new Date().toISOString(),
        ownerId,
      };

      await db.collection("metrics").doc(`${ownerId}_${monthKey}`).set(metric);
      logger.info(`Metric saved for studio ${ownerId}: ${monthKey}`);
    }
  } catch (error) {
    logger.error("Monthly Aggregator Failed", error);
  }
});

/**
 * Trigger: Runs when a new Internal Review is created.
 * Goal: Send emergency email for ratings <= 3.
 */
export const onNegativeFeedback = onDocumentCreated("internal_reviews/{reviewId}", async (event) => {
  const review = event.data?.data();
  if (!review || review.rating > 3) return;

  const db = getFirestore();
  try {
    const ownerSnap = await db.collection("users").doc(review.ownerId).get();
    const ownerEmail = ownerSnap.data()?.email;

    if (ownerEmail) {
      const subject = `[URGENT] Negative Feedback from ${review.clientName}`;
      const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid #f43f5e; border-radius: 10px;">
                    <h2 style="color: #f43f5e;">Alert: Low Rating Received</h2>
                    <p>Your client <strong>${review.clientName}</strong> has just submitted a <strong>${review.rating}-star</strong> review.</p>
                    <div style="background: #fff1f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f43f5e;">
                        <p style="margin: 0;"><strong>Client Feedback:</strong></p>
                        <p style="font-style: italic; margin-top: 5px;">"${review.feedback || "No comment provided."}"</p>
                    </div>
                    <p>We recommend reaching out to the client immediately to resolve any issues before they post this review publicly.</p>
                    <a href="https://lumina-studio.web.app/dashboard" style="display: inline-block; background: #f43f5e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Take Action</a>
                </div>
            `;

      await transporter.sendMail({
        from: "\"Lumina Emergency\" <emergency@lumina.id>",
        to: ownerEmail,
        subject: subject,
        html: html,
      });

      logger.info(`Emergency feedback email sent to ${ownerEmail}`);
    }
  } catch (error) {
    logger.error("Failed to send emergency feedback email", error);
  }
});

export const dailyReminderCron = onSchedule("0 8 * * *", async (event) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  logger.info(`Running Daily Reminders for ${tomorrowStr}`);

  try {
    const bookingsRef = db.collection("bookings");
    const snapshot = await bookingsRef
      .where("date", "==", tomorrowStr)
      .where("status", "in", ["BOOKED", "INQUIRY"])
      .get();

    if (snapshot.empty) {
      logger.info("No bookings scheduled for tomorrow.");
      return;
    }

    for (const doc of snapshot.docs) {
      const booking = doc.data();

      // Send Email to Client (Mocking client email as it's not always in booking,
      // but in real app we'd fetch it from the 'clients' collection)
      const clientSnap = await db.collection("clients").doc(booking.clientId).get();
      const clientEmail = clientSnap.data()?.email;

      if (clientEmail) {
        const subject = "Reminder: Your Photo Session Tomorrow!";
        const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb;">See you tomorrow!</h2>
                        <p>Hi ${booking.clientName},</p>
                        <p>This is a friendly reminder for your scheduled session tomorrow.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Package:</strong> ${booking.package}</p>
                            <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${booking.timeStart}</p>
                            <p style="margin: 5px 0 0 0;"><strong>Location:</strong> ${booking.studio}</p>
                        </div>
                        <p>If you need to reschedule or have any questions, please contact us immediately.</p>
                        <a href="https://lumina-studio.web.app/portal/${booking.id}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Client Portal</a>
                    </div>
                `;

        await transporter.sendMail({
          from: "\"Lumina System\" <system@lumina.id>",
          to: clientEmail,
          subject: subject,
          html: html,
        });

        logger.info(`Reminder sent to ${clientEmail} for booking ${doc.id}`);
      }
    }
  } catch (error) {
    logger.error("Failed to process daily reminders", error);
  }
});

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
    const userDoc = await db.collection("users").doc(booking.ownerId).get();
    const ownerEmail = userDoc.data()?.email;

    if (!ownerEmail) {
      logger.warn(`No email found for owner ${booking.ownerId}. Skipping notification.`);
      return;
    }

    const subject = `New Booking: ${booking.clientName} - ${booking.package}`;
    const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">New Booking Received!</h2>
                <p>Hi there,</p>
                <p>You have a new booking from <strong>${booking.clientName}</strong>.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Package:</strong> ${booking.package}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${booking.date} @ ${booking.timeStart}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Studio:</strong> ${booking.studio}</p>
                </div>
                <a href="https://lumina-studio.web.app/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard</a>
                <p style="font-size: 12px; color: #777; margin-top: 30px;">This is an automated notification from Lumina.</p>
            </div>
        `;

    // Send Email
    await transporter.sendMail({
      from: "\"Lumina System\" <system@lumina.id>",
      to: ownerEmail,
      subject: subject,
      html: html,
    });

    logger.info(`Email notification sent to ${ownerEmail} for booking ${bookingId}`);
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
                extendedProperties: {
                  private: {
                    bookingId: newBooking.id,
                  },
                },
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
          extendedProperties: {
            private: {
              bookingId: event.params.bookingId,
            },
          },
        },
      });
      logger.info(`Google Calendar Event ${googleEventId} updated.`);
    }
  } catch (error) {
    logger.error("Failed to sync booking update to Google Calendar", error);
  }

  // --- REFERRAL SYSTEM LOGIC ---
  // When a booking is marked as COMPLETED, reward the referrer if exists
  if (after.status === "COMPLETED" && before.status !== "COMPLETED" && after.referredByClientId) {
    const db = getFirestore();
    try {
      const referrerRef = db.collection("clients").doc(after.referredByClientId);
      const rewardAmount = 50000; // Fixed Rp 50,000 reward per referral, adjust as needed

      await db.runTransaction(async (transaction) => {
        const referrerSnap = await transaction.get(referrerRef);
        if (!referrerSnap.exists) return;

        const currentCredits = referrerSnap.data()?.referralCredits || 0;
        transaction.update(referrerRef, {
          referralCredits: currentCredits + rewardAmount,
        });

        // Create a notification for the referrer
        const notifRef = db.collection("notifications").doc(`n-ref-${Date.now()}`);
        transaction.set(notifRef, {
          id: notifRef.id,
          title: "Referral Reward Earned!",
          message: `You earned Rp ${rewardAmount.toLocaleString()} credit from ${after.clientName}'s booking.`,
          time: new Date().toISOString(),
          read: false,
          type: "SUCCESS",
          ownerId: after.ownerId,
          link: "clients",
        });
      });
      logger.info(`Referral reward processed for client ${after.referredByClientId}`);
    } catch (err) {
      logger.error("Failed to process referral reward", err);
    }
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
