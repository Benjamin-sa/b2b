/**
 * Webhook routes (Shopify → B2B)
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { handleShopifyInventoryUpdate } from '../services/sync.service';
import { verifyShopifyWebhook, isWebhookProcessed, markWebhookProcessed } from '../utils/webhooks';
import { getAllInventoriesByInventoryItemId } from '../utils/database';
import { checkWebhookRegistration, ensureWebhookRegistration } from '../utils/webhook-registration';

const webhooksRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /webhooks/check
 * Check if the inventory-update webhook is registered in Shopify
 */
webhooksRoutes.get('/check', async (c) => {
  try {
    const result = await checkWebhookRegistration(c.env);

    return c.json({
      success: true,
      registered: result.registered,
      expected_url: result.expectedUrl,
      matching_subscription: result.matchingSubscription
        ? {
            id: result.matchingSubscription.id,
            topic: result.matchingSubscription.topic,
            callback_url: result.matchingSubscription.callbackUrl,
            api_version: result.matchingSubscription.apiVersion?.handle,
          }
        : null,
      all_inventory_subscriptions: result.subscriptions.map((s) => ({
        id: s.id,
        topic: s.topic,
        callback_url: s.callbackUrl,
        api_version: s.apiVersion?.handle,
      })),
    });
  } catch (error: any) {
    console.error('Error checking webhook registration:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to check webhook registration',
      },
      500
    );
  }
});

/**
 * POST /webhooks/ensure
 * Force-ensure the webhook is registered (create/update as needed)
 */
webhooksRoutes.post('/ensure', async (c) => {
  try {
    const result = await ensureWebhookRegistration(c.env);

    return c.json({
      success: true,
      action: result.action,
      subscription: result.subscription
        ? {
            id: result.subscription.id,
            topic: result.subscription.topic,
            callback_url: result.subscription.callbackUrl,
            api_version: result.subscription.apiVersion?.handle,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error ensuring webhook registration:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Failed to ensure webhook registration',
      },
      500
    );
  }
});

/**
 * POST /webhooks/inventory-update
 * Handle Shopify inventory_levels/update webhook
 */
webhooksRoutes.post('/inventory-update', async (c) => {
  try {
    // 1. Validate webhook headers
    const hmac = c.req.header('x-shopify-hmac-sha256');
    const topic = c.req.header('x-shopify-topic');
    const webhookId = c.req.header('x-shopify-webhook-id');

    if (!hmac || !topic || !webhookId) {
      console.error('❌ Missing Shopify webhook headers');
      return c.json({ error: 'Missing Shopify webhook headers' }, 400);
    }

    // 2. Get raw body for HMAC verification
    const body = await c.req.text();

    // 3. Verify webhook signature
    const isValid = await verifyShopifyWebhook(body, hmac, c.env.SHOPIFY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // 4. Check for duplicate webhook (idempotency)
    const alreadyProcessed = await isWebhookProcessed(c.env.DB, webhookId);
    if (alreadyProcessed) {
      console.log(`⏭️ Webhook ${webhookId} already processed, skipping`);
      return c.json({ success: true, message: 'Already processed' });
    }

    // 5. Parse payload
    const payload = JSON.parse(body);
    console.log('📥 Inventory update webhook received:', {
      inventory_item_id: payload.inventory_item_id,
      location_id: payload.location_id,
      available: payload.available,
    });

    // 6. Extract and validate inventory data
    const inventoryItemId = payload.inventory_item_id?.toString();
    const available = payload.available;

    if (!inventoryItemId || available === undefined) {
      console.error('❌ Invalid webhook payload - missing inventory_item_id or available');
      await markWebhookProcessed(c.env.DB, webhookId, topic, body, false, 'Invalid payload');
      return c.json({ error: 'Invalid payload' }, 400);
    }

    // 7. Clean inventory item ID (remove GID format if present)
    const cleanInventoryItemId = inventoryItemId.includes('/')
      ? inventoryItemId.split('/').pop() || inventoryItemId
      : inventoryItemId;

    // 8. Find ALL linked products (multiple B2B products can link to same Shopify item)
    const inventories = await getAllInventoriesByInventoryItemId(c.env.DB, cleanInventoryItemId);
    if (inventories.length === 0) {
      console.warn(`⚠️ No B2B product linked to Shopify inventory item ${cleanInventoryItemId}`);
      await markWebhookProcessed(c.env.DB, webhookId, topic, body, true, 'No linked product');
      return c.json({ success: true, message: 'No linked product found' });
    }

    console.log(
      `📦 Found ${inventories.length} product(s) linked to inventory item ${cleanInventoryItemId}`
    );

    // 9. Process each linked product
    const updatedProducts: string[] = [];
    const skippedProducts: string[] = [];

    for (const inventory of inventories) {
      if (!inventory.sync_enabled) {
        console.log(`⏸️ Sync disabled for product ${inventory.product_id}, skipping`);
        skippedProducts.push(inventory.product_id);
        continue;
      }

      try {
        await handleShopifyInventoryUpdate(
          c.env,
          inventory.shopify_variant_id || '',
          available,
          inventory.product_id
        );
        updatedProducts.push(inventory.product_id);
        console.log(`✅ Updated stock for product ${inventory.product_id}: → ${available}`);
      } catch (error: any) {
        console.error(`❌ Failed to update product ${inventory.product_id}:`, error.message);
      }
    }

    // 10. Mark webhook as processed
    await markWebhookProcessed(c.env.DB, webhookId, topic, body, true);

    return c.json({
      success: true,
      message: `Inventory updated for ${updatedProducts.length} product(s)`,
      updatedProducts,
      skippedProducts,
    });
  } catch (error: any) {
    console.error('❌ Error processing inventory webhook:', error);

    try {
      const webhookId = c.req.header('x-shopify-webhook-id');
      const topic = c.req.header('x-shopify-topic') || 'inventory_levels/update';
      if (webhookId) {
        await markWebhookProcessed(c.env.DB, webhookId, topic, '', false, error.message);
      }
    } catch (markError) {
      console.error('❌ Failed to mark webhook as processed:', markError);
    }

    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
});

export default webhooksRoutes;
