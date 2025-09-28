const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { stripeSecretKey, getStripe, isEmulator } = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");
const {
  createInvoiceWithItems,
  getStripePrice,
} = require("../services/stripeServices");

// Configure function options based on environment
const getFunctionOptions = () => {
  const baseOptions = {
    cors: [
      "http://localhost:5173", // Vite dev server
      "https://motordash-cf401.web.app",
      "https://4tparts.com",
    ],
  };

  // Only add secrets in production
  if (!isEmulator) {
    baseOptions.secrets = [stripeSecretKey];
  }

  return baseOptions;
};

const getProductSnapshot = async (productId, cache) => {
  if (cache.has(productId)) {
    return cache.get(productId);
  }

  const productSnap = await db.collection("products").doc(productId).get();
  if (!productSnap.exists) {
    throw new HttpsError(
      "not-found",
      `Product ${productId} is no longer available`
    );
  }

  const productData = { id: productSnap.id, ...productSnap.data() };
  cache.set(productId, productData);
  return productData;
};

const buildOrderItems = async (items, stripe) => {
  const productCache = new Map();
  const priceCache = new Map();
  const orderItems = [];
  let subtotalCents = 0;

  for (const item of items) {
    const productId = item.metadata.productId;
    const productData = await getProductSnapshot(productId, productCache);
    const stripePrice = await getStripePrice(
      stripe,
      item.stripePriceId,
      priceCache
    );

    const unitPriceCents = stripePrice.unit_amount;
    const quantity = item.quantity;
    const lineTotalCents = unitPriceCents * quantity;
    subtotalCents += lineTotalCents;

    orderItems.push({
      productId,
      productName:
        productData.name ||
        item.metadata.productName ||
        stripePrice.nickname ||
        "",
      productSku:
        productData.shopifyVariantId || item.metadata.shopifyVariantId || "",
      quantity,
      unitPrice: unitPriceCents / 100,
      totalPrice: lineTotalCents / 100,
      imageUrl: productData.imageUrl || null,
      stripeInvoiceItemId: null,
      taxCents: null,
      metadata: {
        shopifyVariantId:
          productData.shopifyVariantId || item.metadata.shopifyVariantId || "",
        productName:
          productData.name ||
          item.metadata.productName ||
          stripePrice.nickname ||
          "",
        productId,
        brand: productData.brand || null,
        unit: productData.unit || null,
        weight: productData.weight ?? null,
        stripePriceId: item.stripePriceId,
        stripeInvoiceItemId: null,
        taxCents: null,
      },
    });
  }

  return { orderItems, subtotalCents };
};

const buildOrderRecord = ({
  uid,
  customerId,
  finalizedInvoice,
  orderItems,
  subtotalCents,
  shippingCostCents,
  taxCents,
  grandTotalCents,
  metadata,
  shippingInvoiceItemId,
}) => {
  return {
    userId: uid,
    customerId,
    stripeInvoiceId: finalizedInvoice.id,
    stripeStatus: finalizedInvoice.status,
    stripeNumber: finalizedInvoice.number || null,
    stripeAmountDueCents: finalizedInvoice.amount_due,
    stripeAmountPaidCents: finalizedInvoice.amount_paid,
    totals: {
      subtotal: subtotalCents / 100,
      subtotalCents,
      tax: taxCents / 100,
      taxCents,
      shipping: shippingCostCents / 100,
      shippingCents: shippingCostCents,
      grandTotal: grandTotalCents / 100,
      grandTotalCents,
    },
    items: orderItems,
    shippingAddress: metadata?.shippingAddress || null,
    billingAddress: metadata?.billingAddress || null,
    notes: metadata?.notes || "",
    customerInfo: metadata?.userInfo || null,
    invoiceUrl: finalizedInvoice.hosted_invoice_url,
    invoicePdf: finalizedInvoice.invoice_pdf || null,
    dueDate: finalizedInvoice.due_date
      ? new Date(finalizedInvoice.due_date * 1000)
      : null,
    paidAt: finalizedInvoice.status_transitions?.paid_at
      ? new Date(finalizedInvoice.status_transitions.paid_at * 1000)
      : null,
    paymentIntentId:
      typeof finalizedInvoice.payment_intent === "string"
        ? finalizedInvoice.payment_intent
        : finalizedInvoice.payment_intent?.id || null,
    status: finalizedInvoice.status === "paid" ? "confirmed" : "pending",
    stripeCustomerEmail: finalizedInvoice.customer_email || null,
    createdAt: getServerTimestamp(),
    updatedAt: getServerTimestamp(),
    stripeShippingInvoiceItemId: shippingInvoiceItemId || null,
  };
};

