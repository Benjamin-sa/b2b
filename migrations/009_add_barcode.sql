-- Migration 009: Add EAN-13 barcode field to products table
-- 
-- This adds a 13-digit EAN-13 barcode that is auto-generated for internal use.
-- Format: 2 (prefix) + 00001 (5-digit ID) + 00001 (5-digit sequence) + X (check digit)
-- 
-- The barcode is used for:
-- - Internal inventory management
-- - Frontend display
-- - Scanning/lookup systems
--
-- NOTE: This is NOT sent to Stripe - internal use only

-- Add barcode column to products table
ALTER TABLE products ADD COLUMN barcode TEXT;

-- Create unique index for faster lookups and ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
