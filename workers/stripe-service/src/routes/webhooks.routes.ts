/**
 * Stripe Webhook Routes - REFACTORED
 *
 * Handles Stripe webhook events for invoice lifecycle:
 * - invoice.created: When invoice is ready (adds URLs, sets status to 'open')
 * - invoice.updated: Invoice status/details change
 * - invoice.paid: When invoice payment succeeds → deducts D1 stock for standalone products
 * - invoice.voided: When invoice is voided/cancelled
 *
 * Uses @b2b/db package for all database operations.
 *
 * INVENTORY FLOW:
 * - Shopify-linked products: Stock updated via Shopify webhook (NOT here)
 * - Standalone products: Stock deducted here on invoice.paid
 *
 * Implements idempotency to prevent duplicate event processing.
 */

import { Hono } from 'hono';
import Stripe from 'stripe';
import { createDb, eq } from '@b2b/db';
import * as schema from '@b2b/db/schema';
import {
  getWebhookEventByEventId,
  createWebhookEvent,
  markWebhookEventProcessed,
  getOrderByStripeInvoiceId,
  updateOrder,
  getOrderItems,
  createOrderItem,
  getInventoryByProductId,
  deductStock,
} from '@b2b/db/operations';
import type { Env } from '../types';
import {
  sendInvoicePaidNotification,
  sendInvoiceVoidedNotification,
} from '../utils/telegram-messages';

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
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`[Webhook] ✅ Received verified event: ${event.type} (${event.id})`);

    // Create db client
    const db = createDb(c.env.DB);

    // Check if we've already processed this event (idempotency)
    const existingEvent = await getWebhookEventByEventId(db, event.id);

    if (existingEvent) {
      console.log(`[Webhook] ⏭️  Event ${event.id} already processed, skipping`);
      return c.json({ received: true, processed: false, reason: 'duplicate' });
    }

    // Store event in webhook_events table (for audit trail and idempotency)
    const webhookEvent = await createWebhookEvent(db, {
      id: crypto.randomUUID(),
      event_type: event.type,
      event_id: event.id,
      payload: JSON.stringify(event.data.object),
      processed: 0,
      created_at: new Date().toISOString(),
    });

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
    if (webhookEvent) {
      await markWebhookEventProcessed(db, webhookEvent.id, success, errorMessage || undefined);
    }

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
 * NOTE: Stock changes are handled by Shopify webhooks after sync, not during invoice creation.
 */
async function handleInvoiceCreated(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 📄 Processing invoice.created: ${invoice.id}`);

  const db = createDb(env.DB);

  // Check if order exists (linked by stripe_invoice_id)
  const order = await getOrderByStripeInvoiceId(db, invoice.id);

  if (!order) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found - skipping update`);
    return;
  }

  // Update order with finalized invoice details
  await updateOrder(db, order.id, {
    stripe_status: 'open',
    invoice_number: invoice.number || '',
    invoice_url: invoice.hosted_invoice_url || '',
    invoice_pdf: invoice.invoice_pdf || '',
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
  });

  console.log(`[Webhook] ✅ Updated order with invoice ${invoice.id} to 'open' status with URLs`);

  // Fetch and store line items if not already stored
  const existingItems = await getOrderItems(db, order.id);

  if (existingItems.length === 0 && invoice.lines?.data) {
    console.log(
      `[Webhook] 📦 Storing ${invoice.lines.data.length} order items for invoice ${invoice.id}`
    );

    for (const line of invoice.lines.data) {
      // Skip non-product items (e.g., shipping)
      if (!line.price) continue;

      const price = line.price as Stripe.Price;
      const product = price.product as Stripe.Product | string;
      const taxAmount = line.tax_amounts?.[0]?.amount || 0;

      // Extract product details (handle both expanded and non-expanded product)
      let productName = line.description || '';
      let sku = '';
      let b2bSku = '';
      let brand = '';
      let imageUrl = '';
      let productId = '';
      let shopifyVariantId = '';

      if (typeof product === 'object' && product !== null) {
        // Product is expanded
        productName = productName || product.name || '';
        sku = product.metadata?.partNumber || '';
        b2bSku = product.metadata?.b2bSku || '';
        brand = product.metadata?.brand || '';
        imageUrl = product.images?.[0] || '';
        productId = product.metadata?.productId || '';
        shopifyVariantId = product.metadata?.shopifyVariantId || '';
      }

      await createOrderItem(db, {
        id: crypto.randomUUID(),
        order_id: order.id,
        product_id: productId || null,
        product_name: productName,
        product_sku: sku,
        b2b_sku: b2bSku,
        brand: brand,
        image_url: imageUrl,
        quantity: line.quantity || 1,
        unit_price: (price.unit_amount || 0) / 100, // Convert cents to euros
        total_price: line.amount / 100, // Convert cents to euros
        tax_cents: taxAmount,
        shopify_variant_id: shopifyVariantId || null,
        stripe_price_id: price.id || null,
        stripe_invoice_item_id: line.id,
        created_at: new Date().toISOString(),
      });
    }

    console.log(
      `[Webhook] ✅ Stored ${invoice.lines.data.length} order items for invoice ${invoice.id}`
    );
  }
}

