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
    let userId = invoice.metadata?.userId || null;

    if (!userId) {
      const orderDoc = await db.collection("orders").doc(invoice.id).get();
      if (orderDoc.exists && orderDoc.data()?.userId) {
        userId = orderDoc.data().userId;
      }
    }

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
      userId,
      updatedAt: getServerTimestamp(),
    };

    if (invoice.created) {
      invoiceData.createdAt = new Date(invoice.created * 1000);
    }

    if (invoice.due_date) {
      invoiceData.dueDate = new Date(invoice.due_date * 1000);
    }

    if (invoice.status_transitions?.paid_at) {
      invoiceData.paidAt = new Date(invoice.status_transitions.paid_at * 1000);
    }

    if (invoice.customer_address) {
      invoiceData.customerAddress = invoice.customer_address;
    }

    if (invoice.customer_shipping) {
      invoiceData.customerShipping = invoice.customer_shipping;
    }

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
        invoiceData.rawOrderMetadata = invoice.metadata.orderMetadata;
      }
    }

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

    await db
      .collection("invoices")
      .doc(invoice.id)
      .set(
        {
          ...invoiceData,
          createdAt: invoiceData.createdAt || getServerTimestamp(),
        },
        { merge: true }
      );

    console.log(`✅ Invoice record stored for Stripe invoice ${invoice.id}`);

    return { id: invoice.id, ...invoiceData };
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

const mapStripeStatusToOrderStatus = (status) => {
  switch (status) {
    case "paid":
      return "confirmed";
    case "void":
    case "voided":
    case "uncollectible":
      return "cancelled";
    case "open":
    case "sent":
      return "pending";
    case "draft":
      return "draft";
    default:
      return status || "pending";
  }
};

const sumTaxAmounts = (taxAmounts = []) => {
  return taxAmounts.reduce((sum, entry) => sum + (entry?.amount || 0), 0);
};

const convertLineItemToOrderItem = (lineItem) => {
  if (!lineItem) {
    return null;
  }

  const quantity = lineItem.quantity || 0;
  const taxCents = sumTaxAmounts(lineItem.tax_amounts || []);
  const netCents =
    typeof lineItem.amount_excluding_tax === "number"
      ? lineItem.amount_excluding_tax
      : typeof lineItem.amount === "number"
      ? lineItem.amount
      : 0;
  const unitPriceCents =
    quantity > 0 ? Math.round(netCents / quantity) : netCents;

  const metadata = {
    ...(lineItem.metadata || {}),
    stripeInvoiceItemId: lineItem.id,
  };

  if (!metadata.stripePriceId && lineItem.price) {
    metadata.stripePriceId = lineItem.price.id || lineItem.price;
  }

  if (taxCents) {
    metadata.taxCents = taxCents;
  }

  if (Array.isArray(lineItem.tax_amounts) && lineItem.tax_amounts.length > 0) {
    metadata.taxAmounts = lineItem.tax_amounts.map((taxAmount) => ({
      taxRateId: taxAmount.tax_rate,
      amount: taxAmount.amount,
    }));
  }

  const productId = metadata.productId || lineItem.price?.product || null;
  const productName =
    metadata.productName ||
    lineItem.description ||
    lineItem.price?.nickname ||
    "";
  const productSku = metadata.shopifyVariantId || null;

  return {
    productId,
    productName,
    productSku,
    quantity,
    unitPrice: unitPriceCents / 100,
    totalPrice: netCents / 100,
    imageUrl: metadata.imageUrl || null,
    stripeInvoiceItemId: lineItem.id,
    taxCents: taxCents || null,
    metadata,
  };
};

const mapInvoiceLineItemsForOrder = (invoice) => {
  if (!invoice.lines?.data) {
    return [];
  }

  return invoice.lines.data
    .filter((lineItem) => lineItem.metadata?.type !== "shipping")
    .map(convertLineItemToOrderItem)
    .filter(Boolean);
};

const extractShippingInfo = (invoice) => {
  if (!invoice.lines?.data) {
    return {
      shippingLine: null,
      shippingInvoiceItemId: null,
      shippingCents: invoice.metadata?.shippingCostCents ?? null,
      shippingTaxCents: null,
    };
  }

  const shippingLine = invoice.lines.data.find(
    (lineItem) => lineItem.metadata?.type === "shipping"
  );

  if (!shippingLine) {
    return {
      shippingLine: null,
      shippingInvoiceItemId: null,
      shippingCents: invoice.metadata?.shippingCostCents ?? null,
      shippingTaxCents: null,
    };
  }

  const shippingTaxCents = sumTaxAmounts(shippingLine.tax_amounts || []);
  const shippingNetCents =
    typeof shippingLine.amount_excluding_tax === "number"
      ? shippingLine.amount_excluding_tax
      : typeof shippingLine.amount === "number"
      ? shippingLine.amount
      : null;

  return {
    shippingLine,
    shippingInvoiceItemId: shippingLine.id,
    shippingCents: shippingNetCents,
    shippingTaxCents,
  };
};

