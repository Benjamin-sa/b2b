import { eq, sql, desc, and, lt, inArray, isNotNull } from 'drizzle-orm';
import { product_inventory, products } from '../schema';
import type { DbClient } from '../db';
import type {
  ProductInventory,
  NewProductInventory,
  StockHistory,
  NewStockHistory,
} from '../types';

// ============================================================================
// INVENTORY CRUD
// ============================================================================

export async function getInventoryByProductId(
  db: DbClient,
  productId: string
): Promise<ProductInventory | undefined> {
  return db
    .select()
    .from(product_inventory)
    .where(eq(product_inventory.product_id, productId))
    .get();
}

export async function getInventoryByShopifyVariantId(
  db: DbClient,
  shopifyVariantId: string
): Promise<ProductInventory | undefined> {
  return db
    .select()
    .from(product_inventory)
    .where(eq(product_inventory.shopify_variant_id, shopifyVariantId))
    .get();
}

export async function createInventory(
  db: DbClient,
  data: NewProductInventory
): Promise<ProductInventory | undefined> {
  await db.insert(product_inventory).values(data).run();
  return getInventoryByProductId(db, data.product_id);
}

export async function updateInventory(
  db: DbClient,
  productId: string,
  data: Partial<Omit<ProductInventory, 'product_id' | 'created_at'>>
): Promise<ProductInventory | undefined> {
  await db
    .update(product_inventory)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(product_inventory.product_id, productId))
    .run();
  return getInventoryByProductId(db, productId);
}

export async function upsertInventory(
  db: DbClient,
  data: NewProductInventory
): Promise<ProductInventory | undefined> {
  const now = new Date().toISOString();
  await db
    .insert(product_inventory)
    .values({ ...data, created_at: now, updated_at: now })
    .onConflictDoUpdate({
      target: product_inventory.product_id,
      set: {
        stock: data.stock,
        shopify_product_id: data.shopify_product_id,
        shopify_variant_id: data.shopify_variant_id,
        shopify_inventory_item_id: data.shopify_inventory_item_id,
        shopify_location_id: data.shopify_location_id,
        sync_enabled: data.sync_enabled,
        updated_at: now,
      },
    })
    .run();
  return getInventoryByProductId(db, data.product_id);
}

export async function deleteInventory(db: DbClient, productId: string): Promise<void> {
  await db.delete(product_inventory).where(eq(product_inventory.product_id, productId)).run();
}

// ============================================================================
// STOCK OPERATIONS (SIMPLIFIED)
// ============================================================================

/**
 * Deduct stock when invoice is created
 * Simple: just reduce stock, log the change
 */
export async function deductStock(
  db: DbClient,
  productId: string,
  quantity: number
): Promise<{ success: boolean; newStock: number; error?: string }> {
  const inventory = await getInventoryByProductId(db, productId);
  if (!inventory) {
    return { success: false, newStock: 0, error: 'Inventory record not found' };
  }

  const newStock = inventory.stock - quantity;
  if (newStock < 0) {
    return { success: false, newStock: inventory.stock, error: 'Insufficient stock' };
  }

  const now = new Date().toISOString();

  // Update inventory
  await db
    .update(product_inventory)
    .set({ stock: newStock, updated_at: now })
    .where(eq(product_inventory.product_id, productId))
    .run();

  return { success: true, newStock };
}

/**
 * Restore stock when invoice is voided
 * Simple: just increase stock, log the change
 */
export async function restoreStock(
  db: DbClient,
  productId: string,
  quantity: number
): Promise<{ success: boolean; newStock: number; error?: string }> {
  const inventory = await getInventoryByProductId(db, productId);
  if (!inventory) {
    return { success: false, newStock: 0, error: 'Inventory record not found' };
  }

  const newStock = inventory.stock + quantity;
  const now = new Date().toISOString();

  // Update inventory
  await db
    .update(product_inventory)
    .set({ stock: newStock, updated_at: now })
    .where(eq(product_inventory.product_id, productId))
    .run();

  return { success: true, newStock };
}

/**
 * Bulk deduct stock for multiple items (invoice creation)
 */
