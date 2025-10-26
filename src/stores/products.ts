// src/stores/productStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Product, ProductFilter, PaginationResult } from '../types/product';
import { appCache } from '../services/cache';
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
function normalizeProduct(product: any): Product {
  return {
    ...product,
    // Map images array to simple URL strings for easier template usage
    images: product.images?.map((img: any) => img.image_url) || [],
    // Map specifications to simpler format
    specifications: product.specifications?.map((spec: any) => ({
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
  const products = ref<Product[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // For pagination
  const currentPage = ref(1);
  const pageSize = ref(20);
  const totalItems = ref(0);
  const totalPages = ref(0);
  const hasMoreProducts = ref(true);

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
      const page = loadMore ? currentPage.value + 1 : (filters.page || 1);

      // Check cache first
      const cacheKey = appCache.generateKey({ type: 'products', ...filters, page });
      const cached = appCache.get<{ items: Product[], currentPage: number, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean }>(cacheKey);
      
      if (cached && !loadMore) {
        products.value = cached.items;
        currentPage.value = cached.currentPage;
        totalItems.value = cached.totalItems;
        totalPages.value = cached.totalPages;
        hasMoreProducts.value = cached.hasNextPage;
        return;
      }

      // Build query parameters (using backend field names directly)
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', (filters.limit || pageSize.value).toString());
      
      if (filters.category_id) params.append('categoryId', filters.category_id);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.in_stock !== undefined) params.append('inStock', filters.in_stock.toString());
      if (filters.coming_soon !== undefined) params.append('comingSoon', filters.coming_soon.toString());
      if (filters.min_price !== undefined) params.append('minPrice', filters.min_price.toString());
      if (filters.max_price !== undefined) params.append('maxPrice', filters.max_price.toString());
      if (filters.search_term) params.append('search', filters.search_term);
      
      // Direct pass-through - no transformation needed
      if (filters.sort_by) params.append('sortBy', filters.sort_by);
      if (filters.sort_order) params.append('sortOrder', filters.sort_order);

      // Fetch from API Gateway (which routes to inventory service)
      const response = await fetch(`${PRODUCTS_API_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Normalize products for frontend use (map images to URLs)
      const fetchedProducts = data.items.map(normalizeProduct);

      // Update state
      if (loadMore) {
        products.value = [...products.value, ...fetchedProducts];
      } else {
        products.value = fetchedProducts;
      }

      currentPage.value = data.pagination.currentPage;
      totalItems.value = data.pagination.totalItems;
      totalPages.value = data.pagination.totalPages;
      hasMoreProducts.value = data.pagination.hasNextPage;

      // Cache the result
      appCache.set(cacheKey, {
        items: fetchedProducts,
        currentPage: data.pagination.currentPage,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPreviousPage: data.pagination.hasPreviousPage,
      });

    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products';
      notificationStore.addNotification({
        type: 'error',
        title: t('products.fetchErrorTitle') || 'Error',
        message: t('products.fetchError') || error.value || 'Failed to fetch products',
      });
      console.error('Error fetching products:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const getProductById = async (id: string): Promise<Product | null> => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check cache first
      const cacheKey = appCache.generateKey({ type: 'product', id });
      const cached = appCache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API Gateway
      const response = await fetch(`${PRODUCTS_API_URL}/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      const data = await response.json();
      const product = normalizeProduct(data);

      // Cache the result
      appCache.set(cacheKey, product);

      return product;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch product';
      console.error('Error fetching product:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      // No transformation needed - send data as-is
      const payload = productData;

      const response = await fetch(PRODUCTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`,
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

      // Invalidate cache
      appCache.invalidate();

      notificationStore.addNotification({
        type: 'success',
        message: t('products.createSuccess') || 'Product created successfully',
      });

      return newProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to create product';
      notificationStore.addNotification({
        type: 'error',
        message: t('products.createError') || error.value,
      });
      console.error('Error creating product:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check if user is authenticated and is admin
      if (!authStore.isAuthenticated || !authStore.isAdmin) {
        throw new Error('Admin authentication required');
      }

      // No transformation needed - send data as-is
      const payload = updates;

      const response = await fetch(`${PRODUCTS_API_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`,
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
      const index = products.value.findIndex(p => p.id === id);
      if (index !== -1) {
        products.value[index] = updatedProduct;
      }

      // Invalidate cache
      appCache.invalidate();

      notificationStore.addNotification({
        type: 'success',
        message: t('products.updateSuccess') || 'Product updated successfully',
      });

      return updatedProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to update product';
      notificationStore.addNotification({
        type: 'error',
        message: t('products.updateError') || error.value,
      });
      console.error('Error updating product:', err);
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

      const response = await fetch(`${PRODUCTS_API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete product: ${response.statusText}`);
      }

      // Remove from local state
      products.value = products.value.filter(p => p.id !== id);

      // Invalidate cache
      appCache.invalidate();

      notificationStore.addNotification({
        type: 'success',
        message: t('products.deleteSuccess') || 'Product deleted successfully',
      });
    } catch (err: any) {
      error.value = err.message || 'Failed to delete product';
      notificationStore.addNotification({
        type: 'error',
        message: t('products.deleteError') || error.value,
      });
      console.error('Error deleting product:', err);
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
      const product = products.value.find(p => p.shopify_variant_id === shopifyVariantId);
      if (product) {
        return {
          shopifyVariantId,
          stock: product.stock || 0,
          inStock: product.in_stock === 1, // Convert SQLite boolean
        };
      }
      return null;
    } catch (err: any) {
      console.error('Error fetching inventory info:', err);
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

      const response = await fetch(`${PRODUCTS_API_URL}/${id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`,
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
      const index = products.value.findIndex(p => p.id === id);
      if (index !== -1) {
        products.value[index] = updatedProduct;
      }

      // Invalidate cache
      appCache.invalidate();

      notificationStore.addNotification({
        type: 'success',
        message: t('products.stockUpdateSuccess') || 'Stock updated successfully',
      });

      return updatedProduct;
    } catch (err: any) {
      error.value = err.message || 'Failed to update stock';
      notificationStore.addNotification({
        type: 'error',
        message: t('products.stockUpdateError') || error.value,
      });
      console.error('Error updating stock:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Utility Actions ---

  const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
    try {
      isLoading.value = true;
      error.value = null;

      // Check cache first
      const cacheKey = appCache.generateKey('products-by-category', categoryId);
      const cached = appCache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API Gateway using category filter
      const response = await fetch(`${PRODUCTS_API_URL}/category/${categoryId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products by category: ${response.statusText}`);
      }

      const data = await response.json();
      const categoryProducts = data.items.map(normalizeProduct);

      // Cache the result
      appCache.set(cacheKey, categoryProducts);

      return categoryProducts;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products by category';
      console.error('Error fetching products by category:', err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const getCategories = async (): Promise<string[]> => {
    try {
      // Check cache first
      const cacheKey = appCache.generateKey('categories');
      const cached = appCache.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // For now, extract unique categories from products
      // TODO: Replace with dedicated categories endpoint when available
      const response = await fetch(`${PRODUCTS_API_URL}?limit=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      const allProducts = data.items; // No transformation needed
      
      const categories = Array.from(
        new Set(
          allProducts
            .map((p: Product) => p.category_id)
            .filter((c: string | null | undefined): c is string => !!c)
        )
      );

      // Cache the result
      appCache.set(cacheKey, categories);

      return categories;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch categories';
      console.error('Error fetching categories:', err);
      return [];
    }
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
  };
});