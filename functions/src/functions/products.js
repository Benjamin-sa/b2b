const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { stripeSecretKey, getStripe } = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");

/**
 * Create product in Stripe when a product document is created
 */
const onProductCreate = onDocumentCreated(
  {
    document: "products/{productId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const snap = event.data;
    if (!snap) return;

    const productData = snap.data();
    const productId = event.params.productId;

    try {
      const stripeProduct = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        images:
          productData.images && productData.images.length > 0
            ? [productData.images[0]]
            : [],
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
        metadata: { firebaseId: productId },
      });

      await snap.ref.update({
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        // Don't update updatedAt here to avoid triggering onProductUpdate unnecessarily
      });

      console.log(
        `✅ Created Stripe product ${stripeProduct.id} for Firebase product ${productId}`
      );
    } catch (error) {
      console.error(
        `❌ Error creating Stripe product for ${productId}:`,
        error.message
      );

      // Update document with error info
      await snap.ref
        .update({
          stripeError: error.message,
          stripeErrorAt: getServerTimestamp(),
        })
        .catch((updateError) => {
          console.error(`Failed to update document with error:`, updateError);
        });
    }
  }
);

/**
 * Update product in Stripe when a product document is updated
 */
const onProductUpdate = onDocumentUpdated(
  {
    document: "products/{productId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const change = event.data;
    if (!change?.before || !change?.after) return;

    const newData = change.after.data();
    const oldData = change.before.data();
    const productId = event.params.productId;

    try {
      const productChanged =
        newData.name !== oldData.name ||
        newData.description !== oldData.description ||
        JSON.stringify(newData.images) !== JSON.stringify(oldData.images) ||
        newData.category !== oldData.category ||
        newData.brand !== oldData.brand ||
        newData.partNumber !== oldData.partNumber ||
        newData.shopifyProductId !== oldData.shopifyProductId ||
        newData.shopifyVariantId !== oldData.shopifyVariantId;

      if (productChanged) {
        await stripe.products.update(newData.stripeProductId, {
          name: newData.name,
          description: newData.description,
          images:
            newData.images && newData.images.length > 0
              ? [newData.images[0]]
              : [],
          metadata: {
            firebaseId: productId,
            category: newData.category || "",
            brand: newData.brand || "",
            partNumber: newData.partNumber || "",
            shopifyProductId: newData.shopifyProductId || "",
            shopifyVariantId: newData.shopifyVariantId || "",
          },
        });
      }

      if (newData.price !== oldData.price) {
        const newPriceInCents = Math.round(newData.price * 100);

        await stripe.prices.update(newData.stripePriceId, { active: false });

        const newPrice = await stripe.prices.create({
          product: newData.stripeProductId,
          unit_amount: newPriceInCents,
          currency: "eur",
          metadata: { firebaseId: productId },
        });

        await change.after.ref.update({
          stripePriceId: newPrice.id,
          updatedAt: getServerTimestamp(),
        });
      }

      console.log(
        `✅ Updated Stripe product ${newData.stripeProductId} for Firebase product ${productId}`
      );
    } catch (error) {
      console.error(
        `❌ Error updating Stripe product for ${productId}:`,
        error.message
      );

      // Update document with error info
      await change.after.ref
        .update({
          stripeError: error.message,
          stripeErrorAt: getServerTimestamp(),
        })
        .catch((updateError) => {
          console.error(`Failed to update document with error:`, updateError);
        });
    }
  }
);

/**
 * Archive product in Stripe when a product document is deleted
 */
const onProductDelete = onDocumentDeleted(
  {
    document: "products/{productId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const snap = event.data;
    if (!snap) return;

    const productData = snap.data();
    const productId = event.params.productId;

    try {
      await stripe.prices.update(productData.stripePriceId, {
        active: false,
      });

      await stripe.products.update(productData.stripeProductId, {
        active: false,
      });

      console.log(
        `✅ Archived Stripe product ${productData.stripeProductId} for deleted Firebase product ${productId}`
      );
    } catch (error) {
      console.error(
        `❌ Error archiving Stripe product for ${productId}:`,
        error.message
      );

      // Store cleanup error for manual intervention
      await db
        .collection("stripe_cleanup_errors")
        .add({
          productId,
          stripeProductId: productData.stripeProductId,
          stripePriceId: productData.stripePriceId,
          error: error.message,
          errorType: error.type || "unknown",
          createdAt: getServerTimestamp(),
        })
        .catch((logError) => {
          console.error(`Failed to log cleanup error:`, logError);
        });
    }
  }
);

module.exports = {
  onProductCreate,
  onProductUpdate,
  onProductDelete,
};
