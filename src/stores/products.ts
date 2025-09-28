// src/stores/productStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../init/firebase';
import type { Product, ProductFilter } from '../types/product';
import { appCache } from '../services/cache'; // Import our new cache service

export const useProductStore = defineStore('products', () => {
  // --- State ---
  const products = ref<Product[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // For pagination
  const lastVisibleDoc = ref<QueryDocumentSnapshot | null>(null);
  const hasMoreProducts = ref(true);

  // --- Computed Properties ---
  const hasProducts = computed(() => products.value.length > 0);

  // --- Core Actions (CRUD) ---

  /**
   * The main function to fetch products with filtering, sorting, and pagination.
   * This replaces fetchProducts, searchProducts, and filterProducts.
   */
  const fetchProducts = async (filters: ProductFilter = {}, loadMore = false) => {
    // 1. Caching
    const cacheKey = appCache.generateKey({ ...filters, startAfter: loadMore ? lastVisibleDoc.value?.id : null });
    const cachedProducts = appCache.get<Product[]>(cacheKey);
    if (cachedProducts) {
      products.value = loadMore ? [...products.value, ...cachedProducts] : cachedProducts;
      return; // Stop here if we have a valid cache
    }
    
    isLoading.value = true;
    error.value = null;

    try {
      // 2. Build Firestore Query
      let q = query(collection(db, 'products'));

      // Apply filters that can be done server-side
      if (filters.categoryId) q = query(q, where('categoryId', '==', filters.categoryId));
      if (filters.category) q = query(q, where('category', '==', filters.category)); // Backward compatibility
      if (filters.inStock !== undefined) q = query(q, where('inStock', '==', filters.inStock));
      if (filters.comingSoon !== undefined) q = query(q, where('comingSoon', '==', filters.comingSoon));
      if (filters.brand) q = query(q, where('brand', '==', filters.brand));
      if (filters.tags && filters.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }
      
      // Price range filtering (if using numeric fields)
      if (filters.minPrice !== undefined) q = query(q, where('price', '>=', filters.minPrice));
      if (filters.maxPrice !== undefined) q = query(q, where('price', '<=', filters.maxPrice));
      
      const sortBy = filters.sortBy || 'name';
      const sortOrder = filters.sortOrder || 'asc';
      q = query(q, orderBy(sortBy, sortOrder));

      if (loadMore && lastVisibleDoc.value) {
        q = query(q, startAfter(lastVisibleDoc.value));
      }

      q = query(q, limit(filters.limit || 100));

      // 3. Execute Query
      const querySnapshot = await getDocs(q);
      let fetchedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      // 4. Client-side Filtering (for full-text search)
      // TODO: Replace with proper search service (Algolia/ElasticSearch) for better performance
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase().trim();
        fetchedProducts = fetchedProducts.filter(p => 
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term) ||
          p.partNumber?.toLowerCase().includes(term) ||
          p.tags?.some(tag => tag.toLowerCase().includes(term))
        );
      }

      // 5. Update State
      lastVisibleDoc.value = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
      hasMoreProducts.value = querySnapshot.docs.length === (filters.limit || 100);
      
      if (loadMore) {
        products.value.push(...fetchedProducts);
      } else {
        products.value = fetchedProducts;
      }
      
      // 6. Set Cache
      appCache.set(cacheKey, fetchedProducts);

    } catch (err) {
      console.error('Error fetching products:', err);
      error.value = 'Failed to fetch products.';
    } finally {
      isLoading.value = false;
    }
  };

  const getProductById = async (id: string): Promise<Product | null> => {
    const cacheKey = `product_${id}`;
    const cachedProduct = appCache.get<Product>(cacheKey);
    if (cachedProduct) return cachedProduct;

    try {
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) {
        const product = { id: docSnap.id, ...docSnap.data() } as Product;
        appCache.set(cacheKey, product);
        return product;
      }
      return null;
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'products'), { ...productData, createdAt: new Date() });
      appCache.invalidate(); // Invalidate all caches when data changes
      return { id: docRef.id, ...productData } as Product;
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    try {
      await updateDoc(doc(db, 'products', id), { ...updates, updatedAt: new Date() });
      appCache.invalidate(); // Invalidate all caches
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      appCache.invalidate(); // Invalidate all caches
    } catch (err) {
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  // --- Inventory Information Actions ---

  /**
   * Get inventory information for a specific variant
   */
  const getInventoryInfo = async (shopifyVariantId: string) => {
    try {
      // Use environment variable or fallback to localhost for development
      const inventoryServiceUrl = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://127.0.0.1:8787'
      
      const response = await fetch(`${inventoryServiceUrl}/api/inventory/search?q=${shopifyVariantId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory info');
      }

      // Find the exact variant match
      const variantInfo = data.data?.find((item: any) => 
        item.shopify_variant_id === shopifyVariantId
      );

      return variantInfo || null;
    } catch (err) {
      console.error('Error fetching inventory info:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch inventory info');
    }
  };



  // --- Utility Actions ---

  const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
    const cacheKey = `products_by_category_${categoryId}`;
    const cachedProducts = appCache.get<Product[]>(cacheKey);
    if (cachedProducts) return cachedProducts;

    try {
      const q = query(
        collection(db, 'products'),
        where('categoryId', '==', categoryId),
        where('inStock', '==', true),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      
      appCache.set(cacheKey, products, 5 * 60 * 1000); // Cache for 5 minutes
      return products;
    } catch (err) {
      console.error('Error fetching products by category:', err);
      return [];
    }
  };

  const getCategories = async (): Promise<string[]> => {
    const cacheKey = 'all_categories';
    const cachedCategories = appCache.get<string[]>(cacheKey);
    if (cachedCategories) return cachedCategories;

    try {
      // Note: This reads all documents. For very large collections,
      // maintain a separate 'categories' collection updated by a Cloud Function.
      const snapshot = await getDocs(query(collection(db, 'products')));
      const categories = new Set<string>();
      snapshot.forEach(doc => {
        const category = doc.data().category;
        if (category) categories.add(category);
      });
      const sortedCategories = Array.from(categories).sort();
      appCache.set(cacheKey, sortedCategories, 10 * 60 * 1000); // Cache categories for 10 mins
      return sortedCategories;
    } catch (err) {
      console.error('Error fetching categories:', err);
      return [];
    }
  };

  return {
    // State
    products,
    isLoading,
    error,
    lastVisibleDoc,
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
    getCategories,
    // Inventory Information Actions
    getInventoryInfo,
  };
});