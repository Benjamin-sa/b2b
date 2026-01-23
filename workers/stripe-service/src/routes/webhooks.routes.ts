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
import {
  sendInvoicePaidNotification,
  sendInvoiceVoidedNotification,
} from '../utils/telegram-messages';
import { buildInvoiceUpdateQuery, extractShippingCost } from '../utils/invoice-update-builder';

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
      apiVersion: '2025-02-24.acacia',
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
    const existingEvent = await c.env.DB.prepare('SELECT id FROM webhook_events WHERE event_id = ?')
      .bind(event.id)
      .first();

    if (existingEvent) {
      console.log(`[Webhook] ⏭️  Event ${event.id} already processed, skipping`);
      return c.json({ received: true, processed: false, reason: 'duplicate' });
    }

    // Store event in webhook_events table (for audit trail and idempotency)
    await c.env.DB.prepare(
      `
      INSERT INTO webhook_events (
        id, event_type, event_id, payload, processed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        crypto.randomUUID(),
        event.type,
        event.id,
        JSON.stringify(event.data.object),
        0, // Not processed yet
        new Date().toISOString()
      )
      .run();

    // Handle different event types
    let success = true;
    let errorMessage: string | null = null;

    try {
      switch (event.type) {
        case 'invoice.created':
          await handleInvoiceCreated(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.updated':
          await handleInvoiceUpdated(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.voided':
          await handleInvoiceVoided(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'customer.tax_id.created':
        case 'customer.tax_id.updated':
          await handleCustomerTaxIdVerification(c.env, event.data.object as Stripe.TaxId);
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
    await c.env.DB.prepare(
      `
      UPDATE webhook_events
      SET processed = ?, success = ?, error_message = ?, processed_at = ?
      WHERE event_id = ?
    `
    )
      .bind(
        1, // Processed
        success ? 1 : 0,
        errorMessage,
        new Date().toISOString(),
        event.id
      )
      .run();

    if (!success) {
      return c.json(
        {
          received: true,
          processed: false,
          error: errorMessage,
        },
        500
      );
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
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE stripe_invoice_id = ?')
    .bind(invoice.id)
    .first();

  if (!existing) {
    console.warn(
      `[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`
    );
    return;
  }

  const orderInternalId = (existing as any).id;

  // Update order with finalized invoice details
  await env.DB.prepare(
    `
    UPDATE orders
    SET 
      stripe_status = ?,
      invoice_number = ?,
      invoice_url = ?,
      invoice_pdf = ?,
      due_date = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `
  )
    .bind(
      'open',
      invoice.number || '',
      invoice.hosted_invoice_url || '',
      invoice.invoice_pdf || '',
      invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      new Date().toISOString(),
      invoice.id
    )
    .run();

  console.log(`[Webhook] ✅ Updated order with invoice ${invoice.id} to 'open' status with URLs`);

  // Fetch and store line items if not already stored (webhooks may contain full data)
  // Check if line items already exist for this order
  const existingItems = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM order_items WHERE order_id = ?'
  )
    .bind(orderInternalId)
    .first();

  const hasItems = existingItems && (existingItems as any).count > 0;

  if (!hasItems && invoice.lines?.data) {
    console.log(
      `[Webhook] 📦 Storing ${invoice.lines.data.length} order items for invoice ${invoice.id}`
    );

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
      let b2bSku = ''; // ✅ B2B SKU
      let brand = '';
      let imageUrl = '';
      let productId = '';
      let shopifyVariantId = '';

      if (typeof product === 'object' && product !== null) {
        // Product is expanded
        productName = productName || product.name || '';
        sku = product.metadata?.partNumber || '';
        b2bSku = product.metadata?.b2bSku || ''; // ✅ Extract B2B SKU from product metadata
        brand = product.metadata?.brand || '';
        imageUrl = product.images?.[0] || '';
        productId = product.metadata?.productId || '';
        shopifyVariantId = product.metadata?.shopifyVariantId || '';
      }

      lineItemInserts.push(
        env.DB.prepare(
          `
          INSERT INTO order_items (
            id, order_id, product_id,
            product_name, product_sku, b2b_sku, brand, image_url,
            quantity, unit_price, total_price, tax_cents,
            shopify_variant_id, stripe_price_id, stripe_invoice_item_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).bind(
          crypto.randomUUID(),
          orderInternalId,
          productId,
          productName,
          sku,
          b2bSku, // ✅ Store B2B SKU in order items
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
      console.log(
        `[Webhook] ✅ Stored ${lineItemInserts.length} order items for invoice ${invoice.id}`
      );
    }
  }
}

