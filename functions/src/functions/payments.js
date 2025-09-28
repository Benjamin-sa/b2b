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

const buildInvoiceItems = async (items, stripe) => {
  const productCache = new Map();
  const priceCache = new Map();
  const invoiceItems = [];
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

    invoiceItems.push({
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
        brand: productData.brand || null,
        unit: productData.unit || null,
        weight: productData.weight ?? null,
        stripePriceId: item.stripePriceId,
        stripeInvoiceItemId: null,
      },
    });
  }

  return { invoiceItems, subtotalCents };
};

const buildInvoiceRecord = ({
  uid,
  customerId,
  finalizedInvoice,
  invoiceItems,
  subtotalCents,
  shippingCostCents,
  taxCents,
  grandTotalCents,
  metadata,
  shippingInvoiceItemId,
}) => {
  return {
    // Core invoice data
    invoiceId: finalizedInvoice.id,
    userId: uid,
    customerId,

    // Stripe invoice details
    stripeInvoiceId: finalizedInvoice.id,
    stripeStatus: finalizedInvoice.status,
    stripeNumber: finalizedInvoice.number || null,
    stripeAmountDueCents: finalizedInvoice.amount_due,
    stripeAmountPaidCents: finalizedInvoice.amount_paid,
    stripeCustomerEmail: finalizedInvoice.customer_email || null,

    // Financial totals
    amount: finalizedInvoice.amount_due,
    currency: finalizedInvoice.currency,
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

    // Invoice line items
    items: invoiceItems,
    shippingAddress: metadata?.shippingAddress || null,
    billingAddress: metadata?.billingAddress || null,
    notes: metadata?.notes || "",
    customerInfo: metadata?.userInfo || null,

    // Invoice URLs and status
    invoiceUrl: finalizedInvoice.hosted_invoice_url,
    hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
    invoicePdf: finalizedInvoice.invoice_pdf || null,
    invoiceNumber: finalizedInvoice.number || null,
    status: finalizedInvoice.status === "paid" ? "confirmed" : "pending",

    // Dates
    dueDate: finalizedInvoice.due_date
      ? new Date(finalizedInvoice.due_date * 1000)
      : null,
    paidAt: finalizedInvoice.status_transitions?.paid_at
      ? new Date(finalizedInvoice.status_transitions.paid_at * 1000)
      : null,
    createdAt: getServerTimestamp(),
    updatedAt: getServerTimestamp(),

    // Additional data
    paymentIntentId:
      typeof finalizedInvoice.payment_intent === "string"
        ? finalizedInvoice.payment_intent
        : finalizedInvoice.payment_intent?.id || null,
    stripeShippingInvoiceItemId: shippingInvoiceItemId || null,
    metadata: metadata || {},
  };
};

const persistInvoiceRecord = async (invoiceRecord) => {
  await db
    .collection("invoices")
    .doc(invoiceRecord.invoiceId)
    .set(invoiceRecord, { merge: true });
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

    const { invoiceItems, subtotalCents } = await buildInvoiceItems(
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
      const invoiceItemsByProductId = new Map(
        invoiceItems.map((item) => [
          item.metadata?.productId || item.productId,
          item,
        ])
      );

      for (const line of productLineItems) {
        const productId = line.metadata?.productId;
        if (!productId) continue;

        const invoiceItem = invoiceItemsByProductId.get(productId);
        if (!invoiceItem) continue;

        invoiceItem.stripeInvoiceItemId = line.id;
        invoiceItem.metadata = {
          ...invoiceItem.metadata,
          stripeInvoiceItemId: line.id,
        };
      }
    }

    const shippingInvoiceItemId = shippingLineItem ? shippingLineItem.id : null;

    const invoiceRecord = buildInvoiceRecord({
      uid: request.auth.uid,
      customerId: stripeCustomerId,
      finalizedInvoice,
      invoiceItems,
      subtotalCents,
      shippingCostCents,
      taxCents,
      grandTotalCents,
      metadata: data.metadata,
      shippingInvoiceItemId,
    });

    await persistInvoiceRecord(invoiceRecord);

    console.log(
      `✅ Invoice created successfully: ${finalizedInvoice.id} → Single record stored in invoices collection`
    );

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
 * Get user's invoices from our Firebase collection
 */
const getUserInvoices = onCall(getFunctionOptions(), async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    // Fetch all invoices for this user from our database
    const invoicesSnapshot = await db
      .collection("invoices")
      .where("userId", "==", request.auth.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const invoices = [];

    invoicesSnapshot.forEach((doc) => {
      const invoiceData = doc.data();

      // Convert Firestore timestamps to milliseconds for frontend
      const invoice = {
        ...invoiceData,
        id: doc.id,
        createdAt: invoiceData.createdAt?.toMillis?.() || invoiceData.createdAt,
        updatedAt: invoiceData.updatedAt?.toMillis?.() || invoiceData.updatedAt,
        dueDate: invoiceData.dueDate?.toMillis?.() || invoiceData.dueDate,
        paidAt: invoiceData.paidAt?.toMillis?.() || invoiceData.paidAt,
      };

      invoices.push(invoice);
    });

    return {
      invoices: invoices,
      total: invoices.length,
      source: "firebase", // Indicate data source
    };
  } catch (error) {
    console.error("Error fetching user invoices from Firebase:", error);
    throw new HttpsError("internal", "Failed to fetch invoices");
  }
});

module.exports = {
  createInvoice,
  getUserInvoices,
};
