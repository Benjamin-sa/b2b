-- ============================================
-- Migration 005: Make product_id nullable in order_items
-- ============================================
-- Date: 2024-10-29
-- Description: 
--   Allow products to be deleted even when referenced in order history.
--   When a product is deleted, order_items.product_id becomes NULL,
--   but all denormalized product data (name, price, sku, etc.) is preserved.
-- 
-- Rationale:
--   - order_items table already stores denormalized product data
--   - product_name, product_sku, unit_price, image_url are preserved
--   - Historical orders remain intact with all purchase information
--   - Allows admins to delete discontinued products
-- 
-- Changes:
--   1. Create new order_items table with nullable product_id
--   2. Copy all existing data
--   3. Replace old table
--   4. Recreate indexes
-- ============================================

-- ============================================
-- STEP 1: Create new table with nullable product_id
-- ============================================
CREATE TABLE IF NOT EXISTS order_items_new (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,  -- ✅ NOW NULLABLE (was: TEXT NOT NULL)
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    image_url TEXT,
    stripe_invoice_item_id TEXT,
    tax_cents INTEGER,
    shopify_variant_id TEXT,
    brand TEXT,
    unit TEXT,
    weight REAL,
    stripe_price_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL  -- ✅ Changed from RESTRICT to SET NULL
);

-- ============================================
-- STEP 2: Copy all data from old table
-- ============================================
INSERT INTO order_items_new (
    id, order_id, product_id,
    product_name, product_sku, quantity,
    unit_price, total_price, image_url,
    stripe_invoice_item_id, tax_cents,
    shopify_variant_id, brand, unit, weight,
    stripe_price_id, created_at
)
SELECT 
    id, order_id, product_id,
    product_name, product_sku, quantity,
    unit_price, total_price, image_url,
    stripe_invoice_item_id, tax_cents,
    shopify_variant_id, brand, unit, weight,
    stripe_price_id, created_at
FROM order_items;

-- ============================================
-- STEP 3: Verify data integrity
-- ============================================
-- Check row counts match
-- Expected: SELECT COUNT(*) FROM order_items = SELECT COUNT(*) FROM order_items_new

-- ============================================
-- STEP 4: Drop old table and rename new one
-- ============================================
DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;

-- ============================================
-- STEP 5: Recreate indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_shopify ON order_items(shopify_variant_id);

-- ============================================
-- STEP 6: Drop related table (order_item_tax_amounts)
-- ============================================
-- This table has FK to order_items(id), needs recreation too
CREATE TABLE IF NOT EXISTS order_item_tax_amounts_new (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    tax_rate_id TEXT,
    amount_cents INTEGER NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- Copy data if exists
INSERT INTO order_item_tax_amounts_new (id, order_item_id, tax_rate_id, amount_cents)
SELECT id, order_item_id, tax_rate_id, amount_cents
FROM order_item_tax_amounts;

-- Replace table
DROP TABLE order_item_tax_amounts;
ALTER TABLE order_item_tax_amounts_new RENAME TO order_item_tax_amounts;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tax_amounts_item ON order_item_tax_amounts(order_item_id);

-- ============================================
-- Migration Complete
-- ============================================
-- What changed:
-- ✅ order_items.product_id is now nullable
-- ✅ ON DELETE RESTRICT → ON DELETE SET NULL
-- ✅ All existing data preserved
-- ✅ Indexes recreated
-- 
-- What this enables:
-- ✅ Admins can delete products even if sold
-- ✅ Order history preserved (product_name, price, etc.)
-- ✅ product_id becomes NULL for deleted products
-- ✅ JOINs to products table now need LEFT JOIN
-- 
-- Testing:
-- 1. Verify row counts: SELECT COUNT(*) FROM order_items
-- 2. Test product deletion: DELETE FROM products WHERE id = 'test-product'
-- 3. Check order_items: SELECT * FROM order_items WHERE product_id IS NULL
-- 4. Verify order displays still work with NULL product_id
-- ============================================