/**
 * Handle invoice.updated event
 *
 * Fired when Stripe updates an invoice (e.g., status change from draft to open,
 * shipping costs added, customer details updated).
 *
 * Updates order with:
 * - Shipping cost from line items (metadata.type = 'shipping')
 * - Customer address/phone details
 * - Invoice URLs (if finalized)
 * - Status changes
 */
async function handleInvoiceUpdated(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 🔄 Processing invoice.updated: ${invoice.id} (status: ${invoice.status})`);

  // Check if order exists in D1 (linked by stripe_invoice_id)
  const existing = await env.DB.prepare(
    'SELECT id, stripe_status FROM orders WHERE stripe_invoice_id = ?'
  )
    .bind(invoice.id)
    .first();

  if (!existing) {
    console.warn(
      `[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`
    );
    return;
  }

  const orderInternalId = (existing as any).id;
  const previousStatus = (existing as any).stripe_status;

  // Extract shipping cost for logging
  const [shippingCostCents] = extractShippingCost(invoice);

  // Build dynamic update query using utility
  const { query, values } = buildInvoiceUpdateQuery(invoice);

  // Execute update
  await env.DB.prepare(query)
    .bind(...values)
    .run();

  console.log(
    `[Webhook] ✅ Updated order ${orderInternalId} (invoice ${invoice.id}): ` +
      `status ${previousStatus} → ${invoice.status}, ` +
      `shipping €${(shippingCostCents / 100).toFixed(2)}, ` +
      `${values.length - 1} fields updated` // -1 for WHERE clause param
  );
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
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE stripe_invoice_id = ?')
    .bind(invoice.id)
    .first();

  if (!existing) {
    console.warn(
      `[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`
    );
    return;
  }

  // Update order with payment details
  await env.DB.prepare(
    `
    UPDATE orders
    SET 
      stripe_status = ?,
      status = ?,
      paid_at = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `
  )
    .bind(
      'paid',
      'confirmed', // Update order status to confirmed when paid
      invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString(),
      new Date().toISOString(),
      invoice.id
    )
    .run();

  console.log(
    `[Webhook] ✅ Marked order with invoice ${invoice.id} as PAID (€${(invoice.amount_paid / 100).toFixed(2)})`
  );

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
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE stripe_invoice_id = ?')
    .bind(invoice.id)
    .first();

  if (!existing) {
    console.warn(
      `[Webhook] ⚠️  Order with invoice ${invoice.id} not found in D1 - skipping update`
    );
    return;
  }

  const orderInternalId = (existing as any).id;

  await env.DB.prepare(
    `
    UPDATE orders
    SET 
      stripe_status = ?,
      status = ?,
      updated_at = ?
    WHERE stripe_invoice_id = ?
  `
  )
    .bind(
      'void',
      'cancelled', // Update order status to cancelled when voided
      new Date().toISOString(),
      invoice.id
    )
    .run();

  console.log(`[Webhook] ✅ Voided order with invoice ${invoice.id}`);

  await increaseB2BStockFromInvoice(env, invoice, orderInternalId);

  await sendInvoiceVoidedNotification(env, invoice);
}

/**
 * Handle customer.tax_id.created and customer.tax_id.updated events
 *
 * Fired when Stripe validates a customer's tax ID (BTW/VAT number).
 * Updates the user's btw_number_validated status to 1 when verification succeeds.
 *
 * Stores VIES (EU VAT Information Exchange System) verification data:
 * - verified_name: Official company name from government registry
 * - verified_address: Official registered address from government registry
 *
 * These values come from the European Commission's VIES database, NOT from
 * customer-submitted data, and serve as authoritative sources for compliance.
 *
 * Listens to both events because:
 * - customer.tax_id.created: Initial submission (status may be "pending")
 * - customer.tax_id.updated: Status changes to "verified" after validation
 */
async function handleCustomerTaxIdVerification(env: Env, taxId: Stripe.TaxId) {
  console.log(
    `[Webhook] 🆔 Processing tax ID verification: ${taxId.id} (status: ${taxId.verification?.status})`
  );

  // Only process verified tax IDs
  if (taxId.verification?.status !== 'verified') {
    console.log(
      `[Webhook] ℹ️  Tax ID ${taxId.id} not verified yet (status: ${taxId.verification?.status}), skipping`
    );
    return;
  }

  const customerId = typeof taxId.customer === 'string' ? taxId.customer : taxId.customer?.id;

  if (!customerId) {
    console.warn(`[Webhook] ⚠️  Tax ID ${taxId.id} has no customer, skipping`);
    return;
  }

  // Find user by stripe_customer_id
  const user = await env.DB.prepare(
    'SELECT id, email, btw_number_validated FROM users WHERE stripe_customer_id = ?'
  )
    .bind(customerId)
    .first();

  if (!user) {
    console.warn(
      `[Webhook] ⚠️  User with Stripe customer ${customerId} not found in D1 - skipping update`
    );
    return;
  }

  const userId = (user as any).id;
  const userEmail = (user as any).email;
  const alreadyValidated = (user as any).btw_number_validated === 1;

  if (alreadyValidated) {
    console.log(`[Webhook] ℹ️  User ${userEmail} already has BTW validated, skipping`);
    return;
  }

  // Extract VIES verification data
  const verifiedName = taxId.verification.verified_name || null;
  const verifiedAddress = taxId.verification.verified_address || null;
  const now = new Date().toISOString();

  // ============================================================================
  // UPDATE USER WITH VIES VERIFICATION DATA
  // ============================================================================
  await env.DB.prepare(
    `
    UPDATE users
    SET 
      btw_number_validated = 1,
      btw_verified_name = ?,
      btw_verified_address = ?,
      btw_verified_at = ?,
      updated_at = ?
    WHERE id = ?
  `
  )
    .bind(verifiedName, verifiedAddress, now, now, userId)
    .run();

  console.log(
    `[Webhook] ✅ Validated BTW for user ${userEmail} (${customerId}):\n` +
      `  Tax ID: ${taxId.type.toUpperCase()} ${taxId.value}\n` +
      `  VIES Name: ${verifiedName || 'N/A'}\n` +
      `  VIES Address: ${verifiedAddress || 'N/A'}\n` +
      `  Verified At: ${now}`
  );
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
      console.warn(
        `[Webhook] ⚠️  Line item ${line.id} has no product_id in metadata, skipping stock update`
      );
      continue;
    }

    // Verify product exists in database
    const product = await env.DB.prepare('SELECT id FROM products WHERE id = ?')
      .bind(productId)
      .first();

    if (!product) {
      console.warn(`[Webhook] ⚠️  Product ${productId} not found in database`);
      continue;
    }

    // Get current inventory
    const currentInventory = await env.DB.prepare(
      'SELECT stock FROM product_inventory WHERE product_id = ?'
    )
      .bind(productId)
      .first();

    if (!currentInventory) {
      console.warn(`[Webhook] ⚠️  No inventory record for product ${productId}`);
      continue;
    }

    const currentStock = (currentInventory as any).stock || 0;
    const newStock = currentStock + quantity;

    // Prepare stock update
    stockUpdates.push(
      env.DB.prepare(
        `
        UPDATE product_inventory
        SET 
          stock = ?,
          updated_at = ?
        WHERE product_id = ?
      `
      ).bind(newStock, now, productId)
    );

    // Prepare audit log entry
    logEntries.push(
      env.DB.prepare(
        `
        INSERT INTO inventory_sync_log (
          id, product_id, action, source,
          stock_change, stock_after,
          reference_id, reference_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).bind(
        crypto.randomUUID(),
        productId,
        'b2b_order_void',
        'stripe_webhook',
        quantity, // stock_change
        newStock, // stock_after
        invoice.id,
        'invoice',
        now
      )
    );

    console.log(
      `[Webhook] 📈 Product ${productId}: stock ${currentStock} → ${newStock} (+${quantity})`
    );
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

export default webhooks;
