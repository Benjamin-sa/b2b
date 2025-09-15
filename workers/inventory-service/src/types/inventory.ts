/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  SHOPIFY_STORE_URL: string;
  SHOPIFY_ACCESS_TOKEN: string;
  WEBHOOK_SECRET: string;
  ADMIN_KEY: string;
}

export interface InventoryItem {
  id?: number;
  shopify_product_id: string;
  shopify_variant_id: string;
  inventory_item_id: string;
  title: string;
  b2c_stock: number;
  b2b_stock: number;
  total_stock: number;
  last_updated?: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: number;
  inventory_item_id: number;
  inventory_quantity: number;
}

export interface ShopifyLineItem {
  variant_id: number;
  sku: string;
  quantity: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface B2BTransferRequest {
  shopify_variant_id: string;
  amount: number;
}

export interface B2BTransferResponse {
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  previous_b2c_stock: number;
  previous_b2b_stock: number;
  new_b2c_stock: number;
  new_b2b_stock: number;
  total_stock: number;
  transferred_amount: number;
}
