/**
 * Invoices Orchestration Route
 *
 * Handles invoice creation flow:
 * 1. Validate authentication via AUTH_SERVICE (middleware)
 * 2. Create Stripe invoice via STRIPE_SERVICE
 * 3. Return invoice details to frontend
 *
 * This replaces the Firebase Functions createInvoice callable
 */

import { Hono } from 'hono';
import type { Env, ContextVariables } from '../types';
import { requireStripeCustomerMiddleware, type AuthenticatedUser } from '../middleware/auth';
import {
  validateAndPrepareStockUpdates,
  executeStockUpdates,
  rollbackStockChanges,
  updateInventoryLogWithInvoiceId,
  storeOrder,
  storeOrderLineItems,
  fetchUserInvoices,
  type OrderItem,
} from '../utils/database';
import { syncProductsToShopify } from '../utils/shopify-sync';

const invoices = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

/**
 * Create invoice via STRIPE_SERVICE
 *
 * Request body matches createInvoice:
 * {
 *   items: Array<{
 *     stripePriceId: string,
 *     quantity: number,
 *     metadata: {
 *       productId: string,
 *       productName: string,
 *       shopifyVariantId: string
 *     }
 *   }>,
 *   shippingCost?: number (in cents),
 *   taxAmount?: number (in cents),
 *   metadata?: {
 *     notes?: string,
 *     shippingAddress?: object,
 *     billingAddress?: object,
 *     userInfo?: object
 *   }
 * }
 */
