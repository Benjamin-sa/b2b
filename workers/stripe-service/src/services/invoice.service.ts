/**
 * Stripe Invoice Service
 *
 * Handles invoice creation with:
 * - Multiple line items
 * - Automatic tax calculation (Belgian customers)
 * - VAT reverse charge for non-Belgian EU B2B customers
 * - Shipping costs (with tax code txcd_92010001)
 * - Product metadata for stock management
 * - 10-day payment terms
 * - Localized shipping descriptions
 * - Country-specific invoice templates
 *
 * Maintains exact compatibility with Firebase Functions implementation
 */

import type Stripe from 'stripe';
import type { Env, InvoiceInput, CreateInvoiceResponse } from '../types';
import { getStripeClient, handleStripeError, validateRequired } from '../utils/stripe.utils';
import { getCountryCode } from '../utils/country-codes';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Shipping description translations
const SHIPPING_DESCRIPTIONS: Record<string, string> = {
  nl: 'Verzendkosten',
  fr: 'Frais de livraison',
  de: 'Versandkosten',
  en: 'Shipping costs',
  it: 'Spese di spedizione',
  es: 'Gastos de envío',
  pt: 'Custos de envio',
  pl: 'Koszty wysyłki',
};

// Default memo translations
const DEFAULT_MEMO: Record<string, string> = {
  nl: 'Bestelling via 4Tparts B2B',
  fr: 'Commande via 4Tparts B2B',
  de: 'Bestellung über 4Tparts B2B',
  en: 'Order via 4Tparts B2B',
  it: 'Ordine tramite 4Tparts B2B',
  es: 'Pedido vía 4Tparts B2B',
};

// EU VAT Reverse Charge footer text (localized)
const REVERSE_CHARGE_FOOTER: Record<string, string> = {
  nl: 'Omgekeerde heffing van toepassing - BTW wordt verantwoord door de ontvanger conform artikel 196 van EU BTW-richtlijn 2006/112/EG',
  fr: "Autoliquidation applicable - TVA à comptabiliser par le destinataire conformément à l'article 196 de la directive TVA UE 2006/112/CE",
  de: 'Umkehrung der Steuerschuldnerschaft anwendbar - MwSt. vom Empfänger zu verantworten gemäß Artikel 196 der EU-MwSt-Richtlinie 2006/112/EG',
  en: 'Reverse charge applies - VAT to be accounted for by the recipient in accordance with Article 196 of EU VAT Directive 2006/112/EC',
  it: "Si applica l'inversione contabile - IVA da contabilizzare dal destinatario ai sensi dell'articolo 196 della Direttiva IVA UE 2006/112/CE",
  es: 'Se aplica inversión del sujeto pasivo - IVA a contabilizar por el destinatario de acuerdo con el artículo 196 de la Directiva IVA UE 2006/112/CE',
};

/**
 * Get localized shipping description
 */
function getShippingDescription(locale?: string): string {
  if (!locale) return SHIPPING_DESCRIPTIONS['en']; // Default to english

  const normalizedLocale = locale.split('-')[0]; // e.g., 'nl-BE' -> 'nl'
  return SHIPPING_DESCRIPTIONS[normalizedLocale] || SHIPPING_DESCRIPTIONS['en'];
}

/**
 * Get localized default memo text
 */
function getDefaultMemo(locale?: string): string {
  if (!locale) return DEFAULT_MEMO['en']; // Default to english

  const normalizedLocale = locale.split('-')[0]; // e.g., 'nl-BE' -> 'nl'
  return DEFAULT_MEMO[normalizedLocale] || DEFAULT_MEMO['en'];
}

/**
 * Get localized reverse charge footer text
 */
function getReverseChargeFooter(locale?: string): string {
  if (!locale) return REVERSE_CHARGE_FOOTER['en']; // Default to English

  // Use locale directly (already converted from country code or customer preference)
  return REVERSE_CHARGE_FOOTER[locale] || REVERSE_CHARGE_FOOTER['en'];
}

/**
 * Determine if country is Belgium (for VAT purposes)
 */