const persistOrderRecords = async ({
  finalizedInvoice,
  orderRecord,
  orderItems,
  metadata,
  subtotalCents,
  taxCents,
  shippingCostCents,
  grandTotalCents,
  shippingInvoiceItemId,
}) => {
  await db.collection("orders").doc(finalizedInvoice.id).set(orderRecord);

  await db
    .collection("invoices")
    .doc(finalizedInvoice.id)
    .set(
      {
        invoiceId: finalizedInvoice.id,
        orderId: finalizedInvoice.id,
        userId: orderRecord.userId,
        customerId: orderRecord.customerId,
        items: orderItems,
        metadata: metadata || {},
        amount: finalizedInvoice.amount_due,
        currency: finalizedInvoice.currency,
        status: finalizedInvoice.status,
        invoiceNumber: finalizedInvoice.number || null,
        createdAt: getServerTimestamp(),
        updatedAt: getServerTimestamp(),
        dueDate: finalizedInvoice.due_date
          ? new Date(finalizedInvoice.due_date * 1000)
          : null,
        invoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoicePdf: finalizedInvoice.invoice_pdf || null,
        totals: {
          subtotal: subtotalCents / 100,
          tax: taxCents / 100,
          shipping: shippingCostCents / 100,
          grandTotal: grandTotalCents / 100,
          subtotalCents,
          taxCents,
          shippingCents: shippingCostCents,
          grandTotalCents,
        },
        stripeShippingInvoiceItemId: shippingInvoiceItemId || null,
      },
      { merge: true }
    );
};

/**
 * Create invoice for B2B payments
 */
const createInvoice = onCall(getFunctionOptions(), async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const data = request.data;

  try {
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Items array is required and cannot be empty"
      );
    }

    for (const item of data.items) {
      if (!item.stripePriceId || !item.quantity || item.quantity < 1) {
        throw new HttpsError(
          "invalid-argument",
          "Each item must have a valid stripePriceId and quantity"
        );
      }

      if (!item.metadata || !item.metadata.shopifyVariantId) {
        throw new HttpsError(
          "invalid-argument",
          "Each item must have metadata with shopifyVariantId"
        );
      }

      if (!item.metadata.productId) {
        throw new HttpsError(
          "invalid-argument",
          "Each item must include metadata with productId"
        );
      }
    }

    const stripe = getStripe();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    if (!userData.stripeCustomerId) {
      throw new HttpsError(
        "failed-precondition",
        "User must have a Stripe customer ID"
      );
    }

    const stripeCustomerId = userData.stripeCustomerId;

    const { orderItems, subtotalCents } = await buildOrderItems(
      data.items,
      stripe
    );

    const shippingCostCents =
      typeof data.shippingCost === "number" &&
      Number.isFinite(data.shippingCost)
        ? Math.max(0, data.shippingCost)
        : 0;

    const providedTaxCents =
      typeof data.taxAmount === "number" && Number.isFinite(data.taxAmount)
        ? data.taxAmount
        : null;

    const taxCents = providedTaxCents ?? 0;

    const grandTotalCents = subtotalCents + shippingCostCents + taxCents;

    const { finalizedInvoice, productLineItems, shippingLineItem } =
      await createInvoiceWithItems({
        stripe,
        customerId: stripeCustomerId,
        uid: request.auth.uid,
        items: data.items,
        shippingCostCents,
        notes: data.metadata?.notes,
      });

    if (Array.isArray(productLineItems) && productLineItems.length > 0) {
      const orderItemsByProductId = new Map(
        orderItems.map((item) => [
          item.metadata?.productId || item.productId,
          item,
        ])
      );

      for (const line of productLineItems) {
        const productId = line.metadata?.productId;
        if (!productId) continue;

        const orderItem = orderItemsByProductId.get(productId);
        if (!orderItem) continue;

        orderItem.stripeInvoiceItemId = line.id;
        orderItem.metadata = {
          ...orderItem.metadata,
          stripeInvoiceItemId: line.id,
        };
      }
    }

    const shippingInvoiceItemId = shippingLineItem ? shippingLineItem.id : null;

    const orderRecord = buildOrderRecord({
      uid: request.auth.uid,
      customerId: stripeCustomerId,
      finalizedInvoice,
      orderItems,
      subtotalCents,
      shippingCostCents,
      taxCents,
      grandTotalCents,
      metadata: data.metadata,
      shippingInvoiceItemId,
    });

    await persistOrderRecords({
      finalizedInvoice,
      orderRecord,
      orderItems,
      metadata: data.metadata,
      subtotalCents,
      taxCents,
      shippingCostCents,
      grandTotalCents,
      shippingInvoiceItemId,
    });

    return {
      invoiceId: finalizedInvoice.id,
      invoiceUrl: finalizedInvoice.hosted_invoice_url,
      amount: finalizedInvoice.amount_due,
      currency: finalizedInvoice.currency,
    };
  } catch (error) {
    console.error("Error creating invoice:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to create invoice");
  }
});

