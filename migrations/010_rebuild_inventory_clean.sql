-- ============================================
-- Migration 010: Rebuild Product Inventory (Clean Slate)
-- ============================================
-- Date: 2026-01-22
-- Description: 
--   Complete rebuild of inventory system with radical simplification.
--   Shopify is the SINGLE SOURCE OF TRUTH.
--   
--   Strategy:
--   1. Rename old table to backup
--   2. Create brand new simplified table
--   3. Migrate only essential data
--   4. Keep backup table for rollback safety
-- ============================================

-- ============================================
-- STEP 1: Backup existing table
-- ============================================
ALTER TABLE product_inventory RENAME TO product_inventory_backup;

-- ============================================
-- STEP 2: Create new simplified table
-- ============================================
CREATE TABLE product_inventory (
  product_id TEXT PRIMARY KEY,
  
  -- 📊 SINGLE SOURCE OF TRUTH: Stock available across ALL channels
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  
  -- 🔗 Shopify synchronization
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  shopify_inventory_item_id TEXT,  -- Required for Shopify Inventory API
  shopify_location_id TEXT,
  sync_enabled INTEGER DEFAULT 0 CHECK(sync_enabled IN (0, 1)),
  last_synced_at TEXT,
  sync_error TEXT,
  
  -- 📅 Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Foreign key: CASCADE delete when product is removed
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 3: Migrate essential data
-- ============================================
INSERT INTO product_inventory (
  product_id,
  stock,
  shopify_product_id,
  shopify_variant_id,
  shopify_inventory_item_id,
  shopify_location_id,
  sync_enabled,
  last_synced_at,
  sync_error,
  created_at,
  updated_at
)
SELECT 
  product_id,
  -- Use total_stock as the unified stock value
  COALESCE(total_stock, 0) as stock,
  shopify_product_id,
  shopify_variant_id,
  shopify_inventory_item_id,
  shopify_location_id,
  sync_enabled,
  last_synced_at,
  sync_error,
  created_at,
  updated_at
FROM product_inventory_backup;

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================
-- Index for stock filtering (e.g., "inStock" filter)
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON product_inventory(stock);

-- Index for products with available stock
CREATE INDEX IF NOT EXISTS idx_inventory_in_stock ON product_inventory(stock) WHERE stock > 0;

-- Index for Shopify-synced products
CREATE INDEX IF NOT EXISTS idx_inventory_shopify_variant ON product_inventory(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;

-- Index for products with sync enabled
CREATE INDEX IF NOT EXISTS idx_inventory_sync_enabled ON product_inventory(sync_enabled) WHERE sync_enabled = 1;

-- ============================================
-- STEP 5: Rebuild inventory_sync_log (simplified)
-- ============================================
ALTER TABLE inventory_sync_log RENAME TO inventory_sync_log_backup;

CREATE TABLE inventory_sync_log (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  
  -- Action details
  action TEXT NOT NULL,  -- 'b2b_order', 'sync_from_shopify', 'sync_to_shopify', 'manual_update', 'initial_stock'
  source TEXT NOT NULL,  -- 'invoice_creation', 'shopify_webhook', 'admin_stock_management'
  
  -- 📊 Simplified stock tracking
  stock_change INTEGER NOT NULL DEFAULT 0,  -- Change amount (+ or -)
  stock_after INTEGER NOT NULL DEFAULT 0,   -- Snapshot after change
  
  -- Shopify sync status
  synced_to_shopify INTEGER DEFAULT 0 CHECK(synced_to_shopify IN (0, 1)),
  sync_error TEXT,
  
  -- Reference to related entities
  reference_id TEXT,      -- invoice_id, webhook_id, etc.
  reference_type TEXT,    -- 'invoice', 'webhook', 'manual'
  
  -- Metadata
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Migrate recent log entries (last 90 days) with simplified data
INSERT INTO inventory_sync_log (
  id,
  product_id,
  action,
  source,
  stock_change,
  stock_after,
  synced_to_shopify,
  sync_error,
  reference_id,
  reference_type,
  created_by,
  created_at
)
SELECT 
  id,
  product_id,
  action,
  source,
  COALESCE(total_change, 0) as stock_change,
  COALESCE(total_stock_after, 0) as stock_after,
  synced_to_shopify,
  sync_error,
  reference_id,
  reference_type,
  created_by,
  created_at
FROM inventory_sync_log_backup
WHERE datetime(created_at) > datetime('now', '-90 days')
ORDER BY created_at ASC;

-- Create index on created_at for log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON inventory_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_product ON inventory_sync_log(product_id);

-- ============================================
-- Migration Complete
-- ============================================
-- ✅ New simplified structure:
--    - Single 'stock' column (Shopify is master)
--    - Removed: total_stock, b2b_stock, b2c_stock, stock_mode, reserved_stock
--    - Simplified audit log with stock_change and stock_after
-- 
-- 📦 Backup tables preserved:
--    - product_inventory_backup (can be dropped after verification)
--    - inventory_sync_log_backup (can be dropped after verification)
-- 
-- 🔄 New flow:
--    1. Shopify webhook → directly updates 'stock'
--    2. B2B checkout → atomic decrement with WHERE stock >= qty
--    3. After B2B checkout → sync stock back to Shopify
-- ============================================
