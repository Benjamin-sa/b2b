const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { stripeSecretKey, getStripe } = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");
const {
  createStripeProductWithPrice,
  updateStripeProduct,
  replaceStripePrice,
  archiveStripeProduct,
} = require("../services/stripeServices");
const {
  inventoryWorkerToken,
  transferStock,
} = require("../services/inventoryWorker");

/**
 * Create product in Stripe when a product document is created
 */
const onProductCreate = onDocumentCreated(
  {
    document: "products/{productId}",
    secrets: [stripeSecretKey, inventoryWorkerToken],
  },
  async (event) => {
    const stripe = getStripe();

    const snap = event.data;
    if (!snap) return;

    const productData = snap.data();
    const productId = event.params.productId;

    try {
      const { stripeProduct, stripePrice } = await createStripeProductWithPrice(
        stripe,
        productData,
        productId
      );

      await snap.ref.update({
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        // Don't update updatedAt here to avoid triggering onProductUpdate unnecessarily
      });

      if (
        productData.shopifyVariantId &&
        typeof productData.stock === "number"
      ) {
        try {
          await transferStock(productData.shopifyVariantId, productData.stock);
        } catch (workerError) {
          console.error(
            "Inventory worker transfer (create) failed:",
            workerError
          );
        }
      }

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
    secrets: [stripeSecretKey, inventoryWorkerToken],
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
        await updateStripeProduct(stripe, newData, productId);
      }

      if (newData.price !== oldData.price) {
        const newPriceId = await replaceStripePrice(stripe, newData, productId);

        await change.after.ref.update({
          stripePriceId: newPriceId,
          updatedAt: getServerTimestamp(),
        });
      }

      const variantId = newData.shopifyVariantId;
      const stock = typeof newData.stock === "number" ? newData.stock : null;
      const stockChanged = stock !== null && stock !== oldData.stock;
      const variantChanged =
        variantId && variantId !== oldData.shopifyVariantId;

      if (variantId && stock !== null && (stockChanged || variantChanged)) {
        try {
          await transferStock(variantId, stock);
        } catch (workerError) {
          console.error(
            "Inventory worker transfer (update) failed:",
            workerError
          );
        }
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
      await archiveStripeProduct(stripe, productData, productId);

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
