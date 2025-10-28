/**
 * Stripe Webhook Routes
 * 
 * Handles Stripe webhook events for invoice lifecycle:
 * - invoice.finalized: When invoice is ready (adds URLs, sets status to 'open')
 * - invoice.paid: When invoice payment succeeds
 * - invoice.voided: When invoice is voided/cancelled
 * 
 * Uses D1 database to persist invoice state changes.
 * Implements idempotency to prevent duplicate event processing.
 */

import { Hono } from 'hono';
import Stripe from 'stripe';
import type { Env } from '../types';

const webhooks = new Hono<{ Bindings: Env }>();

/**
 * Main webhook endpoint
 * 
 * Stripe sends events to this endpoint when invoice state changes.
 * We verify the signature and process the event.
 */
webhooks.post('/', async (c) => {
  const signature = c.req.header('stripe-signature');
  
  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  try {
    const rawBody = await c.req.text();
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { 
      apiVersion: '2025-02-24.acacia' 
    });
    
    // Verify webhook signature (prevents fake events from bad actors)
    // Use async version for Cloudflare Workers (SubtleCrypto context)
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`[Webhook] ✅ Received verified event: ${event.type} (${event.id})`);

    // Check if we've already processed this event (idempotency)
    const existingEvent = await c.env.DB.prepare(
      'SELECT id FROM webhook_events WHERE event_id = ?'
    ).bind(event.id).first();

    if (existingEvent) {
      console.log(`[Webhook] ⏭️  Event ${event.id} already processed, skipping`);
      return c.json({ received: true, processed: false, reason: 'duplicate' });
    }

    // Store event in webhook_events table (for audit trail and idempotency)
    await c.env.DB.prepare(`
      INSERT INTO webhook_events (
        id, event_type, event_id, payload, processed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      event.type,
      event.id,
      JSON.stringify(event.data.object),
      0, // Not processed yet
      new Date().toISOString()
    ).run();

    // Handle different event types
    let success = true;
    let errorMessage: string | null = null;

    try {
      switch (event.type) {
        case 'invoice.created':
          await handleInvoiceCreated(c.env, event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.paid':
          await handleInvoicePaid(c.env, event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.voided':
          await handleInvoiceVoided(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(c.env, event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`[Webhook] ℹ️  Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      success = false;
      errorMessage = error.message;
      console.error(`[Webhook] ❌ Error processing ${event.type}:`, error);
    }

    // Update webhook_events table with processing result
    await c.env.DB.prepare(`
      UPDATE webhook_events
      SET processed = ?, success = ?, error_message = ?, processed_at = ?
      WHERE event_id = ?
    `).bind(
      1, // Processed
      success ? 1 : 0,
      errorMessage,
      new Date().toISOString(),
      event.id
    ).run();

    if (!success) {
      return c.json({ 
        received: true, 
        processed: false, 
        error: errorMessage 
      }, 500);
    }

    return c.json({ received: true, processed: true });

  } catch (error: any) {
    console.error('[Webhook] ❌ Signature verification failed or error:', error);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Handle invoice.created event
 * 
 * Fired when Stripe creates an invoice.
 * Updates order stripe_status and adds URLs for customer access.
 * Also fetches and stores line items with full product/pricing details if not already stored.
 * 
 * NOTE: Stock reduction happens during invoice creation in API Gateway, not here.
 */
async function handleInvoiceCreated(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 📄 Processing invoice.created: ${invoice.id}`);

  // Check if order exists in D1 (linked by stripe_invoice_id)
  const existing = await env.DB.prepare(
    'SELECT id FROM orders WHERE stripe_invoice_id = ?'
  ).bind(invoice.id).first();

  if (!existing) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`);
    return;
  }

  const orderInternalId = (existing as any).id;

  // Update order with finalized invoice details
  await env.DB.prepare(`
    UPDATE orders
    SET 
      stripe_status = ?,
      invoice_number = ?,
      invoice_url = ?,
      invoice_pdf = ?,
      due_date = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `).bind(
    'open',
    invoice.number || '',
    invoice.hosted_invoice_url || '',
    invoice.invoice_pdf || '',
    invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    new Date().toISOString(),
    invoice.id
  ).run();

  console.log(`[Webhook] ✅ Updated order with invoice ${invoice.id} to 'open' status with URLs`);

  // Fetch and store line items if not already stored (webhooks may contain full data)
  // Check if line items already exist for this order
  const existingItems = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM order_items WHERE order_id = ?'
  ).bind(orderInternalId).first();

  const hasItems = existingItems && (existingItems as any).count > 0;

  if (!hasItems && invoice.lines?.data) {
    console.log(`[Webhook] 📦 Storing ${invoice.lines.data.length} order items for invoice ${invoice.id}`);
    
    const now = new Date().toISOString();
    const lineItemInserts = [];

    for (const line of invoice.lines.data) {
      // Skip non-product items (e.g., shipping)
      if (!line.price) continue;

      const price = line.price as Stripe.Price;
      const product = price.product as Stripe.Product | string;
      const taxAmount = line.tax_amounts?.[0]?.amount || 0;

      // Extract product details (handle both expanded and non-expanded product)
      let productName = line.description || '';
      let sku = '';
      let brand = '';
      let imageUrl = '';
      let productId = '';
      let shopifyVariantId = '';

      if (typeof product === 'object' && product !== null) {
        // Product is expanded
        productName = productName || product.name || '';
        sku = product.metadata?.partNumber || '';
        brand = product.metadata?.brand || '';
        imageUrl = product.images?.[0] || '';
        productId = product.metadata?.productId || '';
        shopifyVariantId = product.metadata?.shopifyVariantId || '';
      }

      lineItemInserts.push(
        env.DB.prepare(`
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
          productId,
          productName,
          sku,
          brand,
          imageUrl,
          line.quantity || 1,
          (price.unit_amount || 0) / 100, // Convert cents to euros
          line.amount / 100, // Convert cents to euros
          taxAmount,
          shopifyVariantId,
          price.id,
          line.id,
          now
        )
      );
    }

    if (lineItemInserts.length > 0) {
      await env.DB.batch(lineItemInserts);
      console.log(`[Webhook] ✅ Stored ${lineItemInserts.length} order items for invoice ${invoice.id}`);
    }
  }
}

/**
 * Handle invoice.paid event
 * 
 * Fired when customer successfully pays the invoice.
 * Marks order as paid and records payment timestamp.
 * 
 * This is the RECOMMENDED event to listen to (covers both automatic and manual payments).
 */
async function handleInvoicePaid(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 💰 Processing invoice.paid: ${invoice.id}`);

  // Check if order exists in D1
  const existing = await env.DB.prepare(
    'SELECT id FROM orders WHERE stripe_invoice_id = ?'
  ).bind(invoice.id).first();

  if (!existing) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`);
    return;
  }

  // Update order with payment details
  await env.DB.prepare(`
    UPDATE orders
    SET 
      stripe_status = ?,
      status = ?,
      paid_at = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `).bind(
    'paid',
    'confirmed', // Update order status to confirmed when paid
    invoice.status_transitions?.paid_at 
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
    new Date().toISOString(),
    invoice.id
  ).run();

  console.log(`[Webhook] ✅ Marked order with invoice ${invoice.id} as PAID (€${(invoice.amount_paid / 100).toFixed(2)})`);

  // ============================================================================
  // SEND TELEGRAM NOTIFICATION
  // ============================================================================
  await sendInvoicePaidNotification(env, invoice);
}

/**
 * Handle invoice.voided event
 * 
 * Fired when invoice is manually voided (cancelled).
 * Updates status and records void timestamp.
 * 
 * INVENTORY: Increases B2B stock for each product (order cancelled, stock returned)
 */
async function handleInvoiceVoided(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 🚫 Processing invoice.voided: ${invoice.id}`);

  // Check if order exists in D1
  const existing = await env.DB.prepare(
    'SELECT id FROM orders WHERE stripe_invoice_id = ?'
  ).bind(invoice.id).first();

  if (!existing) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`);
    return;
  }

  const orderInternalId = (existing as any).id;

  await env.DB.prepare(`
    UPDATE orders
    SET 
      stripe_status = ?,
      status = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `).bind(
    'void',
    'cancelled', // Update order status to cancelled when voided
    new Date().toISOString(),
    invoice.id
  ).run();

  console.log(`[Webhook] ✅ Voided order with invoice ${invoice.id}`);

  // ============================================================================
  // INCREASE B2B STOCK (Invoice voided = order cancelled)
  // ============================================================================
  await increaseB2BStockFromInvoice(env, invoice, orderInternalId);

  // ============================================================================
  // SEND TELEGRAM NOTIFICATION
  // ============================================================================
  await sendInvoiceVoidedNotification(env, invoice);
}

/**
 * Handle invoice.payment_failed event
 * 
 * Fired when payment attempt fails.
 * We don't track failed payments per requirements, but log for debugging.
 */
async function handleInvoicePaymentFailed(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] ⚠️  Payment failed for invoice ${invoice.id} - logged for debugging`);
  
  // Per requirements: "2) no" - we don't track failed payments
  // Just log it for debugging purposes
}