function isBelgianCustomer(countryCode?: string): boolean {
  if (!countryCode) return true; // Default to Belgian if unknown
  return countryCode.toUpperCase() === 'BE';
}

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
    let countryCode: string | undefined;

    if (input.shipping_address) {
      const addr = input.shipping_address;

      // Convert country name to ISO code (e.g., "Belgium" -> "BE")
      countryCode = getCountryCode(addr.country);

      // Build Stripe shipping object (different structure than billing address)
      const shippingData: any = {
        name: addr.company || addr.contact_person || 'Customer',
        address: {},
      };

      if (addr.street) shippingData.address.line1 = addr.street;
      if (addr.city) shippingData.address.city = addr.city;
      if (addr.state) shippingData.address.state = addr.state;
      if (addr.zip_code) shippingData.address.postal_code = addr.zip_code;
      if (countryCode) shippingData.address.country = countryCode; // ISO code (e.g., "BE")
      if (addr.phone) shippingData.phone = addr.phone;

      // Only update if we have at least country (minimum requirement for tax)
      if (shippingData.address.country) {
        await stripe.customers.update(input.customer_id, {
          shipping: shippingData, // Set shipping address (used for tax calculation)
          // Note: billing address (customer.address) remains unchanged
        });

        console.log(`✅ Updated customer shipping for tax calculation:`, {
          name: shippingData.name,
          country: shippingData.address.country,
          postalCode: shippingData.address.postal_code,
          city: shippingData.address.city,
          isBelgian: isBelgianCustomer(countryCode),
        });
      } else {
        console.warn(
          '⚠️ Shipping address provided but missing country - cannot update customer for tax calculation'
        );
      }
    }

    // Step 1: Set customer's language preference from frontend i18n locale
    // This ensures Stripe uses the user's active frontend language for invoice PDF/email
    const localeForContent = input.locale ? input.locale.split('-')[0] : 'nl'; // Default to Dutch

    // Update customer's preferred_locales in Stripe
    await stripe.customers.update(input.customer_id, {
      preferred_locales: [localeForContent],
    });
    console.log(`✅ Updated customer preferred_locales to: ${localeForContent}`);

    // Step 2: Create draft invoice with localized content
    const isEUNonBelgian = countryCode && !isBelgianCustomer(countryCode);
    // Use footer for legal reverse charge notice (standard practice)
    const invoiceFooter = isEUNonBelgian ? getReverseChargeFooter(localeForContent) : undefined;
    // Use localized memo (or custom notes if provided)
    const invoiceMemo = input.notes || getDefaultMemo(localeForContent);

    const invoice = await stripe.invoices.create({
      customer: input.customer_id,
      collection_method: 'send_invoice',
      days_until_due: 10, // 10-day payment terms
      description: invoiceMemo, // Localized memo or custom notes
      footer: invoiceFooter, // Localized reverse charge notice (if applicable)
      automatic_tax: {
        enabled: true, // Enable automatic tax calculation
      },
      // Always include your Belgian VAT ID on all invoices
      account_tax_ids: [], // Will use account's default tax IDs (set in Dashboard)
      // Alternatively, you can specify specific tax ID: account_tax_ids: ['taxid_XXXXXXXX']
      metadata: {
        userId: input.user_id,
        source: 'b2b_order',
        createdAt: new Date().toISOString(),
        vatTreatment: isEUNonBelgian ? 'reverse_charge' : 'standard',
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
      // Use localized shipping description based on user's i18n locale
      const shippingDescription = getShippingDescription(localeForContent);

      await stripe.invoiceItems.create({
        customer: input.customer_id,
        invoice: invoice.id,
        amount: input.shipping_cost_cents,
        currency: 'eur',
        tax_behavior: 'exclusive', // Tax calculated on top
        tax_code: 'txcd_92010001', // Shipping and delivery services
        description: shippingDescription,
        metadata: {
          type: 'shipping',
        },
      });

      console.log(
        `✅ Added shipping: €${(input.shipping_cost_cents / 100).toFixed(2)} (${shippingDescription})`
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
export async function voidInvoice(env: Env, invoiceId: string): Promise<void> {
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
export async function getInvoice(env: Env, invoiceId: string): Promise<Stripe.Invoice> {
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
