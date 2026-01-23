/**
 * Database utility functions for inventory operations
 *
 * SIMPLIFIED: Shopify is the single source of truth.
 * Only one 'stock' column matters now.
 */

import type { ProductInventory } from '../types';
import { nanoid } from 'nanoid';
import { createDb, schema } from '@b2b/db';
import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';

const { product_inventory, inventory_sync_log } = schema;

/**
 * Get product inventory by product ID
 */
export async function getInventoryByProductId(
  db: D1Database,
  productId: string
): Promise<ProductInventory | null> {
  const client = createDb(db);
  const result = await client
    .select()
    .from(product_inventory)
    .where(eq(product_inventory.product_id, productId))
    .get();

  return (result as ProductInventory | null) || null;
}

/**
 * Get product inventory by Shopify variant ID
 */
export async function getInventoryByShopifyVariantId(
  db: D1Database,
  variantId: string
): Promise<ProductInventory | null> {
  const client = createDb(db);
  const result = await client
    .select()
    .from(product_inventory)
    .where(eq(product_inventory.shopify_variant_id, variantId))
    .get();

  return (result as ProductInventory | null) || null;
}

/**
 * Get product inventory by Shopify inventory item ID
 */
export async function getInventoryByInventoryItemId(
  db: D1Database,
  inventoryItemId: string
): Promise<ProductInventory | null> {
  const client = createDb(db);
  const result = await client
    .select()
    .from(product_inventory)
    .where(eq(product_inventory.shopify_inventory_item_id, inventoryItemId))
    .get();

  return (result as ProductInventory | null) || null;
}

/**
 * Update stock from Shopify webhook
 * Shopify is the source of truth - just set the stock value directly
 */
export async function updateStockFromShopify(
  db: D1Database,
  productId: string,
  newStock: number
): Promise<{ previousStock: number; newStock: number }> {
  const client = createDb(db);
  const now = new Date().toISOString();

  // Get current inventory
  const current = await getInventoryByProductId(db, productId);
  if (!current) {
    throw new Error(`Product ${productId} not found in inventory`);
  }

  const previousStock = current.stock;

  console.log(`📥 Shopify stock update for ${productId}: ${previousStock} → ${newStock}`);

  // Update the single stock column (Shopify is master)
  await client
    .update(product_inventory)
    .set({
      stock: newStock,
      last_synced_at: now,
      sync_error: null,
      updated_at: now,
    })
    .where(eq(product_inventory.product_id, productId))
    .run();

  return { previousStock, newStock };
}

/**
 * Update last sync timestamp
 */
export async function updateLastSyncTime(
  db: D1Database,
  productId: string,
  error: string | null = null
): Promise<void> {
  const client = createDb(db);
  const now = new Date().toISOString();
  await client
    .update(product_inventory)
    .set({ last_synced_at: now, sync_error: error, updated_at: now })
    .where(eq(product_inventory.product_id, productId))
    .run();
}

/**
 * Log inventory change to audit trail
 */
export async function logInventoryChange(
  db: D1Database,
  productId: string,
  action: string,
  source: string,
  stockChange: number,
  stockAfter: number,
  syncedToShopify: boolean,
  syncError: string | null = null,
  referenceId: string | null = null,
  referenceType: string | null = null
): Promise<void> {
  const client = createDb(db);
  await client
    .insert(inventory_sync_log)
    .values({
      id: nanoid(),
      product_id: productId,
      action,
      source,
      stock_change: stockChange,
      stock_after: stockAfter,
      synced_to_shopify: syncedToShopify ? 1 : 0,
      sync_error: syncError,
      reference_id: referenceId,
      reference_type: referenceType,
      created_at: new Date().toISOString(),
    })
    .run();
}

// ============================================================================
// DEPRECATED FUNCTIONS - Will be removed in next version
// ============================================================================

/** @deprecated Use updateStockFromShopify instead */
export async function updateUnifiedStock(
  db: D1Database,
  productId: string,
  newTotalStock: number
): Promise<void> {
  await updateStockFromShopify(db, productId, newTotalStock);
}

/** @deprecated Use updateStockFromShopify instead */
export async function updateB2CStock(
  db: D1Database,
  productId: string,
  newB2CStock: number
): Promise<void> {
  await updateStockFromShopify(db, productId, newB2CStock);
}
