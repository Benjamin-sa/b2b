/**
 * Database utility functions for inventory operations
 */

import type { ProductInventory } from '../types';
import { nanoid } from 'nanoid';

/**
 * Get product inventory by product ID
 */
export async function getInventoryByProductId(
  db: D1Database,
  productId: string
): Promise<ProductInventory | null> {
  const result = await db
    .prepare('SELECT * FROM product_inventory WHERE product_id = ?')
    .bind(productId)
    .first<ProductInventory>();

  return result || null;
}
/**
 * Log inventory change to audit trail
 */
export async function logInventorySync(
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
 * Get product inventory by Shopify variant ID
 */
export async function getInventoryByShopifyVariantId(
  db: D1Database,
  variantId: string
): Promise<ProductInventory | null> {
  const result = await db
    .prepare('SELECT * FROM product_inventory WHERE shopify_variant_id = ?')
    .bind(variantId)
    .first<ProductInventory>();

  return result || null;
}

/**
 * Get product inventory by Shopify inventory item ID
 */
export async function getInventoryByInventoryItemId(
  db: D1Database,
  inventoryItemId: string
): Promise<ProductInventory | null> {
  const result = await db
    .prepare('SELECT * FROM product_inventory WHERE shopify_inventory_item_id = ?')
    .bind(inventoryItemId)
    .first<ProductInventory>();

  return result || null;
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime(
  db: D1Database,
  productId: string,
  error: string | null = null
): Promise<void> {
  await db
    .prepare(
      'UPDATE product_inventory SET last_synced_at = ?, sync_error = ?, updated_at = ? WHERE product_id = ?'
    )
    .bind(new Date().toISOString(), error, new Date().toISOString(), productId)
    .run();
}

/**
 * Update B2C stock from Shopify webhook (SPLIT MODE)
 * This automatically adjusts total_stock to accommodate the new B2C stock level
 * while keeping B2B stock unchanged
 */
export async function updateB2CStock(
  db: D1Database,
  productId: string,
  newB2CStock: number
): Promise<void> {
  const now = new Date().toISOString();

  // Get current inventory
  const current = await getInventoryByProductId(db, productId);
  if (!current) {
    throw new Error(`Product ${productId} not found in inventory`);
  }

  // Calculate changes
  const b2cChange = newB2CStock - current.b2c_stock;
  const newTotalStock = current.b2b_stock + newB2CStock; // B2B stays same, total = B2B + new B2C

  console.log(`📊 Split mode stock update for ${productId}:`);
  console.log(`   B2C: ${current.b2c_stock} → ${newB2CStock} (${b2cChange > 0 ? '+' : ''}${b2cChange})`);
  console.log(`   B2B: ${current.b2b_stock} (unchanged)`);
  console.log(`   Total: ${current.total_stock} → ${newTotalStock}`);

  // Update inventory - set new totals directly
  await db
    .prepare(
      `UPDATE product_inventory 
       SET 
         total_stock = ?,
         b2c_stock = ?,
         updated_at = ?
       WHERE product_id = ?`
    )
    .bind(newTotalStock, newB2CStock, now, productId)
    .run();
}

/**
 * Update unified stock from Shopify webhook (UNIFIED MODE)
 * Updates total_stock and b2b_stock together (shared pool)
 * b2c_stock stays at 0 in unified mode
 */
export async function updateUnifiedStock(
  db: D1Database,
  productId: string,
  newTotalStock: number
): Promise<void> {
  const now = new Date().toISOString();

  // Get current inventory
  const current = await getInventoryByProductId(db, productId);
  if (!current) {
    throw new Error(`Product ${productId} not found in inventory`);
  }

  console.log(`🔗 Unified mode stock update for ${productId}:`);
  console.log(`   Total: ${current.total_stock} → ${newTotalStock}`);
  console.log(`   B2B: ${current.b2b_stock} → ${newTotalStock} (synced with total)`);
  console.log(`   B2C: 0 (always 0 in unified mode)`);

  // Update inventory - both total_stock and b2b_stock change together
  // b2c_stock stays at 0 in unified mode
  await db
    .prepare(
      `UPDATE product_inventory 
       SET 
         total_stock = ?,
         b2b_stock = ?,
         b2c_stock = 0,
         updated_at = ?
       WHERE product_id = ?`
    )
    .bind(newTotalStock, newTotalStock, now, productId)
    .run();
}
