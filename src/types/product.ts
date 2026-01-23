import type { ProductInventory as DbProductInventory } from '@b2b/db/types';

// SIMPLIFIED: Always unified now (Shopify is source of truth)
export type StockMode = 'unified';

// Product Inventory data (from product_inventory table)
export type ProductInventory = DbProductInventory;

// Product related types
// Matches backend API response exactly (snake_case) - no transformation needed!
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category_id: string | null;
  in_stock: number; // DEPRECATED - use inventory.stock > 0 instead
  coming_soon: number; // SQLite boolean (0 or 1)
  stock: number; // DEPRECATED - use inventory.stock instead
  brand: string | null;
  part_number: string | null;
  b2b_sku: string | null; // Custom B2B SKU (format: TP-00001)
  barcode: string | null; // Auto-generated EAN-13 barcode (13 digits)
  unit: string | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  weight: number | null;
  shopify_product_id: string | null; // DEPRECATED - use inventory.shopify_product_id instead
  shopify_variant_id: string | null; // DEPRECATED - use inventory.shopify_variant_id instead
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations (included in API response when fetched with relations)
  // Note: These are normalized in the store for easier frontend usage
  images?: string[]; // Normalized from ProductImage[] to string[] of URLs
  specifications?: Array<{ key: string; value: string }>; // Normalized from ProductSpecification[]
  tags?: string[];
  dimensions?: ProductDimension | null;
  // ✅ CRITICAL: Single source of truth for stock (Shopify is master)
  inventory?: ProductInventory;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  sort_order: number;
}

export interface ProductDimension {
  product_id: string;
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface ProductFilter {
  category_id?: string;
  brand?: string;
  in_stock?: boolean;
  coming_soon?: boolean;
  min_price?: number;
  max_price?: number;
  search_term?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'stock';
  sort_order?: 'asc' | 'desc';
  tags?: string[];
}

export interface PaginationResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Types
export interface ProductWithInventory {
  id: string;
  name: string;
  part_number: string | null;
  image_url: string | null;
  inventory?: ProductInventory;
}

export interface StockUpdate {
  totalStock: number;
  b2bStock: number;
  b2cStock: number;
  shopifyInventoryItemId?: string | null;
  // Stock mode: 'split' (default) or 'unified' (shared stock pool)
  stockMode?: StockMode;
}
