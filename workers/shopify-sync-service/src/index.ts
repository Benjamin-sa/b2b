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
import { createServiceAuthMiddleware } from '@b2b/types';
import type { Env } from './types';
import { syncToShopify, handleShopifyInventoryUpdate } from './services/sync.service';
import { searchShopifyProducts } from './services/product-search.service';
import { verifyShopifyWebhook, isWebhookProcessed, markWebhookProcessed } from './utils/webhooks';
import {
  getInventoryByInventoryItemId,
  getInventoryByProductId,
  getAllInventoriesByInventoryItemId,
} from './utils/database';
import { adjustShopifyInventory } from './utils/shopify';

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
 * POST /inventory/check
 * Check stock availability for multiple products from Shopify directly
 * Used by API Gateway before invoice creation
 *
 * Request Body:
 * {
 *   "products": [
 *     { "product_id": "uuid", "requested_quantity": 5 }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "items": [
 *     {
 *       "product_id": "uuid",
 *       "available": 10,
 *       "requested": 5,
 *       "sufficient": true
 *     }
 *   ]
 * }
 */
app.post('/inventory/check', async (c) => {
  try {
    const body = await c.req.json<{
      products: Array<{ product_id: string; requested_quantity: number }>;
    }>();

    if (!body.products || !Array.isArray(body.products)) {
      return c.json({ error: 'Invalid request: products array required' }, 400);
    }

    const results = [];

    for (const item of body.products) {
      const { product_id, requested_quantity } = item;

      // Get inventory info from D1 (to find Shopify variant ID)
      const inventory = await getInventoryByProductId(c.env.DB, product_id);

      if (!inventory) {
        results.push({
          product_id,
          available: 0,
          requested: requested_quantity,
          sufficient: false,
          error: 'Product not found in inventory',
        });
        continue;
      }

      if (!inventory.shopify_inventory_item_id || !inventory.shopify_location_id) {
        results.push({
          product_id,
          available: 0,
          requested: requested_quantity,
          sufficient: false,
          error: 'Product not linked to Shopify',
        });
        continue;
      }

      // Query Shopify directly for current stock
      try {
        const shopifyUrl = `https://${c.env.SHOPIFY_STORE_DOMAIN}/admin/api/${c.env.SHOPIFY_API_VERSION}/inventory_levels.json?inventory_item_ids=${inventory.shopify_inventory_item_id}&location_ids=${inventory.shopify_location_id}`;
        const shopifyResponse = await fetch(shopifyUrl, {
          headers: {
            'X-Shopify-Access-Token': c.env.SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        if (!shopifyResponse.ok) {
          results.push({
            product_id,
            available: 0,
            requested: requested_quantity,
            sufficient: false,
            error: 'Failed to query Shopify inventory',
          });
          continue;
        }

        const shopifyData = (await shopifyResponse.json()) as {
          inventory_levels: Array<{ available: number }>;
        };

        const available = shopifyData.inventory_levels[0]?.available || 0;
        const sufficient = available >= requested_quantity;

        results.push({
          product_id,
          available,
          requested: requested_quantity,
          sufficient,
        });
      } catch (shopifyError) {
        console.error(`Error checking Shopify stock for ${product_id}:`, shopifyError);
        results.push({
          product_id,
          available: 0,
          requested: requested_quantity,
          sufficient: false,
          error: 'Shopify query failed',
        });
      }
    }

    return c.json({
      success: true,
      items: results,
    });
  } catch (error: any) {
    console.error('Error checking inventory:', error);
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
 * POST /sync/deduct
 * Deduct stock from Shopify for multiple products (used when creating invoices)
 * ⚠️ MUST be defined BEFORE /sync/:productId to avoid route conflict
 *
 * Request body:
 * {
 *   products: [
 *     { product_id: string, quantity: number, reason?: string, reference_id?: string }
 *   ]
 * }
 *
 * This triggers Shopify inventory adjustment → Shopify webhook → D1 update
 */
app.post('/sync/deduct', async (c) => {
  try {
    const body = (await c.req.json()) as {
      products: Array<{
        product_id: string;
        quantity: number;
        reason?: string;
        reference_id?: string;
      }>;
    };

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return c.json({ success: false, error: 'Products array is required' }, 400);
    }

    console.log(`📦 [/sync/deduct] Processing ${body.products.length} products`);

    const results: Array<{
      product_id: string;
      success: boolean;
      new_quantity?: number;
      error?: string;
    }> = [];

    for (const item of body.products) {
      const { product_id, quantity, reason, reference_id } = item;

      // Get inventory info
      const inventory = await getInventoryByProductId(c.env.DB, product_id);

      if (!inventory) {
        console.warn(`[/sync/deduct] Product ${product_id} not found in inventory`);
        results.push({
          product_id,
          success: false,
          error: 'Product not found in inventory',
        });
        continue;
      }

      if (!inventory.shopify_inventory_item_id || !inventory.shopify_location_id) {
        console.warn(`[/sync/deduct] Product ${product_id} missing Shopify linkage`);
        results.push({
          product_id,
          success: false,
          error: 'Product not linked to Shopify (missing inventory_item_id or location_id)',
        });
        continue;
      }

      // Adjust Shopify inventory (negative delta = deduction)
      const adjustResult = await adjustShopifyInventory(
        c.env,
        inventory.shopify_inventory_item_id,
        inventory.shopify_location_id,
        -quantity, // Negative for deduction
        reason || 'correction' // Valid Shopify reason
      );

      if (adjustResult.success) {
        console.log(`✅ Deducted ${quantity} from product ${product_id} (Shopify)`);
        results.push({
          product_id,
          success: true,
          new_quantity: adjustResult.newQuantity,
        });
      } else {
        console.error(`❌ Failed to deduct stock for ${product_id}: ${adjustResult.error}`);
        results.push({
          product_id,
          success: false,
          error: adjustResult.error,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    return c.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? `Successfully deducted stock for ${results.length} products`
        : `Some products failed to deduct`,
    });
  } catch (error: any) {
    console.error('[/sync/deduct] Error:', error.message);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * POST /sync/restore
 * Restore stock to Shopify for multiple products (used when invoice is voided)
 * ⚠️ MUST be defined BEFORE /sync/:productId to avoid route conflict
 */
app.post('/sync/restore', async (c) => {
  try {
    const body = (await c.req.json()) as {
      products: Array<{
        product_id: string;
        quantity: number;
        reason?: string;
        reference_id?: string;
      }>;
    };

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return c.json({ success: false, error: 'Products array is required' }, 400);
    }

    const results: Array<{
      product_id: string;
      success: boolean;
      new_quantity?: number;
      error?: string;
    }> = [];

    for (const item of body.products) {
      const { product_id, quantity, reason } = item;

      const inventory = await getInventoryByProductId(c.env.DB, product_id);

      if (!inventory) {
        results.push({
          product_id,
          success: false,
          error: 'Product not found in inventory',
        });
        continue;
      }

      if (!inventory.shopify_inventory_item_id || !inventory.shopify_location_id) {
        results.push({
          product_id,
          success: false,
          error: 'Product not linked to Shopify',
        });
        continue;
      }

      // Adjust Shopify inventory (positive delta = restore)
      const adjustResult = await adjustShopifyInventory(
        c.env,
        inventory.shopify_inventory_item_id,
        inventory.shopify_location_id,
        quantity, // Positive for restoration
        reason || 'restock' // Valid Shopify reason for restoration
      );

      if (adjustResult.success) {
        console.log(
          `✅ Restored ${quantity} to product ${product_id} (Shopify) - new qty: ${adjustResult.newQuantity}`
        );
        results.push({
          product_id,
          success: true,
          new_quantity: adjustResult.newQuantity,
        });
      } else {
        results.push({
          product_id,
          success: false,
          error: adjustResult.error,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    return c.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? `Successfully restored stock for ${results.length} products`
        : `Some products failed to restore`,
    });
  } catch (error: any) {
    console.error('Error in /sync/restore:', error);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * POST /sync/:productId
 * Manually sync a single product's B2C stock to Shopify
 * ⚠️ MUST be defined AFTER /sync/deduct and /sync/restore (dynamic route catches all)
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
      // Check if sync is enabled for this product
      if (!inventory.sync_enabled) {
        console.log(`⏸️ Sync disabled for product ${inventory.product_id}, skipping`);
        skippedProducts.push(inventory.product_id);
        continue;
      }

      // 10. Process the inventory update for this product
      try {
        await handleShopifyInventoryUpdate(
          c.env,
          inventory.shopify_variant_id || '',
          available,
          webhookId,
          inventory.product_id // Pass specific product ID to update
        );
        updatedProducts.push(inventory.product_id);
        console.log(`✅ Updated stock for product ${inventory.product_id}: → ${available}`);
      } catch (error: any) {
        console.error(`❌ Failed to update product ${inventory.product_id}:`, error.message);
      }
    }

    // 11. Mark webhook as processed
    await markWebhookProcessed(c.env.DB, webhookId, topic, body, true);

    return c.json({
      success: true,
      message: `Inventory updated for ${updatedProducts.length} product(s)`,
      updatedProducts,
      skippedProducts,
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
