-- ============================================
-- Migration 006: Unified Stock Mode
-- ============================================
-- Date: 2025-11-26
-- Description: 
--   Add stock_mode column to support unified stock mode where B2B and Shopify
--   share the same stock pool instead of having separate allocations.
-- 
-- Stock Modes:
--   - 'split': B2B and B2C have separate stock allocations (default, current behavior)
--   - 'unified': Both channels share total_stock (b2b_stock = b2c_stock = total_stock)
-- 
-- When unified:
--   - Both B2B platform and Shopify sell from the same pool
--   - Any sale on either platform decrements total_stock
--   - b2b_stock and b2c_stock are kept equal to total_stock (for compatibility)
--   - Shopify sync sends total_stock instead of b2c_stock
-- ============================================

-- ============================================
-- STEP 1: Add stock_mode column
-- ============================================
-- D1 SQLite supports ALTER TABLE ADD COLUMN
ALTER TABLE product_inventory 
ADD COLUMN stock_mode TEXT NOT NULL DEFAULT 'split' CHECK(stock_mode IN ('split', 'unified'));

-- ============================================
-- STEP 2: Create index for stock_mode queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_stock_mode ON product_inventory(stock_mode);

-- ============================================
-- Migration Complete
-- ============================================
-- Note: The CHECK constraint on b2b_stock + b2c_stock <= total_stock
-- still exists from migration 003. For unified mode products, we keep
-- b2b_stock = b2c_stock = total_stock, which satisfies this constraint
-- (total_stock + total_stock would violate it, but we set both equal to total_stock).
-- 
-- The application layer handles the logic:
-- - When stock_mode = 'unified', b2b_stock and b2c_stock are always set to total_stock
-- - This means: b2b_stock (total_stock) + b2c_stock (total_stock) would be 2x total_stock
-- - BUT: we must update the constraint logic in the application layer
-- - For DB integrity in unified mode, we'll set b2b_stock = total_stock, b2c_stock = 0
--   OR remove the constraint check in the application when mode is unified
-- 
-- Implementation choice: In unified mode, we'll set:
--   - total_stock = available inventory
--   - b2b_stock = total_stock (for B2B queries)
--   - b2c_stock = total_stock (for Shopify sync)
-- The constraint b2b + b2c <= total will be REMOVED in migration
-- Actually, we'll keep backwards compatibility by:
--   - Setting b2b_stock = total_stock
--   - Setting b2c_stock = 0 (Shopify sync will use total_stock directly when mode='unified')
-- ============================================
