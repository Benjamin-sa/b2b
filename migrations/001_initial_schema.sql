-- ============================================
-- B2B Platform - Complete D1 Database Schema
-- ============================================
-- Migration from Firebase Firestore to Cloudflare D1
-- Version: 001
-- Date: 2025-10-23
-- ============================================

-- ============================================
-- USERS TABLE
-- Maps from Firestore collection: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'customer')) NOT NULL,
    company_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    btw_number TEXT NOT NULL,
    btw_number_validated INTEGER DEFAULT 0 CHECK(btw_number_validated IN (0, 1)),
    address_street TEXT NOT NULL,
    address_house_number TEXT NOT NULL,
    address_postal_code TEXT NOT NULL,
    address_city TEXT NOT NULL,
    address_country TEXT NOT NULL,
    stripe_customer_id TEXT,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    is_verified INTEGER DEFAULT 0 CHECK(is_verified IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CATEGORIES TABLE
-- Maps from Firestore collection: categories
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    parent_id TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================
-- PRODUCTS TABLE
-- Maps from Firestore collection: products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    original_price REAL,
    image_url TEXT,
    category_id TEXT,
    in_stock INTEGER DEFAULT 1 CHECK(in_stock IN (0, 1)),
    coming_soon INTEGER DEFAULT 0 CHECK(coming_soon IN (0, 1)),
    stock INTEGER DEFAULT 0,
    brand TEXT,
    part_number TEXT,
    unit TEXT,
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER,
    weight REAL,
    shopify_product_id TEXT,
    shopify_variant_id TEXT,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================
-- PRODUCT IMAGES TABLE
-- Supports multiple images per product
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- PRODUCT SPECIFICATIONS TABLE
-- Key-value pairs for product specs
-- ============================================
CREATE TABLE IF NOT EXISTS product_specifications (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    spec_key TEXT NOT NULL,
    spec_value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- PRODUCT TAGS TABLE
-- Many-to-many relationship for product tags
-- ============================================
CREATE TABLE IF NOT EXISTS product_tags (
    product_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (product_id, tag),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- PRODUCT DIMENSIONS TABLE
-- Optional dimensions for products
-- ============================================
CREATE TABLE IF NOT EXISTS product_dimensions (
    product_id TEXT PRIMARY KEY,
    length REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    unit TEXT DEFAULT 'cm',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- ORDERS TABLE
-- Maps from Firestore collection: orders
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    shipping REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')) NOT NULL,
    order_date TEXT DEFAULT (datetime('now')),
    estimated_delivery TEXT,
    shipping_address_street TEXT NOT NULL,
    shipping_address_city TEXT NOT NULL,
    shipping_address_state TEXT,
    shipping_address_zip_code TEXT NOT NULL,
    shipping_address_country TEXT NOT NULL,
    shipping_address_company TEXT,
    shipping_address_contact TEXT,
    shipping_address_phone TEXT,
    billing_address_street TEXT,
    billing_address_city TEXT,
    billing_address_state TEXT,
    billing_address_zip_code TEXT,
    billing_address_country TEXT,
    billing_address_company TEXT,
    billing_address_contact TEXT,
    billing_address_phone TEXT,
    payment_method TEXT,
    notes TEXT,
    tracking_number TEXT,
    invoice_url TEXT,
    invoice_pdf TEXT,
    invoice_number TEXT,
    stripe_invoice_id TEXT,
    stripe_status TEXT,
    shipping_cost_cents INTEGER,
    due_date TEXT,
    paid_at TEXT,
    stripe_shipping_invoice_item_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- ORDER ITEMS TABLE
-- Line items for each order
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ============================================
-- ORDER ITEM TAX AMOUNTS TABLE
-- Multiple tax rates can apply to one item
-- ============================================
CREATE TABLE IF NOT EXISTS order_item_tax_amounts (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    tax_rate_id TEXT,
    amount_cents INTEGER NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);
-- ============================================
-- SESSIONS TABLE
-- JWT session management
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_activity TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- WEBHOOK EVENTS TABLE
-- Log all webhook events for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL,
    processed INTEGER DEFAULT 0 CHECK(processed IN (0, 1)),
    success INTEGER CHECK(success IN (0, 1)),
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT
);

-- ============================================
-- STOCK HISTORY TABLE
-- Track all stock changes for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS stock_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    shopify_variant_id TEXT,
    change_amount INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    change_type TEXT CHECK(change_type IN ('sale', 'return', 'adjustment', 'transfer', 'sync')) NOT NULL,
    reference_id TEXT,
    reference_type TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- Temporary tokens for password reset flow
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0 CHECK(used IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    used_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- EMAIL VERIFICATION TOKENS TABLE
-- Tokens for email verification
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0 CHECK(used IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    used_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- CART TABLE (Optional - if persisting carts)
-- Store user carts in database
-- ============================================
CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- CART ITEMS TABLE
-- Items in user carts
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    cart_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(cart_id, product_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_btw ON users(btw_number);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_shopify_variant ON products(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_products_shopify_product ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_product ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products(part_number);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Product images indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, sort_order);

-- Product specifications indexes
CREATE INDEX IF NOT EXISTS idx_product_specs_product ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_key ON product_specifications(product_id, spec_key);

-- Product tags indexes
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON product_tags(tag);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_invoice ON orders(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shopify ON order_items(shopify_variant_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_date ON webhook_events(created_at);

-- Stock history indexes
CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_variant ON stock_history(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_type ON stock_history(change_type);
CREATE INDEX IF NOT EXISTS idx_stock_history_date ON stock_history(created_at);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Email verification tokens indexes
CREATE INDEX IF NOT EXISTS idx_verify_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verify_tokens_token ON email_verification_tokens(token);

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Note: D1 doesn't support triggers yet, so updated_at
-- must be handled in application code. When D1 adds
-- trigger support, uncomment and modify these:

-- CREATE TRIGGER IF NOT EXISTS update_users_timestamp
-- AFTER UPDATE ON users
-- BEGIN
--     UPDATE users SET updated_at = datetime('now')
--     WHERE id = NEW.id;
-- END;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- This schema supports all functionality from
-- the existing Firebase Firestore database:
--
-- ✓ User authentication and authorization
-- ✓ Product catalog with categories
-- ✓ Multiple product images and specifications
-- ✓ Order management with line items
-- ✓ Invoice tracking (Stripe integration)
-- ✓ Session management for JWT auth
-- ✓ Webhook event logging
-- ✓ Stock history and audit trail
-- ✓ Password reset and email verification
-- ✓ Shopping cart persistence
--
-- Ready for Phase 2 data migration!
-- ============================================
