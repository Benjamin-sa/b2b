/**
 * @b2b/types - Product Types
 *
 * Single source of truth for product-related types.
 * ALL fields use snake_case to match D1 database schema.
 */

import type { ISODateString, SQLiteBoolean, PaginationParams } from './common';
import type { ProductInventory } from './inventory';

// ============================================================================
// PRODUCT TYPES (matches D1 `products` table)
// ============================================================================

/**
 * Product record from D1 database
 *
 * Note: `stock`, `in_stock`, `shopify_product_id`, `shopify_variant_id` columns
 * exist in the table but are DEPRECATED. Always use product_inventory instead.
 * Note: Fields with defaults can be null when returned from D1
 */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category_id: string | null;
  coming_soon: SQLiteBoolean;
  brand: string | null;
  part_number: string | null;
  b2b_sku: string | null; // Custom B2B SKU (format: TP-00001)
  barcode: string | null; // Auto-generated EAN-13 barcode (13 digits)
  unit: string | null;
  min_order_quantity: number | null;
  max_order_quantity: number | null;
  weight: number | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: ISODateString | null;
  updated_at: ISODateString | null;

  // DEPRECATED: These exist in DB but should NOT be used
  in_stock?: SQLiteBoolean;
  stock?: number | null;
  shopify_product_id?: string | null;
  shopify_variant_id?: string | null;
}

/**
 * Product with all relations loaded (API response)
 */
export interface ProductWithRelations extends Product {
  /** Gallery images (normalized to URL strings) */
  images?: string[];
  /** Product specifications (key-value pairs) */
  specifications?: ProductSpecificationDisplay[];
  /** Product tags */
  tags?: string[];
  /** Dimensions */
  dimensions?: ProductDimension | null;
  /** Inventory (single source of truth for stock) */
  inventory?: ProductInventory;
}

/**
 * Input for creating a new product
 */
export interface CreateProductInput {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  category_id?: string | null;
  coming_soon?: SQLiteBoolean;
  brand?: string | null;
  part_number?: string | null;
  b2b_sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  min_order_quantity?: number;
  max_order_quantity?: number | null;
  weight?: number | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
}

/**
 * Input for updating a product
 */
export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  price?: number;
  original_price?: number | null;
  image_url?: string | null;
  category_id?: string | null;
  coming_soon?: SQLiteBoolean;
  brand?: string | null;
  part_number?: string | null;
  b2b_sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  min_order_quantity?: number;
  max_order_quantity?: number | null;
  weight?: number | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
}

// ============================================================================
// PRODUCT IMAGE TYPES (matches D1 `product_images` table)
// ============================================================================

/**
 * Product image record
 */
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number | null;
  created_at: ISODateString | null;
}

/**
 * Input for adding a product image
 */
export interface CreateProductImageInput {
  id: string;
  product_id: string;
  image_url: string;
  sort_order?: number;
}

// ============================================================================
// PRODUCT SPECIFICATION TYPES (matches D1 `product_specifications` table)
// ============================================================================

/**
 * Product specification record (raw DB format)
 */
export interface ProductSpecification {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  sort_order: number | null;
}

/**
 * Product specification display format (simplified for frontend)
 */
export interface ProductSpecificationDisplay {
  key: string;
  value: string;
}

/**
 * Input for creating a product specification
 */
export interface CreateProductSpecificationInput {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  sort_order?: number;
}

// ============================================================================
// PRODUCT TAG TYPES (matches D1 `product_tags` table)
// ============================================================================

/**
 * Product tag record (composite primary key)
 */
export interface ProductTag {
  product_id: string;
  tag: string;
}

// ============================================================================
// PRODUCT DIMENSION TYPES (matches D1 `product_dimensions` table)
// ============================================================================

/**
 * Product dimensions record
 */
export interface ProductDimension {
  product_id: string;
  length: number;
  width: number;
  height: number;
  unit: string | null;
}

/**
 * Input for setting product dimensions
 */
export interface SetProductDimensionsInput {
  product_id: string;
  length: number;
  width: number;
  height: number;
  unit?: string;
}

// ============================================================================
// PRODUCT FILTER & QUERY TYPES
// ============================================================================

/**
 * Product filter parameters for listing
 */
export interface ProductFilter extends PaginationParams {
  category_id?: string;
  brand?: string;
  in_stock?: boolean;
  coming_soon?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  tags?: string[];
}

/**
 * Product list API response
 */
export interface ProductListResponse {
  products: ProductWithRelations[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Product brands list response
 */
export interface ProductBrandsResponse {
  brands: string[];
}
