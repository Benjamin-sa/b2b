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
  type OrderItem
} from '../utils/database';

const invoices = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

/**
 * Create invoice via STRIPE_SERVICE
 * 
 * Request body matches Firebase Functions createInvoice:
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
      metadata?: {
        notes?: string;
        shippingAddress?: any;
        billingAddress?: any;
        userInfo?: any;
      };
    }>();

    // 2. Validate request data
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json({ 
        error: 'invalid-argument',
        message: 'Items array is required and cannot be empty' 
      }, 400);
    }

    for (const item of body.items) {
      if (!item.stripePriceId || !item.quantity || item.quantity < 1) {
        return c.json({ 
          error: 'invalid-argument',
          message: 'Each item must have a valid stripePriceId and quantity' 
        }, 400);
      }

      // Metadata is optional - shopifyVariantId can be empty for standalone products
      if (!item.metadata) {
        return c.json({ 
          error: 'invalid-argument',
          message: 'Each item must have metadata (productId, productName, shopifyVariantId)' 
        }, 400);
      }
    }

    // 3. Check stock availability and prepare stock updates
    const now = new Date().toISOString();
    const stockResult = await validateAndPrepareStockUpdates(c.env.DB, body.items, user.userId);

    if (!stockResult.success) {
      return c.json({
        error: 'insufficient-stock',
        message: 'Some items do not have enough stock available',
        details: stockResult.errors
      }, 400);
    }

    // Execute stock updates in a single transaction
    try {
      await executeStockUpdates(c.env.DB, stockResult.updates, stockResult.logs);
    } catch (error: any) {
      console.error('❌ Failed to reduce stock:', error);
      return c.json({
        error: 'stock-update-failed',
        message: 'Failed to update inventory. Please try again.',
      }, 500);
    }

    // 4. Prepare invoice creation request for STRIPE_SERVICE
    // Note: Using service binding for direct worker-to-worker communication
    // Service bindings are much faster and more secure than HTTP requests
    // IMPORTANT: Use snake_case to match Stripe service's InvoiceInput type
    const invoiceRequest = new Request('http://stripe-service/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: user.stripeCustomerId, // snake_case for Stripe service
        user_id: user.userId,               // snake_case for Stripe service
        items: body.items.map(item => ({
          stripe_price_id: item.stripePriceId,
          quantity: item.quantity,
          metadata: {
            product_id: item.metadata.productId,
            product_name: item.metadata.productName || '',
            shopify_variant_id: item.metadata.shopifyVariantId || '',
          }
        })),
        shipping_cost_cents: body.shippingCost || 0,
        notes: body.metadata?.notes || '',
        shipping_address: body.metadata?.shippingAddress || null, // Pass shipping address for customer update
      }),
    });

    // 5. Create invoice via STRIPE_SERVICE using service binding
    const invoiceResponse = await c.env.STRIPE_SERVICE.fetch(invoiceRequest);

    if (!invoiceResponse.ok) {
      const errorData = await invoiceResponse.json() as { 
        success: false;
        error?: { 
          code: string; 
          message: string;
        };
      };
      console.error('Stripe service error:', errorData);

      // IMPORTANT: Rollback stock changes if Stripe invoice creation fails
      await rollbackStockChanges(c.env.DB, body.items);
      
      return c.json({ 
        error: 'stripe-error',
        message: errorData.error?.message || 'Failed to create invoice in Stripe' 
      }, invoiceResponse.status as any);
    }

    const responseData = await invoiceResponse.json() as {
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

    // 8. Send Telegram notification (NON-BLOCKING)
    console.log('📱 [Gateway] Sending Telegram notification for invoice creation');
    
    try {
      // Use the pre-built invoice/created endpoint with proper data structure
      const telegramRequest = new Request('https://dummy/notifications/invoice/created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              description: item.description || 'Product'
            }))
          },
          metadata: {
            orderMetadata: JSON.stringify({
              userId: user.userId,
              invoiceUrl: responseData.data.hosted_invoice_url,
              status: responseData.data.status
            })
          }
        })
      });

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log('✅ [Gateway] Telegram notification sent successfully');
    } catch (telegramError) {
      // Log Telegram error but don't fail the request
      console.error('⚠️  [Gateway] Failed to send Telegram notification:', telegramError);
    }

    // 9. Return invoice details matching Firebase Functions format (camelCase for frontend)
    console.log(`✅ Invoice created successfully via gateway: ${responseData.data.invoice_id} for user ${user.userId}`);
    
    return c.json({
      invoiceId: responseData.data.invoice_id,
      invoiceUrl: responseData.data.hosted_invoice_url,
      amount: responseData.data.amount_due,
      currency: responseData.data.currency,
      status: responseData.data.status,
    }, 200);

  } catch (error) {
    console.error('Error in invoice orchestration:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      return c.json({ 
        error: 'unauthenticated',
        message: 'User must be authenticated' 
      }, 401);
    }

    return c.json({ 
      error: 'internal',
      message: 'Failed to create invoice' 
    }, 500);
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

    return c.json({
      invoices,
      total: invoices.length,
      source: 'cloudflare-d1',
    }, 200);

  } catch (error) {
    console.error('Error fetching invoices:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      return c.json({ 
        error: 'unauthenticated',
        message: 'User must be authenticated' 
      }, 401);
    }

    return c.json({ 
      error: 'internal',
      message: 'Failed to fetch invoices' 
    }, 500);
  }
});

export default invoices;
