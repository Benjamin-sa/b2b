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
}

export interface PaginationResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ProductSummary {
  totalProducts: number
  totalValue: number
  categorySummary: CategorySummary[]
  stockSummary: {
    inStock: number
    outOfStock: number
    lowStock: number // products with stock < 10
  }
  priceRanges: {
    under50: number
    between50And200: number
    between200And500: number
    over500: number
  }
  recentlyAdded: number // products added in last 30 days
  topCategories: CategorySummary[]
  averagePrice: number
}

export interface CategorySummary {
  category: string
  productCount: number
  totalValue: number
  averagePrice: number
  inStockCount: number
  outOfStockCount: number
}

export interface ProductFormData {
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
}
