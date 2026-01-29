/**
 * Invoices Routes - Direct Database Operations
 *
 * Handles invoice creation with:
 * - Direct D1 database operations via @b2b/db
 * - Stripe service for payment processing
 * - Telegram notifications (non-blocking)
 *
 * INVENTORY FLOW:
 * - Shopify-linked products: Check Shopify stock → Create invoice → Update Shopify → Webhook updates D1
 * - Standalone products: Check D1 stock → Create invoice → Stripe payment webhook → Update D1 stock
 */

import { Hono } from 'hono';
import type { Env, ContextVariables } from '../types';
import { createDb } from '@b2b/db';
import {
  createOrder,
  createOrderItems,
  getOrdersWithItemsByUserId,
  getOrderWithItems,
  getInventoryByProductId,
} from '@b2b/db/operations';
import { requireStripeCustomerMiddleware } from '../middleware/auth';
import { createInvoice } from '../utils/stripe';

const invoices = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceItem {
  stripe_price_id: string;
  quantity: number;
  metadata: {
    product_id: string;
    product_name?: string;
    shopify_variant_id?: string;
  };
}

interface CreateInvoiceRequest {
  items: InvoiceItem[];
  shipping_cost?: number;
  tax_amount?: number;
  locale?: string;
  metadata?: {
    notes?: string;
    shipping_address?: any;
    billing_address?: any;
    user_info?: any;
  };
}

// ============================================================================
// ROUTES
// ============================================================================

interface StockValidationResult {
  success: true;
  shopifyItems: InvoiceItem[]; // Items that need Shopify sync
  standaloneItems: InvoiceItem[]; // Items that need D1 stock deduction via Stripe webhook
}

interface StockValidationError {
  success: false;
  error: string;
  code: string;
  details?: Array<{
    product_id: string;
    available: number;
    requested: number;
    error: string;
  }>;
}

/**
 * Helper: Validate stock availability
 *
 * For Shopify-linked products: Query Shopify API (source of truth)
 * For standalone products: Query D1 inventory
 *
 * Returns categorized items for proper stock deduction later
 */
async function validateStock(
  env: Env,
  db: ReturnType<typeof createDb>,
  items: InvoiceItem[]
): Promise<StockValidationResult | StockValidationError> {
  const shopifyItems: InvoiceItem[] = [];
  const standaloneItems: InvoiceItem[] = [];
  const errors: Array<{ product_id: string; available: number; requested: number; error: string }> =
    [];

  for (const item of items) {
    const productId = item.metadata.product_id;
    const requestedQuantity = item.quantity;

    // Get inventory record from D1
    const inventory = await getInventoryByProductId(db, productId);

    if (!inventory) {
      errors.push({
        product_id: productId,
        available: 0,
        requested: requestedQuantity,
        error: 'Product not found in inventory',
      });
      continue;
    }

    // Check if this product is Shopify-linked
    const isShopifyLinked = !!(
      inventory.shopify_inventory_item_id &&
      inventory.shopify_location_id &&
      inventory.sync_enabled
    );

    if (isShopifyLinked) {
      // Query Shopify for stock (source of truth)
      try {
        const shopifyHeaders = new Headers();
        shopifyHeaders.set('Content-Type', 'application/json');
        shopifyHeaders.set('X-Service-Token', env.SERVICE_SECRET);

        const shopifyCheckRequest = new Request('https://dummy/inventory/check', {
          method: 'POST',
          headers: shopifyHeaders,
          body: JSON.stringify({
            products: [{ product_id: productId, requested_quantity: requestedQuantity }],
          }),
        });

        const shopifyResponse = await env.SHOPIFY_SYNC_SERVICE.fetch(shopifyCheckRequest);

        if (!shopifyResponse.ok) {
          errors.push({
            product_id: productId,
            available: 0,
            requested: requestedQuantity,
            error: 'Failed to check Shopify stock',
          });
          continue;
        }

        const shopifyResult = (await shopifyResponse.json()) as {
          success: boolean;
          items: Array<{
            product_id: string;
            available: number;
            requested: number;
            sufficient: boolean;
          }>;
        };

        const checkResult = shopifyResult.items[0];
        if (!checkResult?.sufficient) {
          errors.push({
            product_id: productId,
            available: checkResult?.available || 0,
            requested: requestedQuantity,
            error: `Insufficient stock: need ${requestedQuantity}, have ${checkResult?.available || 0}`,
          });
          continue;
        }

        // Shopify has sufficient stock
        shopifyItems.push(item);
      } catch (shopifyError) {
        console.error(`[Invoice] Shopify stock check failed for ${productId}:`, shopifyError);
        errors.push({
          product_id: productId,
          available: 0,
          requested: requestedQuantity,
          error: 'Shopify stock check failed',
        });
      }
    } else {
      // Standalone product - check D1 stock
      const availableStock = inventory.stock || 0;

      if (availableStock < requestedQuantity) {
        errors.push({
          product_id: productId,
          available: availableStock,
          requested: requestedQuantity,
          error: `Insufficient stock: need ${requestedQuantity}, have ${availableStock}`,
        });
        continue;
      }

      // D1 has sufficient stock
      standaloneItems.push(item);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: 'Insufficient Stock',
      code: 'inventory/insufficient-stock',
      details: errors,
    };
  }

  return {
    success: true,
    shopifyItems,
    standaloneItems,
  };
}