const removeUndefined = (data) => {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const updateOrderFromInvoice = async (invoice, additionalData = {}) => {
  try {
    const orderRef = db.collection("orders").doc(invoice.id);
    const orderSnap = await orderRef.get();
    const existingOrder = orderSnap.exists ? orderSnap.data() : null;

    let userId = invoice.metadata?.userId || existingOrder?.userId || null;

    const status = mapStripeStatusToOrderStatus(invoice.status);

    const productLineItems = mapInvoiceLineItemsForOrder(invoice);
    const productLineMap = new Map();
    for (const item of productLineItems) {
      if (item?.stripeInvoiceItemId) {
        productLineMap.set(item.stripeInvoiceItemId, item);
      }
    }

    let itemsToPersist = [];
    if (existingOrder?.items?.length) {
      itemsToPersist = existingOrder.items.map((existingItem) => {
        const existingId =
          existingItem.stripeInvoiceItemId ||
          existingItem.metadata?.stripeInvoiceItemId ||
          null;
        const lineData = existingId ? productLineMap.get(existingId) : null;

        if (!lineData) {
          return existingItem;
        }

        return {
          ...existingItem,
          productName: lineData.productName || existingItem.productName,
          productSku:
            lineData.productSku !== undefined
              ? lineData.productSku
              : existingItem.productSku,
          quantity: lineData.quantity,
          unitPrice: lineData.unitPrice,
          totalPrice: lineData.totalPrice,
          imageUrl: lineData.imageUrl || existingItem.imageUrl || null,
          stripeInvoiceItemId: lineData.stripeInvoiceItemId,
          taxCents:
            typeof lineData.taxCents === "number" ? lineData.taxCents : null,
          metadata: {
            ...(existingItem.metadata || {}),
            ...(lineData.metadata || {}),
          },
        };
      });

      for (const [lineId, lineData] of productLineMap.entries()) {
        const alreadyExists = itemsToPersist.some((item) => {
          const itemId =
            item.stripeInvoiceItemId || item.metadata?.stripeInvoiceItemId;
          return itemId === lineId;
        });

        if (!alreadyExists) {
          itemsToPersist.push({
            productId: lineData.productId,
            productName: lineData.productName,
            productSku: lineData.productSku,
            quantity: lineData.quantity,
            unitPrice: lineData.unitPrice,
            totalPrice: lineData.totalPrice,
            imageUrl: lineData.imageUrl || null,
            stripeInvoiceItemId: lineData.stripeInvoiceItemId,
            taxCents:
              typeof lineData.taxCents === "number" ? lineData.taxCents : null,
            metadata: lineData.metadata || {},
          });
        }
      }
    } else {
      itemsToPersist = productLineItems;
    }

    const { shippingInvoiceItemId, shippingCents, shippingTaxCents } =
      extractShippingInfo(invoice);

    const subtotalCents =
      typeof invoice.subtotal === "number" ? invoice.subtotal : null;
    const grandTotalCents =
      typeof invoice.total === "number" ? invoice.total : null;
    const totalTaxCents = Array.isArray(invoice.total_tax_amounts)
      ? invoice.total_tax_amounts.reduce(
          (sum, taxAmount) => sum + (taxAmount?.amount || 0),
          0
        )
      : typeof invoice.tax === "number"
      ? invoice.tax
      : null;

    const shippingNetCents =
      typeof shippingCents === "number"
        ? shippingCents
        : invoice.metadata?.shippingCostCents ?? null;

    const mergedTotals = { ...(existingOrder?.totals || {}) };

    if (subtotalCents !== null) {
      mergedTotals.subtotalCents = subtotalCents;
      mergedTotals.subtotal = subtotalCents / 100;
    }

    if (totalTaxCents !== null) {
      mergedTotals.taxCents = totalTaxCents;
      mergedTotals.tax = totalTaxCents / 100;
    }

    if (shippingNetCents !== null) {
      mergedTotals.shippingCents = shippingNetCents;
      mergedTotals.shipping = shippingNetCents / 100;
    }

    if (shippingTaxCents !== null && shippingTaxCents !== undefined) {
      mergedTotals.shippingTaxCents = shippingTaxCents;
      mergedTotals.shippingTax = shippingTaxCents / 100;
    }

    if (grandTotalCents !== null) {
      mergedTotals.grandTotalCents = grandTotalCents;
      mergedTotals.grandTotal = grandTotalCents / 100;
    }

    const basePayload = {
      userId,
      stripeInvoiceId: invoice.id,
      stripeStatus: invoice.status,
      status,
      stripeNumber: invoice.number || null,
      stripeAmountDueCents: invoice.amount_due,
      stripeAmountPaidCents: invoice.amount_paid,
      invoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdf: invoice.invoice_pdf || null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      stripeCustomerEmail: invoice.customer_email || null,
      updatedAt: getServerTimestamp(),
      metadata: {
        ...(existingOrder?.metadata || {}),
        ...(invoice.metadata || {}),
      },
      stripeShippingInvoiceItemId:
        shippingInvoiceItemId ||
        existingOrder?.stripeShippingInvoiceItemId ||
        null,
      items:
        itemsToPersist && itemsToPersist.length ? itemsToPersist : undefined,
      totals: Object.keys(mergedTotals).length > 0 ? mergedTotals : undefined,
    };

    if (!orderSnap.exists) {
      basePayload.createdAt = getServerTimestamp();
    }

    const finalPayload = removeUndefined({
      ...basePayload,
      ...additionalData,
    });

    await orderRef.set(finalPayload, { merge: true });
    console.log(`✅ Order ${invoice.id} synced from invoice ${invoice.status}`);

    return finalPayload;
  } catch (error) {
    console.error("❌ Error syncing order from invoice:", error);
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
  createInvoiceRecord,
  updateInvoiceStatus,
  changeProductStock,
  parseOrderMetadata,
  reduceLocalStock,
  restoreLocalStock,
  updateOrderFromInvoice,
};