/**
 * Handle invoice.updated event
 *
 * Fired when Stripe updates an invoice (e.g., status change, shipping costs added).
 * Updates order with changed fields.
 */
async function handleInvoiceUpdated(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 🔄 Processing invoice.updated: ${invoice.id} (status: ${invoice.status})`);

  const db = createDb(env.DB);

  // Check if order exists
  const order = await getOrderByStripeInvoiceId(db, invoice.id);

  if (!order) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found - skipping update`);
    return;
  }

  const previousStatus = order.stripe_status;

  // Extract shipping cost from line items
  const shippingLine = invoice.lines?.data?.find((line) => line.metadata?.type === 'shipping');
  const shipping_cost_cents = shippingLine?.amount || 0;

  // Build update object
  const updates: any = {
    stripe_status: invoice.status,
  };

  if (invoice.number) updates.invoice_number = invoice.number;
  if (invoice.hosted_invoice_url) updates.invoice_url = invoice.hosted_invoice_url;
  if (invoice.invoice_pdf) updates.invoice_pdf = invoice.invoice_pdf;
  if (invoice.due_date) updates.due_date = new Date(invoice.due_date * 1000).toISOString();
  if (shipping_cost_cents > 0) updates.shipping_cost = shipping_cost_cents / 100; // Convert to euros

  // Update customer details if available
  const customer = invoice.customer_shipping;
  if (customer) {
    if (customer.name) updates.shipping_address_company = customer.name;
    if (customer.phone) updates.shipping_phone = customer.phone;
    if (customer.address) {
      if (customer.address.line1) updates.shipping_address_street = customer.address.line1;
      if (customer.address.city) updates.shipping_address_city = customer.address.city;
      if (customer.address.postal_code) updates.shipping_address_zip = customer.address.postal_code;
      if (customer.address.country) updates.shipping_address_country = customer.address.country;
    }
  }

  await updateOrder(db, order.id, updates);

  console.log(
    `[Webhook] ✅ Updated order ${order.id} (invoice ${invoice.id}): ` +
      `status ${previousStatus} → ${invoice.status}, ` +
      `shipping €${(shipping_cost_cents / 100).toFixed(2)}`
  );
}

/**
 * Handle invoice.paid event
 *
 * Fired when customer successfully pays the invoice.
 * - Marks order as paid
 * - Records payment timestamp
 * - Deducts D1 stock for STANDALONE products only (Shopify-linked handled by Shopify webhook)
 */
