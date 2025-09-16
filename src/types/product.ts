// Product related types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  imageUrl?: string
  images?: string[]
  categoryId?: string // Reference to category ID instead of string
  category?: string // Keep for backward compatibility, will be deprecated
  inStock: boolean
  stock?: number // B2B stock amount (synced from inventory transfers)
  brand?: string
  partNumber?: string
  specifications?: { key: string; value: string }[]
  unit?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  tags?: string[]
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  // Inventory service integration
  shopifyProductId?: string
  // is ID to sync stock changes 
  shopifyVariantId?: string
  // Stripe integration
  stripeProductId?: string
  stripePriceId?: string
  createdAt?: any
  updatedAt?: any
}

export interface ProductFilter {
  categoryId?: string // Updated to use categoryId
  category?: string // Keep for backward compatibility
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  searchTerm?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  tags?: string[]
  brand?: string
}

export interface PaginationResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}
