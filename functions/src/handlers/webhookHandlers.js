const {
  notifyPaymentSuccess,
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
} = require("../config/telegram");
const {
  createOrder,
  createInvoiceRecord,
  updateInvoiceStatus,
} = require("../utils/database");
const {
  getInvoiceDetails,
  getCustomerDetails,
  getPaymentIntentDetails,
  formatCustomerName,
} = require("../utils/stripeHelpers");

/**
 * Handle invoice creation
 * This is triggered when a new invoice is created in Stripe
 */
const handleInvoiceCreated = async (invoice) => {
  console.log(`📄 Processing new invoice: ${invoice.id}`);

  try {
    // Create invoice record in database
    const invoiceRecord = await createInvoiceRecord(invoice);

    // Try to get enriched invoice data from Stripe
    let enrichedInvoiceData = null;
    try {
      enrichedInvoiceData = await getInvoiceDetails(invoice.id);
      console.log(`✅ Retrieved enriched invoice data for ${invoice.id}`);
    } catch (enrichError) {
      console.warn(
        `⚠️ Could not retrieve enriched invoice data: ${enrichError.message}`
      );
      // Continue with basic data - don't fail the whole process
    }

    // Send Telegram notification with enriched data
    await notifyInvoiceCreated(invoice, enrichedInvoiceData);

    console.log(
      `✅ Invoice processed successfully: ${invoice.id} → Record: ${invoiceRecord.id}`
    );
  } catch (error) {
    console.error(
      `❌ Error processing invoice creation for ${invoice.id}:`,
      error
    );
    throw error;
  }
};

/**
 * Handle invoice payment success
 * This is triggered when an invoice is successfully paid
 */
const handleInvoicePaymentSucceeded = async (invoice) => {
  console.log(`💰 Processing invoice payment success: ${invoice.id}`);

  try {
    // Update invoice status in database
    await updateInvoiceStatus(invoice.id, "paid", {
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    });

    // Try to get enriched invoice data from Stripe for better notifications
    let enrichedInvoiceData = null;
    try {
      enrichedInvoiceData = await getInvoiceDetails(invoice.id);
      console.log(
        `✅ Retrieved enriched invoice data for payment notification: ${invoice.id}`
      );
    } catch (enrichError) {
      console.warn(
        `⚠️ Could not retrieve enriched invoice data for payment notification: ${enrichError.message}`
      );
      // Continue with basic data - don't fail the whole process
    }

    // Send Telegram notification with enriched data
    await notifyInvoicePaymentSucceeded(invoice, enrichedInvoiceData);

    console.log(`✅ Invoice payment processed successfully: ${invoice.id}`);
  } catch (error) {
    console.error(
      `❌ Error processing invoice payment for ${invoice.id}:`,
      error
    );
    throw error;
  }
};

/**
 * Handle invoice payment failure
 * This is triggered when an invoice payment fails
 */
const handleInvoicePaymentFailed = async (invoice) => {
  console.log(`❌ Processing invoice payment failure: ${invoice.id}`);

  try {
    // Update invoice status in database
    await updateInvoiceStatus(invoice.id, "payment_failed", {
      paymentFailedAt: new Date(),
    });

    console.log(`✅ Invoice payment failure processed: ${invoice.id}`);
  } catch (error) {
    console.error(
      `❌ Error processing invoice payment failure for ${invoice.id}:`,
      error
    );
    throw error;
  }
};

module.exports = {
  handleInvoiceCreated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
};
