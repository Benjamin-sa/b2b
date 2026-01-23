/**
 * Shopify Sync Service
 *
 * Handles bidirectional inventory synchronization between B2B platform and Shopify
 *
 * Routes:
 * - POST /sync/:productId - Sync single product to Shopify
 * - POST /webhooks/inventory-update - Shopify inventory level webhook
 * - GET /health - Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createServiceAuthMiddleware } from '../../shared-types/service-auth';
import type { Env } from './types';
import { syncToShopify, handleShopifyInventoryUpdate } from './services/sync.service';
import { searchShopifyProducts } from './services/product-search.service';
import { verifyShopifyWebhook, isWebhookProcessed, markWebhookProcessed } from './utils/webhooks';
import { getInventoryByInventoryItemId } from './utils/database';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// 🔐 Service authentication - blocks direct HTTP access in production
app.use(
  '*',
  createServiceAuthMiddleware({
    allowedPaths: ['/', '/health', '/webhooks/inventory-update'], // Allow Shopify webhooks
  })
);

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => origin, // Allow all origins for webhooks
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Shopify-*'],
  })
);

// Logging
app.use('*', async (c, next) => {
  const start = Date.now();
  console.log(`➡️ ${c.req.method} ${c.req.url}`);
  await next();
  const duration = Date.now() - start;
  console.log(`⬅️ ${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    service: 'Shopify Sync Service',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// OUTBOUND SYNC (B2B → Shopify)
// ============================================================================

/**
 * GET /shopify/products
 * Search Shopify products for linking with B2B products
 * Query params: query, productId, variantId, sku, limit
 */
app.get('/shopify/products', async (c) => {
  try {
    const query = c.req.query('query');
    const productId = c.req.query('productId');
    const variantId = c.req.query('variantId');
    const sku = c.req.query('sku');
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const variants = await searchShopifyProducts(c.env, {
      query,
      productId,
      variantId,
      sku,
      limit,
    });

    return c.json({
      success: true,
      data: variants,
      count: variants.length,
    });
  } catch (error: any) {
    console.error('Error searching Shopify products:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
});

/**
 * POST /sync/:productId
 * Manually sync a single product's B2C stock to Shopify
 */
app.post('/sync/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');

    const result = await syncToShopify(c.env, productId);

    if (result.success) {
      return c.json({
        success: true,
        message: 'Product synced to Shopify successfully',
        productId,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error,
          productId,
        },
        500
      );
    }
  } catch (error: any) {
    console.error('Error syncing product:', error);
    return c.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
});

// ============================================================================
// INBOUND WEBHOOKS (Shopify → B2B)
// ============================================================================

/**
 * POST /webhooks/inventory-update
 * Handle Shopify inventory_levels/update webhook
 *
 * Uses handleShopifyInventoryUpdate from sync.service which properly handles:
 * - 'split' mode: Updates only b2c_stock (B2B stock unchanged)
 * - 'unified' mode: Updates total_stock and b2b_stock (shared pool)
 */
app.post('/webhooks/inventory-update', async (c) => {
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

    // 8. Find linked product
    const inventory = await getInventoryByInventoryItemId(c.env.DB, cleanInventoryItemId);
    if (!inventory) {
      console.warn(`⚠️ No B2B product linked to Shopify inventory item ${cleanInventoryItemId}`);
      await markWebhookProcessed(c.env.DB, webhookId, topic, body, true, 'No linked product');
      return c.json({ success: true, message: 'No linked product found' });
    }

    // 9. Check if sync is enabled
    if (!inventory.sync_enabled) {
      console.log(`⏸️ Sync disabled for product ${inventory.product_id}, skipping`);
      await markWebhookProcessed(c.env.DB, webhookId, topic, body, true, 'Sync disabled');
      return c.json({ success: true, message: 'Sync disabled for product' });
    }

    // 10. Process the inventory update using sync service (handles stock_mode properly)
    await handleShopifyInventoryUpdate(
      c.env,
      inventory.shopify_variant_id || '',
      available,
      webhookId
    );

    // 11. Mark webhook as processed
    await markWebhookProcessed(c.env.DB, webhookId, topic, body, true);

    return c.json({
      success: true,
      message: 'Inventory updated',
      productId: inventory.product_id,
      stockMode: inventory.stock_mode || 'split',
    });
  } catch (error: any) {
    console.error('❌ Error processing inventory webhook:', error);

    // Try to mark webhook as failed
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

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      code: 'shopify-sync/not-found',
    },
    404
  );
});

app.onError((err, c) => {
  console.error('[Shopify Sync Error]', err);
  return c.json(
    {
      error: 'Internal Server Error',
      code: 'shopify-sync/error',
      message: err.message,
    },
    500
  );
});

export default app;
