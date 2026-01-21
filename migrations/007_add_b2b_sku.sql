-- Migration 007: Add B2B SKU field to products table
-- 
-- This adds a custom, auto-generated B2B SKU (format: TP-00001) 
-- that coexists with the supplier's SKU (part_number field).
-- 
-- The B2B SKU is used internally for:
-- - Order management and fulfillment
-- - Invoice generation
-- - Internal inventory tracking
-- - Customer-facing product identification
--
-- NOTE: This does NOT override the supplier's SKU (part_number)

-- Add b2b_sku column to products table
ALTER TABLE products ADD COLUMN b2b_sku TEXT;

-- Create index for faster lookups (b2b_sku will be searchable)
CREATE INDEX IF NOT EXISTS idx_products_b2b_sku ON products(b2b_sku);

-- Note: UNIQUE constraint is NOT added here to allow NULL values during migration
-- Once all products are enriched with SKUs (via backfill script), 
-- you can optionally add: CREATE UNIQUE INDEX idx_products_b2b_sku_unique ON products(b2b_sku) WHERE b2b_sku IS NOT NULL;
