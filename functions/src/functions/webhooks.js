const { onRequest } = require("firebase-functions/v2/https");
const stripe = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");

/**
 * Handle Stripe webhooks
 */
const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Stripe webhook secret not configured");
    res.status(500).send("Webhook secret not configured");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case "customer.created":
        await handleCustomerCreated(event.data.object);
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case "invoice.finalized":
        await handleInvoiceFinalized(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log webhook event for monitoring
    await db.collection("webhook_logs").add({
      eventType: event.type,
      eventId: event.id,
      processed: true,
      timestamp: getServerTimestamp(),
    });

    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);

    // Log failed webhook
    await db
      .collection("webhook_logs")
      .add({
        eventType: event.type,
        eventId: event.id,
        processed: false,
        error: error.message,
        timestamp: getServerTimestamp(),
      })
      .catch((logError) => {
        console.error(`Failed to log webhook error:`, logError);
      });

    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle invoice finalized
 */
const handleInvoiceFinalized = async (invoice) => {
  if (!invoice.metadata?.userId) {
    console.warn("Invoice finalized without userId in metadata");
    return;
  }

  try {
    // Update invoice record in our database
    const invoiceQuery = await db
      .collection("invoices")
      .where("invoiceId", "==", invoice.id)
      .limit(1)
      .get();

    if (!invoiceQuery.empty) {
      await invoiceQuery.docs[0].ref.update({
        status: invoice.status,
        finalizedAt: getServerTimestamp(),
      });
    }

    console.log(`✅ Invoice finalized: ${invoice.id}`);
  } catch (error) {
    console.error("❌ Error handling invoice finalized:", error);
    throw error;
  }
};

/**
 * Handle customer created (for external customer creation)
 */
const handleCustomerCreated = async (customer) => {
  // This would handle customers created outside of our system
  console.log(`External customer created: ${customer.id}`);
};

/**
 * Handle customer updated
 */
const handleCustomerUpdated = async (customer) => {
  if (!customer.metadata?.firebaseId) {
    return; // Not one of our customers
  }

  try {
    // Update user document with any changes from Stripe
    const userRef = db.collection("users").doc(customer.metadata.firebaseId);
    const updateData = {
      stripeCustomerUpdatedAt: getServerTimestamp(),
    };

    await userRef.update(updateData);
    console.log(
      `✅ Updated user ${customer.metadata.firebaseId} from Stripe customer update`
    );
  } catch (error) {
    console.error("❌ Error handling customer updated:", error);
  }
};

/**
 * Handle successful invoice payment
 */
const handleInvoicePaymentSucceeded = async (invoice) => {
  if (!invoice.metadata?.userId) {
    console.warn("Invoice payment succeeded without userId in metadata");
    return;
  }

  try {
    // Create order record for successful payment
    const orderData = {
      userId: invoice.metadata.userId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "paid",
      paymentStatus: "succeeded",
      createdAt: getServerTimestamp(),
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    };

    if (invoice.metadata.orderMetadata) {
      try {
        orderData.metadata = JSON.parse(invoice.metadata.orderMetadata);
      } catch (e) {
        console.warn("Failed to parse order metadata:", e);
      }
    }

    if (invoice.customer) {
      orderData.stripeCustomerId = invoice.customer;
    }

    const orderRef = await db.collection("orders").add(orderData);

    // Update invoice record
    const invoiceQuery = await db
      .collection("invoices")
      .where("invoiceId", "==", invoice.id)
      .limit(1)
      .get();

    if (!invoiceQuery.empty) {
      await invoiceQuery.docs[0].ref.update({
        status: "paid",
        orderId: orderRef.id,
        paidAt: getServerTimestamp(),
      });
    }

    console.log(`✅ Order created for invoice ${invoice.id}: ${orderRef.id}`);
  } catch (error) {
    console.error("❌ Error handling invoice payment succeeded:", error);
    throw error;
  }
};

/**
 * Handle failed invoice payment
 */
const handleInvoicePaymentFailed = async (invoice) => {
  console.log(`❌ Invoice payment failed: ${invoice.id}`);

  try {
    // Update invoice record
    const invoiceQuery = await db
      .collection("invoices")
      .where("invoiceId", "==", invoice.id)
      .limit(1)
      .get();

    if (!invoiceQuery.empty) {
      await invoiceQuery.docs[0].ref.update({
        status: "payment_failed",
        paymentFailedAt: getServerTimestamp(),
      });
    }

    // Log the failure for analytics
    await db.collection("payment_failures").add({
      stripeInvoiceId: invoice.id,
      userId: invoice.metadata?.userId || null,
      amount: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
      createdAt: getServerTimestamp(),
    });
  } catch (error) {
    console.error("❌ Error handling invoice payment failed:", error);
  }
};

module.exports = {
  stripeWebhook,
};