export async function bulkDeductStock(
  db: DbClient,
  items: { product_id: string; quantity: number }[]
): Promise<{
  success: boolean;
  successfulProducts: string[];
  failedItems: string[];
  errors: Map<string, string>;
}> {
  const successfulProducts: string[] = [];
  const failedItems: string[] = [];
  const errors = new Map<string, string>();

  for (const item of items) {
    const result = await deductStock(db, item.product_id, item.quantity);
    if (result.success) {
      successfulProducts.push(item.product_id);
    } else {
      failedItems.push(item.product_id);
      errors.set(item.product_id, result.error || 'Unknown error');
    }
  }

  return {
    success: failedItems.length === 0,
    successfulProducts,
    failedItems,
    errors,
  };
}

/**
 * Bulk restore stock for multiple items (invoice voided)
 */
export async function bulkRestoreStock(
  db: DbClient,
  items: { product_id: string; quantity: number }[]
): Promise<{
  success: boolean;
  successfulProducts: string[];
  failedItems: string[];
  errors: Map<string, string>;
}> {
  const successfulProducts: string[] = [];
  const failedItems: string[] = [];
  const errors = new Map<string, string>();

  for (const item of items) {
    const result = await restoreStock(db, item.product_id, item.quantity);
    if (result.success) {
      successfulProducts.push(item.product_id);
    } else {
      failedItems.push(item.product_id);
      errors.set(item.product_id, result.error || 'Unknown error');
    }
  }

  return {
    success: failedItems.length === 0,
    successfulProducts,
    failedItems,
    errors,
  };
}

// ============================================================================
// LEGACY STOCK OPERATIONS (kept for backwards compatibility)
// ============================================================================

export interface StockAdjustment {
  productId: string;
  change: number;
  action: string;
  source: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
}

export async function adjustStock(
  db: DbClient,
  adjustment: StockAdjustment
): Promise<{ success: boolean; newStock: number; error?: string }> {
  const { productId, change } = adjustment;

  const inventory = await getInventoryByProductId(db, productId);
  if (!inventory) {
    return { success: false, newStock: 0, error: 'Inventory record not found' };
  }

  const newStock = inventory.stock + change;
  if (newStock < 0) {
    return { success: false, newStock: inventory.stock, error: 'Insufficient stock' };
  }

  const now = new Date().toISOString();

  // Update inventory
  await db
    .update(product_inventory)
    .set({ stock: newStock, updated_at: now })
    .where(eq(product_inventory.product_id, productId))
    .run();

  return { success: true, newStock };
}

