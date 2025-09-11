// Category related types
export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string // For nested categories
  imageUrl?: string
  displayOrder: number // For sorting categories
  isActive: boolean
  productCount?: number // Calculated field
  color?: string // For visual distinction
  createdAt?: any
  updatedAt?: any
}

export interface CategoryFilter {
  parentId?: string | null // null for root categories, string for children
  isActive?: boolean
  searchTerm?: string
  sortBy?: 'name' | 'displayOrder' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[]
}
