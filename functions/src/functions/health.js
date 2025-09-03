const { onRequest } = require("firebase-functions/v2/https");
const stripe = require("../config/stripe");
const { db } = require("../config/firebase");

/**
 * Health check endpoint for Stripe connectivity
 */
const stripeHealth = onRequest(async (req, res) => {
  try {
    const apiVersion = process.env.STRIPE_API_VERSION || "default";

    // Test Stripe connectivity
    await stripe.products.list({ limit: 1 });

    // Test Firestore connectivity
    await db.collection("health_checks").add({
      timestamp: new Date(),
      service: "stripe_health_check",
    });

    res.status(200).json({
      ok: true,
      message: "All services reachable",
      apiVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check failed", err);
    res.status(500).json({
      ok: false,
      message: err instanceof Error ? err.message : "Unknown error",
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
    services: {},
  };

  // Test Stripe
  try {
    await stripe.products.list({ limit: 1 });
    status.services.stripe = {
      status: "healthy",
      apiVersion: process.env.STRIPE_API_VERSION || "default",
    };
  } catch (error) {
    status.services.stripe = {
      status: "unhealthy",
      error: error.message,
    };
  }

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
  const requiredEnvVars = ["STRIPE_SECRET", "STRIPE_WEBHOOK_SECRET"];

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