async function handleInvoicePaid(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 💰 Processing invoice.paid: ${invoice.id}`);

  const db = createDb(env.DB);

  // Check if order exists
  const order = await getOrderByStripeInvoiceId(db, invoice.id);

  if (!order) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found - skipping update`);
    return;
  }

  // Update order with payment details
  await updateOrder(db, order.id, {
    stripe_status: 'paid',
    status: 'confirmed', // Update order status to confirmed when paid
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
  });

  console.log(
    `[Webhook] ✅ Marked order with invoice ${invoice.id} as PAID (€${(invoice.amount_paid / 100).toFixed(2)})`
  );

  // Deduct stock for STANDALONE products only
  // Shopify-linked products are already handled by Shopify webhook
  const orderItems = await getOrderItems(db, order.id);

  for (const item of orderItems) {
    if (!item.product_id) continue;

    // Get inventory to check if Shopify-linked
    const inventory = await getInventoryByProductId(db, item.product_id);

    if (!inventory) {
      console.warn(`[Webhook] ⚠️ No inventory record for product ${item.product_id}`);
      continue;
    }

    // Skip Shopify-linked products (their stock is managed by Shopify webhook)
    const isShopifyLinked = !!(
      inventory.shopify_inventory_item_id &&
      inventory.shopify_location_id &&
      inventory.sync_enabled
    );

    if (isShopifyLinked) {
      console.log(
        `[Webhook] ⏭️ Skipping Shopify-linked product ${item.product_id} - stock managed by Shopify webhook`
      );
      continue;
    }

    // Deduct stock for standalone product
    const result = await deductStock(db, item.product_id, item.quantity);

    if (result.success) {
      console.log(
        `[Webhook] 📦 Deducted ${item.quantity} stock for standalone product ${item.product_id} (new stock: ${result.newStock})`
      );
    } else {
      console.error(`[Webhook] ❌ Failed to deduct stock for ${item.product_id}: ${result.error}`);
    }
  }

  // Send Telegram notification
  await sendInvoicePaidNotification(env, invoice);
}

/**
 * Handle invoice.voided event
 *
 * Fired when invoice is manually voided (cancelled).
 * Updates status and triggers Shopify sync to restore stock.
 *
 * INVENTORY: Shopify webhook will update stock after sync completes
 */
async function handleInvoiceVoided(env: Env, invoice: Stripe.Invoice) {
  console.log(`[Webhook] 🚫 Processing invoice.voided: ${invoice.id}`);

  const db = createDb(env.DB);

  // Check if order exists
  const order = await getOrderByStripeInvoiceId(db, invoice.id);

  if (!order) {
    console.warn(`[Webhook] ⚠️  Order with invoice ${invoice.id} not found - skipping update`);
    return;
  }

  // Update order status
  await updateOrder(db, order.id, {
    stripe_status: 'void',
    status: 'cancelled', // Update order status to cancelled when voided
  });

  console.log(`[Webhook] ✅ Voided order with invoice ${invoice.id}`);

  // Return stock to inventory (unified stock system)
  await returnStockFromInvoice(env, invoice);

  // Send Telegram notification
  await sendInvoiceVoidedNotification(env, invoice);
}

/**
 * Handle customer.tax_id.created and customer.tax_id.updated events
 *
 * Fired when Stripe validates a customer's tax ID (BTW/VAT number).
 * Updates the user's btw_number_validated status when verification succeeds.
 *
 * Stores VIES verification data:
 * - btw_verified_name: Official company name from government registry
 * - btw_verified_address: Official registered address from government registry
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

  const db = createDb(env.DB);

  // Find user by stripe_customer_id
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.stripe_customer_id, customerId))
    .get();

  if (!user) {
    console.warn(
      `[Webhook] ⚠️  User with Stripe customer ${customerId} not found - skipping update`
    );
    return;
  }

  if (user.btw_number_validated === 1) {
    console.log(`[Webhook] ℹ️  User ${user.email} already has BTW validated, skipping`);
    return;
  }

  // Extract VIES verification data
  const verifiedName = taxId.verification.verified_name || null;
  const verifiedAddress = taxId.verification.verified_address || null;
  const now = new Date().toISOString();

  // Update user with VIES verification data
  await db
    .update(schema.users)
    .set({
      btw_number_validated: 1,
      btw_verified_name: verifiedName,
      btw_verified_address: verifiedAddress,
      btw_verified_at: now,
      updated_at: now,
    })
    .where(eq(schema.users.id, user.id))
    .run();

  console.log(
    `[Webhook] ✅ Validated BTW for user ${user.email} (${customerId}):\n` +
      `  Tax ID: ${taxId.type.toUpperCase()} ${taxId.value}\n` +
      `  VIES Name: ${verifiedName || 'N/A'}\n` +
      `  VIES Address: ${verifiedAddress || 'N/A'}\n` +
      `  Verified At: ${now}`
  );
}

// ============================================================================
// INVENTORY STOCK MANAGEMENT
// ============================================================================

/**
 * Return stock when invoice is voided
 *
 * - Shopify-linked products: Trigger Shopify sync → Shopify webhook updates D1
 * - Standalone products: Add stock directly to D1
 */
