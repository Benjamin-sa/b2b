/**
 * Inventory Sync Service
 * 
 * Core business logic for syncing inventory between B2B and Shopify
 */

import { nanoid } from 'nanoid';
import type { Env, ProductInventory } from '../types';
import { updateShopifyInventory, getShopifyInventory } from '../utils/shopify';
import {
  getInventoryByProductId,
  getInventoryByShopifyVariantId,
  getAllSyncEnabledProducts,
  updateLastSyncTime,
  updateB2CStock,
} from '../utils/database';

/**
 * Log inventory change to audit trail
 */
async function logInventorySync(
  db: D1Database,
  productId: string,
  action: string,
  source: string,
  totalChange: number,
  b2bChange: number,
  b2cChange: number,
  inventory: ProductInventory,
  syncedToShopify: boolean,
  syncError: string | null = null,
  referenceId: string | null = null,
  referenceType: string | null = null
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inventory_sync_log (
        id, product_id, action, source,
        total_change, b2b_change, b2c_change,
        total_stock_after, b2b_stock_after, b2c_stock_after,
        synced_to_shopify, sync_error,
        reference_id, reference_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      nanoid(),
      productId,
      action,
      source,
      totalChange,
      b2bChange,
      b2cChange,
      inventory.total_stock,
      inventory.b2b_stock,
      inventory.b2c_stock,
      syncedToShopify ? 1 : 0,
      syncError,
      referenceId,
      referenceType,
      new Date().toISOString()
    )
    .run();
}

/**
 * Sync B2C stock to Shopify after B2B order
 * Call this after a B2B order to inform Shopify of available B2C stock
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

    console.log(`🔄 Syncing product ${productId} to Shopify: ${inventory.b2c_stock} units`);

    // Update Shopify inventory with B2C stock level
    await updateShopifyInventory(
      env,
      inventory.shopify_inventory_item_id,
      inventory.b2c_stock
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

    console.log(`✅ Successfully synced product ${productId} to Shopify`);

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

  // Calculate stock change
  const oldB2CStock = inventory.b2c_stock;
  const b2cChange = newAvailable - oldB2CStock;
  const totalChange = b2cChange;

  console.log(`📊 Stock change for ${inventory.product_id}: B2C ${oldB2CStock} → ${newAvailable} (${b2cChange > 0 ? '+' : ''}${b2cChange})`);

  // Update B2C stock in database
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

/**
 * Full reconciliation - sync all enabled products
 * Called by cron job to ensure consistency
 */
export async function reconcileAllProducts(env: Env): Promise<{
  total: number;
  synced: number;
  errors: number;
}> {
  console.log('🔄 Starting full inventory reconciliation...');

  const products = await getAllSyncEnabledProducts(env.DB);
  let synced = 0;
  let errors = 0;

  for (const inventory of products) {
    try {
      if (!inventory.shopify_inventory_item_id) {
        console.warn(`⚠️ Product ${inventory.product_id} missing inventory_item_id`);
        errors++;
        continue;
      }

      // Get current Shopify stock
      const shopifyStock = await getShopifyInventory(
        env,
        inventory.shopify_inventory_item_id
      );

      // Check if sync is needed
      if (shopifyStock !== inventory.b2c_stock) {
        console.log(
          `🔄 Product ${inventory.product_id}: Shopify=${shopifyStock}, B2C=${inventory.b2c_stock} - syncing...`
        );

        // Update Shopify to match our B2C stock
        await updateShopifyInventory(
          env,
          inventory.shopify_inventory_item_id,
          inventory.b2c_stock
        );

        await updateLastSyncTime(env.DB, inventory.product_id, null);

        await logInventorySync(
          env.DB,
          inventory.product_id,
          'sync_to_shopify',
          'cron_job',
          0,
          0,
          0,
          inventory,
          true,
          null
        );

        synced++;
      }

      // Rate limiting - Shopify has 2 req/sec limit for GraphQL
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`❌ Failed to reconcile product ${inventory.product_id}:`, error.message);
      await updateLastSyncTime(env.DB, inventory.product_id, error.message);
      errors++;
    }
  }

  console.log(`✅ Reconciliation complete: ${synced}/${products.length} synced, ${errors} errors`);

  return {
    total: products.length,
    synced,
    errors,
  };
}
