const {
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
} = require("../config/telegram");
const {
  updateInvoiceStatus,
  reduceLocalStock,
  restoreLocalStock,
} = require("../utils/database");
const {
  notifyStockReduction,
  notifyStockRestoration,
} = require("../services/inventoryWorker");

/**
 * Extract stock items from invoice line items
 */
const extractStockItems = (invoice) => {
  const stockItems = [];
  if (invoice.lines?.data) {
    for (const lineItem of invoice.lines.data) {
      const shopifyVariantId = lineItem.metadata?.shopifyVariantId;
      if (shopifyVariantId && lineItem.quantity) {
        stockItems.push({
          shopifyVariantId,
          quantity: lineItem.quantity,
          productName:
            lineItem.metadata?.productName ||
            lineItem.description ||
            "Unknown Product",
        });
      }
    }
  }
  return stockItems;
};

/**
 * Handle invoice sent
 * This is triggered when an invoice is sent in Stripe (has more complete data)
 */
const handleInvoiceSent = async (invoice) => {
  console.log(`📄 Processing sent invoice: ${invoice.id}`);

  try {
    // Update invoice status to sent
    await updateInvoiceStatus(invoice.id, "sent", {
      sentAt: new Date(),
      status: "pending",
    });

    // Extract and process stock items
    const stockItems = extractStockItems(invoice);

    if (stockItems.length > 0) {
      // Update local Firebase stock
      await reduceLocalStock(stockItems);

      // Notify Cloudflare worker about stock reduction
      try {
        await notifyStockReduction(stockItems, {
          invoiceId: invoice.id,
          userId: invoice.metadata?.userId,
        });
      } catch (workerError) {
        console.error(
          `⚠️ Failed to notify worker about stock reduction:`,
          workerError
        );
        // Don't throw - worker notification failure shouldn't break the invoice processing
      }
    }

    // Send Telegram notification
    await notifyInvoiceCreated(invoice);

    console.log(
      `✅ Invoice sent processed successfully: ${invoice.id}, Stock items: ${stockItems.length}`
    );
  } catch (error) {
    console.error(`❌ Error processing invoice sent for ${invoice.id}:`, error);
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
    // Update invoice status to paid
    await updateInvoiceStatus(invoice.id, "paid", {
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      status: "confirmed",
      stripeAmountPaidCents: invoice.amount_paid,
      paymentIntentId:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : invoice.payment_intent?.id || null,
    });

    // Send Telegram notification
    await notifyInvoicePaymentSucceeded(invoice);

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
 * Handle invoice voided/marked uncollectible
 * This is triggered when an invoice payment fails or is voided
 */
const handleInvoiceVoided = async (invoice) => {
  console.log(`❌ Processing invoice voided: ${invoice.id}`);

  try {
    // Update invoice status to cancelled
    await updateInvoiceStatus(invoice.id, "voided", {
      voidedAt: new Date(),
      status: "cancelled",
      cancelledAt: new Date(),
    });

    // Extract and restore stock items
    const stockItems = extractStockItems(invoice);

    if (stockItems.length > 0) {
      // Restore local Firebase stock
      await restoreLocalStock(stockItems);

      // Notify Cloudflare worker about stock restoration
      try {
        await notifyStockRestoration(stockItems, {
          invoiceId: invoice.id,
          userId: invoice.metadata?.userId,
        });
      } catch (workerError) {
        console.error(
          `⚠️ Failed to notify worker about stock restoration:`,
          workerError
        );
        // Don't throw - worker notification failure shouldn't break the invoice processing
      }
    }

    console.log(
      `✅ Invoice voided processed: ${invoice.id}, Stock items restored: ${stockItems.length}`
    );
  } catch (error) {
    console.error(
      `❌ Error processing invoice voided for ${invoice.id}:`,
      error
    );
    throw error;
  }
};

module.exports = {
  handleInvoiceSent,
  handleInvoicePaymentSucceeded,
  handleInvoiceVoided,
};
