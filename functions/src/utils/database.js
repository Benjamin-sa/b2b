const { db, getServerTimestamp } = require("../config/firebase");

/**
 * Log webhook events for monitoring and debugging
 */
const logWebhookEvent = async (event, processed = true, error = null) => {
  try {
    const logData = {
      eventType: event.type,
      eventId: event.id,
      processed,
      timestamp: getServerTimestamp(),
    };

    if (error) {
      logData.error = error.message || String(error);
    }

    await db.collection("webhook_logs").add(logData);
    console.log(
      `📝 Logged webhook event: ${event.type} (${
        processed ? "success" : "failed"
      })`
    );
  } catch (logError) {
    console.error(`❌ Failed to log webhook event:`, logError);
    // Don't throw - logging failures shouldn't break the webhook
  }
};

/**
 * Update or create order record
 */
const createOrder = async (paymentIntent) => {
  try {
    const orderData = {
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: "completed",
      paymentStatus: "succeeded",
      createdAt: getServerTimestamp(),
      paidAt: getServerTimestamp(),
    };

    // Add metadata if available
    if (paymentIntent.metadata?.userId) {
      orderData.userId = paymentIntent.metadata.userId;
    }

    if (paymentIntent.metadata?.customerEmail) {
      orderData.customerEmail = paymentIntent.metadata.customerEmail;
    }

    if (paymentIntent.customer) {
      orderData.stripeCustomerId = paymentIntent.customer;
    }

    // Parse any additional order metadata
    if (paymentIntent.metadata?.orderData) {
      try {
        orderData.orderDetails = JSON.parse(paymentIntent.metadata.orderData);
      } catch (e) {
        console.warn("Failed to parse order metadata:", e);
      }
    }

    const orderRef = await db.collection("orders").add(orderData);
    console.log(
      `✅ Order created: ${orderRef.id} for payment ${paymentIntent.id}`
    );

    return { id: orderRef.id, ...orderData };
  } catch (error) {
    console.error("❌ Error creating order:", error);
    throw error;
  }
};

/**
 * Create or update invoice record
 */
const createInvoiceRecord = async (invoice) => {
  try {
    const invoiceData = {
      invoiceId: invoice.id,
      stripeCustomerId: invoice.customer,
      customerEmail: invoice.customer_email,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      createdAt: getServerTimestamp(),
    };

    // Add due date if available
    if (invoice.due_date) {
      invoiceData.dueDate = new Date(invoice.due_date * 1000);
    }

    // Add metadata if available
    if (invoice.metadata?.userId) {
      invoiceData.userId = invoice.metadata.userId;
    }

    const invoiceRef = await db.collection("invoices").add(invoiceData);
    console.log(
      `✅ Invoice record created: ${invoiceRef.id} for Stripe invoice ${invoice.id}`
    );

    return { id: invoiceRef.id, ...invoiceData };
  } catch (error) {
    console.error("❌ Error creating invoice record:", error);
    throw error;
  }
};

/**
 * Update invoice record status
 */
const updateInvoiceStatus = async (invoiceId, status, additionalData = {}) => {
  try {
    const invoiceQuery = await db
      .collection("invoices")
      .where("invoiceId", "==", invoiceId)
      .limit(1)
      .get();

    if (invoiceQuery.empty) {
      console.warn(`Invoice not found in database: ${invoiceId}`);
      return null;
    }

    const updateData = {
      status,
      updatedAt: getServerTimestamp(),
      ...additionalData,
    };

    await invoiceQuery.docs[0].ref.update(updateData);
    console.log(`✅ Updated invoice ${invoiceId} status to ${status}`);

    return updateData;
  } catch (error) {
    console.error("❌ Error updating invoice status:", error);
    throw error;
  }
};

module.exports = {
  logWebhookEvent,
  createOrder,
  createInvoiceRecord,
  updateInvoiceStatus,
};
