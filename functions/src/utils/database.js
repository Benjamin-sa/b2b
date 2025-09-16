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
 * Create or update invoice record
 */
const createInvoiceRecord = async (invoice) => {
  try {
    const invoiceData = {
      invoiceId: invoice.id,
      stripeCustomerId: invoice.customer,
      customerEmail: invoice.customer_email,
      customerName: invoice.customer_name,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      invoiceNumber: invoice.number,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
      createdAt: getServerTimestamp(),
    };

    // Add due date if available
    if (invoice.due_date) {
      invoiceData.dueDate = new Date(invoice.due_date * 1000);
    }

    // Add payment dates if available
    if (invoice.status_transitions?.paid_at) {
      invoiceData.paidAt = new Date(invoice.status_transitions.paid_at * 1000);
    }

    // Add customer address if available
    if (invoice.customer_address) {
      invoiceData.customerAddress = invoice.customer_address;
    }

    // Add customer shipping if available
    if (invoice.customer_shipping) {
      invoiceData.customerShipping = invoice.customer_shipping;
    }

    // Add metadata if available
    if (invoice.metadata?.userId) {
      invoiceData.userId = invoice.metadata.userId;
    }

    // Parse and store order metadata if available
    if (invoice.metadata?.orderMetadata) {
      try {
        const orderMetadata = JSON.parse(invoice.metadata.orderMetadata);
        invoiceData.orderDetails = orderMetadata;
        console.log(`✅ Parsed order metadata for invoice ${invoice.id}`);
      } catch (parseError) {
        console.warn(
          `⚠️ Failed to parse order metadata for invoice ${invoice.id}:`,
          parseError
        );
        // Store raw metadata as fallback
        invoiceData.rawOrderMetadata = invoice.metadata.orderMetadata;
      }
    }

    // Store invoice line items
    if (invoice.lines?.data) {
      invoiceData.lineItems = invoice.lines.data.map((item) => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        description: item.description,
        quantity: item.quantity,
        metadata: item.metadata,
      }));
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

/**
 * Change product stock
 * @param {string} productSku - The product SKU
 * @param {number} quantityChange - Positive to add, negative to subtract
 */
const changeProductStock = async (productSku, quantityChange) => {
  try {
    const productQuery = await db
      .collection("products")
      .where("shopifyVariantId", "==", productSku)
      .limit(1)
      .get();

    if (productQuery.empty) {
      console.warn(`Product not found with SKU: ${productSku}`);
      return null;
    }

    const productDoc = productQuery.docs[0];
    const currentProduct = productDoc.data();
    const currentStock = currentProduct.stock || 0;
    const newStock = Math.max(0, currentStock + quantityChange);

    await productDoc.ref.update({
      stock: newStock,
      inStock: newStock > 0,
      updatedAt: getServerTimestamp(),
    });

    console.log(
      `✅ Stock updated for ${productSku}: ${currentStock} → ${newStock} (${
        quantityChange > 0 ? "+" : ""
      }${quantityChange})`
    );

    return {
      productId: productDoc.id,
      productName: currentProduct.name,
      previousStock: currentStock,
      newStock,
      quantityChanged: quantityChange,
    };
  } catch (error) {
    console.error(`❌ Error changing stock for product ${productSku}:`, error);
    throw error;
  }
};

/**
 * Process order items for stock changes
 * @param {Array} orderItems - Array of order items
 * @param {number} multiplier - 1 to reduce stock, -1 to restore stock
 */
const processOrderItemsStock = async (orderItems, multiplier) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return [];
  }

  const results = [];
  console.log(`🔄 Processing stock for ${orderItems.length} items`);

  for (const item of orderItems) {
    if (!item.productSku || !item.quantity) {
      console.warn(`⚠️ Missing productSku or quantity:`, item);
      continue;
    }

    try {
      const quantityChange = item.quantity * multiplier * -1;
      const stockResult = await changeProductStock(
        item.productSku,
        quantityChange
      );

      if (stockResult) {
        results.push({ ...stockResult, success: true });
        console.log(
          `✅ ${item.productName || "Unknown"} (${item.productSku}): ${
            quantityChange > 0 ? "+" : ""
          }${quantityChange}`
        );
      } else {
        results.push({
          productSku: item.productSku,
          error: "Product not found",
          success: false,
        });
      }
    } catch (stockError) {
      results.push({
        productSku: item.productSku,
        error: stockError.message,
        success: false,
      });
      console.error(
        `❌ Failed stock update for ${item.productSku}:`,
        stockError
      );
    }
  }

  const successful = results.filter((r) => r.success).length;
  console.log(
    `📊 Stock processing: ${successful}/${results.length} successful`
  );
  return results;
};

/**
 * Parse order metadata from invoice
 * @param {Object} invoice - The Stripe invoice object
 * @returns {Object|null} Parsed order metadata or null if not available/invalid
 */
const parseOrderMetadata = (invoice) => {
  if (!invoice.metadata?.orderMetadata) {
    console.warn(`⚠️ No orderMetadata found for invoice ${invoice.id}`);
    return null;
  }

  try {
    const orderMetadata = JSON.parse(invoice.metadata.orderMetadata);

    if (!orderMetadata.orderItems || !Array.isArray(orderMetadata.orderItems)) {
      console.warn(
        `⚠️ No valid orderItems found in orderMetadata for invoice ${invoice.id}`
      );
      return null;
    }

    return orderMetadata;
  } catch (parseError) {
    console.error(
      `❌ Failed to parse orderMetadata for invoice ${invoice.id}:`,
      parseError
    );
    return null;
  }
};

module.exports = {
  logWebhookEvent,
  createInvoiceRecord,
  updateInvoiceStatus,
  changeProductStock,
  processOrderItemsStock,
  parseOrderMetadata,
};
