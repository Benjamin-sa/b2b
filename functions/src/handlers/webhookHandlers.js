const {
  notifyInvoiceCreated,
  notifyInvoicePaymentSucceeded,
} = require("../config/telegram");
const {
  createInvoiceRecord,
  updateInvoiceStatus,
  processOrderItemsStock,
  parseOrderMetadata,
} = require("../utils/database");
const {
  notifyStockReduction,
  notifyStockRestoration,
} = require("../services/inventoryWorker");

/**
 * Handle invoice creation
 * This is triggered when a new invoice is created in Stripe
 */
const handleInvoiceCreated = async (invoice) => {
  console.log(`📄 Processing new invoice: ${invoice.id}`);

  try {
    // Create invoice record in database
    const invoiceRecord = await createInvoiceRecord(invoice);

    // Reduce stock for new invoice
    const orderMetadata = parseOrderMetadata(invoice);
    if (orderMetadata?.orderItems) {
      // Update local database stock
      await processOrderItemsStock(orderMetadata.orderItems, 1);

      // Notify Cloudflare worker about stock reduction
      try {
        await notifyStockReduction(orderMetadata.orderItems, {
          orderMetadata: orderMetadata,
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

    // Send Telegram notification with invoice data (metadata contains all needed info)
    await notifyInvoiceCreated(invoice);

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

    // Restore stock for voided invoice
    const orderMetadata = parseOrderMetadata(invoice);
    if (orderMetadata?.orderItems) {
      // Update local database stock
      await processOrderItemsStock(orderMetadata.orderItems, -1);

      // Notify Cloudflare worker about stock restoration
      try {
        await notifyStockRestoration(orderMetadata.orderItems, {
          orderMetadata: orderMetadata,
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

    console.log(`✅ Invoice voided processed: ${invoice.id}`);
  } catch (error) {
    console.error(
      `❌ Error processing invoice voided for ${invoice.id}:`,
      error
    );
    throw error;
  }
};

module.exports = {
  handleInvoiceCreated,
  handleInvoicePaymentSucceeded,
  handleInvoiceVoided,
};