/**
 * Get user's invoices directly from Stripe using customer ID
 */
const getUserInvoices = onCall(getFunctionOptions(), async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    // Initialize Stripe with error handling
    const stripe = getStripe();
    // Get user's Stripe customer ID
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    if (!userData.stripeCustomerId) {
      throw new HttpsError(
        "failed-precondition",
        "User must have a Stripe customer ID"
      );
    }

    // Fetch all invoices for this customer directly from Stripe
    const stripeInvoices = await stripe.invoices.list({
      customer: userData.stripeCustomerId,
      limit: 100, // Adjust as needed
      expand: ["data.payment_intent"], // Get payment details
    });

    const invoices = [];

    for (const stripeInvoice of stripeInvoices.data) {
      try {
        // Parse metadata if it exists
        let orderMetadata = {};
        try {
          orderMetadata = JSON.parse(
            stripeInvoice.metadata.orderMetadata || "{}"
          );
        } catch (e) {
          console.warn("Failed to parse order metadata:", e);
        }

        // Get invoice items (line items) with metadata
        const lineItems = stripeInvoice.lines.data.map((item) => ({
          stripePriceId: item.price.id,
          productName:
            item.metadata?.productName ||
            item.description ||
            item.price.nickname ||
            "Unknown Product",
          quantity: item.quantity,
          unitPrice: item.price.unit_amount,
          totalPrice: item.amount,
          metadata: {
            shopifyVariantId: item.metadata?.shopifyVariantId || "",
            productName: item.metadata?.productName || "",
            productId: item.metadata?.productId || "",
          },
        }));

        invoices.push({
          id: stripeInvoice.id, // Use Stripe invoice ID as primary ID
          invoiceId: stripeInvoice.id,
          amount: stripeInvoice.amount_due,
          amountPaid: stripeInvoice.amount_paid,
          currency: stripeInvoice.currency,
          status: stripeInvoice.status,
          paid: stripeInvoice.paid,
          createdAt: stripeInvoice.created * 1000, // Convert Unix timestamp
          dueDate: stripeInvoice.due_date
            ? stripeInvoice.due_date * 1000
            : null,
          paidAt: stripeInvoice.status_transitions?.paid_at
            ? stripeInvoice.status_transitions.paid_at * 1000
            : null,
          invoiceUrl: stripeInvoice.hosted_invoice_url,
          invoicePdf: stripeInvoice.invoice_pdf,
          number: stripeInvoice.number,
          subtotal: stripeInvoice.subtotal,
          tax: stripeInvoice.tax || 0,
          total: stripeInvoice.total,
          // Include order metadata
          orderMetadata: orderMetadata,
          // Items from Stripe
          items: lineItems,
          // Additional Stripe data
          attempt_count: stripeInvoice.attempt_count,
          attempted: stripeInvoice.attempted,
          auto_advance: stripeInvoice.auto_advance,
          collection_method: stripeInvoice.collection_method,
        });
      } catch (itemError) {
        throw new HttpsError(
          "OrderMetadataError",
          "Failed to process order metadata"
        );
      }
    }

    return {
      invoices: invoices,
      total: invoices.length,
      source: "stripe", // Indicate data source
    };
  } catch (error) {
    console.error("Error fetching user invoices from Stripe:", error);
    throw new HttpsError("internal", "Failed to fetch invoices from Stripe");
  }
});

module.exports = {
  createInvoice,
  getUserInvoices,
};
