-- Migration 008: Add B2B SKU to order_items table
-- 
-- This adds historical tracking of B2B SKU in order items.
-- When an order is placed, we capture the product's B2B SKU at that moment
-- (in case it changes later).
--
-- This is a denormalized field, similar to existing product_name, product_sku, etc.

-- Add b2b_sku column to order_items table
ALTER TABLE order_items ADD COLUMN b2b_sku TEXT;

-- No index needed here as order_items are typically queried by order_id
-- (which already has an index)
