/**
 * Inventory routes
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { getInventoryByProductId } from '../utils/database';

const inventoryRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /inventory/check
 * Check stock availability for multiple products from Shopify directly
 * Used by API Gateway before invoice creation
 */
inventoryRoutes.post('/check', async (c) => {
  try {
    const body = await c.req.json<{
      products: Array<{ product_id: string; requested_quantity: number }>;
    }>();

    if (!body.products || !Array.isArray(body.products)) {
      return c.json({ error: 'Invalid request: products array required' }, 400);
    }

    const results = [] as Array<{
      product_id: string;
      available: number;
      requested: number;
      sufficient: boolean;
      error?: string;
    }>;

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

export default inventoryRoutes;
