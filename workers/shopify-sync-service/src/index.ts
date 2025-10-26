/**
 * Shopify Sync Service
 * 
 * Handles bidirectional inventory synchronization between B2B platform and Shopify
 * 
 * Routes:
 * - POST /sync/:productId - Manual sync single product to Shopify
 * - POST /sync/all - Trigger full reconciliation
 * - POST /webhooks/inventory-update - Shopify inventory level webhook
 * - POST /webhooks/orders-create - Shopify order created webhook
 * - GET /health - Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import {
  syncToShopify,
  handleShopifyInventoryUpdate,
  reconcileAllProducts,
} from './services/sync.service';
import { searchShopifyProducts } from './services/product-search.service';
import { verifyShopifyWebhook, isWebhookProcessed, markWebhookProcessed } from './utils/webhooks';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS
app.use('*', cors({
  origin: (origin) => origin, // Allow all origins for webhooks
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Shopify-*'],
}));

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

/**
 * POST /sync/all
 * Trigger full reconciliation of all sync-enabled products
 */
app.post('/sync/all', async (c) => {
  try {
    const result = await reconcileAllProducts(c.env);

    return c.json({
      success: true,
      message: 'Reconciliation complete',
      stats: result,
    });
  } catch (error: any) {
    console.error('Error during reconciliation:', error);
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
 */
app.post('/webhooks/inventory-update', async (c) => {
  try {
    // Get webhook headers
    const hmac = c.req.header('x-shopify-hmac-sha256');
    const topic = c.req.header('x-shopify-topic');
    const webhookId = c.req.header('x-shopify-webhook-id');

    if (!hmac || !topic || !webhookId) {
      return c.json({ error: 'Missing Shopify webhook headers' }, 400);
    }

    // Get raw body for HMAC verification
    const body = await c.req.text();

    // Verify webhook signature
    const isValid = await verifyShopifyWebhook(body, hmac, c.env.SHOPIFY_WEBHOOK_SECRET);

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Check for duplicate webhook
    const alreadyProcessed = await isWebhookProcessed(c.env.DB, webhookId);

    if (alreadyProcessed) {
      console.log(`⏭️ Webhook ${webhookId} already processed, skipping`);
      return c.json({ success: true, message: 'Already processed' });
    }

    // Parse payload
    const payload = JSON.parse(body);

    console.log('📥 Inventory update webhook:', payload);

    // Extract variant ID from inventory_item_id
    // Note: You may need to query Shopify to map inventory_item_id → variant_id
    // For now, assuming we store inventory_item_id in product_inventory table

    // Process the update
    // This is simplified - in production you'd need to map inventory_item_id to variant_id
    // For now, we'll mark it as processed and log it
    await markWebhookProcessed(c.env.DB, webhookId, topic, body, true);

    return c.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    console.error('❌ Error processing inventory webhook:', error);

    const webhookId = c.req.header('x-shopify-webhook-id');
    const topic = c.req.header('x-shopify-topic') || 'inventory_levels/update';
    const body = await c.req.text();

    if (webhookId) {
      await markWebhookProcessed(c.env.DB, webhookId, topic, body, false, error.message);
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

// ============================================================================
// SCHEDULED HANDLER (Cron Trigger)
// ============================================================================

export default {
  fetch: app.fetch,

  // Cron trigger for periodic reconciliation
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('⏰ Running scheduled reconciliation');

    ctx.waitUntil(
      (async () => {
        try {
          const result = await reconcileAllProducts(env);
          console.log(`✅ Scheduled reconciliation complete:`, result);
        } catch (error) {
          console.error('❌ Scheduled reconciliation failed:', error);
        }
      })()
    );
  },
};
