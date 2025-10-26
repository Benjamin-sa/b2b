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
  const totalChange = b2cChange; // Total stock changes by same amount

  // Update inventory
  await db
    .prepare(
      `UPDATE product_inventory 
       SET 
         total_stock = total_stock + ?,
         b2c_stock = ?,
         updated_at = ?
       WHERE product_id = ?`
    )
    .bind(b2cChange, newB2CStock, now, productId)
    .run();
}