// ============================================================================
// INVENTORY STOCK MANAGEMENT HELPERS
// ============================================================================

/**
 * Increase B2B stock when invoice is voided (order cancelled)
 * 
 * Reverses stock reduction by returning products to B2B inventory.
 * Uses productId from metadata (works for both Shopify-linked and standalone products).
 * Logs all changes to inventory_sync_log for audit trail.
 */
async function increaseB2BStockFromInvoice(
  env: Env,
  invoice: Stripe.Invoice,
  orderInternalId: string
) {
  if (!invoice.lines?.data || invoice.lines.data.length === 0) {
    console.log(`[Webhook] ℹ️  No line items in invoice ${invoice.id}, skipping stock increase`);
    return;
  }

  console.log(`[Webhook] 📈 Increasing B2B stock for ${invoice.lines.data.length} line items`);

  const now = new Date().toISOString();
  const stockUpdates: D1PreparedStatement[] = [];
  const logEntries: D1PreparedStatement[] = [];

  for (const line of invoice.lines.data) {
    // Skip non-product items (e.g., shipping with metadata.type = 'shipping')
    if (line.metadata?.type === 'shipping') {
      continue;
    }

    const productId = line.metadata?.product_id;
    const quantity = line.quantity || 1;

    if (!productId) {
      console.warn(`[Webhook] ⚠️  Line item ${line.id} has no product_id in metadata, skipping stock update`);
      continue;
    }

    // Verify product exists in database
    const product = await env.DB.prepare(
      'SELECT id FROM products WHERE id = ?'
    ).bind(productId).first();

    if (!product) {
      console.warn(`[Webhook] ⚠️  Product ${productId} not found in database`);
      continue;
    }

    // Get current inventory
    const currentInventory = await env.DB.prepare(
      'SELECT total_stock, b2b_stock, b2c_stock FROM product_inventory WHERE product_id = ?'
    ).bind(productId).first();

    if (!currentInventory) {
      console.warn(`[Webhook] ⚠️  No inventory record for product ${productId}`);
      continue;
    }

    const currentB2BStock = (currentInventory as any).b2b_stock;
    const currentB2CStock = (currentInventory as any).b2c_stock;
    const currentTotalStock = (currentInventory as any).total_stock;

    const newB2BStock = currentB2BStock + quantity;
    const newTotalStock = currentTotalStock + quantity;

    // Prepare stock update
    stockUpdates.push(
      env.DB.prepare(`
        UPDATE product_inventory
        SET 
          total_stock = ?,
          b2b_stock = ?,
          updated_at = ?
        WHERE product_id = ?
      `).bind(newTotalStock, newB2BStock, now, productId)
    );

    // Prepare audit log entry
    logEntries.push(
      env.DB.prepare(`
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          total_change, b2b_change, b2c_change,
          total_stock_after, b2b_stock_after, b2c_stock_after,
          reference_id, reference_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        productId,
        'b2b_order_void',
        'stripe_webhook',
        quantity,  // Total increased
        quantity,  // B2B increased
        0,         // B2C unchanged
        newTotalStock,
        newB2BStock,
        currentB2CStock,
        invoice.id,
        'stripe_invoice_voided',
        now
      )
    );

    console.log(`[Webhook] 📈 Product ${productId}: B2B stock ${currentB2BStock} → ${newB2BStock} (+${quantity})`);
  }

  if (stockUpdates.length > 0) {
    try {
      await env.DB.batch([...stockUpdates, ...logEntries]);
      console.log(`[Webhook] ✅ Increased B2B stock for ${stockUpdates.length} products`);
    } catch (error: any) {
      console.error(`[Webhook] ❌ Failed to increase stock:`, error);
      throw error;
    }
  } else {
    console.log(`[Webhook] ℹ️  No stock updates needed for invoice ${invoice.id}`);
  }
}

// ============================================================================
// TELEGRAM NOTIFICATION HELPERS
// ============================================================================

/**
 * Send invoice paid notification to Telegram
 * Uses service binding to telegram-service
 */
async function sendInvoicePaidNotification(env: Env, invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] 📬 Sending invoice paid notification for ${invoice.id}`);
    
    const telegramRequest = new Request('https://dummy/notifications/invoice/paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: invoice.id,
        number: invoice.number,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        status_transitions: invoice.status_transitions,
        metadata: invoice.metadata,
        lines: invoice.lines,
      }),
    });

    await env.TELEGRAM_SERVICE.fetch(telegramRequest);
    console.log(`[Webhook] ✅ Invoice paid notification sent for ${invoice.id}`);
  } catch (error) {
    // Log error but don't fail the webhook (notifications are not critical)
    console.error(`[Webhook] ⚠️  Failed to send invoice paid notification:`, error);
  }
}

/**
 * Send invoice voided notification to Telegram
 * Uses service binding to telegram-service
 */
async function sendInvoiceVoidedNotification(env: Env, invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] 📬 Sending invoice voided notification for ${invoice.id}`);
    
    const telegramRequest = new Request('https://dummy/notifications/invoice/voided', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: invoice.id,
        number: invoice.number,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        metadata: invoice.metadata,
        lines: invoice.lines,
      }),
    });

    await env.TELEGRAM_SERVICE.fetch(telegramRequest);
    console.log(`[Webhook] ✅ Invoice voided notification sent for ${invoice.id}`);
  } catch (error) {
    // Log error but don't fail the webhook (notifications are not critical)
    console.error(`[Webhook] ⚠️  Failed to send invoice voided notification:`, error);
  }
}

export default webhooks;
