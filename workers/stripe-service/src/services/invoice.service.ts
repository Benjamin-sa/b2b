/**
 * Stripe Invoice Service
 * 
 * Handles invoice creation with:
 * - Multiple line items
 * - Automatic tax calculation
 * - Shipping costs (with tax code txcd_92010001)
 * - Product metadata for stock management
 * - 10-day payment terms
 * 
 * Maintains exact compatibility with Firebase Functions implementation
 */

import type Stripe from 'stripe';
import type { Env, InvoiceInput, CreateInvoiceResponse } from '../types';
import { getStripeClient, handleStripeError, validateRequired } from '../utils/stripe.utils';

/**
 * Create invoice with items
 * 
 * Process:
 * 1. Create draft invoice
 * 2. Add product line items with metadata
 * 3. Add shipping cost (if applicable)
 * 4. Finalize invoice (calculates tax automatically)
 * 5. Send invoice to customer
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param input - Invoice data with items and customer info
 * @returns Invoice details including line items
 */
export async function createInvoiceWithItems(
  env: Env,
  input: InvoiceInput
): Promise<CreateInvoiceResponse> {
  try {
    // Validate required fields
    validateRequired(input, ['customer_id', 'user_id', 'items']);

    if (!input.items || input.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    const stripe = getStripeClient(env);

    console.log(`Creating invoice for customer ${input.customer_id}`, {
      userId: input.user_id,
      itemCount: input.items.length,
      shippingCents: input.shipping_cost_cents || 0,
      hasShippingAddress: !!input.shipping_address,
    });

    // Step 0: Set customer shipping address for this order
    // CRITICAL: Stripe Tax uses customer.shipping as FIRST PRIORITY for tax calculation
    // This allows billing address (company HQ) to stay unchanged while shipping address
    // (delivery location) is used for accurate tax calculation
    if (input.shipping_address) {
      const addr = input.shipping_address;
      
      // Build Stripe shipping object (different structure than billing address)
      const shippingData: any = {
        name: addr.company || addr.contactPerson || 'Customer',
        address: {},
      };
      
      if (addr.street) shippingData.address.line1 = addr.street;
      if (addr.city) shippingData.address.city = addr.city;
      if (addr.state) shippingData.address.state = addr.state;
      if (addr.zipCode) shippingData.address.postal_code = addr.zipCode;
      if (addr.country) shippingData.address.country = addr.country;
      if (addr.phone) shippingData.phone = addr.phone;

      // Only update if we have at least country (minimum requirement for tax)
      if (shippingData.address.country) {
        await stripe.customers.update(input.customer_id, {
          shipping: shippingData, // Set shipping address (used for tax calculation)
          // Note: billing address (customer.address) remains unchanged
        });

        console.log(`✅ Updated customer shipping address for automatic tax calculation:`, {
          name: shippingData.name,
          country: shippingData.address.country,
          postalCode: shippingData.address.postal_code,
          city: shippingData.address.city,
        });
      } else {
        console.warn('⚠️ Shipping address provided but missing country - cannot update customer for tax calculation');
      }
    }

    // Step 1: Create draft invoice
    const invoice = await stripe.invoices.create({
      customer: input.customer_id,
      collection_method: 'send_invoice',
      days_until_due: 10, // 10-day payment terms
      description: input.notes || 'Bestelling via 4Tparts B2B',
      automatic_tax: {
        enabled: true, // Enable automatic tax calculation
      },
      metadata: {
        userId: input.user_id,
        source: 'b2b_order',
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`✅ Created draft invoice ${invoice.id}`);

    // Step 2: Add product line items
    for (const item of input.items) {
      await stripe.invoiceItems.create({
        customer: input.customer_id,
        invoice: invoice.id,
        price: item.stripe_price_id,
        quantity: item.quantity,
        metadata: {
          product_id: item.metadata.product_id,
          shopify_variant_id: item.metadata.shopify_variant_id || '',
          product_name: item.metadata.product_name || '',
        },
      });

      console.log(
        `✅ Added item: ${item.metadata.product_name || 'Product'} (qty: ${item.quantity})`
      );
    }

    // Step 3: Add shipping cost (if applicable)
    if (input.shipping_cost_cents && input.shipping_cost_cents > 0) {
      await stripe.invoiceItems.create({
        customer: input.customer_id,
        invoice: invoice.id,
        amount: input.shipping_cost_cents,
        currency: 'eur',
        tax_behavior: 'exclusive', // Tax calculated on top
        tax_code: 'txcd_92010001', // Shipping and delivery services
        description: 'Verzendkosten',
        metadata: {
          type: 'shipping',
        },
      });

      console.log(
        `✅ Added shipping: €${(input.shipping_cost_cents / 100).toFixed(2)}`
      );
    }

    // Step 4: Finalize invoice (calculates tax)
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
      expand: ['lines.data.tax_amounts', 'lines.data.price', 'lines.data.price.product'],
    });

    console.log(
      `✅ Finalized invoice ${finalizedInvoice.id} - Total: €${(
        finalizedInvoice.amount_due / 100
      ).toFixed(2)}`
    );

    // Step 5: Send invoice to customer
    await stripe.invoices.sendInvoice(invoice.id);

    console.log(`✅ Sent invoice ${invoice.id} to customer`);

    // Extract line items for response
    const invoiceLines = finalizedInvoice.lines?.data || [];
    
    // Extract product line items with full historical data
    const productLineItems = invoiceLines
      .filter((line) => {
        // Filter out shipping/other non-product items
        const isShipping = line.metadata && line.metadata.type === 'shipping';
        const hasPrice = !!line.price;
        return !isShipping && hasPrice;
      })
      .map((line) => {
        const price = line.price as Stripe.Price;
        const product = price.product as Stripe.Product;
        const taxAmount = line.tax_amounts?.[0]?.amount || 0;

        return {
          id: line.id,
          product_name: line.description || product?.name || '',
          sku: product?.metadata?.partNumber || '',
          brand: product?.metadata?.brand || '',
          quantity: line.quantity || 1,
          unit_price_cents: price.unit_amount || 0,
          total_price_cents: line.amount,
          tax_cents: taxAmount,
          image_url: product?.images?.[0] || '',
          currency: line.currency || 'eur',
          metadata: {
            shopify_variant_id: product?.metadata?.shopifyVariantId || '',
            product_id: product?.metadata?.productId || '',
            stripe_price_id: price.id || '',
            stripe_product_id: (typeof product === 'string' ? product : product?.id) || '',
          },
        };
      });

    const shippingLineItem = invoiceLines.find(
      (line) => line.metadata && line.metadata.type === 'shipping'
    );

    const shippingData = shippingLineItem
      ? {
          id: shippingLineItem.id,
          amount: shippingLineItem.amount,
          metadata: shippingLineItem.metadata as Record<string, string>,
        }
      : null;

    return {
      invoice_id: finalizedInvoice.id,
      invoice_number: finalizedInvoice.number || '',
      invoice_pdf: finalizedInvoice.invoice_pdf || '',
      hosted_invoice_url: finalizedInvoice.hosted_invoice_url || '',
      status: finalizedInvoice.status || 'draft',
      amount_due: finalizedInvoice.amount_due,
      currency: finalizedInvoice.currency,
      product_line_items: productLineItems,
      shipping_line_item: shippingData,
    };
  } catch (error: any) {
    return handleStripeError(error, 'create invoice with items');
  }
}

/**
 * Void/cancel an invoice
 * 
 * Used when order is cancelled or needs to be reversed
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param invoiceId - Stripe invoice ID to void
 */
export async function voidInvoice(
  env: Env,
  invoiceId: string
): Promise<void> {
  try {
    if (!invoiceId) {
      throw new Error('invoice_id is required');
    }

    const stripe = getStripeClient(env);

    console.log(`Voiding invoice ${invoiceId}`);

    await stripe.invoices.voidInvoice(invoiceId);

    console.log(`✅ Voided invoice ${invoiceId}`);
  } catch (error: any) {
    return handleStripeError(error, 'void invoice');
  }
}

/**
 * Get invoice details
 * 
 * @param env - Cloudflare environment with Stripe key
 * @param invoiceId - Stripe invoice ID
 * @returns Stripe invoice object with expanded data
 */
export async function getInvoice(
  env: Env,
  invoiceId: string
): Promise<Stripe.Invoice> {
  try {
    if (!invoiceId) {
      throw new Error('invoice_id is required');
    }

    const stripe = getStripeClient(env);

    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['lines.data.tax_amounts', 'lines.data.price'],
    });

    return invoice;
  } catch (error: any) {
    return handleStripeError(error, 'get invoice');
  }
}
