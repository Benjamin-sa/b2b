/**
 * Service to communicate with the Cloudflare Inventory Worker
 */
const { defineSecret } = require("firebase-functions/params");

// Define secret using Firebase Functions v2 approach (for production)
const inventoryWorkerToken = defineSecret("INVENTORY_WORKER_TOKEN");

// Detect if we're running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

const INVENTORY_WORKER_URL =
  process.env.INVENTORY_WORKER_URL ||
  "https://inventory-service.benkee-sauter.workers.dev";

/**
 * Get inventory worker token - uses .env in emulator, secrets in production
 */
const getInventoryWorkerToken = () => {
  if (isEmulator) {
    // In emulator, use environment variable from .env with _LOCAL suffix
    const token = process.env.INVENTORY_WORKER_TOKEN_LOCAL;
    if (!token) {
      console.warn(
        "INVENTORY_WORKER_TOKEN_LOCAL not found in .env file for emulator"
      );
      return ""; // Return empty string instead of throwing
    }
    return token;
  } else {
    // In production, use Firebase Functions v2 secrets
    return inventoryWorkerToken.value();
  }
};

/**
 * Transfer stock from B2C to B2B for a specific Shopify variant
 * @param {string} shopifyVariantId
 * @param {number} amount
 * @returns {Promise<Object|null>}
 */
const transferStock = async (shopifyVariantId, amount) => {
  if (
    !shopifyVariantId ||
    typeof amount !== "number" ||
    !Number.isFinite(amount)
  ) {
    throw new Error(
      "transferStock requires a shopifyVariantId and numeric amount"
    );
  }

  const payload = {
    shopify_variant_id: shopifyVariantId,
    amount,
  };

  try {
    console.log(
      `📡 Requesting B2B stock transfer: variant=${shopifyVariantId}, amount=${amount}`
    );

    const response = await fetch(
      `${INVENTORY_WORKER_URL}/api/inventory/transfer-b2b`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getInventoryWorkerToken()}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const rawBody = await response.text();
    let parsedBody = JSON.parse(rawBody);

    if (!response.ok) {
      const errorMessage =
        (parsedBody && (parsedBody.error || parsedBody.message)) || rawBody;
      throw new Error(
        `Inventory worker responded with status ${response.status}: ${
          errorMessage || response.statusText
        }`
      );
    }

    console.log(
      `✅ Stock transfer requested successfully for variant ${shopifyVariantId}`
    );

    return parsedBody;
  } catch (error) {
    console.error(`❌ Failed to request stock transfer:`, error);
    throw new Error(
      `Stock transfer failed for variant ${shopifyVariantId}: ${error.message}`
    );
  }
};

/**
 * Send stock update to Cloudflare Worker
 * @param {Array} orderItems - Array of order items with productSku and quantity
 * @param {string} operation - 'reduce' or 'increase'
 * @param {Object} metadata - Additional metadata (orderMetadata, userId)
 * @returns {Promise<Object>} Response from the worker
 */
const sendStockUpdate = async (orderItems, operation, metadata = {}) => {
  try {
    console.log(
      `📡 Sending stock update to worker: ${operation} operation for ${orderItems.length} items`
    );

    // Prepare the payload for each product
    const updates = orderItems.map((item) => ({
      productSku: item.productSku,
      amount: item.quantity,
      operation: operation, // 'reduce' or 'increase'
    }));

    const payload = {
      updates,
      metadata: {
        orderMetadata: JSON.stringify(metadata.orderMetadata || {}),
        userId: metadata.userId || null,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await fetch(
      `${INVENTORY_WORKER_URL}/webhook/stock-update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getInventoryWorkerToken()}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Worker responded with status ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`✅ Stock update sent successfully: ${JSON.stringify(result)}`);

    return result;
  } catch (error) {
    console.error(`❌ Failed to send stock update to worker:`, error);
    throw error;
  }
};

/**
 * Send stock reduction notification to worker (for new invoices)
 * @param {Array} orderItems - Array of order items
 * @param {Object} metadata - Order and user metadata
 */
const notifyStockReduction = async (orderItems, metadata = {}) => {
  return sendStockUpdate(orderItems, "reduce", metadata);
};

/**
 * Send stock restoration notification to worker (for voided invoices)
 * @param {Array} orderItems - Array of order items
 * @param {Object} metadata - Order and user metadata
 */
const notifyStockRestoration = async (orderItems, metadata = {}) => {
  return sendStockUpdate(orderItems, "increase", metadata);
};

module.exports = {
  inventoryWorkerToken, // Export secret for use in function definitions
  transferStock,
  sendStockUpdate,
  notifyStockReduction,
  notifyStockRestoration,
};
