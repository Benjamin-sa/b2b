const { onRequest } = require("firebase-functions/v2/https");
const {
  stripeSecretKey,
  stripeWebhookSecret,
  getStripe,
  getWebhookSecret,
  isEmulator,
} = require("../config/stripe");
const { telegramBotToken, telegramChatId } = require("../config/telegram");
const { inventoryWorkerToken } = require("../services/inventoryWorker");
const { logWebhookEvent } = require("../utils/database");
const {
  handleInvoiceSent,
  handleInvoicePaymentSucceeded,
  handleInvoiceVoided,
} = require("../handlers/webhookHandlers");

// Configure function options based on environment
const getFunctionOptions = () => {
  const baseOptions = {
    cors: [
      "http://localhost:5173", // Vite dev server
      "http://localhost:3000",
      "https://motordash-cf401.web.app",
      "https://4tparts.com",
    ],
  };

  // Only add secrets in production
  if (!isEmulator) {
    baseOptions.secrets = [
      stripeSecretKey,
      stripeWebhookSecret,
      telegramBotToken,
      telegramChatId,
      inventoryWorkerToken,
    ];
  }

  return baseOptions;
};

/**
 * Streamlined Stripe Webhook Handler
 * Handles payment intents and invoices with Telegram notifications
 */
const stripeWebhook = onRequest(getFunctionOptions(), async (req, res) => {
  // Validate request method
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("Missing stripe-signature header");
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let webhookSecret;
  try {
    webhookSecret = getWebhookSecret();
  } catch (error) {
    console.error("Stripe webhook secret not configured:", error.message);
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    console.log(`🔔 Webhook received: ${event.type} (ID: ${event.id})`);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  try {
    // Process webhook events
    switch (event.type) {
      case "payment_intent.succeeded":
        break;

      case "invoice.sent":
        await handleInvoiceSent(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.marked_uncollectible":
      case "invoice.voided":
        await handleInvoiceVoided(event.data.object);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    // Log successful webhook processing
    await logWebhookEvent(event, true);

    res.json({
      received: true,
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);

    // Log failed webhook processing
    await logWebhookEvent(event, false, error);

    res.status(500).json({
      error: "Webhook processing failed",
      eventType: event.type,
      eventId: event.id,
    });
  }
});

module.exports = {
  stripeWebhook,
};