async function returnStockFromInvoice(env: Env, invoice: Stripe.Invoice) {
  if (!invoice.lines?.data || invoice.lines.data.length === 0) {
    console.log(`[Webhook] ℹ️  No line items in invoice ${invoice.id}, skipping stock return`);
    return;
  }

  const db = createDb(env.DB);

  // Build list of items to restore (skip shipping items)
  const shopifyItems: { product_id: string; quantity: number }[] = [];
  const standaloneItems: { product_id: string; quantity: number }[] = [];

  for (const line of invoice.lines.data) {
    // Skip non-product items (e.g., shipping)
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

    // Check if Shopify-linked
    const inventory = await getInventoryByProductId(db, productId);

    if (!inventory) {
      console.warn(`[Webhook] ⚠️ No inventory record for product ${productId}`);
      continue;
    }

    const isShopifyLinked = !!(
      inventory.shopify_inventory_item_id &&
      inventory.shopify_location_id &&
      inventory.sync_enabled
    );

    if (isShopifyLinked) {
      shopifyItems.push({ product_id: productId, quantity });
    } else {
      standaloneItems.push({ product_id: productId, quantity });
    }
  }

  // Handle standalone products - add stock directly to D1
  for (const item of standaloneItems) {
    const inventory = await getInventoryByProductId(db, item.product_id);
    if (inventory) {
      const newStock = (inventory.stock || 0) + item.quantity;
      await db
        .update(schema.product_inventory)
        .set({ stock: newStock, updated_at: new Date().toISOString() })
        .where(eq(schema.product_inventory.product_id, item.product_id))
        .run();
      console.log(
        `[Webhook] 📦 Restored ${item.quantity} stock for standalone product ${item.product_id} (new stock: ${newStock})`
      );
    }
  }

  // Handle Shopify-linked products - trigger restore via sync service
  if (shopifyItems.length > 0) {
    console.log(
      `[Webhook] 📈 Triggering Shopify sync to restore stock for ${shopifyItems.length} Shopify-linked products`
    );

    try {
      const shopifyHeaders = new Headers();
      shopifyHeaders.set('Content-Type', 'application/json');
      shopifyHeaders.set('X-Service-Token', env.SERVICE_SECRET);

      const shopifyRequest = new Request('https://dummy/sync/restore', {
        method: 'POST',
        headers: shopifyHeaders,
        body: JSON.stringify({
          products: shopifyItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity, // Amount to restore
            reason: 'other',
            reference_id: invoice.id,
          })),
        }),
      });

      const restoreResponse = await env.SHOPIFY_SYNC_SERVICE.fetch(shopifyRequest);
      const restoreResult = (await restoreResponse.json()) as { success: boolean };

      if (restoreResult.success) {
        console.log(`[Webhook] ✅ Shopify stock restored - webhook will update D1`);
      } else {
        console.warn(`[Webhook] ⚠️ Some Shopify stock restorations failed`);
      }
    } catch (shopifyError) {
      console.warn(`[Webhook] ⚠️  Failed to trigger Shopify restore:`, shopifyError);
    }
  }

  console.log(
    `[Webhook] ✅ Stock return complete: ${standaloneItems.length} standalone, ${shopifyItems.length} Shopify-linked`
  );
}

export default webhooks;
