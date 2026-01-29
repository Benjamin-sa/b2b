/**
 * @b2b/types - Inventory Types
 *
 * Single source of truth for inventory and stock management types.
 * ALL fields use snake_case to match D1 database schema.
 *
 * IMPORTANT: product_inventory is the SINGLE SOURCE OF TRUTH for stock.
 * The deprecated columns on the products table should NEVER be used.
 */

import type { ISODateString, SQLiteBoolean } from './common';

// ============================================================================
// INVENTORY TYPES (matches D1 `product_inventory` table)
// ============================================================================

/**
 * Product inventory record - SINGLE SOURCE OF TRUTH for stock
 *
 * Stock is unified (Shopify is master). The old split B2B/B2C model is deprecated.
 * Note: Fields with defaults can be null when returned from D1
 */
export interface ProductInventory {
  product_id: string;

  /** Current stock level (unified, Shopify is source of truth) */
  stock: number;

  // Shopify sync fields
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_inventory_item_id: string | null;
  shopify_location_id: string | null;

  /** Whether Shopify sync is enabled for this product */
  sync_enabled: SQLiteBoolean;
  last_synced_at: ISODateString | null;
  sync_error: string | null;

  // Timestamps
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Input for creating/updating inventory
 */
export interface UpsertInventoryInput {
  product_id: string;
  stock: number;
  shopify_product_id?: string | null;
  shopify_variant_id?: string | null;
  shopify_inventory_item_id?: string | null;
  shopify_location_id?: string | null;
  sync_enabled?: SQLiteBoolean;
}

/**
 * Input for setting absolute stock level
 */
export interface SetStockInput {
  product_id: string;
  stock: number;
  source: StockChangeSource;
  reference_id?: string;
  reference_type?: string;
  created_by?: string;
}

/**
 * Input for adjusting stock (relative change)
 */
export interface AdjustStockInput {
  product_id: string;
  change: number; // Positive or negative
  action: StockChangeAction;
  source: StockChangeSource;
  reference_id?: string;
  reference_type?: string;
  created_by?: string;
}

// ============================================================================
// STOCK SYNC LOG (matches D1 `inventory_sync_log` table)
// ============================================================================

/**
 * Inventory sync log record
 */
export interface InventorySyncLog {
  id: string;
  product_id: string;
  action: string;
  source: string;
  stock_change: number;
  stock_after: number;
  synced_to_shopify: SQLiteBoolean;
  sync_error: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: ISODateString;
}

// ============================================================================
// STOCK HISTORY (matches D1 `stock_history` table)
// ============================================================================

/**
 * Stock history record (audit trail)
 */
export interface StockHistory {
  id: string;
  product_id: string;
  shopify_variant_id: string | null;
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  change_type: string;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: ISODateString | null;
}

/**
 * Input for creating stock history entry
 */
export interface CreateStockHistoryInput {
  id: string;
  product_id: string;
  shopify_variant_id?: string | null;
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  change_type: StockChangeAction;
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

// ============================================================================
// STOCK ENUMS & CONSTANTS
// ============================================================================

/**
 * Stock change actions
 */
export type StockChangeAction =
  | 'set' // Manual set to absolute value
  | 'adjust' // Relative adjustment
  | 'reserve' // Reserve for order
  | 'release' // Release reservation
  | 'sale' // Stock reduced by sale
  | 'return' // Stock increased by return
  | 'sync' // Synced from Shopify
  | 'import' // Bulk import
  | 'correction'; // Manual correction

/**
 * Stock change source
 */
export type StockChangeSource =
  | 'manual' // Admin manual change
  | 'shopify' // Shopify webhook/sync
  | 'order' // Order processing
  | 'api' // External API call
  | 'system'; // System process

// ============================================================================
// STOCK RESERVATION TYPES
// ============================================================================

/**
 * Stock reservation for checkout
 */
export interface StockReservation {
  product_id: string;
  quantity: number;
  reserved_at: ISODateString;
  expires_at: ISODateString;
  order_id?: string;
}

/**
 * Bulk stock reservation input
 */
export interface BulkReserveInput {
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  reference_id?: string;
}

/**
 * Bulk stock release input
 */
export interface BulkReleaseInput {
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  reference_id?: string;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Stock update request body
 */
export interface UpdateStockRequest {
  stock: number;
  shopify_inventory_item_id?: string | null;
}

/**
 * Stock validation result
 */
export interface StockValidation {
  product_id: string;
  available: number;
  requested: number;
  is_available: boolean;
  error?: string;
}
