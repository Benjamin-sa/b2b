-- Migration 0001: Enhanced inventory table for Shopify integration with variant support
-- Tracks product inventory with B2C stock, B2B stock, and total stock from Shopify
-- Each row represents a single purchasable variant (product + variant combination)

-- Main inventory table - minimal fields for stock management
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopify_product_id TEXT NOT NULL,
    shopify_variant_id TEXT UNIQUE NOT NULL,
    inventory_item_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    b2c_stock INTEGER NOT NULL DEFAULT 0,
    b2b_stock INTEGER NOT NULL DEFAULT 0,
    total_stock INTEGER NOT NULL DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (b2c_stock + b2b_stock = total_stock AND total_stock >= 0)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_shopify_product_id ON inventory(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shopify_variant_id ON inventory(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_inventory_item_id ON inventory(inventory_item_id);

-- Trigger to update the last_updated timestamp
CREATE TRIGGER IF NOT EXISTS update_inventory_timestamp 
    AFTER UPDATE ON inventory 
    BEGIN 
        UPDATE inventory SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
