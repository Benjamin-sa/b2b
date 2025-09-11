const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { sendWelcomeEmail } = require("../utils/emailService");
const {
  notifyNewUserRegistration,
  telegramBotToken,
  telegramChatId,
} = require("../config/telegram");

/**
 * Send welcome email when a new user document is created
 * This function triggers automatically when a user document is created in Firestore
 * and sends a welcome email with account review status information
 */
exports.sendWelcomeEmailOnUserCreate = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [
      "CLOUDFLARE_EMAIL_SERVICE_URL",
      "CLOUDFLARE_EMAIL_SERVICE_SECRET",
      telegramBotToken,
      telegramChatId,
    ],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("No data in document snapshot");
      return;
    }

    const userData = snap.data();
    const userId = event.params.userId;

    // Validate required user data
    if (!userData.email) {
      logger.error("User document missing email", { userId });
      return;
    }

    try {
      // Prepare user display name
      const userName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData.companyName || "Valued Customer";

      const companyName = userData.companyName || "Your Company";

      logger.info("Sending welcome email to new user", {
        userId,
        email: userData.email,
        userName,
        companyName,
      });

      // Send welcome email
      const emailResult = await sendWelcomeEmail(
        userData.email,
        userName,
        companyName
      );

      // Update user document with email status
      await snap.ref.update({
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date(),
        welcomeEmailMessageId: emailResult.messageId,
      });

      logger.info("Welcome email sent and user document updated", {
        userId,
        email: userData.email,
        messageId: emailResult.messageId,
      });

      // Send Telegram notification to admins about new user registration
      try {
        await notifyNewUserRegistration(userData, userId);
        logger.info("Telegram notification sent for new user registration", {
          userId,
          email: userData.email,
        });
      } catch (telegramError) {
        logger.error("Failed to send Telegram notification", {
          userId,
          email: userData.email,
          error: telegramError.message,
        });
        // Don't fail the entire function if Telegram fails
      }
    } catch (error) {
      logger.error("Failed to send welcome email", {
        userId,
        email: userData.email,
        error: error.message,
      });

      // Update user document with error status
      try {
        await snap.ref.update({
          welcomeEmailError: error.message,
          welcomeEmailErrorAt: new Date(),
        });
      } catch (updateError) {
        logger.error("Failed to update user document with email error", {
          userId,
          updateError: updateError.message,
        });
      }
    }
  }
);
