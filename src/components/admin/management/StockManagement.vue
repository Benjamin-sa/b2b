<template>
  <div class="max-w-[1400px] mx-auto p-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-semibold text-gray-900">Stock Management</h2>
      <button
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading" @click="refreshData">
        <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
        <span v-else
          class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></span>
        Refresh
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">Search</label>
        <input v-model="searchTerm" type="text" placeholder="Search products..."
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100" />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">Stock Status</label>
        <select v-model="stockFilter"
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100">
          <option value="all">All Products</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">Shopify Sync</label>
        <select v-model="syncFilter"
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100">
          <option value="all">All Products</option>
          <option value="synced">Synced to Shopify</option>
          <option value="not-synced">Not Synced</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && products.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
      <div class="w-12 h-12 border-3 border-current border-r-transparent rounded-full animate-spin"></div>
      <p>Loading products...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 gap-4 text-red-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{{ error }}</p>
      <button
        class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        @click="refreshData">
        Try Again
      </button>
    </div>

    <!-- Products Table -->
    <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
      <table class="w-full border-collapse">
        <thead class="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th class="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Product
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Stock
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Shopify Sync
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.id"
            class="border-b border-gray-200 transition-colors hover:bg-gray-50">
            <!-- Product Info -->
            <td class="px-4 py-4 min-w-[300px]">
              <div class="flex items-center gap-4">
                <img v-if="product.image_url" :src="product.image_url" :alt="product.name"
                  class="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                <div v-else
                  class="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="font-medium text-gray-900">{{ product.name }}</span>
                  <span v-if="product.part_number" class="text-xs text-gray-500">{{
                    product.part_number
                    }}</span>
                </div>
              </div>
            </td>

            <!-- Stock -->
            <td class="px-4 py-4 text-center">
              <span class="inline-block px-3 py-1.5 rounded-full text-sm font-medium" :class="{
                'bg-green-100 text-green-800':
                  getStockClass(product.inventory?.stock ?? product.inventory?.stock ?? 0) === 'in-stock',
                'bg-yellow-100 text-yellow-800':
                  getStockClass(product.inventory?.stock ?? product.inventory?.stock ?? 0) === 'low-stock',
                'bg-red-100 text-red-800':
                  getStockClass(product.inventory?.stock ?? product.inventory?.stock ?? 0) === 'out-of-stock',
              }">
                {{ product.inventory?.stock ?? product.inventory?.stock ?? 0 }}
              </span>
            </td>

            <!-- Shopify Sync Status -->
            <td class="px-4 py-4 text-center">
              <div class="flex justify-center">
                <span v-if="product.inventory?.shopify_variant_id"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  title="Product synced to Shopify">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Synced
                </span>
                <span v-else
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                  title="Not synced to Shopify">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Not Synced
                </span>
              </div>
            </td>

          </tr>

          <!-- Empty State -->
          <tr v-if="filteredProducts.length === 0">
            <td colspan="4" class="px-4 py-16">
              <div class="flex flex-col items-center gap-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                <p>No products found</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { ProductWithInventory } from '../../../types';
import { useAuthStore } from '../../../stores/auth';

const authStore = useAuthStore();

// API Configuration
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:5174';

// State
const products = ref<ProductWithInventory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchTerm = ref('');
const stockFilter = ref('all');
const syncFilter = ref('all');

// Computed
const filteredProducts = computed(() => {
  let filtered = products.value;

  // Search filter
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(term) || p.part_number?.toLowerCase().includes(term)
    );
  }

  // Stock status filter - use new 'stock' column
  if (stockFilter.value !== 'all') {
    filtered = filtered.filter((p) => {
      const stock = p.inventory?.stock ?? p.inventory?.stock ?? 0;
      if (stockFilter.value === 'in-stock') return stock > 10;
      if (stockFilter.value === 'low-stock') return stock > 0 && stock <= 10;
      if (stockFilter.value === 'out-of-stock') return stock === 0;
      return true;
    });
  }

  // Shopify sync filter
  if (syncFilter.value !== 'all') {
    filtered = filtered.filter((p) => {
      if (syncFilter.value === 'synced') return !!p.inventory?.shopify_variant_id;
      if (syncFilter.value === 'not-synced') return !p.inventory?.shopify_variant_id;
      return true;
    });
  }

  return filtered;
});

// Methods
const getStockClass = (stock: number): string => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= 5) return 'low-stock';
  return 'in-stock';
};


const refreshData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}/api/products?limit=100`);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();
    products.value = data.products;
  } catch (err: any) {
    error.value = err.message || 'Failed to load products';
  } finally {
    loading.value = false;
  }
};


// Lifecycle
onMounted(() => {
  refreshData();
});
</script>
