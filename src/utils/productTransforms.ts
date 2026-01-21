/**
 * Product Transformation Utilities
 * 
 * Transforms between API (snake_case, DB format) and Frontend (camelCase, UI format)
 */

import type { Product } from '../types/product';

/**
 * API Product format (from inventory-service)
 */
interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category_id: string | null;
  in_stock: number; // SQLite boolean (0 or 1)
  b2b_sku: string | null;
  barcode: string | null;
  coming_soon: number; // SQLite boolean (0 or 1)
  stock: number;
  brand: string | null;
  part_number: string | null;
  unit: string | null;
  min_order_quantity: number;
  max_order_quantity: number | null;
  weight: number | null;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  images?: Array<{
    id: string;
    product_id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
  }>;
  specifications?: Array<{
    id: string;
    product_id: string;
    spec_key: string;
    spec_value: string;
    sort_order: number;
  }>;
  tags?: string[];
  dimensions?: {
    product_id: string;
    length: number;
    width: number;
    height: number;
    unit: string;
  } | null;
}

/**
 * Transform API product (snake_case) to Frontend product (snake_case)
 */
export function transformApiProduct(apiProduct: ApiProduct): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    description: apiProduct.description || '',
    price: apiProduct.price,
    original_price: apiProduct.original_price || null,
    image_url: apiProduct.image_url || null,
    // Map images array to string array
    images: apiProduct.images?.map((img) => img.image_url) || [],
    category_id: apiProduct.category_id || null,
    // Convert SQLite boolean (0/1) to SQLite number format
    in_stock: apiProduct.in_stock,
    b2b_sku: apiProduct.b2b_sku || null,
    barcode: apiProduct.barcode || null,
    coming_soon: apiProduct.coming_soon,
    stock: apiProduct.stock,
    brand: apiProduct.brand || null,
    part_number: apiProduct.part_number || null,
    unit: apiProduct.unit || null,
    min_order_quantity: apiProduct.min_order_quantity,
    max_order_quantity: apiProduct.max_order_quantity || null,
    weight: apiProduct.weight || null,
    // Transform specifications array
    specifications: apiProduct.specifications?.map((spec) => ({
      key: spec.spec_key,
      value: spec.spec_value,
    })) || [],
    tags: apiProduct.tags || [],
    // Transform dimensions
    dimensions: apiProduct.dimensions
      ? {
          product_id: apiProduct.dimensions.product_id,
          length: apiProduct.dimensions.length,
          width: apiProduct.dimensions.width,
          height: apiProduct.dimensions.height,
          unit: apiProduct.dimensions.unit,
        }
      : null,
    // Integration IDs
    shopify_product_id: apiProduct.shopify_product_id || null,
    shopify_variant_id: apiProduct.shopify_variant_id || null,
    stripe_product_id: apiProduct.stripe_product_id || null,
    stripe_price_id: apiProduct.stripe_price_id || null,
    // Timestamps
    created_at: apiProduct.created_at,
    updated_at: apiProduct.updated_at,
  };
}

/**
 * Transform Frontend product (snake_case) to API format (snake_case)
 * Used for CREATE and UPDATE operations
 */
export function transformProductToApi(product: Partial<Product>): any {
  const apiProduct: any = {};

  // Only include fields that are present
  if (product.name !== undefined) apiProduct.name = product.name;
  if (product.description !== undefined) apiProduct.description = product.description || null;
  if (product.price !== undefined) apiProduct.price = product.price;
  if (product.original_price !== undefined) apiProduct.original_price = product.original_price;
  if (product.image_url !== undefined) apiProduct.image_url = product.image_url;
  if (product.category_id !== undefined) apiProduct.category_id = product.category_id;
  
  // Convert boolean to SQLite format (not needed for API request, service handles it)
  if (product.in_stock !== undefined) apiProduct.in_stock = product.in_stock;
  if (product.coming_soon !== undefined) apiProduct.coming_soon = product.coming_soon;
  
  if (product.stock !== undefined) apiProduct.stock = product.stock;
  if (product.brand !== undefined) apiProduct.brand = product.brand;
  if (product.part_number !== undefined) apiProduct.part_number = product.part_number;
  if (product.unit !== undefined) apiProduct.unit = product.unit;
  if (product.min_order_quantity !== undefined) apiProduct.min_order_quantity = product.min_order_quantity;
  if (product.max_order_quantity !== undefined) apiProduct.max_order_quantity = product.max_order_quantity;
  if (product.weight !== undefined) apiProduct.weight = product.weight;

  // Arrays
  if (product.images !== undefined) apiProduct.images = product.images;
  if (product.tags !== undefined) apiProduct.tags = product.tags;

  // Transform specifications to API format
  if (product.specifications !== undefined) {
    apiProduct.specifications = product.specifications.map((spec) => ({
      key: spec.key,
      value: spec.value,
    }));
  }

  // Transform dimensions to API format
  if (product.dimensions !== undefined && product.dimensions !== null) {
    apiProduct.dimensions = {
      length: product.dimensions.length,
      width: product.dimensions.width,
      height: product.dimensions.height,
      unit: product.dimensions.unit || 'cm', // Default unit
    };
  }

  // Integration IDs
  if (product.shopify_product_id !== undefined) apiProduct.shopify_product_id = product.shopify_product_id;
  if (product.shopify_variant_id !== undefined) apiProduct.shopify_variant_id = product.shopify_variant_id;
  if (product.stripe_product_id !== undefined) apiProduct.stripe_product_id = product.stripe_product_id;
  if (product.stripe_price_id !== undefined) apiProduct.stripe_price_id = product.stripe_price_id;

  return apiProduct;
}
