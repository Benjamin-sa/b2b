// src/stores/categories.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Category, CategoryFilter, CategoryWithChildren } from '../types/category';
import { useAuthStore } from './auth';

// Normalize API Gateway URL to ensure it ends with /
const API_GATEWAY_URL =
  (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787').replace(/\/$/, '') + '/';

export const useCategoryStore = defineStore('categories', () => {
  const authStore = useAuthStore();

  // --- State ---
  const categories = ref<Category[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Computed Properties ---
  const hasCategories = computed(() => categories.value.length > 0);

  // Get root categories (no parent)
  const rootCategories = computed(() =>
    categories.value.filter((cat) => !cat.parent_id && cat.is_active)
  );

  // Get categories tree structure
  const categoriesTree = computed(() => {
    const buildTree = (parentId: string | undefined = undefined): CategoryWithChildren[] => {
      return categories.value
        .filter((cat) => cat.parent_id === parentId && cat.is_active)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat.id),
        }));
    };
    return buildTree();
  });

  // --- Actions ---
  const fetchCategories = async (filters: CategoryFilter = {}) => {
    isLoading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      if (filters.parent_id !== undefined) {
        params.append('parentId', filters.parent_id === null ? 'null' : filters.parent_id);
      }

      if (filters.is_active !== undefined) {
        params.append('isActive', filters.is_active ? 'true' : 'false');
      }

      if (filters.search) {
        params.append('search', filters.search || '');
      }

      // Only add query string if there are parameters
      const queryString = params.toString();
      const url = `${API_GATEWAY_URL}api/categories${queryString ? `?${queryString}` : ''}`;
      const response = await authStore.authenticatedFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedCategories = data.categories;

      categories.value = fetchedCategories;
    } catch {
      error.value = 'Failed to fetch categories';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCategoriesTree = async () => {
    const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}api/categories/tree`);

    if (!response.ok) {
      throw new Error(`Failed to fetch category tree: ${response.statusText}`);
    }

    const data = await response.json();
    const tree = data.categories;

    return tree;
  };

  const getCategoryById = async (id: string): Promise<Category | null> => {
    try {
      const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}api/categories/${id}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch category: ${response.statusText}`);
      }

      const category = await response.json();
      return category;
    } catch {
      return null;
    }
  };

  const getCategoryByName = async (name: string): Promise<Category | null> => {
    try {
      // Fetch all categories and filter client-side
      await fetchCategories({ search: name });
      return categories.value.find((cat) => cat.name === name) || null;
    } catch {
      return null;
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Generate slug from name if not provided
    const slug = categoryData.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: categoryData.name,
        description: categoryData.description,
        slug,
        parentId: categoryData.parent_id,
        imageUrl: categoryData.image_url,
        sortOrder: categoryData.sort_order,
        isActive: categoryData.is_active,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create category');
    }

    const category = await response.json();

    // Update local state
    categories.value.push(category);

    return category;
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt'>>
  ) => {
    const payload: any = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.parent_id !== undefined) payload.parentId = updates.parent_id;
    if (updates.image_url !== undefined) payload.imageUrl = updates.image_url;
    if (updates.sort_order !== undefined) payload.sortOrder = updates.sort_order;
    if (updates.is_active !== undefined) payload.isActive = updates.is_active;

    const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}api/categories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update category');
    }

    const category = await response.json();

    // Update local state
    const index = categories.value.findIndex((cat) => cat.id === id);
    if (index !== -1) {
      categories.value[index] = category;
    }
  };

  const deleteCategory = async (id: string) => {
    const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}api/categories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete category');
    }

    // Update local state
    categories.value = categories.value.filter((cat) => cat.id !== id);
  };
  // Get product count for each category (would need to be called separately)
  const updateCategoryProductCounts = async () => {
    // TODO: implement when product/category relationship is finalized.
  };

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
    updateCategoryProductCounts,
  };
});
