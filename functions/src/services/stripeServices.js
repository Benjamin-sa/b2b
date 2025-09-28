const { HttpsError } = require("firebase-functions/v2/https");

// Invoice helpers ---------------------------------------------------------

const createInvoiceWithItems = async ({
  stripe,
  customerId,
  uid,
  items,
  shippingCostCents,
  notes,
}) => {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 10,
    description: notes || "Bestelling via 4Tparts B2B",
    automatic_tax: {
      enabled: true,
    },
    metadata: {
      userId: uid,
      source: "b2b_order",
    },
  });

  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      price: item.stripePriceId,
      quantity: item.quantity,
      metadata: {
        shopifyVariantId: item.metadata.shopifyVariantId,
        productName: item.metadata.productName || "",
        productId: item.metadata.productId || "",
      },
    });
  }

  if (shippingCostCents > 0) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: shippingCostCents,
      currency: "eur",
      tax_behavior: "exclusive",
      tax_code: "txcd_92010001",
      description: "Verzendkosten",
      metadata: {
        type: "shipping",
      },
    });
  }

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    expand: ["lines.data.tax_amounts", "lines.data.price"],
  });
  await stripe.invoices.sendInvoice(invoice.id);

  const invoiceLines = finalizedInvoice?.lines?.data || [];
  const productLineItems = invoiceLines.filter(
    (line) => line.metadata && line.metadata.productId
  );
  const shippingLineItem =
    invoiceLines.find(
      (line) => line.metadata && line.metadata.type === "shipping"
    ) || null;

  return {
    finalizedInvoice,
    productLineItems,
    shippingLineItem,
  };
};

// Pricing helpers ---------------------------------------------------------

const getStripePrice = async (stripe, priceId, cache) => {
  if (cache?.has(priceId)) {
    return cache.get(priceId);
  }

  const price = await stripe.prices.retrieve(priceId);
  if (!price || typeof price.unit_amount !== "number") {
    throw new HttpsError(
      "failed-precondition",
      `Stripe price ${priceId} is not configured with a fixed unit amount`
    );
  }

  if (cache) {
    cache.set(priceId, price);
  }

  return price;
};

// Product helpers ---------------------------------------------------------

const createStripeProductWithPrice = async (stripe, productData, productId) => {
  const stripeProduct = await stripe.products.create({
    name: productData.name,
    description: productData.description,
    images:
      productData.images && productData.images.length > 0
        ? [productData.images[0]]
        : [],
    tax_code: "txcd_99999999",
    metadata: {
      firebaseId: productId,
      category: productData.category || "",
      brand: productData.brand || "",
      partNumber: productData.partNumber || "",
      shopifyProductId: productData.shopifyProductId || "",
      shopifyVariantId: productData.shopifyVariantId || "",
    },
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(productData.price * 100),
    currency: "eur",
    tax_behavior: "exclusive",
    metadata: { firebaseId: productId },
  });

  return { stripeProduct, stripePrice };
};

const updateStripeProduct = async (stripe, newData, productId) => {
  await stripe.products.update(newData.stripeProductId, {
    name: newData.name,
    description: newData.description,
    images:
      newData.images && newData.images.length > 0 ? [newData.images[0]] : [],
    tax_code: "txcd_99999999",
    tax_behavior: "exclusive",
    metadata: {
      firebaseId: productId,
      category: newData.category || "",
      brand: newData.brand || "",
      partNumber: newData.partNumber || "",
      shopifyProductId: newData.shopifyProductId || "",
      shopifyVariantId: newData.shopifyVariantId || "",
    },
  });

  return true;
};

const replaceStripePrice = async (stripe, productData, productId) => {
  const newPriceInCents = Math.round(productData.price * 100);

  if (!productData.stripePriceId) {
    throw new HttpsError(
      "failed-precondition",
      `Product ${productId} is missing stripePriceId`
    );
  }

  await stripe.prices.update(productData.stripePriceId, { active: false });

  const newPrice = await stripe.prices.create({
    product: productData.stripeProductId,
    unit_amount: newPriceInCents,
    currency: "eur",
    metadata: { firebaseId: productId },
  });

  return newPrice.id;
};

const archiveStripeProduct = async (stripe, productData) => {
  if (productData.stripePriceId) {
    await stripe.prices.update(productData.stripePriceId, {
      active: false,
    });
  }

  if (productData.stripeProductId) {
    await stripe.products.update(productData.stripeProductId, {
      active: false,
    });
  }
};

// Customer helpers --------------------------------------------------------

const createStripeCustomer = async (stripe, customerData) => {
  return stripe.customers.create(customerData);
};

const updateStripeCustomer = async (stripe, customerId, updateData) => {
  return stripe.customers.update(customerId, updateData);
};

const archiveStripeCustomer = async (stripe, customerId, metadata = {}) => {
  return stripe.customers.update(customerId, {
    metadata: {
      deleted: "true",
      deletedAt: new Date().toISOString(),
      ...metadata,
    },
  });
};

module.exports = {
  createInvoiceWithItems,
  getStripePrice,
  createStripeProductWithPrice,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
  createStripeCustomer,
  updateStripeCustomer,
  archiveStripeCustomer,
};
