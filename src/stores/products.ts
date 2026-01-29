// src/stores/productStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProductWithRelations, ProductFilter } from '../types/product';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notifications';
import { useI18n } from 'vue-i18n';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Always go through the API Gateway - it handles routing, CORS, rate limiting, etc.
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:5174';
const PRODUCTS_API_URL = `${API_GATEWAY_URL}/api/products`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize product data for frontend use
 * - Converts images array from objects to URLs for easier template usage
 * - Converts specifications array from objects to simple key-value pairs
 */
function normalizeProduct(product: any): ProductWithRelations {
  return {
    ...product,
    // Map images array to simple URL strings for easier template usage
    images: product.images?.map((img: any) => img.image_url) || [],
    // Map specifications to simpler format
    specifications:
      product.specifications?.map((spec: any) => ({
        key: spec.spec_key,
        value: spec.spec_value,
      })) || [],
  };
}

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useProductStore = defineStore('products', () => {
  const authStore = useAuthStore();
  const notificationStore = useNotificationStore();
  const { t } = useI18n();

  // --- State ---
  const products = ref<ProductWithRelations[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // For pagination
  const currentPage = ref(1);
  const pageSize = ref(30);
  const totalItems = ref(0);
  const totalPages = ref(0);
  const hasMoreProducts = ref(true);

  // Navigation state for scroll position persistence
  const savedScrollPosition = ref(0);
  const savedFilters = ref<ProductFilter | null>(null);
  const savedViewMode = ref<'grid' | 'list'>('grid');
  const savedPriceRange = ref('');
  const savedShowAdvancedFilters = ref(false);
  const returningFromDetail = ref(false);

  // --- Computed Properties ---
  const hasProducts = computed(() => products.value.length > 0);

  // --- Core Actions (CRUD) ---

  /**
   * The main function to fetch products with filtering, sorting, and pagination.
   * This replaces fetchProducts, searchProducts, and filterProducts.
   */
  const fetchProducts = async (filters: ProductFilter = {}, loadMore = false) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Determine which page to fetch
      const page = loadMore ? currentPage.value + 1 : filters.page || 1;
      const limit = filters.limit || pageSize.value;
      const offset = (page - 1) * limit;

      // Build query parameters (using backend field names - snake_case)
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.in_stock !== undefined) params.append('in_stock', filters.in_stock.toString());
      if (filters.min_price !== undefined) params.append('min_price', filters.min_price.toString());
      if (filters.max_price !== undefined) params.append('max_price', filters.max_price.toString());
      if (filters.search) params.append('search', filters.search);

      // Sorting - not yet implemented in backend, but prepare for future
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      // Fetch from API Gateway with auth token
      const response = await authStore.authenticatedFetch(
        `${PRODUCTS_API_URL}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();

      // Backend returns: { products, total, limit, offset }
      // Normalize products for frontend use (map images to URLs)
      const fetchedProducts = data.products.map(normalizeProduct);

      // Update state
      if (loadMore) {
        products.value = [...products.value, ...fetchedProducts];
      } else {
        products.value = fetchedProducts;
      }

      // Calculate pagination values from backend response
      const responseLimit = data.limit || pageSize.value;
      const responseOffset = data.offset || 0;
      currentPage.value = Math.floor(responseOffset / responseLimit) + 1;
      totalItems.value = data.total || 0;
      totalPages.value = Math.ceil(totalItems.value / responseLimit);
      hasMoreProducts.value = responseOffset + fetchedProducts.length < totalItems.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.fetchErrorTitle') || 'Error',
        message: t('products.fetchError') || error.value || 'Failed to fetch products',
      });
    } finally {
      isLoading.value = false;
    }
  };

  const getProductById = async (id: string): Promise<ProductWithRelations | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      // Fetch from API Gateway with auth
      const response = await authStore.authenticatedFetch(`${PRODUCTS_API_URL}/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      const data = await response.json();
      const product = normalizeProduct(data);

      return product;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch product';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const addProduct = async (productData: Omit<ProductWithRelations, 'id'>) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      // No transformation needed - send data as-is
      const payload = productData;

      const response = await authStore.authenticatedFetch(PRODUCTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create product: ${response.statusText}`);
      }

      const data = await response.json();
      const newProduct = normalizeProduct(data);

      // Add to local state
      products.value.unshift(newProduct);

      notificationStore.addNotification({
        type: 'success',
        title: t('products.createSuccessTitle') || 'Success',
        message: t('products.createSuccess') || 'Product created successfully',
      });

      return newProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to create product';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.createErrorTitle') || 'Error',
        message: t('products.createError') || error.value || 'Failed to create product',
      });
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Omit<ProductWithRelations, 'id'>>) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      // No transformation needed - send data as-is
      const payload = updates;

      const response = await authStore.authenticatedFetch(`${PRODUCTS_API_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update product: ${response.statusText}`);
      }

      const data = await response.json();
      const updatedProduct = normalizeProduct(data);

      // Update local state
      const index = products.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        products.value[index] = updatedProduct;
      }

      notificationStore.addNotification({
        type: 'success',
        title: t('products.updateSuccessTitle') || 'Success',
        message: t('products.updateSuccess') || 'Product updated successfully',
      });

      return updatedProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to update product';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.updateErrorTitle') || 'Error',
        message: t('products.updateError') || error.value || 'Failed to update product',
      });
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      const response = await authStore.authenticatedFetch(`${PRODUCTS_API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete product: ${response.statusText}`);
      }

      // Remove from local state
      products.value = products.value.filter((p) => p.id !== id);

      notificationStore.addNotification({
        type: 'success',
        title: t('products.deleteSuccessTitle') || 'Success',
        message: t('products.deleteSuccess') || 'Product deleted successfully',
      });
    } catch (err: any) {
      error.value = err.message || 'Failed to delete product';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.deleteErrorTitle') || 'Error',
        message: t('products.deleteError') || error.value || 'Failed to delete product',
      });
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Inventory Information Actions ---

  /**
   * Get inventory information for a specific variant
   * Note: This will need to be implemented when the inventory sync service is ready
   */
  const getInventoryInfo = async (shopifyVariantId: string) => {
    try {
      // For now, return mock data or fetch from the product that has this variant ID
      const product = products.value.find((p) => p.shopify_variant_id === shopifyVariantId);
      if (product) {
        return {
          shopifyVariantId,
          stock: product.stock || 0,
          inStock: product.in_stock === 1, // Convert SQLite boolean
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  /**
   * Update stock level for a product (admin only)
   */
  const updateStock = async (id: string, stock: number) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      const response = await authStore.authenticatedFetch(`${PRODUCTS_API_URL}/${id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update stock: ${response.statusText}`);
      }

      const data = await response.json();
      const updatedProduct = normalizeProduct(data);

      // Update local state
      const index = products.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        products.value[index] = updatedProduct;
      }

      notificationStore.addNotification({
        type: 'success',
        title: t('products.stockUpdateSuccessTitle') || 'Success',
        message: t('products.stockUpdateSuccess') || 'Stock updated successfully',
      });

      return updatedProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to update stock';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.stockUpdateErrorTitle') || 'Error',
        message: t('products.stockUpdateError') || error.value || 'Failed to update stock',
      });
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Utility Actions ---

  const getProductsByCategory = async (categoryId: string): Promise<ProductWithRelations[]> => {
    try {
      isLoading.value = true;
      error.value = null;
      // Fetch from API Gateway using category filter with auth
      const response = await authStore.authenticatedFetch(
        `${PRODUCTS_API_URL}/category/${categoryId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products by category: ${response.statusText}`);
      }

      const data = await response.json();
      // Backend returns: { products, category_id }
      const categoryProducts = data.products.map(normalizeProduct);

      return categoryProducts;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products by category';
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const getCategories = async (): Promise<string[]> => {
    try {
      // For now, extract unique categories from products
      // TODO: Replace with dedicated categories endpoint when available
      const response = await authStore.authenticatedFetch(`${PRODUCTS_API_URL}?limit=100`);

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      // Backend returns: { products, total, limit, offset }
      const allProducts = data.products; // No transformation needed

      const categories: string[] = Array.from(
        new Set(
          allProducts
            .map((p: ProductWithRelations) => p.category_id)
            .filter((c: string | null | undefined): c is string => !!c)
        )
      );

      return categories;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch categories';
      return [];
    }
  };

  /**
   * Save current navigation state before navigating to product detail
   */
  const saveNavigationState = (
    filters: ProductFilter,
    viewMode: 'grid' | 'list',
    priceRange: string,
    showAdvancedFilters: boolean
  ) => {
    savedScrollPosition.value = window.scrollY;
    savedFilters.value = { ...filters };
    savedViewMode.value = viewMode;
    savedPriceRange.value = priceRange;
    savedShowAdvancedFilters.value = showAdvancedFilters;
    returningFromDetail.value = true;
  };

  /**
   * Get saved navigation state and clear the returningFromDetail flag
   */
  const getNavigationState = () => {
    const state = {
      scrollPosition: savedScrollPosition.value,
      filters: savedFilters.value,
      viewMode: savedViewMode.value,
      priceRange: savedPriceRange.value,
      showAdvancedFilters: savedShowAdvancedFilters.value,
      shouldRestore: returningFromDetail.value && products.value.length > 0,
    };
    // Clear the flag after reading
    returningFromDetail.value = false;
    return state;
  };

  /**
   * Clear saved navigation state (e.g., when navigating from navbar)
   */
  const clearNavigationState = () => {
    savedScrollPosition.value = 0;
    savedFilters.value = null;
    savedViewMode.value = 'grid';
    savedPriceRange.value = '';
    savedShowAdvancedFilters.value = false;
    returningFromDetail.value = false;
  };

  return {
    // State
    products,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasMoreProducts,
    // Computed
    hasProducts,
    // Actions
    fetchProducts,
    getProductById,
    getProductsByCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getCategories,
    // Inventory Information Actions
    getInventoryInfo,
    // Navigation state actions
    saveNavigationState,
    getNavigationState,
    clearNavigationState,
  };
});
