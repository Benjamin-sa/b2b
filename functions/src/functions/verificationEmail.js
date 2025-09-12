const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { sendVerificationEmail } = require("../utils/emailService");

/**
 * Send verification/approval email when user's isVerified field is set to true
 * This function triggers automatically when a user's isVerified status changes from false to true
 * and sends an account approval email with access information
 */
exports.sendVerificationEmailOnApproval = onDocumentUpdated(
  {
    document: "users/{userId}",
    secrets: [
      "CLOUDFLARE_EMAIL_SERVICE_URL",
      "CLOUDFLARE_EMAIL_SERVICE_SECRET",
    ],
  },
  async (event) => {
    const change = event.data;
    if (!change?.before || !change?.after) {
      logger.warn("Missing before/after data in document change");
      return;
    }

    const beforeData = change.before.data();
    const afterData = change.after.data();
    const userId = event.params.userId;

    // Check if isVerified changed from false to true
    const wasVerified = beforeData.isVerified === true;
    const isNowVerified = afterData.isVerified === true;

    if (wasVerified || !isNowVerified) {
      // User was already verified or is not being verified now, skip
      logger.info(
        "User verification status unchanged or user not being verified",
        {
          userId,
          wasVerified,
          isNowVerified,
        }
      );
      return;
    }

    // Validate required user data
    if (!afterData.email) {
      logger.error("User document missing email", { userId });
      return;
    }

    try {
      // Prepare user display name
      const userName =
        afterData.firstName && afterData.lastName
          ? `${afterData.firstName} ${afterData.lastName}`
          : afterData.companyName || "Valued Customer";

      const companyName = afterData.companyName || "Your Company";

      // Create verification URL (redirect to login/dashboard)
      const verificationUrl = process.env.VITE_APP_URL
        ? `${process.env.VITE_APP_URL}/auth`
        : "https://4tparts.com/auth";

      logger.info("Sending verification email to approved user", {
        userId,
        email: afterData.email,
        userName,
        companyName,
        verificationUrl,
      });

      // Send verification email
      const emailResult = await sendVerificationEmail(
        afterData.email,
        userName,
        companyName,
        verificationUrl
      );

      // Update user document with verification email status
      await change.after.ref.update({
        verificationEmailSent: true,
        verificationEmailSentAt: new Date(),
        verificationEmailMessageId: emailResult.messageId,
      });

      logger.info("Verification email sent and user document updated", {
        userId,
        email: afterData.email,
        messageId: emailResult.messageId,
      });
    } catch (error) {
      logger.error("Failed to send verification email", {
        userId,
        email: afterData.email,
        error: error.message,
      });

      // Update user document with error status
      try {
        await change.after.ref.update({
          verificationEmailError: error.message,
          verificationEmailErrorAt: new Date(),
        });
      } catch (updateError) {
        logger.error(
          "Failed to update user document with verification email error",
          {
            userId,
            updateError: updateError.message,
          }
        );
      }
    }
  }
);
