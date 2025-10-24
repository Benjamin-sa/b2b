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
 * Transform API product (snake_case) to Frontend product (camelCase)
 */
export function transformApiProduct(apiProduct: ApiProduct): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    description: apiProduct.description || '',
    price: apiProduct.price,
    originalPrice: apiProduct.original_price || undefined,
    imageUrl: apiProduct.image_url || undefined,
    // Map images array to string array
    images: apiProduct.images?.map((img) => img.image_url) || [],
    categoryId: apiProduct.category_id || undefined,
    // Convert SQLite boolean (0/1) to JavaScript boolean
    inStock: apiProduct.in_stock === 1,
    comingSoon: apiProduct.coming_soon === 1,
    stock: apiProduct.stock,
    brand: apiProduct.brand || undefined,
    partNumber: apiProduct.part_number || undefined,
    unit: apiProduct.unit || undefined,
    minOrderQuantity: apiProduct.min_order_quantity,
    maxOrderQuantity: apiProduct.max_order_quantity || undefined,
    weight: apiProduct.weight || undefined,
    // Transform specifications array
    specifications: apiProduct.specifications?.map((spec) => ({
      key: spec.spec_key,
      value: spec.spec_value,
    })) || [],
    tags: apiProduct.tags || [],
    // Transform dimensions
    dimensions: apiProduct.dimensions
      ? {
          length: apiProduct.dimensions.length,
          width: apiProduct.dimensions.width,
          height: apiProduct.dimensions.height,
        }
      : undefined,
    // Integration IDs
    shopifyProductId: apiProduct.shopify_product_id || undefined,
    shopifyVariantId: apiProduct.shopify_variant_id || undefined,
    stripeProductId: apiProduct.stripe_product_id || undefined,
    stripePriceId: apiProduct.stripe_price_id || undefined,
    // Timestamps
    createdAt: apiProduct.created_at,
    updatedAt: apiProduct.updated_at,
  };
}

/**
 * Transform Frontend product (camelCase) to API format (snake_case)
 * Used for CREATE and UPDATE operations
 */
export function transformProductToApi(product: Partial<Product>): any {
  const apiProduct: any = {};

  // Only include fields that are present
  if (product.name !== undefined) apiProduct.name = product.name;
  if (product.description !== undefined) apiProduct.description = product.description || null;
  if (product.price !== undefined) apiProduct.price = product.price;
  if (product.originalPrice !== undefined) apiProduct.originalPrice = product.originalPrice;
  if (product.imageUrl !== undefined) apiProduct.imageUrl = product.imageUrl;
  if (product.categoryId !== undefined) apiProduct.categoryId = product.categoryId;
  
  // Convert boolean to SQLite format (not needed for API request, service handles it)
  if (product.inStock !== undefined) apiProduct.inStock = product.inStock;
  if (product.comingSoon !== undefined) apiProduct.comingSoon = product.comingSoon;
  
  if (product.stock !== undefined) apiProduct.stock = product.stock;
  if (product.brand !== undefined) apiProduct.brand = product.brand;
  if (product.partNumber !== undefined) apiProduct.partNumber = product.partNumber;
  if (product.unit !== undefined) apiProduct.unit = product.unit;
  if (product.minOrderQuantity !== undefined) apiProduct.minOrderQuantity = product.minOrderQuantity;
  if (product.maxOrderQuantity !== undefined) apiProduct.maxOrderQuantity = product.maxOrderQuantity;
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
  if (product.dimensions !== undefined) {
    apiProduct.dimensions = {
      length: product.dimensions.length,
      width: product.dimensions.width,
      height: product.dimensions.height,
      unit: 'cm', // Default unit
    };
  }

  // Integration IDs
  if (product.shopifyProductId !== undefined) apiProduct.shopifyProductId = product.shopifyProductId;
  if (product.shopifyVariantId !== undefined) apiProduct.shopifyVariantId = product.shopifyVariantId;
  if (product.stripeProductId !== undefined) apiProduct.stripeProductId = product.stripeProductId;
  if (product.stripePriceId !== undefined) apiProduct.stripePriceId = product.stripePriceId;

  return apiProduct;
}
