const { defineSecret } = require("firebase-functions/params");
const Stripe = require("stripe");

// Define secrets using Firebase Functions v2 approach (for production)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Detect if we're running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

// Singleton instance to prevent multiple initializations
let stripeInstance = null;

/**
 * Get Stripe secret key - uses .env in emulator, secrets in production
 */
const getStripeSecretKey = () => {
  if (isEmulator) {
    // In emulator, use environment variable from .env with _LOCAL suffix
    const key = process.env.STRIPE_SECRET_KEY_LOCAL;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY_LOCAL not found in .env file for emulator"
      );
    }
    return key;
  } else {
    // In production, use Firebase Functions v2 secrets
    return stripeSecretKey.value();
  }
};

/**
 * Get Stripe webhook secret - uses .env in emulator, secrets in production
 */
const getStripeWebhookSecret = () => {
  if (isEmulator) {
    // In emulator, use environment variable from .env with _LOCAL suffix
    const secret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL;
    if (!secret) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET_LOCAL not found in .env file for emulator"
      );
    }
    return secret;
  } else {
    // In production, use Firebase Functions v2 secrets
    return stripeWebhookSecret.value();
  }
};

/**
 * Get Stripe instance with lazy initialization and error handling
 */
const getStripe = () => {
  if (stripeInstance) {
    return stripeInstance;
  }

  try {
    const secretKey = getStripeSecretKey();

    // Validate key format
    if (!secretKey || !secretKey.startsWith("sk_")) {
      throw new Error(
        "Invalid Stripe secret key format. Must start with 'sk_'"
      );
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: process.env.STRIPE_API_VERSION || "2024-06-20",
    });

    console.log(
      `✅ Stripe initialized successfully (${
        isEmulator ? "emulator" : "production"
      })`
    );
    return stripeInstance;
  } catch (error) {
    console.error("❌ Failed to initialize Stripe:", error.message);
    throw new Error(`Failed to initialize Stripe: ${error.message}`);
  }
};

/**
 * Get webhook secret with validation
 */
const getWebhookSecret = () => {
  try {
    const secret = getStripeWebhookSecret();

    // Validate webhook secret format
    if (!secret || !secret.startsWith("whsec_")) {
      throw new Error(
        "Invalid Stripe webhook secret format. Must start with 'whsec_'"
      );
    }

    console.log(
      `✅ Stripe webhook secret retrieved (${
        isEmulator ? "emulator" : "production"
      })`
    );
    return secret;
  } catch (error) {
    console.error("❌ Failed to get webhook secret:", error.message);
    throw new Error(`Failed to get webhook secret: ${error.message}`);
  }
};

/**
 * Test Stripe connection without throwing errors
 */
const testStripeConnection = async () => {
  try {
    const stripe = getStripe();
    await stripe.balance.retrieve();
    return {
      success: true,
      message: `Stripe connection successful (${
        isEmulator ? "emulator" : "production"
      })`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Stripe connection failed: ${error.message}`,
      error: error,
      environment: isEmulator ? "emulator" : "production",
    };
  }
};

// Export secrets and helper functions
module.exports = {
  stripeSecretKey, // Only used in production
  stripeWebhookSecret, // Only used in production
  getStripe,
  getWebhookSecret,
  testStripeConnection,
  isEmulator, // Export for debugging
};
