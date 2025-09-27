const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { stripeSecretKey, getStripe } = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");

// Note: Welcome email is now handled by the separate welcomeEmail function
// This function focuses only on Stripe customer creation

/**
 * Convert country name to ISO country code for Stripe
 */
const getCountryCode = (countryName) => {
  const countryMap = {
    Belgium: "BE",
    Netherlands: "NL",
    France: "FR",
    Germany: "DE",
    Luxembourg: "LU",
    "United Kingdom": "GB",
    "United States": "US",
  };

  return countryMap[countryName] || countryName.toUpperCase().slice(0, 2);
};

/**
 * Create Stripe customer when a user document is created
 */
const onUserCreate = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const snap = event.data;
    if (!snap) return;

    const userData = snap.data();
    const userId = event.params.userId;

    try {
      // Create customer data object with proper Stripe field mapping
      const customerData = {
        email: userData.email,
        name:
          `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
          userData.email,
        metadata: {
          firebaseId: userId,
          companyName: userData.companyName || "",
        },
      };

      // Add phone if available
      if (userData.phone) {
        customerData.phone = userData.phone;
      }

      // Map address when present (expects address map with street, houseNumber, postalCode, city, country)
      if (userData.address) {
        customerData.address = {
          line1: `${userData.address.street || ""} ${
            userData.address.houseNumber || ""
          }`.trim(),
          postal_code: userData.address.postalCode || "",
          city: userData.address.city || "",
          country: getCountryCode(userData.address.country || ""),
        };

        // add shipping (B2B: same as billing)
        customerData.shipping = {
          name: customerData.name,
          address: { ...customerData.address },
        };
      }

      // Add VAT / tax id when provided (Stripe expects tax_id_data array for EU VAT)
      if (userData.btwNumber) {
        customerData.tax_id_data = [
          {
            type: "eu_vat",
            value: userData.btwNumber,
          },
        ];
      }

      const stripeCustomer = await stripe.customers.create(customerData);

      await snap.ref.update({
        stripeCustomerId: stripeCustomer.id,
        stripeCustomerCreatedAt: getServerTimestamp(),
      });

      console.log(
        `✅ Created Stripe customer ${stripeCustomer.id} for user ${userId}`
      );
    } catch (error) {
      console.error("❌ Error creating Stripe customer:", error);

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
 * Update Stripe customer when user data is updated
 */
const onUserUpdate = onDocumentUpdated(
  {
    document: "users/{userId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const change = event.data;
    if (!change?.before || !change?.after) return;

    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = event.params.userId;

    if (!newData.stripeCustomerId) {
      console.log(
        `User ${userId} doesn't have a Stripe customer ID yet, skipping update`
      );
      return;
    }

    try {
      // Check if customer-relevant data has changed
      const customerChanged =
        newData.email !== oldData.email ||
        newData.firstName !== oldData.firstName ||
        newData.lastName !== oldData.lastName ||
        newData.companyName !== oldData.companyName ||
        newData.btwNumber !== oldData.btwNumber ||
        newData.phone !== oldData.phone ||
        JSON.stringify(newData.address) !== JSON.stringify(oldData.address);

      if (customerChanged) {
        const updateData = {
          email: newData.email,
          name:
            `${newData.firstName} ${newData.lastName}`.trim() || newData.email,
          metadata: {
            firebaseId: userId,
            companyName: newData.companyName || "",
          },
        };

        // Add phone if available
        if (newData.phone) {
          updateData.phone = newData.phone;
        }

        // Map address to Stripe's expected format
        if (newData.address) {
          updateData.address = {
            line1:
              `${newData.address.street} ${newData.address.houseNumber}`.trim(),
            postal_code: newData.address.postalCode,
            city: newData.address.city,
            country: getCountryCode(newData.address.country),
          };

          // Add shipping address (same as billing for B2B)
          updateData.shipping = {
            name:
              `${newData.firstName} ${newData.lastName}`.trim() ||
              newData.email,
            address: {
              line1:
                `${newData.address.street} ${newData.address.houseNumber}`.trim(),
              postal_code: newData.address.postalCode,
              city: newData.address.city,
              country: getCountryCode(newData.address.country),
            },
          };
        }

        await stripe.customers.update(newData.stripeCustomerId, updateData);

        console.log(
          `✅ Updated Stripe customer ${newData.stripeCustomerId} for user ${userId}`
        );
      }
    } catch (error) {
      console.error("❌ Error updating Stripe customer:", error);

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
 * Archive Stripe customer when user is deleted
 */
const onUserDelete = onDocumentDeleted(
  {
    document: "users/{userId}",
    secrets: [stripeSecretKey],
  },
  async (event) => {
    const stripe = getStripe();

    const snap = event.data;
    if (!snap) return;

    const userData = snap.data();
    const userId = event.params.userId;

    if (!userData.stripeCustomerId) {
      console.log(
        `User ${userId} doesn't have a Stripe customer ID, skipping deletion`
      );
      return;
    }

    try {
      // Note: Stripe doesn't allow deleting customers with payment history
      // So we'll just mark them as deleted in metadata
      await stripe.customers.update(userData.stripeCustomerId, {
        metadata: {
          firebaseId: userId,
          deleted: "true",
          deletedAt: new Date().toISOString(),
        },
      });

      console.log(
        `✅ Marked Stripe customer ${userData.stripeCustomerId} as deleted for user ${userId}`
      );
    } catch (error) {
      console.error("❌ Error marking Stripe customer as deleted:", error);

      // Store cleanup error for manual intervention
      await db
        .collection("stripe_cleanup_errors")
        .add({
          userId,
          stripeCustomerId: userData.stripeCustomerId,
          operation: "customer_deletion",
          error: error instanceof Error ? error.message : "Unknown error",
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
  onUserCreate,
  onUserUpdate,
  onUserDelete,
};
