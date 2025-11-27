/**
 * Environment bindings for Shopify Sync Service
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // Shopify configuration
  SHOPIFY_ACCESS_TOKEN: string;
  SHOPIFY_ADMIN_API_TOKEN: string; // GraphQL Admin API token
  SHOPIFY_WEBHOOK_SECRET: string;
  SHOPIFY_STORE_DOMAIN: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_LOCATION_ID: string;

  // Service-to-service authentication
  SERVICE_SECRET: string;

  // Environment
  ENVIRONMENT: 'development' | 'production';
  ALLOWED_ORIGINS: string;
}

/**
 * Stock mode type
 * - 'split': Separate B2B/B2C allocations (default)
 * - 'unified': Shared stock pool between B2B and Shopify
 */
export type StockMode = 'split' | 'unified';

/**
 * Product inventory from D1
 */
export interface ProductInventory {
  product_id: string;
  total_stock: number;
  b2b_stock: number;
  b2c_stock: number;
  reserved_stock: number;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_inventory_item_id: string | null;
  shopify_location_id: string | null;
  sync_enabled: number;
  last_synced_at: string | null;
  sync_error: string | null;
  // Stock mode: 'split' (default) = separate B2B/B2C allocations, 'unified' = shared stock pool
  stock_mode: StockMode;
  created_at: string;
  updated_at: string;
}

/**
 * Shopify inventory level response
 */
export interface ShopifyInventoryLevel {
  inventory_item_id: string;
  location_id: string;
  available: number;
  updated_at: string;
}

/**
 * Shopify variant details
 */
export interface ShopifyVariant {
  id: string;
  product_id: string;
  title: string;
  sku: string;
  inventory_item_id: string;
  inventory_quantity: number;
}

/**
 * Sync log entry
 */
export interface SyncLogEntry {
  id: string;
  product_id: string;
  action: 'sync_to_shopify' | 'sync_from_shopify' | 'b2b_order' | 'b2c_order' | 'restock' | 'rebalance';
  source: 'b2b_checkout' | 'shopify_webhook' | 'admin_manual' | 'cron_job';
  total_change: number;
  b2b_change: number;
  b2c_change: number;
  total_stock_after: number;
  b2b_stock_after: number;
  b2c_stock_after: number;
  synced_to_shopify: number;
  sync_error: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Shopify webhook payload types
 */
export interface ShopifyWebhookHeader {
  'x-shopify-topic': string;
  'x-shopify-hmac-sha256': string;
  'x-shopify-shop-domain': string;
  'x-shopify-api-version': string;
  'x-shopify-webhook-id': string;
}

export interface ShopifyInventoryUpdatePayload {
  inventory_item_id: string;
  location_id: string;
  available: number;
  updated_at: string;
}

export interface ShopifyOrderCreatedPayload {
  id: number;
  order_number: number;
  line_items: Array<{
    id: number;
    variant_id: number;
    quantity: number;
    sku: string;
  }>;
}
