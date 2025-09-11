// Product related types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  imageUrl?: string
  images?: string[]
  category?: string
  sku?: string
  inStock: boolean
  stock?: number
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
  // Stripe integration
  stripeProductId?: string
  stripePriceId?: string
  createdAt?: any
  updatedAt?: any
}

export interface ProductFilter {
  category?: string
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
