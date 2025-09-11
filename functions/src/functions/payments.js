const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { stripeSecretKey, getStripe, isEmulator } = require("../config/stripe");
const { db, getServerTimestamp } = require("../config/firebase");

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

/**
 * Create invoice for B2B payments
 */
const createInvoice = onCall(getFunctionOptions(), async (request) => {
  const data = request.data;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    // Initialize Stripe with error handling
    const stripe = getStripe();

    // Validate required fields
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Items array is required and cannot be empty"
      );
    }

    // Validate each item
    for (const item of data.items) {
      if (!item.stripePriceId || !item.quantity || item.quantity < 1) {
        throw new HttpsError(
          "invalid-argument",
          "Each item must have a valid stripePriceId and quantity"
        );
      }
    }

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

    // Create invoice in Stripe
    const invoice = await stripe.invoices.create({
      customer: userData.stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      description: data.metadata?.notes || "Bestelling via Motordash B2B",
      metadata: {
        userId: request.auth.uid,
        orderMetadata: JSON.stringify(data.metadata || {}),
      },
    });

    // Add invoice items
    for (const item of data.items) {
      await stripe.invoiceItems.create({
        customer: userData.stripeCustomerId,
        invoice: invoice.id,
        price: item.stripePriceId,
        quantity: item.quantity,
      });
    }

    // Add Shipping as a line item
    if (data.shippingCost && data.shippingCost > 0) {
      const shippingRate = await stripe.shippingRates.create({
        display_name: "Standaard verzending",
        type: "fixed_amount",
        fixed_amount: {
          amount: data.shippingCost,
          currency: "eur",
        },
      });

      await stripe.invoiceItems.create({
        customer: userData.stripeCustomerId,
        invoice: invoice.id,
        amount: data.shippingCost, // in cents
        currency: "eur",
        description: "Verzendkosten",
        metadata: {
          type: "shipping",
          shipping_rate_id: shippingRate.id,
        },
      });
    }

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    // Log invoice creation
    await db.collection("invoices").add({
      invoiceId: invoice.id,
      userId: request.auth.uid,
      customerId: userData.stripeCustomerId,
      items: data.items,
      amount: finalizedInvoice.amount_due,
      currency: finalizedInvoice.currency,
      status: finalizedInvoice.status,
      createdAt: getServerTimestamp(),
      dueDate: finalizedInvoice.due_date
        ? new Date(finalizedInvoice.due_date * 1000)
        : null,
      invoiceUrl: finalizedInvoice.hosted_invoice_url,
    });

    return {
      invoiceId: invoice.id,
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

        // Get invoice items (line items)
        const lineItems = stripeInvoice.lines.data.map((item) => ({
          stripePriceId: item.price.id,
          productName:
            item.description || item.price.nickname || "Unknown Product",
          quantity: item.quantity,
          unitPrice: item.price.unit_amount,
          totalPrice: item.amount,
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
        console.error(
          `Error processing Stripe invoice ${stripeInvoice.id}:`,
          itemError
        );

        // Still include basic invoice info even if processing fails
        invoices.push({
          id: stripeInvoice.id,
          invoiceId: stripeInvoice.id,
          amount: stripeInvoice.amount_due,
          amountPaid: stripeInvoice.amount_paid,
          currency: stripeInvoice.currency,
          status: stripeInvoice.status,
          paid: stripeInvoice.paid,
          createdAt: new Date(stripeInvoice.created * 1000),
          dueDate: stripeInvoice.due_date
            ? new Date(stripeInvoice.due_date * 1000)
            : null,
          invoiceUrl: stripeInvoice.hosted_invoice_url,
          invoicePdf: stripeInvoice.invoice_pdf,
          number: stripeInvoice.number,
          orderMetadata: {},
          items: [],
          error: "Failed to process invoice details",
        });
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
