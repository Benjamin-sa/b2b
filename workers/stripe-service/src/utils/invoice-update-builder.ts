/**
 * Invoice Update Query Builder
 * 
 * Utilities for building dynamic SQL update queries from Stripe invoice data.
 * Improves readability by separating field extraction from query building.
 */

import Stripe from 'stripe';

/**
 * Dynamic SQL update builder
 */
interface UpdateBuilder {
  fields: string[];
  values: any[];
}

/**
 * Add a field to the update builder if the value exists
 * 
 * @param builder - Update builder object
 * @param fieldName - SQL column name
 * @param value - Value to set (skipped if null/undefined)
 */
function addField(builder: UpdateBuilder, fieldName: string, value: any): void {
  if (value !== null && value !== undefined) {
    builder.fields.push(`${fieldName} = ?`);
    builder.values.push(value);
  }
}

/**
 * Extract and add invoice basic fields to update builder
 * 
 * @param builder - Update builder object
 * @param invoice - Stripe invoice object
 */
export function addInvoiceBasicFields(
  builder: UpdateBuilder,
  invoice: Stripe.Invoice
): void {
  // Always update stripe_status
  addField(builder, 'stripe_status', invoice.status);
  
  // Optional invoice fields
  addField(builder, 'invoice_url', invoice.hosted_invoice_url);
  addField(builder, 'invoice_pdf', invoice.invoice_pdf);
  addField(builder, 'invoice_number', invoice.number);
  
  if (invoice.due_date) {
    addField(builder, 'due_date', new Date(invoice.due_date * 1000).toISOString());
  }
}

/**
 * Extract and add shipping cost fields to update builder
 * 
 * @param builder - Update builder object
 * @param shippingCostCents - Shipping cost in cents
 * @param shippingInvoiceItemId - Stripe invoice item ID
 */
export function addShippingFields(
  builder: UpdateBuilder,
  shippingCostCents: number,
  shippingInvoiceItemId: string | null
): void {
  if (shippingCostCents > 0) {
    addField(builder, 'shipping_cost_cents', shippingCostCents);
    addField(builder, 'shipping', shippingCostCents / 100); // Convert to euros
  }
  
  if (shippingInvoiceItemId) {
    addField(builder, 'stripe_shipping_invoice_item_id', shippingInvoiceItemId);
  }
}

/**
 * Extract and add billing address fields to update builder
 * 
 * @param builder - Update builder object
 * @param address - Stripe address object
 */
export function addBillingAddressFields(
  builder: UpdateBuilder,
  address: Stripe.Address | null
): void {
  if (!address) return;
  
  addField(builder, 'billing_address_street', address.line1);
  addField(builder, 'billing_address_city', address.city);
  addField(builder, 'billing_address_zip_code', address.postal_code);
  addField(builder, 'billing_address_country', address.country);
  addField(builder, 'billing_address_state', address.state);
}

/**
 * Extract and add shipping address fields to update builder
 * 
 * @param builder - Update builder object
 * @param shipping - Stripe customer shipping object
 */
export function addShippingAddressFields(
  builder: UpdateBuilder,
  shipping: Stripe.Invoice.CustomerShipping | null
): void {
  if (!shipping?.address) return;
  
  const { address, name, phone } = shipping;
  
  addField(builder, 'shipping_address_street', address.line1);
  addField(builder, 'shipping_address_city', address.city);
  addField(builder, 'shipping_address_zip_code', address.postal_code);
  addField(builder, 'shipping_address_country', address.country);
  addField(builder, 'shipping_address_state', address.state);
  addField(builder, 'shipping_address_contact', name);
  addField(builder, 'shipping_address_phone', phone);
}

/**
 * Extract shipping cost from invoice line items
 * 
 * @param invoice - Stripe invoice object
 * @returns Tuple of [shippingCostCents, shippingInvoiceItemId]
 */
export function extractShippingCost(
  invoice: Stripe.Invoice
): [number, string | null] {
  if (!invoice.lines?.data) {
    return [0, null];
  }
  
  const shippingItem = invoice.lines.data.find(
    (line) => line.metadata?.type === 'shipping'
  );
  
  if (!shippingItem) {
    return [0, null];
  }
  
  return [shippingItem.amount, shippingItem.id];
}

/**
 * Build a complete SQL UPDATE query from invoice data
 * 
 * @param invoice - Stripe invoice object
 * @returns Object containing SQL query string and values array
 */
export function buildInvoiceUpdateQuery(invoice: Stripe.Invoice): {
  query: string;
  values: any[];
} {
  const builder: UpdateBuilder = {
    fields: [],
    values: [],
  };
  
  // Extract shipping cost
  const [shippingCostCents, shippingInvoiceItemId] = extractShippingCost(invoice);
  
  // Add all fields
  addInvoiceBasicFields(builder, invoice);
  addShippingFields(builder, shippingCostCents, shippingInvoiceItemId);
  addBillingAddressFields(builder, invoice.customer_address);
  addShippingAddressFields(builder, invoice.customer_shipping);
  
  // Always update timestamp
  addField(builder, 'updated_at', new Date().toISOString());
  
  // Add WHERE clause parameter
  builder.values.push(invoice.id);
  
  // Build final query
  const query = `
    UPDATE orders
    SET ${builder.fields.join(', ')}
    WHERE stripe_invoice_id = ?
  `;
  
  return { query, values: builder.values };
}
