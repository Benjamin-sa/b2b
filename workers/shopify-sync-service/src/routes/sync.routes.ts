/**
 * Sync routes (B2B → Shopify)
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { syncToShopify } from '../services/sync.service';
import {
  getInventoryByProductId,
  getAllLinkedInventories,
  updateStockFromShopify,
} from '../utils/database';
import { adjustShopifyInventory, getShopifyInventory } from '../utils/shopify';

const syncRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /sync/deduct
 * Deduct stock from Shopify for multiple products (used when creating invoices)
 * ⚠️ MUST be defined BEFORE /sync/:productId to avoid route conflict
 */
syncRoutes.post('/deduct', async (c) => {
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
      const { product_id, quantity, reason } = item;

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
        -quantity,
        reason || 'correction'
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
        : 'Some products failed to deduct',
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
syncRoutes.post('/restore', async (c) => {
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
        quantity,
        reason || 'restock'
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
        : 'Some products failed to restore',
    });
  } catch (error: any) {
    console.error('Error in /sync/restore:', error);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * POST /sync/pull-all
 * Pull current stock from Shopify for ALL linked products and update D1
 * ⚠️ MUST be defined BEFORE /sync/:productId to avoid route conflict
 */
syncRoutes.post('/pull-all', async (c) => {
  try {
    const inventories = await getAllLinkedInventories(c.env.DB);

    console.log(`🔄 [/sync/pull-all] Processing ${inventories.length} linked products`);

    if (inventories.length === 0) {
      return c.json({
        success: true,
        message: 'No sync-enabled products with Shopify linkage found',
        total: 0,
        updated: 0,
        unchanged: 0,
        failed: 0,
        results: [],
      });
    }

    const results: Array<{
      product_id: string;
      shopify_inventory_item_id: string;
      status: 'updated' | 'unchanged' | 'failed';
      previous_stock?: number;
      shopify_stock?: number;
      error?: string;
    }> = [];

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const inventory of inventories) {
      try {
        const shopifyStock = await getShopifyInventory(c.env, inventory.shopify_inventory_item_id!);

        const previousStock = inventory.stock;

        if (shopifyStock === previousStock) {
          unchanged++;
          results.push({
            product_id: inventory.product_id,
            shopify_inventory_item_id: inventory.shopify_inventory_item_id!,
            status: 'unchanged',
            previous_stock: previousStock,
            shopify_stock: shopifyStock,
          });
          continue;
        }

        await updateStockFromShopify(c.env.DB, inventory.product_id, shopifyStock);

        updated++;
        results.push({
          product_id: inventory.product_id,
          shopify_inventory_item_id: inventory.shopify_inventory_item_id!,
          status: 'updated',
          previous_stock: previousStock,
          shopify_stock: shopifyStock,
        });

        console.log(`📊 [pull-all] ${inventory.product_id}: ${previousStock} → ${shopifyStock}`);
      } catch (error: any) {
        failed++;
        results.push({
          product_id: inventory.product_id,
          shopify_inventory_item_id: inventory.shopify_inventory_item_id!,
          status: 'failed',
          error: error.message,
        });
        console.error(`❌ [pull-all] Failed for ${inventory.product_id}: ${error.message}`);
      }
    }

    console.log(
      `✅ [/sync/pull-all] Done: ${updated} updated, ${unchanged} unchanged, ${failed} failed`
    );

    return c.json({
      success: failed === 0,
      message: `Processed ${inventories.length} products: ${updated} updated, ${unchanged} unchanged, ${failed} failed`,
      total: inventories.length,
      updated,
      unchanged,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('[/sync/pull-all] Error:', error.message);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * POST /sync/:productId
 * Manually sync a single product's B2C stock to Shopify
 * ⚠️ MUST be defined AFTER /sync/deduct, /sync/restore and /sync/pull-all
 */
syncRoutes.post('/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');

    const result = await syncToShopify(c.env, productId);

    if (result.success) {
      return c.json({
        success: true,
        message: 'Product synced to Shopify successfully',
        productId,
      });
    }

    return c.json(
      {
        success: false,
        error: result.error,
        productId,
      },
      500
    );
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

export default syncRoutes;
