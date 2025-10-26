-- ============================================
-- Migration 003: Product Inventory System
-- ============================================
-- Date: 2025-10-26
-- Description: 
--   Centralized inventory management for B2B/B2C stock allocation
--   and Shopify synchronization
-- 
-- Changes:
--   1. Create product_inventory table (single source of truth)
--   2. Create inventory_sync_log table (audit trail)
--   3. Migrate existing stock data from products table
--   4. Remove deprecated fields from products table
-- ============================================

-- ============================================
-- STEP 1: Create product_inventory table
-- ============================================
CREATE TABLE IF NOT EXISTS product_inventory (
  product_id TEXT PRIMARY KEY,
  
  -- Stock allocation
  total_stock INTEGER NOT NULL DEFAULT 0,
  b2b_stock INTEGER NOT NULL DEFAULT 0,
  b2c_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,  -- For pending checkouts
  
  -- Shopify synchronization
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  shopify_inventory_item_id TEXT,  -- Required for Shopify stock updates
  shopify_location_id TEXT,        -- Shopify warehouse location
  sync_enabled INTEGER DEFAULT 0 CHECK(sync_enabled IN (0, 1)),
  last_synced_at TEXT,
  sync_error TEXT,                 -- Last sync error message (if any)
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Foreign key
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  -- Constraints: ensure stock integrity
  CHECK (b2b_stock >= 0),
  CHECK (b2c_stock >= 0),
  CHECK (reserved_stock >= 0),
  CHECK (total_stock >= 0),
  CHECK (b2b_stock + b2c_stock <= total_stock),  -- Allocated can't exceed total
  CHECK (reserved_stock <= total_stock)          -- Reserved can't exceed total
);

-- ============================================
-- STEP 2: Create inventory_sync_log table
-- ============================================
-- Audit trail for all inventory changes
CREATE TABLE IF NOT EXISTS inventory_sync_log (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  
  -- Action details
  action TEXT NOT NULL,  -- 'b2b_order', 'b2c_order', 'restock', 'rebalance', 'sync_to_shopify', 'sync_from_shopify'
  source TEXT NOT NULL,  -- 'b2b_checkout', 'shopify_webhook', 'admin_manual', 'cron_job'
  
  -- Stock changes (positive or negative)
  total_change INTEGER DEFAULT 0,
  b2b_change INTEGER DEFAULT 0,
  b2c_change INTEGER DEFAULT 0,
  reserved_change INTEGER DEFAULT 0,
  
  -- Snapshot (values AFTER change)
  total_stock_after INTEGER,
  b2b_stock_after INTEGER,
  b2c_stock_after INTEGER,
  
  -- Shopify sync status
  synced_to_shopify INTEGER DEFAULT 0 CHECK(synced_to_shopify IN (0, 1)),
  sync_error TEXT,
  
  -- Reference to related entities
  reference_id TEXT,      -- order_id, webhook_id, etc.
  reference_type TEXT,    -- 'order', 'webhook', 'manual'
  
  -- Metadata
  created_by TEXT,        -- user_id if manual action
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 3: Migrate existing data
-- ============================================
-- Copy stock data from products table to product_inventory
-- Strategy: All existing stock goes to B2B (since no B2C integration yet)
INSERT INTO product_inventory (
  product_id,
  total_stock,
  b2b_stock,
  b2c_stock,
  reserved_stock,
  shopify_product_id,
  shopify_variant_id,
  sync_enabled,
  created_at,
  updated_at
)
SELECT 
  id AS product_id,
  COALESCE(stock, 0) AS total_stock,
  COALESCE(stock, 0) AS b2b_stock,  -- All stock initially allocated to B2B
  0 AS b2c_stock,                    -- No B2C allocation yet
  0 AS reserved_stock,
  shopify_product_id,
  shopify_variant_id,
  CASE 
    WHEN shopify_variant_id IS NOT NULL THEN 0  -- Linked but not syncing yet
    ELSE 0
  END AS sync_enabled,
  created_at,
  updated_at
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM product_inventory WHERE product_inventory.product_id = products.id
);

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_product ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sync_enabled ON product_inventory(sync_enabled) WHERE sync_enabled = 1;
CREATE INDEX IF NOT EXISTS idx_inventory_shopify_variant ON product_inventory(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_last_synced ON product_inventory(last_synced_at);

-- Sync log indexes
CREATE INDEX IF NOT EXISTS idx_sync_log_product ON inventory_sync_log(product_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_action ON inventory_sync_log(action);
CREATE INDEX IF NOT EXISTS idx_sync_log_source ON inventory_sync_log(source);
CREATE INDEX IF NOT EXISTS idx_sync_log_date ON inventory_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_reference ON inventory_sync_log(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_sync_status ON inventory_sync_log(synced_to_shopify);

-- ============================================
-- STEP 5: Clean up products table
-- ============================================
-- Remove deprecated columns: stock, in_stock, shopify_product_id, shopify_variant_id
-- 
-- IMPORTANT: We're NOT recreating the products table in this migration.
-- D1's foreign key handling makes table recreation risky with existing data.
-- 
-- Instead, we'll keep the old columns but mark them as DEPRECATED.
-- The application code will use product_inventory table instead.
-- 
-- Future cleanup: When D1 supports ALTER TABLE DROP COLUMN, we can remove:
--   - stock (use product_inventory.total_stock)
--   - in_stock (compute from product_inventory)
--   - shopify_product_id (use product_inventory.shopify_product_id)
--   - shopify_variant_id (use product_inventory.shopify_variant_id)
--
-- For now: These columns exist but are IGNORED by the application.

-- No table recreation - keeping existing products table structure

-- ============================================
-- STEP 6: Add comment to stock_history table
-- ============================================
-- The existing stock_history table (from migration 001) can still be used
-- for high-level audit trail. The inventory_sync_log table is more detailed
-- and specific to B2B/B2C allocation changes.
-- Consider both tables complementary:
--   - stock_history: High-level changes (what changed)
--   - inventory_sync_log: Detailed allocation changes (how it changed, where it synced)

-- ============================================
-- Migration Complete
-- ============================================
-- Next steps:
-- 1. Update product.service.ts to use product_inventory table
-- 2. Create shopify-sync-service worker
-- 3. Update admin UI to show B2B/B2C allocation
-- 4. Test stock operations (order, restock, rebalance)
-- ============================================
