/**
 * Inventory Sync Service
 *
 * SIMPLIFIED: Shopify is the single source of truth.
 * All stock changes from Shopify are directly applied.
 * B2B checkout decrements stock and syncs back to Shopify.
 */

import type { Env } from '../types';
import { updateShopifyInventory } from '../utils/shopify';
import {
  getInventoryByProductId,
  getInventoryByShopifyVariantId,
  updateLastSyncTime,
  updateStockFromShopify,
} from '../utils/database';

/**
 * Sync stock to Shopify after B2B order
 * Pushes the current stock value to Shopify
 */
export async function syncToShopify(
  env: Env,
  productId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const inventory = await getInventoryByProductId(env.DB, productId);

    if (!inventory) {
      return { success: false, error: 'Product not found in inventory' };
    }

    if (!inventory.shopify_inventory_item_id) {
      return { success: false, error: 'Product not configured for Shopify sync' };
    }

    // Simple: push current stock to Shopify
    const stockToSync = inventory.stock;
    console.log(`🔄 Syncing product ${productId} to Shopify: ${stockToSync} units`);

    await updateShopifyInventory(env, inventory.shopify_inventory_item_id, stockToSync);
    await updateLastSyncTime(env.DB, productId, null);

    console.log(`✅ Synced product ${productId} to Shopify (${stockToSync} units)`);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`❌ Failed to sync product ${productId} to Shopify:`, errorMessage);

    await updateLastSyncTime(env.DB, productId, errorMessage);

    return { success: false, error: errorMessage };
  }
}

/**
 * Process Shopify inventory update webhook
 * Shopify is the source of truth - update our stock to match
 * @param env - Environment bindings
 * @param variantId - Shopify variant ID (used if productId not provided)
 * @param newAvailable - New stock level from Shopify
 * @param webhookId - Webhook ID for logging
 * @param productId - Optional: specific product ID to update (for multi-product webhooks)
 */
export async function handleShopifyInventoryUpdate(
  env: Env,
  variantId: string,
  newAvailable: number,
  webhookId: string,
  productId?: string
): Promise<void> {
  console.log(
    `📥 Shopify webhook: variant=${variantId}, available=${newAvailable}, productId=${productId || 'auto-detect'}`
  );

  let inventory;

  // If productId is provided, use it directly; otherwise look up by variant ID
  if (productId) {
    inventory = await getInventoryByProductId(env.DB, productId);
  } else {
    inventory = await getInventoryByShopifyVariantId(env.DB, variantId);
  }

  if (!inventory) {
    console.warn(
      `⚠️ No B2B product found: ${productId ? `productId=${productId}` : `variantId=${variantId}`}`
    );
    return;
  }

  if (!inventory.sync_enabled) {
    console.log(`⏸️ Sync disabled for product ${inventory.product_id}, skipping`);
    return;
  }

  const previousStock = inventory.stock;

  console.log(`📊 Stock update for ${inventory.product_id}: ${previousStock} → ${newAvailable}`);

  // Simple: Shopify is master, just update our stock
  await updateStockFromShopify(env.DB, inventory.product_id, newAvailable);

  console.log(`✅ Updated stock for product ${inventory.product_id}`);
}
