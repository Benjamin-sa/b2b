/**
 * Invoices Orchestration Route
 * 
 * Handles invoice creation flow:
 * 1. Validate authentication via AUTH_SERVICE
 * 2. Create Stripe invoice via STRIPE_SERVICE
 * 3. Return invoice details to frontend
 * 
 * This replaces the Firebase Functions createInvoice callable
 */

import { Hono } from 'hono';
import type { Env } from '../types';

const invoices = new Hono<{ Bindings: Env }>();

/**
 * Validate user token via AUTH_SERVICE and get user details
 * 
 * Uses Cloudflare Service Bindings for direct worker-to-worker communication
 */
async function validateUserToken(env: Env, authHeader: string | null): Promise<{ 
  userId: string; 
  email: string;
  stripeCustomerId: string | null;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);
  
  // Use service binding for direct worker-to-worker call
  // Note: Service bindings are much faster than HTTP requests
  const validateRequest = new Request('http://auth-service/auth/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token }), // Auth service expects 'accessToken', not 'token'
  });

  const validateResponse = await env.AUTH_SERVICE.fetch(validateRequest);
  
  if (!validateResponse.ok) {
    const errorText = await validateResponse.text();
    throw new Error(`Token validation failed: ${errorText}`);
  }

  const validationData = await validateResponse.json() as { 
    valid: boolean;
    user: { 
      uid: string; 
      email: string; 
      stripeCustomerId?: string;
    };
    sessionId: string;
    validatedAt: string;
  };
  
  if (!validationData.valid || !validationData.user || !validationData.user.uid) {
    throw new Error('Invalid user data from auth service');
  }

  return { 
    userId: validationData.user.uid, 
    email: validationData.user.email,
    stripeCustomerId: validationData.user.stripeCustomerId || null,
  };
}

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
invoices.post('/', async (c) => {
  try {
    // 1. Validate authentication
    const authHeader = c.req.header('Authorization') || null;
    const { userId, email, stripeCustomerId } = await validateUserToken(c.env, authHeader);

    // 2. Check if user has Stripe customer ID
    if (!stripeCustomerId) {
      return c.json({ 
        error: 'failed-precondition',
        message: 'User must have a Stripe customer ID. Please complete your profile first.' 
      }, 400);
    }

    // 2. Parse and validate request body
    const body = await c.req.json<{
      items: Array<{
        stripePriceId: string;
        quantity: number;
        metadata: {
          productId: string;
          productName?: string;
          shopifyVariantId: string;
        };
      }>;
      shippingCost?: number;
      taxAmount?: number;
      metadata?: {
        notes?: string;
        shippingAddress?: any;
        billingAddress?: any;
        userInfo?: any;
      };
    }>();

    // 3. Validate request data
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

    // 4. Check stock availability and reduce B2B stock for all items
    // This happens BEFORE creating the invoice to ensure we don't oversell
    const now = new Date().toISOString();
    const stockUpdates: D1PreparedStatement[] = [];
    const stockLogs: D1PreparedStatement[] = [];
    const stockValidationErrors: string[] = [];

    for (const item of body.items) {
      const productId = item.metadata.productId;
      const quantity = item.quantity;

      // Get current inventory
      const inventory = await c.env.DB.prepare(
        'SELECT total_stock, b2b_stock, b2c_stock FROM product_inventory WHERE product_id = ?'
      ).bind(productId).first();

      if (!inventory) {
        stockValidationErrors.push(`Product ${productId} has no inventory record`);
        continue;
      }

      const currentB2BStock = (inventory as any).b2b_stock;
      const currentB2CStock = (inventory as any).b2c_stock;
      const currentTotalStock = (inventory as any).total_stock;

      // Validate sufficient B2B stock
      if (currentB2BStock < quantity) {
        stockValidationErrors.push(
          `Insufficient stock for product ${productId}: need ${quantity}, have ${currentB2BStock} available`
        );
        continue;
      }

      // Calculate new stock levels
      const newB2BStock = currentB2BStock - quantity;
      const newTotalStock = currentTotalStock - quantity;

      // Prepare stock update query
      stockUpdates.push(
        c.env.DB.prepare(`
          UPDATE product_inventory
          SET 
            total_stock = ?,
            b2b_stock = ?,
            updated_at = ?
          WHERE product_id = ?
        `).bind(newTotalStock, newB2BStock, now, productId)
      );

      // Prepare audit log entry
      stockLogs.push(
        c.env.DB.prepare(`
          INSERT INTO inventory_sync_log (
            id, product_id, action, source,
            total_change, b2b_change, b2c_change,
            total_stock_after, b2b_stock_after, b2c_stock_after,
            reference_id, reference_type, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          productId,
          'b2b_order',
          'invoice_creation',
          -quantity,
          -quantity,
          0,
          newTotalStock,
          newB2BStock,
          currentB2CStock,
          'pending', // Will be updated with invoice ID after creation
          'invoice',
          now,
          userId
        )
      );

      console.log(`📉 Stock reduction prepared for ${productId}: ${currentB2BStock} → ${newB2BStock} (-${quantity})`);
    }

    // If stock validation failed, return error BEFORE creating invoice
    if (stockValidationErrors.length > 0) {
      return c.json({
        error: 'insufficient-stock',
        message: 'Some items do not have enough stock available',
        details: stockValidationErrors
      }, 400);
    }

    // Execute all stock updates in a single transaction
    if (stockUpdates.length > 0) {
      try {
        await c.env.DB.batch([...stockUpdates, ...stockLogs]);
        console.log(`✅ Reduced stock for ${stockUpdates.length} products`);
      } catch (error: any) {
        console.error('❌ Failed to reduce stock:', error);
        return c.json({
          error: 'stock-update-failed',
          message: 'Failed to update inventory. Please try again.',
        }, 500);
      }
    }

    // 5. Prepare invoice creation request for STRIPE_SERVICE
    // Note: Using service binding for direct worker-to-worker communication
    // Service bindings are much faster and more secure than HTTP requests
    // IMPORTANT: Use snake_case to match Stripe service's InvoiceInput type
    const invoiceRequest = new Request('http://stripe-service/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: stripeCustomerId, // snake_case for Stripe service
        user_id: userId,               // snake_case for Stripe service
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

    // 6. Create invoice via STRIPE_SERVICE using service binding
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
      if (stockUpdates.length > 0) {
        console.log('⚠️  Rolling back stock changes due to Stripe error...');
        const rollbackUpdates: D1PreparedStatement[] = [];
        
        for (const item of body.items) {
          const productId = item.metadata.productId;
          const quantity = item.quantity;
          
          // Get current stock (after our reduction)
          const currentInventory = await c.env.DB.prepare(
            'SELECT total_stock, b2b_stock FROM product_inventory WHERE product_id = ?'
          ).bind(productId).first();
          
          if (currentInventory) {
            const currentTotal = (currentInventory as any).total_stock;
            const currentB2B = (currentInventory as any).b2b_stock;
            
            // Restore stock
            rollbackUpdates.push(
              c.env.DB.prepare(`
                UPDATE product_inventory
                SET 
                  total_stock = ?,
                  b2b_stock = ?,
                  updated_at = ?
                WHERE product_id = ?
              `).bind(currentTotal + quantity, currentB2B + quantity, new Date().toISOString(), productId)
            );
          }
        }
        
        if (rollbackUpdates.length > 0) {
          await c.env.DB.batch(rollbackUpdates);
          console.log('✅ Stock rollback completed');
        }
      }
      
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
    if (stockLogs.length > 0) {
      try {
        const updateLogQueries = body.items.map(item => 
          c.env.DB.prepare(`
            UPDATE inventory_sync_log
            SET reference_id = ?
            WHERE product_id = ? AND reference_id = 'pending' AND created_at = ?
          `).bind(responseData.data.invoice_id, item.metadata.productId, now)
        );
        await c.env.DB.batch(updateLogQueries);
        console.log('✅ Updated inventory logs with invoice ID');
      } catch (error) {
        console.warn('⚠️  Failed to update inventory log reference_id (non-critical):', error);
      }
    }

    // 7. Store order AND line items in D1 database (orders + order_items tables)
    // Webhooks will update order to 'open' when finalized, and 'paid' when paid
    try {
      const orderInternalId = crypto.randomUUID(); // Our internal ID
      const now = new Date().toISOString();

      // Extract shipping address from request metadata
      const shippingAddr = body.metadata?.shippingAddress;

      // 7a. Store order record (status: 'draft')
      await c.env.DB.prepare(`
        INSERT INTO orders (
          id, user_id, stripe_invoice_id, status, stripe_status,
          total_amount, subtotal, tax, shipping,
          order_date, invoice_url, invoice_pdf, invoice_number, due_date,
          shipping_address_street, shipping_address_city, shipping_address_zip_code, shipping_address_country,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        orderInternalId,
        userId,
        responseData.data.invoice_id, // Stripe invoice ID (in_xxx)
        'pending', // Order status
        'draft', // Stripe status (webhook will update to 'open' when finalized)
        responseData.data.amount_due / 100, // Convert cents to euros
        responseData.data.amount_due / 100, // Subtotal (we'll calculate from items later)
        0, // Tax (we'll calculate from items later)
        0, // Shipping (we'll calculate from items later)
        now, // order_date
        responseData.data.hosted_invoice_url,
        responseData.data.invoice_pdf,
        responseData.data.invoice_number,
        null, // due_date (webhook will set this)
        shippingAddr?.street || '', // Extract from request body
        shippingAddr?.city || '', // Extract from request body
        shippingAddr?.zipCode || '', // Extract from request body
        shippingAddr?.country || '', // Extract from request body
        now,
        now
      ).run();

      console.log(`✅ Stored order ${orderInternalId} with Stripe invoice ${responseData.data.invoice_id} in D1`);

      // 7b. Store order line items for historical pricing/product details
      const lineItems = responseData.data.product_line_items || [];
      
      if (lineItems.length > 0) {
        // Batch insert all line items (more efficient than individual inserts)
        const lineItemInserts = lineItems.map((item: any) => {
          return c.env.DB.prepare(`
            INSERT INTO order_items (
              id, order_id, product_id,
              product_name, product_sku, brand, image_url,
              quantity, unit_price, total_price, tax_cents,
              shopify_variant_id, stripe_price_id, stripe_invoice_item_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            orderInternalId,
            item.metadata?.product_id || item.metadata?.productId || '',
            item.product_name || '',
            item.sku || '',
            item.brand || '',
            item.image_url || '',
            item.quantity,
            item.unit_price_cents / 100, // Convert cents to euros
            item.total_price_cents / 100, // Convert cents to euros
            item.tax_cents,
            item.metadata?.shopify_variant_id || item.metadata?.shopifyVariantId || '',
            item.metadata?.stripe_price_id || item.metadata?.stripePriceId || '',
            item.id, // Stripe line item ID
            now
          );
        });

        await c.env.DB.batch(lineItemInserts);

        console.log(`✅ Stored ${lineItems.length} order items in D1 for order ${orderInternalId}`);
      }

    } catch (dbError) {
      // Log error but don't fail the request - invoice is created in Stripe
      console.error('⚠️  Failed to store order/line items in D1 (non-critical):', dbError);
    }

    // 8. Return invoice details matching Firebase Functions format (camelCase for frontend)
    console.log(`✅ Invoice created successfully via gateway: ${responseData.data.invoice_id} for user ${userId}`);
    
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
invoices.get('/', async (c) => {
  try {
    // 1. Validate authentication
    const authHeader = c.req.header('Authorization') || null;
    const { userId } = await validateUserToken(c.env, authHeader);

    // 2. Query D1 database for user's orders (which contain invoice data)
    const ordersResult = await c.env.DB.prepare(`
      SELECT 
        id,
        stripe_invoice_id,
        stripe_status,
        status as order_status,
        total_amount,
        subtotal,
        tax,
        shipping,
        invoice_pdf,
        invoice_url,
        invoice_number,
        due_date,
        paid_at,
        order_date,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = ? AND stripe_invoice_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(userId).all();

    console.log(`📋 Fetched ${ordersResult.results?.length || 0} orders/invoices for user ${userId}`);
    
    // 3. Fetch order items for all orders in a single query (more efficient)
    const orderIds = (ordersResult.results || []).map((order: any) => order.id);
    let lineItemsMap = new Map<string, any[]>();

    if (orderIds.length > 0) {
      // Build dynamic query with placeholders for all order IDs
      const placeholders = orderIds.map(() => '?').join(',');
      const lineItemsResult = await c.env.DB.prepare(`
        SELECT 
          order_id,
          id,
          stripe_invoice_item_id,
          product_id,
          product_name,
          product_sku,
          brand,
          image_url,
          quantity,
          unit_price,
          total_price,
          tax_cents,
          shopify_variant_id,
          stripe_price_id
        FROM order_items
        WHERE order_id IN (${placeholders})
        ORDER BY created_at ASC
      `).bind(...orderIds).all();

      // Group line items by order_id
      (lineItemsResult.results || []).forEach((item: any) => {
        if (!lineItemsMap.has(item.order_id)) {
          lineItemsMap.set(item.order_id, []);
        }
        lineItemsMap.get(item.order_id)!.push(item);
      });

      console.log(`📦 Fetched line items for ${lineItemsMap.size} orders`);
    }
    
    // 4. Transform to frontend format (camelCase) and attach line items
    const invoices = (ordersResult.results || []).map((order: any) => {
      const items = (lineItemsMap.get(order.id) || []).map((item: any) => ({
        id: item.id,
        stripeLineItemId: item.stripe_invoice_item_id,
        productId: item.product_id,
        productName: item.product_name,
        sku: item.product_sku,
        brand: item.brand,
        imageUrl: item.image_url,
        quantity: item.quantity,
        unitPrice: item.unit_price, // Already in euros
        totalPrice: item.total_price, // Already in euros
        tax: item.tax_cents ? item.tax_cents / 100 : 0, // Convert cents to euros
        currency: 'eur',
        metadata: {
          shopifyVariantId: item.shopify_variant_id,
          stripePriceId: item.stripe_price_id,
          productId: item.product_id,
        },
      }));

      // Calculate totals from line items if available
      const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      const totalTax = items.reduce((sum: number, item: any) => sum + (item.tax || 0), 0);

      return {
        id: order.id,
        stripeInvoiceId: order.stripe_invoice_id,
        status: order.stripe_status || order.order_status,
        amount: order.total_amount * 100, // Convert euros to cents for consistency
        amountPaid: order.paid_at ? order.total_amount * 100 : 0,
        currency: 'eur',
        invoicePdf: order.invoice_pdf,
        hostedInvoiceUrl: order.invoice_url,
        invoiceNumber: order.invoice_number,
        dueDate: order.due_date,
        paidAt: order.paid_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items, // ⭐ Include line items with historical pricing
      };
    });

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
