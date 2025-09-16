const { onRequest } = require("firebase-functions/v2/https");
const { testStripeConnection, getConfigStatus } = require("../config/stripe");
const { db } = require("../config/firebase");

/**
 * Health check endpoint for Stripe connectivity
 */
const stripeHealth = onRequest(async (req, res) => {
  try {
    // Get configuration status
    const configStatus = getConfigStatus();

    // Test Stripe connectivity (non-throwing version)
    const stripeTest = await testStripeConnection();

    // Test Firestore connectivity
    await db.collection("health_checks").add({
      timestamp: new Date(),
      service: "stripe_health_check",
      configStatus,
    });

    if (!stripeTest.success) {
      return res.status(503).json({
        ok: false,
        message: stripeTest.message,
        configStatus,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      ok: true,
      message: "All services reachable",
      configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check failed", err);
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "Unknown error",
      configStatus: getConfigStatus(),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Detailed system status check
 */
const systemStatus = onRequest(async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    configStatus: getConfigStatus(),
    services: {},
  };

  // Test Stripe with non-throwing method
  const stripeTest = await testStripeConnection();
  status.services.stripe = {
    status: stripeTest.success ? "healthy" : "unhealthy",
    message: stripeTest.message,
    ...(stripeTest.error && { error: stripeTest.error.message }),
  };

  // Test Firestore
  try {
    await db.collection("health_checks").add({
      timestamp: new Date(),
      service: "system_status_check",
    });
    status.services.firestore = { status: "healthy" };
  } catch (error) {
    status.services.firestore = {
      status: "unhealthy",
      error: error.message,
    };
  }

  // Check environment variables
  const requiredEnvVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  status.environment = {};
  requiredEnvVars.forEach((envVar) => {
    status.environment[envVar] = process.env[envVar] ? "configured" : "missing";
  });

  const allHealthy = Object.values(status.services).every(
    (service) => service.status === "healthy"
  );

  res.status(allHealthy ? 200 : 503).json(status);
});

module.exports = {
  stripeHealth,
  systemStatus,
};