export async function setStock(
  db: DbClient,
  productId: string,
  newStock: number
): Promise<{ success: boolean; previousStock: number }> {
  const inventory = await getInventoryByProductId(db, productId);
  const previousStock = inventory?.stock ?? 0;
  const now = new Date().toISOString();
  if (inventory) {
    await db
      .update(product_inventory)
      .set({ stock: newStock, updated_at: now })
      .where(eq(product_inventory.product_id, productId))
      .run();
  } else {
    await db
      .insert(product_inventory)
      .values({
        product_id: productId,
        stock: newStock,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  return { success: true, previousStock };
}

export async function reserveStock(
  db: DbClient,
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  return adjustStock(db, {
    productId,
    change: -quantity,
    action: 'reserve',
    source: 'checkout',
  });
}

export async function releaseStock(
  db: DbClient,
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  return adjustStock(db, {
    productId,
    change: quantity,
    action: 'release',
    source: 'checkout_cancel',
  });
}

// ============================================================================
// BULK STOCK OPERATIONS
// ============================================================================

export interface BulkStockAdjustment {
  product_id: string;
  quantity: number;
}

export async function bulkReserveStock(
  db: DbClient,
  items: BulkStockAdjustment[]
): Promise<{ success: boolean; failedItems: string[]; errors: Map<string, string> }> {
  const failedItems: string[] = [];
  const errors = new Map<string, string>();

  for (const item of items) {
    const result = await reserveStock(db, item.product_id, item.quantity);
    if (!result.success) {
      failedItems.push(item.product_id);
      errors.set(item.product_id, result.error || 'Unknown error');
    }
  }

  return {
    success: failedItems.length === 0,
    failedItems,
    errors,
  };
}

export async function bulkReleaseStock(db: DbClient, items: BulkStockAdjustment[]): Promise<void> {
  for (const item of items) {
    await releaseStock(db, item.product_id, item.quantity);
  }
}

// ============================================================================
// INVENTORY QUERIES
// ============================================================================

export interface GetInventoryOptions {
  limit?: number;
  offset?: number;
  lowStockThreshold?: number;
  outOfStockOnly?: boolean;
  syncEnabledOnly?: boolean;
}

export interface InventoryWithProduct {
  inventory: ProductInventory;
  productName: string;
  productSku: string | null;
  b2bSku: string | null;
}

export async function getInventoryList(
  db: DbClient,
  options: GetInventoryOptions = {}
): Promise<{ items: InventoryWithProduct[]; total: number }> {
  const { limit = 50, offset = 0, lowStockThreshold, outOfStockOnly, syncEnabledOnly } = options;

  const conditions: ReturnType<typeof eq>[] = [];

  if (outOfStockOnly) {
    conditions.push(eq(product_inventory.stock, 0));
  } else if (lowStockThreshold !== undefined) {
    conditions.push(lt(product_inventory.stock, lowStockThreshold));
  }

  if (syncEnabledOnly) {
    conditions.push(eq(product_inventory.sync_enabled, 1));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const query = db
    .select({
      inventory: product_inventory,
      productName: products.name,
      productSku: products.part_number,
      b2bSku: products.b2b_sku,
    })
    .from(product_inventory)
    .innerJoin(products, eq(product_inventory.product_id, products.id))
    .$dynamic();

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(product_inventory)
    .$dynamic();

  const [items, countResult] = await Promise.all([
    whereClause
      ? query.where(whereClause).limit(limit).offset(offset)
      : query.limit(limit).offset(offset),
    whereClause ? countQuery.where(whereClause).get() : countQuery.get(),
  ]);

  return {
    items,
    total: countResult?.count || 0,
  };
}

export async function getLowStockProducts(
  db: DbClient,
  threshold: number
): Promise<InventoryWithProduct[]> {
  const result = await getInventoryList(db, { lowStockThreshold: threshold, limit: 1000 });
  return result.items;
}

export async function getOutOfStockProducts(db: DbClient): Promise<InventoryWithProduct[]> {
  const result = await getInventoryList(db, { outOfStockOnly: true, limit: 1000 });
  return result.items;
}

export async function getInventoryByProductIds(
  db: DbClient,
  productIds: string[]
): Promise<ProductInventory[]> {
  if (productIds.length === 0) return [];
  return db
    .select()
    .from(product_inventory)
    .where(inArray(product_inventory.product_id, productIds));
}

// ============================================================================
// SHOPIFY SYNC
// ============================================================================

export async function getProductsForShopifySync(db: DbClient): Promise<ProductInventory[]> {
  return db
    .select()
    .from(product_inventory)
    .where(
      and(eq(product_inventory.sync_enabled, 1), isNotNull(product_inventory.shopify_variant_id))
    );
}

export async function updateShopifySyncStatus(
  db: DbClient,
  productId: string,
  syncedAt: string,
  error?: string
): Promise<void> {
  await db
    .update(product_inventory)
    .set({
      last_synced_at: syncedAt,
      sync_error: error || null,
      updated_at: new Date().toISOString(),
    })
    .where(eq(product_inventory.product_id, productId))
    .run();
}

export async function enableShopifySync(
  db: DbClient,
  productId: string,
  shopifyData: {
    shopify_product_id: string;
    shopify_variant_id: string;
    shopify_inventory_item_id?: string;
    shopify_location_id?: string;
  }
): Promise<void> {
  await db
    .update(product_inventory)
    .set({
      ...shopifyData,
      sync_enabled: 1,
      updated_at: new Date().toISOString(),
    })
    .where(eq(product_inventory.product_id, productId))
    .run();
}

export async function disableShopifySync(db: DbClient, productId: string): Promise<void> {
  await db
    .update(product_inventory)
    .set({
      sync_enabled: 0,
      updated_at: new Date().toISOString(),
    })
    .where(eq(product_inventory.product_id, productId))
    .run();
}
