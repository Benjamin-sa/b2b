/**
 * Inventory Sync Service
 * 
 * Core business logic for syncing inventory between B2B and Shopify
 */

import type { Env, ProductInventory } from '../types';
import { updateShopifyInventory } from '../utils/shopify';
import {
  getInventoryByProductId,
  getInventoryByShopifyVariantId,
  updateLastSyncTime,
  updateB2CStock,
  updateUnifiedStock,
  logInventorySync,
} from '../utils/database';


/**
 * Sync B2C stock to Shopify after B2B order
 * Call this after a B2B order to inform Shopify of available B2C stock
 * 
 * Behavior based on stock_mode:
 * - 'split': Syncs b2c_stock to Shopify (separate pool for B2C channel)
 * - 'unified': Syncs total_stock to Shopify (shared pool with B2B)
 */
export async function syncToShopify(
  env: Env,
  productId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Get current inventory
    const inventory = await getInventoryByProductId(env.DB, productId);

    if (!inventory) {
      return { success: false, error: 'Product not found in inventory' };
    }

    if (!inventory.shopify_inventory_item_id) {
      return { success: false, error: 'Product not configured for Shopify sync' };
    }

    // Determine which stock value to sync based on stock_mode
    const stockMode = inventory.stock_mode || 'split';
    const stockToSync = stockMode === 'unified' 
      ? inventory.total_stock  // Unified: sync total_stock (shared pool)
      : inventory.b2c_stock;   // Split: sync b2c_stock (dedicated B2C pool)

    console.log(`🔄 Syncing product ${productId} to Shopify (mode=${stockMode}): ${stockToSync} units`);

    // Update Shopify inventory with the appropriate stock level
    await updateShopifyInventory(
      env,
      inventory.shopify_inventory_item_id,
      stockToSync
    );

    // Update last sync time
    await updateLastSyncTime(env.DB, productId, null);

    // Log success
    await logInventorySync(
      env.DB,
      productId,
      'sync_to_shopify',
      'b2b_checkout',
      0, // No stock change, just sync
      0,
      0,
      inventory,
      true,
      null
    );

    console.log(`✅ Successfully synced product ${productId} to Shopify (${stockToSync} units)`);

    return { success: true, error: null };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`❌ Failed to sync product ${productId} to Shopify:`, errorMessage);

    // Update sync error
    await updateLastSyncTime(env.DB, productId, errorMessage);

    // Log failure
    const inventory = await getInventoryByProductId(env.DB, productId);
    if (inventory) {
      await logInventorySync(
        env.DB,
        productId,
        'sync_to_shopify',
        'b2b_checkout',
        0,
        0,
        0,
        inventory,
        false,
        errorMessage
      );
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Process Shopify inventory update webhook
 * Called when inventory changes in Shopify (e.g., B2C order placed)
 * 
 * Behavior based on stock_mode:
 * - 'split': Updates only b2c_stock (B2B stock unchanged)
 * - 'unified': Updates total_stock and b2b_stock (shared pool)
 */
export async function handleShopifyInventoryUpdate(
  env: Env,
  variantId: string,
  newAvailable: number,
  webhookId: string
): Promise<void> {
  console.log(`📥 Processing Shopify inventory update: variant=${variantId}, available=${newAvailable}`);

  // Find product by Shopify variant ID
  const inventory = await getInventoryByShopifyVariantId(env.DB, variantId);

  if (!inventory) {
    console.warn(`⚠️ No B2B product linked to Shopify variant ${variantId}`);
    return;
  }

  if (!inventory.sync_enabled) {
    console.log(`⏸️ Sync disabled for product ${inventory.product_id}, skipping`);
    return;
  }

  const stockMode = inventory.stock_mode || 'split';
  
  if (stockMode === 'unified') {
    // UNIFIED MODE: Update total_stock and b2b_stock (shared pool)
    const oldTotalStock = inventory.total_stock;
    const totalChange = newAvailable - oldTotalStock;
    
    console.log(`🔗 Unified mode stock update for ${inventory.product_id}:`);
    console.log(`   Total: ${oldTotalStock} → ${newAvailable} (${totalChange > 0 ? '+' : ''}${totalChange})`);
    console.log(`   B2B: ${inventory.b2b_stock} → ${newAvailable} (synced with total)`);

    // Update both total_stock and b2b_stock (shared pool)
    await updateUnifiedStock(env.DB, inventory.product_id, newAvailable);

    // Refresh inventory to get updated values
    const updatedInventory = await getInventoryByProductId(env.DB, inventory.product_id);

    if (updatedInventory) {
      // Log the change
      await logInventorySync(
        env.DB,
        inventory.product_id,
        'sync_from_shopify',
        'shopify_webhook',
        totalChange,
        totalChange, // B2B also changes in unified mode
        0, // b2c_stock stays 0 in unified mode
        updatedInventory,
        true,
        null,
        webhookId,
        'webhook'
      );
    }

    console.log(`✅ Updated unified stock for product ${inventory.product_id}`);
  } else {
    // SPLIT MODE: Update only b2c_stock (original behavior)
    const oldB2CStock = inventory.b2c_stock;
    const b2cChange = newAvailable - oldB2CStock;
    const totalChange = b2cChange;

    console.log(`📊 Split mode stock update for ${inventory.product_id}:`);
    console.log(`   B2C: ${oldB2CStock} → ${newAvailable} (${b2cChange > 0 ? '+' : ''}${b2cChange})`);
    console.log(`   B2B: ${inventory.b2b_stock} (unchanged)`);

    // Update B2C stock in database (original behavior)
    await updateB2CStock(env.DB, inventory.product_id, newAvailable);

    // Refresh inventory to get updated values
    const updatedInventory = await getInventoryByProductId(env.DB, inventory.product_id);

    if (updatedInventory) {
      // Log the change
      await logInventorySync(
        env.DB,
        inventory.product_id,
        'sync_from_shopify',
        'shopify_webhook',
        totalChange,
        0,
        b2cChange,
        updatedInventory,
        true,
        null,
        webhookId,
        'webhook'
      );
    }

    console.log(`✅ Updated B2C stock for product ${inventory.product_id}`);
  }
}
