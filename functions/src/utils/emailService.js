const { logger } = require("firebase-functions");

/**
 * Shared email service utility for sending emails via Cloudflare worker
 * This centralizes email sending logic and provides security for Firebase-to-Cloudflare communication
 */

/**
 * Send email via Cloudflare email service
 * @param {string} endpoint - Email endpoint path (e.g., 'welcome', 'verification', 'password-reset')
 * @param {Object} emailData - Email data object
 * @param {string} userEmail - User email for logging
 * @returns {Promise<Object>} Email result
 */
async function sendEmail(endpoint, emailData, userEmail) {
  const emailServiceUrl = process.env.CLOUDFLARE_EMAIL_SERVICE_URL;
  const emailServiceSecret = process.env.CLOUDFLARE_EMAIL_SERVICE_SECRET;

  if (!emailServiceUrl) {
    logger.error("CLOUDFLARE_EMAIL_SERVICE_URL not configured");
    throw new Error("Email service not configured");
  }

  if (!emailServiceSecret) {
    logger.error("CLOUDFLARE_EMAIL_SERVICE_SECRET not configured");
    throw new Error("Email service secret not configured");
  }

  try {
    const response = await fetch(`${emailServiceUrl}/api/email/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://firebase-functions",
        "X-Firebase-Auth": emailServiceSecret, // Custom auth header
        "User-Agent": "Firebase-Functions/1.0",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to send ${endpoint} email`, {
        status: response.status,
        error: errorText,
        email: userEmail,
      });
      throw new Error(`Failed to send ${endpoint} email`);
    }

    const result = await response.json();
    logger.info(`${endpoint} email sent successfully`, {
      email: userEmail,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error(`Error sending ${endpoint} email`, {
      error: error.message,
      email: userEmail,
    });
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(userEmail, userName, companyName) {
  return sendEmail(
    "welcome",
    {
      to: userEmail,
      userName,
      companyName,
    },
    userEmail
  );
}

/**
 * Send verification/approval email to verified user
 */
async function sendVerificationEmail(
  userEmail,
  userName,
  companyName,
  verificationUrl
) {
  return sendEmail(
    "verification",
    {
      to: userEmail,
      userName,
      companyName,
      verificationUrl,
    },
    userEmail
  );
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(
  userEmail,
  userName,
  companyName,
  resetUrl
) {
  return sendEmail(
    "password-reset",
    {
      to: userEmail,
      userName,
      resetUrl,
      resetToken: "firebase-generated",
      companyName,
    },
    userEmail
  );
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