/**
 * POST /api/invoices
 * Create a new invoice
 *
 * INVENTORY FLOW:
 *
 * Shopify-linked products:
 * 1. Validate stock via Shopify API (source of truth)
 * 2. Create Stripe invoice
 * 3. Store order in D1
 * 4. Trigger Shopify inventory adjustment → Shopify webhook updates D1
 *
 * Standalone products:
 * 1. Validate stock via D1 inventory
 * 2. Create Stripe invoice
 * 3. Store order in D1
 * 4. Stripe payment webhook → Update D1 stock
 */
invoices.post('/', requireStripeCustomerMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const db = createDb(c.env.DB);
    const body = await c.req.json<CreateInvoiceRequest>();

    // Validate items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json(
        {
          error: 'Validation Error',
          code: 'validation/missing-items',
          message: 'Invoice items are required',
        },
        400
      );
    }

    // Step 1: Validate stock availability
    // This checks Shopify for linked products, D1 for standalone products
    const stockValidation = await validateStock(c.env, db, body.items);

    if (!stockValidation.success) {
      return c.json(
        {
          error: stockValidation.error,
          code: stockValidation.code,
          details: stockValidation.details,
        },
        stockValidation.code === 'inventory/insufficient-stock' ? 400 : 500
      );
    }

    // Log validation results
    console.log(
      `[Invoice] Stock validated: ${stockValidation.shopifyItems.length} Shopify items, ${stockValidation.standaloneItems.length} standalone items`
    );

    // Step 2: Create Stripe invoice
    const stripeResult = await createInvoice(c.env, {
      customer_id: user.stripeCustomerId || '',
      user_id: user.userId,
      items: body.items.map((item) => ({
        stripe_price_id: item.stripe_price_id,
        quantity: item.quantity,
        metadata: {
          product_id: item.metadata.product_id,
          product_name: item.metadata.product_name || '',
          shopify_variant_id: item.metadata.shopify_variant_id || '',
        },
      })),
      shipping_cost_cents: body.shipping_cost || 0,
      notes: body.metadata?.notes || '',
      shipping_address: body.metadata?.shipping_address || null,
      locale: body.locale || undefined,
    });

    if (!stripeResult) {
      return c.json(
        {
          error: 'Invoice Creation Failed',
          code: 'invoices/stripe-failed',
          message: 'Failed to create Stripe invoice',
        },
        500
      );
    }

    // Step 3: Store order in D1 with item categorization
    // We store which items are Shopify-linked vs standalone for webhook processing
    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();
    const shippingAddr = body.metadata?.shipping_address;

    await createOrder(db, {
      id: orderId,
      user_id: user.userId,
      stripe_invoice_id: stripeResult.invoice_id,
      status: 'pending',
      stripe_status: 'draft',
      total_amount: stripeResult.amount_due / 100,
      subtotal: stripeResult.amount_due / 100,
      tax: 0,
      shipping: (body.shipping_cost || 0) / 100,
      order_date: now,
      invoice_url: stripeResult.hosted_invoice_url,
      invoice_pdf: stripeResult.invoice_pdf,
      invoice_number: stripeResult.invoice_number,
      shipping_address_street: shippingAddr?.street || '',
      shipping_address_city: shippingAddr?.city || '',
      shipping_address_zip_code: shippingAddr?.zip_code || '',
      shipping_address_country: shippingAddr?.country || '',
      shipping_address_company: shippingAddr?.company || null,
      shipping_address_contact: shippingAddr?.contact_person || null,
      notes: body.metadata?.notes || null,
    });

    // Store order line items (with Shopify-linked flag for webhook processing)
    const lineItems = stripeResult.product_line_items || [];
    const shopifyProductIds = new Set(
      stockValidation.shopifyItems.map((i) => i.metadata.product_id)
    );

    const orderItems = lineItems.map((item: any, index: number) => {
      const productId = body.items[index]?.metadata.product_id || null;
      return {
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: productId,
        product_name: item.description || body.items[index]?.metadata.product_name || 'Product',
        quantity: item.quantity || body.items[index]?.quantity || 1,
        unit_price: (item.unit_amount || 0) / 100,
        total_price: (item.amount || 0) / 100,
        stripe_price_id: body.items[index]?.stripe_price_id || null,
        stripe_invoice_item_id: item.id || null,
        shopify_variant_id: body.items[index]?.metadata.shopify_variant_id || null,
        // Mark if this item needs D1 stock deduction on payment (standalone only)
        is_shopify_linked: productId ? shopifyProductIds.has(productId) : false,
      };
    });

    if (orderItems.length > 0) {
      await createOrderItems(db, orderItems);
    }

    // Step 4: Trigger Shopify inventory deduction for Shopify-linked items
    // Shopify webhook will update D1 after this
    // Standalone products: stock deducted via Stripe payment webhook (invoice.paid)
    if (stockValidation.shopifyItems.length > 0) {
      try {
        const shopifyHeaders = new Headers();
        shopifyHeaders.set('Content-Type', 'application/json');
        shopifyHeaders.set('X-Service-Token', c.env.SERVICE_SECRET);

        const shopifyRequest = new Request('https://dummy/sync/deduct', {
          method: 'POST',
          headers: shopifyHeaders,
          body: JSON.stringify({
            products: stockValidation.shopifyItems.map((item) => ({
              product_id: item.metadata.product_id,
              quantity: item.quantity,
              reason: 'other', // Shopify reason code
              reference_id: stripeResult.invoice_id,
            })),
          }),
        });

        const deductResponse = await c.env.SHOPIFY_SYNC_SERVICE.fetch(shopifyRequest);
        const deductResult = (await deductResponse.json()) as {
          success: boolean;
          results?: Array<{ product_id: string; success: boolean; new_quantity?: number }>;
        };

        if (deductResult.success) {
          console.log(
            `✅ Shopify inventory deducted for ${stockValidation.shopifyItems.length} items - Shopify webhook will update D1`
          );
        } else {
          console.warn('⚠️ Some Shopify stock deductions failed:', deductResult.results);
        }
      } catch (shopifyError) {
        console.warn('⚠️ Failed to deduct Shopify stock:', shopifyError);
        // Don't fail the invoice - stock mismatch can be fixed manually
      }
    }

    if (stockValidation.standaloneItems.length > 0) {
      console.log(
        `📦 ${stockValidation.standaloneItems.length} standalone items - stock will be deducted on Stripe payment webhook`
      );
    }

    // Step 5: Send Telegram notification (non-blocking)
    try {
      const telegramHeaders = new Headers();
      telegramHeaders.set('Content-Type', 'application/json');
      telegramHeaders.set('X-Service-Token', c.env.SERVICE_SECRET);

      const telegramRequest = new Request('https://dummy/notifications/invoice/created', {
        method: 'POST',
        headers: telegramHeaders,
        body: JSON.stringify({
          id: stripeResult.invoice_id,
          number: stripeResult.invoice_number,
          amount_due: stripeResult.amount_due,
          currency: stripeResult.currency,
          customer_email: user.email || undefined,
          lines: {
            data: lineItems.map((item: any) => ({
              amount: item.amount || 0,
              quantity: item.quantity || 1,
              description: item.description || 'Product',
            })),
          },
          metadata: {
            order_metadata: JSON.stringify({
              user_id: user.userId,
              invoice_url: stripeResult.hosted_invoice_url,
              status: stripeResult.status,
              user_info: body.metadata?.user_info,
              order_items: orderItems.map((item: any) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price.toString(),
              })),
              shipping_address: {
                company: shippingAddr?.company,
                contact_person: shippingAddr?.contact_person,
                street: shippingAddr?.street,
                zip_code: shippingAddr?.zip_code,
                city: shippingAddr?.city,
              },
            }),
          },
        }),
      });

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log('✅ Telegram notification sent');
    } catch (telegramError) {
      console.warn('⚠️ Failed to send Telegram notification:', telegramError);
    }

    // Return success
    console.log(`✅ Invoice created: ${stripeResult.invoice_id} for user ${user.userId}`);

    return c.json({
      invoice_id: stripeResult.invoice_id,
      invoice_url: stripeResult.hosted_invoice_url,
      amount: stripeResult.amount_due,
      currency: stripeResult.currency,
      status: stripeResult.status,
      order_id: orderId,
    });
  } catch (error: any) {
    console.error('[Invoices] Error creating invoice:', error);
    return c.json(
      {
        error: 'Internal Error',
        code: 'invoices/create-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/invoices
 * Get user's invoices/orders with items
 */
invoices.get('/', requireStripeCustomerMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const db = createDb(c.env.DB);
    const url = new URL(c.req.url);

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const orders = await getOrdersWithItemsByUserId(db, user.userId, limit, offset);

    // Transform to invoice format expected by frontend (with items)
    const invoices = orders.map((order) => ({
      id: order.stripe_invoice_id,
      order_id: order.id,
      invoice_number: order.invoice_number,
      total_amount: order.total_amount,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      status: order.stripe_status,
      order_status: order.status,
      invoice_url: order.invoice_url,
      invoice_pdf: order.invoice_pdf,
      created_at: order.order_date,
      paid_at: order.paid_at,
      due_date: order.due_date,
      // Include order items
      items: order.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        b2b_sku: item.b2b_sku,
        brand: item.brand,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        image_url: item.image_url,
        stripe_invoice_item_id: item.stripe_invoice_item_id,
      })),
    }));

    return c.json({
      invoices,
      total: invoices.length,
    });
  } catch (error: any) {
    console.error('[Invoices] Error fetching invoices:', error);
    return c.json(
      {
        error: 'Internal Error',
        code: 'invoices/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/invoices/:id
 * Get a single invoice/order with items
 */
invoices.get('/:id', requireStripeCustomerMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const db = createDb(c.env.DB);
    const orderId = c.req.param('id');

    const order = await getOrderWithItems(db, orderId);

    if (!order) {
      return c.json(
        {
          error: 'Order not found',
          code: 'orders/not-found',
        },
        404
      );
    }

    // Verify user owns this order
    if (order.user_id !== user.userId) {
      return c.json(
        {
          error: 'Unauthorized',
          code: 'orders/unauthorized',
        },
        403
      );
    }

    return c.json({
      id: order.stripe_invoice_id,
      order_id: order.id,
      invoice_number: order.invoice_number,
      total_amount: order.total_amount,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      status: order.stripe_status,
      order_status: order.status,
      invoice_url: order.invoice_url,
      invoice_pdf: order.invoice_pdf,
      created_at: order.order_date,
      paid_at: order.paid_at,
      due_date: order.due_date,
      tracking_number: order.tracking_number,
      shipping_address: {
        street: order.shipping_address_street,
        city: order.shipping_address_city,
        zip_code: order.shipping_address_zip_code,
        country: order.shipping_address_country,
        company: order.shipping_address_company,
        contact_person: order.shipping_address_contact,
      },
      items: order.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        image_url: item.image_url,
      })),
    });
  } catch (error: any) {
    console.error('[Invoices] Error fetching invoice:', error);
    return c.json(
      {
        error: 'Internal Error',
        code: 'invoices/fetch-failed',
        message: error.message,
      },
      500
    );
  }
});

export default invoices;
