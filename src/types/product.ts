// Product related types
// Matches backend API response exactly (snake_case) - no transformation needed!
export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  image_url: string | null
  category_id: string | null
  in_stock: number // SQLite boolean (0 or 1) - use truthy check: product.in_stock === 1
  coming_soon: number // SQLite boolean (0 or 1)
  stock: number
  brand: string | null
  part_number: string | null
  unit: string | null
  min_order_quantity: number
  max_order_quantity: number | null
  weight: number | null
  shopify_product_id: string | null
  shopify_variant_id: string | null
  stripe_product_id: string | null
  stripe_price_id: string | null
  created_at: string
  updated_at: string
  // Relations (included in API response when fetched with relations)
  // Note: These are normalized in the store for easier frontend usage
  images?: string[] // Normalized from ProductImage[] to string[] of URLs
  specifications?: Array<{ key: string; value: string }> // Normalized from ProductSpecification[]
  tags?: string[]
  dimensions?: ProductDimension | null
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export interface ProductSpecification {
  id: string
  product_id: string
  spec_key: string
  spec_value: string
  sort_order: number
}

export interface ProductDimension {
  product_id: string
  length: number
  width: number
  height: number
  unit: string
}

export interface ProductFilter {
  category_id?: string
  brand?: string
  in_stock?: boolean
  coming_soon?: boolean
  min_price?: number
  max_price?: number
  search_term?: string
  page?: number
  limit?: number
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'stock'
  sort_order?: 'asc' | 'desc'
  tags?: string[]
}

export interface PaginationResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}
