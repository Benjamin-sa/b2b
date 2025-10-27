<template>
  <div class="max-w-[1400px] mx-auto p-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-semibold text-gray-900">{{ t('admin.stock.title') }}</h2>
      <button 
        @click="refreshData" 
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
      >
        <svg
          v-if="!loading"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        <span v-else class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></span>
        {{ t('admin.stock.refresh') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">{{ t('admin.stock.filters.search') }}</label>
        <input
          v-model="searchTerm"
          type="text"
          :placeholder="t('admin.stock.filters.searchPlaceholder')"
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">{{ t('admin.stock.filters.stockStatus') }}</label>
        <select 
          v-model="stockFilter" 
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
        >
          <option value="all">{{ t('admin.stock.filters.all') }}</option>
          <option value="in-stock">{{ t('admin.stock.filters.inStock') }}</option>
          <option value="low-stock">{{ t('admin.stock.filters.lowStock') }}</option>
          <option value="out-of-stock">{{ t('admin.stock.filters.outOfStock') }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-600">{{ t('admin.stock.filters.shopifySync') }}</label>
        <select 
          v-model="syncFilter" 
          class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
        >
          <option value="all">{{ t('admin.stock.filters.all') }}</option>
          <option value="synced">{{ t('admin.stock.filters.synced') }}</option>
          <option value="not-synced">{{ t('admin.stock.filters.notSynced') }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && products.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
      <div class="w-12 h-12 border-3 border-current border-r-transparent rounded-full animate-spin"></div>
      <p>{{ t('admin.stock.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 gap-4 text-red-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button @click="refreshData" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        {{ t('admin.stock.retry') }}
      </button>
    </div>

    <!-- Products Table -->
    <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
      <table class="w-full border-collapse">
        <thead class="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th class="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.product') }}
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.totalStock') }}
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.b2bStock') }}
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.b2cStock') }}
            </th>

            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.shopifySync') }}
            </th>
            <th class="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ t('admin.stock.table.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.id" class="border-b border-gray-200 transition-colors hover:bg-gray-50">
            <!-- Product Info -->
            <td class="px-4 py-4 min-w-[300px]">
              <div class="flex items-center gap-4">
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="w-12 h-12 rounded-md object-cover flex-shrink-0"
                />
                <div v-else class="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="font-medium text-gray-900">{{ product.name }}</span>
                  <span v-if="product.part_number" class="text-xs text-gray-500">{{ product.part_number }}</span>
                </div>
              </div>
            </td>

            <!-- Total Stock -->
            <td class="px-4 py-4 text-center">
              <span 
                class="inline-block px-3 py-1.5 rounded-full text-sm font-medium"
                :class="{
                  'bg-green-100 text-green-800': getStockClass(product.inventory?.total_stock || 0) === 'in-stock',
                  'bg-yellow-100 text-yellow-800': getStockClass(product.inventory?.total_stock || 0) === 'low-stock',
                  'bg-red-100 text-red-800': getStockClass(product.inventory?.total_stock || 0) === 'out-of-stock'
                }"
              >
                {{ product.inventory?.total_stock || 0 }}
              </span>
            </td>

            <!-- B2B Stock -->
            <td class="px-4 py-4 text-center">
              <span class="font-medium text-gray-700">{{ product.inventory?.b2b_stock || 0 }}</span>
            </td>

            <!-- B2C Stock -->
            <td class="px-4 py-4 text-center">
              <span class="font-medium text-gray-700">{{ product.inventory?.b2c_stock || 0 }}</span>
            </td>

            <!-- Shopify Sync Status -->
            <td class="px-4 py-4 text-center">
              <div class="flex justify-center">
                <span
                  v-if="product.inventory?.shopify_variant_id"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  :title="t('admin.stock.shopify.syncedTooltip')"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {{ t('admin.stock.shopify.synced') }}
                </span>
                <span v-else class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium" :title="t('admin.stock.shopify.notSyncedTooltip')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {{ t('admin.stock.shopify.notSynced') }}
                </span>
              </div>
            </td>

            <!-- Actions -->
            <td class="px-4 py-4 text-center">
              <button
                @click="openEditModal(product)"
                class="inline-flex items-center justify-center w-8 h-8 bg-transparent text-gray-500 rounded-md transition-all hover:bg-gray-100 hover:text-blue-600"
                :title="t('admin.stock.actions.edit')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-if="filteredProducts.length === 0">
            <td colspan="7" class="px-4 py-16">
              <div class="flex flex-col items-center gap-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
                <p>{{ t('admin.stock.noProducts') }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Stock Modal -->
    <div v-if="editingProduct" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="closeEditModal">
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center px-6 py-6 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">{{ t('admin.stock.modal.title') }}</h3>
          <button @click="closeEditModal" class="flex items-center justify-center w-8 h-8 bg-transparent text-gray-500 rounded-md transition-all hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-6 overflow-y-auto">
          <!-- Product Info -->
          <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <img
              v-if="editingProduct.image_url"
              :src="editingProduct.image_url"
              :alt="editingProduct.name"
              class="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h4 class="text-lg font-semibold text-gray-900">{{ editingProduct.name }}</h4>
              <p v-if="editingProduct.part_number" class="text-sm text-gray-500">{{ editingProduct.part_number }}</p>
            </div>
          </div>

          <!-- Update Form -->
          <form @submit.prevent="updateStock" class="flex flex-col gap-4">
            <!-- Total Stock -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">{{ t('admin.stock.modal.currentTotal') }}</label>
              <input
                v-model.number="stockUpdate.totalStock"
                type="number"
                min="0"
                class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                required
              />
            </div>

            <!-- B2B Stock -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">{{ t('admin.stock.modal.currentB2B') }}</label>
              <input
                v-model.number="stockUpdate.b2bStock"
                type="number"
                min="0"
                :max="stockUpdate.totalStock"
                class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                required
              />
            </div>

            <!-- B2C Stock -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">{{ t('admin.stock.modal.currentB2C') }}</label>
              <input
                v-model.number="stockUpdate.b2cStock"
                type="number"
                min="0"
                :max="stockUpdate.totalStock"
                class="px-2.5 py-2.5 border border-gray-300 rounded-md text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                required
              />
            </div>

            <!-- Validation Error -->
            <div v-if="validationError" class="px-3 py-3 bg-red-100 text-red-800 rounded-md text-sm">
              {{ validationError }}
            </div>

         
            <div class="flex gap-4 justify-end mt-6 pt-6 border-t border-gray-200">
              <button type="button" @click="closeEditModal" class="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                {{ t('admin.stock.modal.cancel') }}
              </button>
              <button 
                type="submit" 
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                :disabled="submitting || !!validationError"
              >
                <span v-if="!submitting">{{ t('admin.stock.modal.update') }}</span>
                <span v-else class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';
import type { ProductWithInventory, StockUpdate } from '../../types';

const { t } = useI18n();
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
const editingProduct = ref<ProductWithInventory | null>(null);
const submitting = ref(false);
const stockUpdate = ref<StockUpdate>({
  totalStock: 0,
  b2bStock: 0,
  b2cStock: 0,
  shopifyInventoryItemId: null,
});

// Computed
const filteredProducts = computed(() => {
  let filtered = products.value;

  // Search filter
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.part_number?.toLowerCase().includes(term)
    );
  }

  // Stock status filter
  if (stockFilter.value !== 'all') {
    filtered = filtered.filter((p) => {
      const totalStock = p.inventory?.total_stock || 0;
      if (stockFilter.value === 'in-stock') return totalStock > 10;
      if (stockFilter.value === 'low-stock') return totalStock > 0 && totalStock <= 10;
      if (stockFilter.value === 'out-of-stock') return totalStock === 0;
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

const reallocationError = computed(() => {
  const total = stockUpdate.value.totalStock;
  const sum = stockUpdate.value.b2bStock + stockUpdate.value.b2cStock;
  
  if (sum > total) {
    return t('admin.stock.modal.reallocationError', { total });
  }
  
  return null;
});

const validationError = computed(() => {
  return reallocationError.value;
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
    // Fetch products with inventory data from API Gateway
    const response = await fetch(`${API_GATEWAY_URL}/api/products?limit=100`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Products now include inventory data from product_inventory table
    products.value = data.items;
  } catch (err: any) {
    error.value = err.message || t('admin.stock.errorLoading');
  } finally {
    loading.value = false;
  }
};

const openEditModal = (product: ProductWithInventory) => {
  editingProduct.value = product;
  stockUpdate.value = {
    totalStock: product.inventory?.total_stock || 0,
    b2bStock: product.inventory?.b2b_stock || 0,
    b2cStock: product.inventory?.b2c_stock || 0,
    shopifyInventoryItemId: product.inventory?.shopify_inventory_item_id || null
  };
};

const closeEditModal = () => {
  editingProduct.value = null;
  stockUpdate.value = {
    totalStock: 0,
    b2bStock: 0,
    b2cStock: 0,
    shopifyInventoryItemId: null
  };
};

const updateStock = async () => {
  if (!editingProduct.value) return;

  submitting.value = true;

  try {
    // Make API call to update stock in product_inventory table
    const response = await fetch(`${API_GATEWAY_URL}/api/products/inventory/${editingProduct.value.id}/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(stockUpdate.value),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update stock: ${response.statusText}`);
    }

    const updatedProduct = await response.json();

    // Update local state with server response
    const index = products.value.findIndex(p => p.id === editingProduct.value!.id);
    if (index !== -1) {
      products.value[index] = updatedProduct;
    }

    closeEditModal();
  } catch (err: any) {
    error.value = err.message || t('admin.stock.errorUpdating');
  } finally {
    submitting.value = false;
  }
};

// Lifecycle
onMounted(() => {
  refreshData();
});
</script>

