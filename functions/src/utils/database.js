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
 * Update invoice record status
 */
const updateInvoiceStatus = async (invoiceId, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updatedAt: getServerTimestamp(),
      ...additionalData,
    };

    await db
      .collection("invoices")
      .doc(invoiceId)
      .set(updateData, { merge: true });
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

/**
 * Reduce local stock for multiple items (simplified version)
 * @param {Array} stockItems - Array of {shopifyVariantId, quantity, productName}
 */
const reduceLocalStock = async (stockItems) => {
  console.log(`🔽 Reducing stock for ${stockItems.length} items`);

  for (const item of stockItems) {
    try {
      await changeProductStock(item.shopifyVariantId, -item.quantity);
      console.log(
        `✅ Reduced stock: ${item.productName} (${item.shopifyVariantId}) -${item.quantity}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to reduce stock for ${item.shopifyVariantId}:`,
        error
      );
    }
  }
};

/**
 * Restore local stock for multiple items (simplified version)
 * @param {Array} stockItems - Array of {shopifyVariantId, quantity, productName}
 */
const restoreLocalStock = async (stockItems) => {
  console.log(`🔼 Restoring stock for ${stockItems.length} items`);

  for (const item of stockItems) {
    try {
      await changeProductStock(item.shopifyVariantId, item.quantity);
      console.log(
        `✅ Restored stock: ${item.productName} (${item.shopifyVariantId}) +${item.quantity}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to restore stock for ${item.shopifyVariantId}:`,
        error
      );
    }
  }
};

module.exports = {
  logWebhookEvent,
  updateInvoiceStatus,
  changeProductStock,
  parseOrderMetadata,
  reduceLocalStock,
  restoreLocalStock,
};
