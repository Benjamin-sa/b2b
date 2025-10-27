/**
 * Database utility functions for inventory operations
 */

import type { ProductInventory } from '../types';

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
 * Get all products with sync enabled
 */
export async function getAllSyncEnabledProducts(
  db: D1Database
): Promise<ProductInventory[]> {
  const result = await db
    .prepare(
      'SELECT * FROM product_inventory WHERE sync_enabled = 1 AND shopify_variant_id IS NOT NULL'
    )
    .all<ProductInventory>();

  return result.results || [];
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
 * Update B2C stock from Shopify webhook
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

  console.log(`📊 Stock update for ${productId}:`);
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
