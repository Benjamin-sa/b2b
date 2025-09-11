const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

/**
 * Callable function to request a password reset
 * This function:
 * 1. Validates the user exists in Firebase Auth
 * 2. Generates a password reset link
 * 3. Calls our Cloudflare email service to send the email
 */
exports.requestPasswordReset = onCall(
  {
    cors: true,
  },
  async (request) => {
    try {
      const { email } = request.data;

      // Validate input
      if (!email || typeof email !== "string" || !email.trim()) {
        logger.warn("Password reset request missing email", { email });
        throw new HttpsError("invalid-argument", "Email is required");
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Check if user exists in Firebase Auth
      let userRecord;
      try {
        userRecord = await getAuth().getUserByEmail(trimmedEmail);
        logger.info("User found in Firebase Auth", {
          uid: userRecord.uid,
          email: trimmedEmail,
        });
      } catch (authError) {
        logger.warn("User not found in Firebase Auth", {
          email: trimmedEmail,
          error: authError.code,
        });
        // Return success even if user doesn't exist for security
        // This prevents email enumeration attacks
        return {
          success: true,
          message:
            "If an account with this email exists, you will receive password reset instructions.",
        };
      }

      // Check if user exists in Firestore and is active
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(userRecord.uid).get();

      if (!userDoc.exists) {
        logger.warn("User profile not found in Firestore", {
          uid: userRecord.uid,
          email: trimmedEmail,
        });
        return {
          success: true,
          message:
            "If an account with this email exists, you will receive password reset instructions.",
        };
      }

      const userProfile = userDoc.data();

      // Check if user is active
      if (!userProfile.isActive) {
        logger.warn("Password reset requested for inactive user", {
          uid: userRecord.uid,
          email: trimmedEmail,
        });
        return {
          success: true,
          message:
            "If an account with this email exists, you will receive password reset instructions.",
        };
      }

      // Generate password reset link
      // This creates a secure token that expires in 1 hour
      const resetLink = await getAuth().generatePasswordResetLink(
        trimmedEmail,
        {
          url: `${process.env.VITE_APP_URL || "http://localhost:5173"}/auth`, // Redirect after reset
          handleCodeInApp: false,
        }
      );

      logger.info("Generated password reset link", {
        uid: userRecord.uid,
        email: trimmedEmail,
      });

      // Call Cloudflare email service
      const emailServiceUrl = process.env.CLOUDFLARE_EMAIL_SERVICE_URL;
      if (!emailServiceUrl) {
        logger.error("CLOUDFLARE_EMAIL_SERVICE_URL not configured");
        throw new HttpsError("internal", "Email service not configured");
      }

      const emailResponse = await fetch(`${emailServiceUrl}/password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://firebase-functions", // For CORS
        },
        body: JSON.stringify({
          to: trimmedEmail,
          userName:
            userProfile.firstName && userProfile.lastName
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile.companyName || "Valued Customer",
          resetLink: resetLink,
          companyName: userProfile.companyName,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        logger.error("Failed to send password reset email", {
          status: emailResponse.status,
          error: errorText,
          email: trimmedEmail,
        });
        throw new HttpsError("internal", "Failed to send password reset email");
      }

      const emailResult = await emailResponse.json();
      logger.info("Password reset email sent successfully", {
        email: trimmedEmail,
        messageId: emailResult.messageId,
      });

      return {
        success: true,
        message:
          "Password reset instructions have been sent to your email address.",
        messageId: emailResult.messageId,
      };
    } catch (error) {
      logger.error("Password reset request failed", {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Don't expose internal errors to client
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "An unexpected error occurred");
    }
  }
);
