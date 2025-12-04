// src/stores/categories.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, CategoryFilter, CategoryWithChildren } from '../types/category'

// Normalize API Gateway URL to ensure it ends with /
const API_GATEWAY_URL = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787')
  .replace(/\/$/, '') + '/'

// Helper to map D1 category to frontend type
function mapCategory(dbCategory: any): Category {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    description: dbCategory.description,
    parentId: dbCategory.parent_id,
    imageUrl: dbCategory.image_url,
    displayOrder: dbCategory.sort_order,
    isActive: dbCategory.is_active === 1,
    createdAt: dbCategory.created_at,
    updatedAt: dbCategory.updated_at,
  }
}

export const useCategoryStore = defineStore('categories', () => {
  // --- State ---
  const categories = ref<Category[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // --- Computed Properties ---
  const hasCategories = computed(() => categories.value.length > 0)
  
  // Get root categories (no parent)
  const rootCategories = computed(() => 
    categories.value.filter(cat => !cat.parentId && cat.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  )

  // Get categories tree structure
  const categoriesTree = computed(() => {
    const buildTree = (parentId: string | undefined = undefined): CategoryWithChildren[] => {
      return categories.value
        .filter(cat => cat.parentId === parentId && cat.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }))
    }
    return buildTree()
  })

  // --- Actions ---
  const fetchCategories = async (filters: CategoryFilter = {}) => {

    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      
      if (filters.parentId !== undefined) {
        params.append('parentId', filters.parentId === null ? 'null' : filters.parentId)
      }
      
      if (filters.isActive !== undefined) {
        params.append('isActive', filters.isActive ? 'true' : 'false')
      }
      
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm)
      }

      // Only add query string if there are parameters
      const queryString = params.toString()
      const url = `${API_GATEWAY_URL}api/categories${queryString ? `?${queryString}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
      }

      const data = await response.json()
      const fetchedCategories = data.categories.map(mapCategory)

      categories.value = fetchedCategories

    } catch (err) {
      console.error('Error fetching categories:', err)
      error.value = 'Failed to fetch categories'
    } finally {
      isLoading.value = false
    }
  }

  const fetchCategoriesTree = async () => {

    try {
      const response = await fetch(`${API_GATEWAY_URL}api/categories/tree`)

      if (!response.ok) {
        throw new Error(`Failed to fetch category tree: ${response.statusText}`)
      }

      const data = await response.json()
      const tree = data.categories.map((cat: any) => mapCategoryWithChildren(cat))
      
      return tree
    } catch (err) {
      console.error('Error fetching category tree:', err)
      throw err
    }
  }

  function mapCategoryWithChildren(dbCategory: any): CategoryWithChildren {
    return {
      ...mapCategory(dbCategory),
      children: dbCategory.children?.map((child: any) => mapCategoryWithChildren(child)) || []
    }
  }

  const getCategoryById = async (id: string): Promise<Category | null> => {
    
    try {
      const response = await fetch(`${API_GATEWAY_URL}api/categories/${id}`)
      
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Failed to fetch category: ${response.statusText}`)
      }

      const data = await response.json()
      const category = mapCategory(data)
      return category
    } catch (err) {
      console.error('Error fetching category:', err)
      return null
    }
  }

  const getCategoryByName = async (name: string): Promise<Category | null> => {
    try {
      // Fetch all categories and filter client-side
      await fetchCategories({ searchTerm: name })
      return categories.value.find(cat => cat.name === name) || null
    } catch (err) {
      console.error('Error fetching category by name:', err)
      return null
    }
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Generate slug from name if not provided
      const slug = categoryData.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')

      const response = await fetch(`${API_GATEWAY_URL}api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('b2b_access_token')}`
        },
        body: JSON.stringify({
          name: categoryData.name,
          description: categoryData.description,
          slug,
          parentId: categoryData.parentId,
          imageUrl: categoryData.imageUrl,
          sortOrder: categoryData.displayOrder,
          isActive: categoryData.isActive
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create category')
      }

      const data = await response.json()
      const category = mapCategory(data)
      
      // Update local state
      categories.value.push(category)
      
      return category
    } catch (err) {
      console.error('Error adding category:', err)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => {
    try {
      const payload: any = {}
      
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.description !== undefined) payload.description = updates.description
      if (updates.parentId !== undefined) payload.parentId = updates.parentId
      if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl
      if (updates.displayOrder !== undefined) payload.sortOrder = updates.displayOrder
      if (updates.isActive !== undefined) payload.isActive = updates.isActive

      const response = await fetch(`${API_GATEWAY_URL}api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('b2b_access_token')}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update category')
      }

      const data = await response.json()
      const category = mapCategory(data)
      
      // Update local state
      const index = categories.value.findIndex(cat => cat.id === id)
      if (index !== -1) {
        categories.value[index] = category
      }
      
    } catch (err) {
      console.error('Error updating category:', err)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('b2b_access_token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete category')
      }
      
      // Update local state
      categories.value = categories.value.filter(cat => cat.id !== id)
    } catch (err) {
      console.error('Error deleting category:', err)
      throw err
    }
  }

  const reorderCategories = async (categoryIds: string[]) => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}api/categories/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('b2b_access_token')}`
        },
        body: JSON.stringify({ categoryIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reorder categories')
      }
      
      // Update local state
      categoryIds.forEach((id, index) => {
        const category = categories.value.find(cat => cat.id === id)
        if (category) {
          category.displayOrder = index
        }
      })
      
    } catch (err) {
      console.error('Error reordering categories:', err)
      throw err
    }
  }

  // Get product count for each category (would need to be called separately)
  const updateCategoryProductCounts = async () => {
    try {
      // This would require querying products collection
      // Implementation depends on how products reference categories
      console.log('Update category product counts - to be implemented')
    } catch (err) {
      console.error('Error updating category product counts:', err)
    }
  }

  return {
    // State
    categories,
    isLoading,
    error,
    // Computed
    hasCategories,
    rootCategories,
    categoriesTree,
    // Actions
    fetchCategories,
    fetchCategoriesTree,
    getCategoryById,
    getCategoryByName,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    updateCategoryProductCounts
  }
})
