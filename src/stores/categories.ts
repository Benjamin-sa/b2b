// src/stores/categories.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore'
import { db } from '../init/firebase'
import type { Category, CategoryFilter, CategoryWithChildren } from '../types/category'
import { appCache } from '../services/cache'

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

  // --- Helper Functions ---
  // No longer need generateSlug function

  // --- Actions ---
  const fetchCategories = async (filters: CategoryFilter = {}) => {
    const cacheKey = appCache.generateKey(filters)
    const cachedCategories = appCache.get<Category[]>(cacheKey)
    
    if (cachedCategories) {
      categories.value = cachedCategories
      return
    }

    isLoading.value = true
    error.value = null

    try {
      let q = query(collection(db, 'categories'))

      // Apply filters
      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          q = query(q, where('parentId', '==', null))
        } else {
          q = query(q, where('parentId', '==', filters.parentId))
        }
      }

      if (filters.isActive !== undefined) {
        q = query(q, where('isActive', '==', filters.isActive))
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'displayOrder'
      const sortOrder = filters.sortOrder || 'asc'
      q = query(q, orderBy(sortBy, sortOrder))

      const querySnapshot = await getDocs(q)
      let fetchedCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category))

      // Client-side search filtering
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        fetchedCategories = fetchedCategories.filter(cat =>
          cat.name.toLowerCase().includes(term) ||
          cat.description?.toLowerCase().includes(term)
        )
      }

      categories.value = fetchedCategories
      appCache.set(cacheKey, fetchedCategories)

    } catch (err) {
      console.error('Error fetching categories:', err)
      error.value = 'Failed to fetch categories'
    } finally {
      isLoading.value = false
    }
  }

  const getCategoryById = async (id: string): Promise<Category | null> => {
    const cacheKey = `category_${id}`
    const cachedCategory = appCache.get<Category>(cacheKey)
    
    if (cachedCategory) return cachedCategory

    try {
      const docSnap = await getDoc(doc(db, 'categories', id))
      if (docSnap.exists()) {
        const category = { id: docSnap.id, ...docSnap.data() } as Category
        appCache.set(cacheKey, category)
        return category
      }
      return null
    } catch (err) {
      console.error('Error fetching category:', err)
      return null
    }
  }

  const getCategoryByName = async (name: string): Promise<Category | null> => {
    try {
      const q = query(collection(db, 'categories'), where('name', '==', name))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        return { id: doc.id, ...doc.data() } as Category
      }
      return null
    } catch (err) {
      console.error('Error fetching category by name:', err)
      return null
    }
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Check if category name already exists
      const existingCategory = await getCategoryByName(categoryData.name)
      if (existingCategory) {
        throw new Error('A category with this name already exists')
      }

      const newCategory = {
        ...categoryData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, 'categories'), newCategory)
      const category = { id: docRef.id, ...newCategory } as Category
      
      // Update local state
      categories.value.push(category)
      appCache.invalidate() // Clear all caches
      
      return category
    } catch (err) {
      console.error('Error adding category:', err)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => {
    try {
      // Check if new name already exists (excluding current category)
      if (updates.name) {
        const existingCategory = await getCategoryByName(updates.name)
        if (existingCategory && existingCategory.id !== id) {
          throw new Error('A category with this name already exists')
        }
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      }

      await updateDoc(doc(db, 'categories', id), updateData)
      
      // Update local state
      const index = categories.value.findIndex(cat => cat.id === id)
      if (index !== -1) {
        categories.value[index] = { ...categories.value[index], ...updateData }
      }
      
      appCache.invalidate() // Clear all caches
    } catch (err) {
      console.error('Error updating category:', err)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      // Check if category has children
      const childCategories = categories.value.filter(cat => cat.parentId === id)
      if (childCategories.length > 0) {
        throw new Error('Cannot delete category with subcategories. Please delete or move subcategories first.')
      }

      // TODO: Check if category has products assigned
      // This would require querying the products collection
      // For now, we'll assume the admin checks this manually

      await deleteDoc(doc(db, 'categories', id))
      
      // Update local state
      categories.value = categories.value.filter(cat => cat.id !== id)
      appCache.invalidate() // Clear all caches
    } catch (err) {
      console.error('Error deleting category:', err)
      throw err
    }
  }

  const reorderCategories = async (categoryIds: string[]) => {
    try {
      const batch = writeBatch(db)
      
      categoryIds.forEach((id, index) => {
        const categoryRef = doc(db, 'categories', id)
        batch.update(categoryRef, { 
          displayOrder: index,
          updatedAt: new Date()
        })
      })
      
      await batch.commit()
      
      // Update local state
      categoryIds.forEach((id, index) => {
        const category = categories.value.find(cat => cat.id === id)
        if (category) {
          category.displayOrder = index
        }
      })
      
      appCache.invalidate()
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
    getCategoryById,
    getCategoryByName,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    updateCategoryProductCounts
  }
})
