const { getStripe } = require("../config/stripe");

/**
 * Retrieve detailed invoice information from Stripe
 * This enriches the webhook data with additional customer and line item details
 */
const getInvoiceDetails = async (invoiceId) => {
  try {
    const stripe = getStripe();
    
    // Retrieve the invoice with expanded customer and line items
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['customer', 'lines.data.price.product']
    });

    console.log(`✅ Retrieved detailed invoice: ${invoiceId}`);
    return invoice;
  } catch (error) {
    console.error(`❌ Error retrieving invoice ${invoiceId}:`, error.message);
    throw error;
  }
};

/**
 * Retrieve detailed customer information from Stripe
 */
const getCustomerDetails = async (customerId) => {
  try {
    const stripe = getStripe();
    
    const customer = await stripe.customers.retrieve(customerId);
    
    console.log(`✅ Retrieved customer details: ${customerId}`);
    return customer;
  } catch (error) {
    console.error(`❌ Error retrieving customer ${customerId}:`, error.message);
    throw error;
  }
};

/**
 * Retrieve detailed payment intent information from Stripe
 */
const getPaymentIntentDetails = async (paymentIntentId) => {
  try {
    const stripe = getStripe();
    
    // Retrieve payment intent with expanded customer and invoice
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['customer', 'invoice']
    });

    console.log(`✅ Retrieved detailed payment intent: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    console.error(`❌ Error retrieving payment intent ${paymentIntentId}:`, error.message);
    throw error;
  }
};

/**
 * Format customer name from Stripe customer object
 */
const formatCustomerName = (customer) => {
  if (!customer) return 'Unknown Customer';
  
  // Try to get name from customer object
  if (customer.name) return customer.name;
  
  // Fallback to constructing name from first/last name
  const firstName = customer.metadata?.firstName || '';
  const lastName = customer.metadata?.lastName || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  // Final fallback to email
  return customer.email || 'Unknown Customer';
};

/**
 * Extract product information from invoice line items
 */
const formatInvoiceLineItems = (invoice) => {
  if (!invoice.lines || !invoice.lines.data || invoice.lines.data.length === 0) {
    return 'No items';
  }

  return invoice.lines.data.slice(0, 3).map(item => {
    const productName = item.price?.product?.name || item.description || 'Unknown Item';
    const quantity = item.quantity || 1;
    const amount = item.amount / 100; // Convert from cents
    const currency = item.currency?.toUpperCase() || 'EUR';
    
    return `• ${productName} (${quantity}x) - €${amount.toFixed(2)}`;
  }).join('\n');
};

module.exports = {
  getInvoiceDetails,
  getCustomerDetails,
  getPaymentIntentDetails,
  formatCustomerName,
  formatInvoiceLineItems,
};
