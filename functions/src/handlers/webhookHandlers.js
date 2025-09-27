const {
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
} = require("../config/telegram");
const {
  createInvoiceRecord,
  updateInvoiceStatus,
  reduceLocalStock,
  restoreLocalStock,
} = require("../utils/database");
const {
  notifyStockReduction,
  notifyStockRestoration,
} = require("../services/inventoryWorker");

/**
 * Handle invoice sent
 * This is triggered when an invoice is sent in Stripe (has more complete data)
 */
const handleInvoiceSent = async (invoice) => {
  console.log(`📄 Processing sent invoice: ${invoice.id}`);

  try {
    // Create invoice record in database
    const invoiceRecord = await createInvoiceRecord(invoice);

    // Extract stock items directly from invoice line items metadata
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
      `✅ Invoice sent processed successfully: ${invoice.id} → Record: ${invoiceRecord.id}, Stock items: ${stockItems.length}`
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
    // Update invoice status in database
    await updateInvoiceStatus(invoice.id, "paid", {
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    });

    // Send Telegram notification with invoice data (metadata contains all needed info)
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
    // Update invoice status in database
    await updateInvoiceStatus(invoice.id, "voided", {
      voidedAt: new Date(),
    });

    // Extract stock items directly from invoice line items metadata
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