invoices.post('/', requireStripeCustomerMiddleware, async (c) => {
  try {
    // User is authenticated and has Stripe customer ID (middleware handles this)
    const user = c.get('user');

    // 1. Parse and validate request body
    const body = await c.req.json<{
      items: OrderItem[];
      shippingCost?: number;
      taxAmount?: number;
      locale?: string; // User's active language for invoice localization
      metadata?: {
        notes?: string;
        shippingAddress?: any;
        billingAddress?: any;
        userInfo?: any;
      };
    }>();

    // 3. Check stock availability and prepare stock updates
    const now = new Date().toISOString();
    const stockResult = await validateAndPrepareStockUpdates(c.env.DB, body.items, user.userId);

    if (!stockResult.success) {
      return c.json(
        {
          error: 'insufficient-stock',
          message: 'Some items do not have enough stock available',
          details: stockResult.errors,
        },
        400
      );
    }

    // Execute stock updates in a single transaction
    try {
      await executeStockUpdates(c.env.DB, stockResult.updates, stockResult.logs);
    } catch (error: any) {
      console.error('❌ Failed to reduce stock:', error);
      return c.json(
        {
          error: 'stock-update-failed',
          message: 'Failed to update inventory. Please try again.',
        },
        500
      );
    }

    // 4. Prepare invoice creation request for STRIPE_SERVICE
    const invoiceHeaders = new Headers();
    invoiceHeaders.set('Content-Type', 'application/json');
    invoiceHeaders.set('X-Service-Token', c.env.SERVICE_SECRET);

    const invoiceRequest = new Request('http://stripe-service/invoices', {
      method: 'POST',
      headers: invoiceHeaders,
      body: JSON.stringify({
        customer_id: user.stripeCustomerId,
        user_id: user.userId,
        items: body.items.map((item) => ({
          stripe_price_id: item.stripePriceId,
          quantity: item.quantity,
          metadata: {
            product_id: item.metadata.productId,
            product_name: item.metadata.productName || '',
            shopify_variant_id: item.metadata.shopifyVariantId || '',
          },
        })),
        shipping_cost_cents: body.shippingCost || 0,
        notes: body.metadata?.notes || '',
        shipping_address: body.metadata?.shippingAddress || null,
        locale: body.locale || null, // User's active language for invoice localization
      }),
    });

    // 5. Create invoice via STRIPE_SERVICE using service binding
    const invoiceResponse = await c.env.STRIPE_SERVICE.fetch(invoiceRequest);

    if (!invoiceResponse.ok) {
      const errorData = (await invoiceResponse.json()) as {
        success: false;
        error?: {
          code: string;
          message: string;
        };
      };
      console.error('Stripe service error:', errorData);

      // IMPORTANT: Rollback stock changes if Stripe invoice creation fails
      await rollbackStockChanges(c.env.DB, body.items);

      return c.json(
        {
          error: 'stripe-error',
          message: errorData.error?.message || 'Failed to create invoice in Stripe',
        },
        invoiceResponse.status as any
      );
    }

    const responseData = (await invoiceResponse.json()) as {
      success: boolean;
      data: {
        invoice_id: string;
        invoice_number: string;
        invoice_pdf: string;
        hosted_invoice_url: string;
        status: string;
        amount_due: number;
        currency: string;
        product_line_items: any[];
        shipping_line_item?: any;
      };
    };

    // Update audit log with actual invoice ID
    await updateInventoryLogWithInvoiceId(c.env.DB, responseData.data.invoice_id, body.items, now);

    // 6. Store order AND line items in D1 database (orders + order_items tables)
    // Webhooks will update order to 'open' when finalized, and 'paid' when paid
    try {
      const orderInternalId = crypto.randomUUID(); // Our internal ID

      // Store order record
      await storeOrder(c.env.DB, {
        orderId: orderInternalId,
        userId: user.userId,
        stripeInvoiceId: responseData.data.invoice_id,
        totalAmount: responseData.data.amount_due,
        invoiceUrl: responseData.data.hosted_invoice_url,
        invoicePdf: responseData.data.invoice_pdf,
        invoiceNumber: responseData.data.invoice_number,
        shippingAddress: body.metadata?.shippingAddress,
      });

      // Store order line items
      const lineItems = responseData.data.product_line_items || [];
      await storeOrderLineItems(c.env.DB, orderInternalId, lineItems);
    } catch (dbError) {
      // Log error but don't fail the request - invoice is created in Stripe
      console.error('⚠️  Failed to store order/line items in D1 (non-critical):', dbError);
    }

    // 7. Sync inventory to Shopify (blocking to prevent overselling)
    const productIds = body.items.map((item) => item.metadata.productId);
    console.log(
      `🔄 [Gateway] Syncing ${productIds.length} products to Shopify after invoice creation`
    );

    const syncResults = await syncProductsToShopify(c.env, productIds);
    const failedSyncs = syncResults.filter((r) => !r.success);

    if (failedSyncs.length > 0) {
      console.warn(
        `⚠️  [Gateway] ${failedSyncs.length} products failed to sync to Shopify:`,
        failedSyncs.map((r) => r.productId)
      );
    } else {
      console.log(`✅ [Gateway] All ${productIds.length} products synced to Shopify`);
    }

    // 8. Send Telegram notification (NON-BLOCKING)
    console.log('📱 [Gateway] Sending Telegram notification for invoice creation');

    try {
      const telegramHeaders = new Headers();
      telegramHeaders.set('Content-Type', 'application/json');
      telegramHeaders.set('X-Service-Token', c.env.SERVICE_SECRET);

      const telegramRequest = new Request('https://dummy/notifications/invoice/created', {
        method: 'POST',
        headers: telegramHeaders,
        body: JSON.stringify({
          id: responseData.data.invoice_id,
          number: responseData.data.invoice_number,
          amount_due: responseData.data.amount_due,
          currency: responseData.data.currency,
          customer_email: user.email || undefined,
          lines: {
            data: (responseData.data.product_line_items || []).map((item: any) => ({
              amount: item.amount || 0,
              quantity: item.quantity || 1,
              description: item.description || 'Product',
            })),
          },
          metadata: {
            orderMetadata: JSON.stringify({
              userId: user.userId,
              invoiceUrl: responseData.data.hosted_invoice_url,
              status: responseData.data.status,
            }),
          },
        }),
      });

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log('✅ [Gateway] Telegram notification sent successfully');
    } catch (telegramError) {
      // Log Telegram error but don't fail the request
      console.error('⚠️  [Gateway] Failed to send Telegram notification:', telegramError);
    }

    // 9. Return invoice details matching Firebase Functions format (camelCase for frontend)
    console.log(
      `✅ Invoice created successfully via gateway: ${responseData.data.invoice_id} for user ${user.userId}`
    );

    return c.json(
      {
        invoiceId: responseData.data.invoice_id,
        invoiceUrl: responseData.data.hosted_invoice_url,
        amount: responseData.data.amount_due,
        currency: responseData.data.currency,
        status: responseData.data.status,
      },
      200
    );
  } catch (error) {
    console.error('Error in invoice orchestration:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      return c.json(
        {
          error: 'unauthenticated',
          message: 'User must be authenticated',
        },
        401
      );
    }

    return c.json(
      {
        error: 'internal',
        message: 'Failed to create invoice',
      },
      500
    );
  }
});

/**
 * Get user's invoices
 *
 * Fetches all invoices for the authenticated user from D1 database.
 * Invoices are automatically synced via Stripe webhooks.
 */
invoices.get('/', requireStripeCustomerMiddleware, async (c) => {
  try {
    // User is authenticated (middleware handles this)
    const user = c.get('user');

    // Fetch invoices from database using utility function
    const invoices = await fetchUserInvoices(c.env.DB, user.userId);

    return c.json(
      {
        invoices,
        total: invoices.length,
        source: 'cloudflare-d1',
      },
      200
    );
  } catch (error) {
    console.error('Error fetching invoices:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      return c.json(
        {
          error: 'unauthenticated',
          message: 'User must be authenticated',
        },
        401
      );
    }

    return c.json(
      {
        error: 'internal',
        message: 'Failed to fetch invoices',
      },
      500
    );
  }
});

export default invoices;
