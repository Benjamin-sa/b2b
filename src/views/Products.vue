<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Category Breadcrumb (shown when filtering by category) -->
    <div v-if="currentCategory" class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav class="flex" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-4">
            <li>
              <router-link to="/categories" class="text-gray-500 hover:text-gray-700">
                {{ $t('navigation.categories') }}
              </router-link>
            </li>
            <li>
              <svg class="flex-shrink-0 h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd" />
              </svg>
            </li>
            <li class="text-sm">
              <span class="font-medium text-gray-900">{{ currentCategory.name }}</span>
            </li>
          </ol>
        </nav>
        <div class="mt-2">
          <p v-if="currentCategory.description" class="text-sm text-gray-600 mt-1">
            {{ currentCategory.description }}
          </p>
        </div>
      </div>
    </div>

    <ProductsHeader :search-term="filters.search" :active-category="currentCategory?.name || ''"
      :in-stock-only="filters.in_stock" :sort-by="filters.sort_by" :is-loading="productStore.isLoading"
      :product-count="productStore.products.length" :total-count="productStore.totalItems" :view-mode="viewMode"
      :price-range="priceRange" :has-advanced-filters="showAdvancedFilters" @search="handleSearch"
      @category-change="handleCategoryChange" @stock-filter-change="handleStockFilterChange"
      @sort-change="handleSortChange" @clear-filters="clearFilters" @view-mode-change="handleViewModeChange"
      @toggle-filters="toggleAdvancedFilters" />

    <!-- Advanced Filters Panel -->
    <div v-if="showAdvancedFilters" class="bg-gradient-to-br from-white to-gray-50 border-b border-gray-200 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{
              $t('products.filters.category_id')
            }}</label>
            <select v-model="filters.category_id"
              class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white">
              <option value="">{{ $t('products.filters.allCategories') }}</option>
              <option v-for="category in categoryStore.categories" :key="category.id" :value="category.name">
                {{ category.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{
              $t('products.filters.availability')
            }}</label>
            <select v-model="filters.in_stock"
              class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white">
              <option :value="undefined">{{ $t('products.filters.allProducts') }}</option>
              <option :value="true">{{ $t('products.filters.in_stockOnly') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{
              $t('products.filters.priceRange')
            }}</label>
            <select v-model="priceRange"
              class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
              @change="handlePriceRangeChange">
              <option value="">{{ $t('products.filters.anyPrice') }}</option>
              <option value="0-50">€0 - €50</option>
              <option value="50-100">€50 - €100</option>
              <option value="100-500">€100 - €500</option>
              <option value="500+">€500+</option>
            </select>
          </div>
          <div class="flex flex-col space-y-3">
            <button
              class="w-full px-4 py-3 text-primary-600 hover:text-white bg-primary-50 hover:bg-primary-600 border border-primary-300 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
              @click="clearFilters">
              >
              {{ $t('products.filters.clear') }}
            </button>
            <button
              class="w-full px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-lg font-semibold transition-all duration-200"
              @click="toggleAdvancedFilters">
              >
              {{ $t('products.filters.hideFilters') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Products Grid/List -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="productStore.isLoading && !productStore.hasProducts" class="text-center py-24">
        <div
          class="w-20 h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto shadow-lg">
        </div>
        <p class="mt-8 text-lg text-gray-700 font-semibold">{{ $t('products.header.loading') }}</p>
        <p class="mt-2 text-sm text-gray-500">Please wait while we fetch the products...</p>
      </div>

      <div v-else-if="!productStore.hasProducts" class="text-center py-24">
        <div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 border border-gray-100">
          <div
            class="bg-gradient-to-br from-primary-100 to-primary-200 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4h-3a2 2 0 00-2 2v1m-3 0V9a2 2 0 012-2h3m-6 3h2m-2 0v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2z" />
            </svg>
          </div>
          <h3 class="mt-6 text-xl font-bold text-gray-900">{{ $t('products.empty.title') }}</h3>
          <p class="mt-3 text-gray-600">{{ $t('products.empty.description') }}</p>
          <button
            class="mt-6 inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transform transition-all duration-200 hover:scale-105 shadow-md"
            @click="clearFilters">
            >
            {{ $t('products.empty.clearFilters') }}
          </button>
        </div>
      </div>

      <div v-else>
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ProductCard v-for="product in productStore.products" :key="product.id" :product="product"
            class="transform hover:scale-102 transition-transform duration-200" />
        </div>

        <!-- List View -->
        <div v-else class="space-y-4">
          <div v-for="product in productStore.products" :key="product.id"
            class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center space-x-6">
              <img :src="product.image_url || '/placeholder-product.jpg'" :alt="product.name"
                class="w-24 h-24 object-cover rounded-lg" />
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ product.name }}</h3>
                <div class="text-gray-600 mt-1 html-content" v-html="truncateHtml(product.description || '', 150)">
                </div>
                <div class="flex items-center justify-between mt-3">
                  <span class="text-xl font-bold text-blue-600">€{{ product.price }}</span>
                  <button :disabled="product.coming_soon === 1 || (product.inventory?.stock ?? 0) <= 0
                    " :class="[
                      product.coming_soon === 1 || (product.inventory?.stock ?? 0) <= 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700',
                      'px-4 py-2 text-white rounded-md',
                    ]">
                    <span v-if="product.coming_soon === 1">{{
                      $t('products.card.comingSoon')
                    }}</span>
                    <span v-else-if="(product.inventory?.stock ?? 0) <= 0">{{
                      $t('products.card.outOfStock')
                    }}</span>
                    <span v-else>{{ $t('products.card.addToCart') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div v-if="productStore.hasMoreProducts" class="mt-12 text-center">
          <button :disabled="productStore.isLoading"
            class="px-10 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            @click="loadMore">
            {{ productStore.isLoading ? $t('common.actions.loading') : $t('products.loadMore') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, watch, reactive, computed, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useProductStore } from '../stores/products';
import { useCategoryStore } from '../stores/categories';
import ProductCard from '../components/product/ProductCard.vue';
import ProductsHeader from '../components/product/ProductsHeader.vue';
import { truncateHtml } from '../utils/htmlUtils';
import type { ProductFilter, ProductWithRelations } from '../types';

// Define component name for KeepAlive matching
defineOptions({
  name: 'Products',
});

const productStore = useProductStore();
const categoryStore = useCategoryStore();
const route = useRoute();

// Local state
const viewMode = ref<'grid' | 'list'>('grid');
const showAdvancedFilters = ref(false);
const priceRange = ref('');

// Remove legacy categories array - we now use categoryStore.categories directly

// Simple debounce implementation
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Get category ID from route if we're filtering by category
const categoryIdFromRoute = computed(() => (route.params.categoryId as string) || null);

// --- Local State for Filters ---
const filters = reactive<ProductFilter>({
  search: '',
  category_id: '',
  in_stock: undefined,
  sort_by: 'created_at',
  sort_order: 'desc',
  limit: 12, // How many items to fetch per page
});

// Watch for route changes to update category filter
watch(
  categoryIdFromRoute,
  (newCategoryId) => {
    if (newCategoryId) {
      filters.category_id = newCategoryId;
    } else {
      filters.category_id = '';
    }
  },
  { immediate: true }
);

// Get current category info for display
const currentCategory = computed(() => {
  if (!filters.category_id) return null;
  return categoryStore.categories.find((cat) => cat.id === filters.category_id);
});

// --- Event Handlers ---
const handleSearch = (searchTerm: string) => {
  filters.search = searchTerm;
};

const handleCategoryChange = (category: string) => {
  filters.category_id = category;
};

const handleStockFilterChange = (inStock: boolean) => {
  filters.in_stock = inStock || undefined;
};

const handleSortChange = (sortBy: string) => {
  // Map camelCase from UI to snake_case for filter
  const sortMap: Record<string, 'name' | 'price' | 'created_at' | 'updated_at' | 'stock'> = {
    name: 'name',
    price: 'price',
    createdAt: 'created_at',
    created_at: 'created_at',
    updatedAt: 'updated_at',
    updated_at: 'updated_at',
    stock: 'stock',
    popularity: 'created_at', // Map popularity to created_at
  };

  filters.sort_by = sortMap[sortBy] || 'created_at';

  // Set appropriate sort order based on field
  // Newest (createdAt) and popularity should be descending (most recent/popular first)
  // Price and name should be ascending by default
  if (sortBy === 'createdAt' || sortBy === 'created_at' || sortBy === 'popularity') {
    filters.sort_order = 'desc';
  } else {
    filters.sort_order = 'asc';
  }
};

const handleViewModeChange = (mode: 'grid' | 'list') => {
  viewMode.value = mode;
};

const handlePriceRangeChange = () => {
  if (priceRange.value === '') {
    filters.min_price = undefined;
    filters.max_price = undefined;
  } else if (priceRange.value === '0-50') {
    filters.min_price = 0;
    filters.max_price = 50;
  } else if (priceRange.value === '50-100') {
    filters.min_price = 50;
    filters.max_price = 100;
  } else if (priceRange.value === '100-500') {
    filters.min_price = 100;
    filters.max_price = 500;
  } else if (priceRange.value === '500+') {
    filters.min_price = 500;
    filters.max_price = undefined;
  }
};

const toggleAdvancedFilters = () => {
  showAdvancedFilters.value = !showAdvancedFilters.value;
};

// --- Data Fetching Logic ---

// The single, unified function to fetch data based on current filters
const applyFiltersAndFetch = (loadMore = false) => {
  productStore.fetchProducts(filters, loadMore);
};

// A debounced version for reactive filtering to avoid excessive API calls
const debouncedFetch = debounce(() => applyFiltersAndFetch(false), 300);

// Watch for any changes in the filters and re-fetch data
watch(filters, () => {
  debouncedFetch();
});

const loadMore = () => {
  applyFiltersAndFetch(true); // Call with loadMore = true
};

const clearFilters = () => {
  filters.search = '';
  filters.category_id = categoryIdFromRoute.value || ''; // Keep category from route
  filters.in_stock = undefined;
  filters.min_price = undefined;
  filters.max_price = undefined;
  filters.sort_by = 'created_at';
  filters.sort_order = 'desc';
  priceRange.value = '';
  showAdvancedFilters.value = false;
  // The watch effect will automatically trigger a re-fetch
};

// --- Lifecycle ---

// Track if this is the first mount (component created) vs reactivation (coming back)
const isFirstMount = ref(true);

onMounted(async () => {
  // Load categories first
  await categoryStore.fetchCategories();

  // Fresh navigation - fetch products on first mount
  if (isFirstMount.value) {
    applyFiltersAndFetch(false);
    isFirstMount.value = false;
  }
});

// onActivated is called when returning to a KeepAlive cached component
onActivated(async () => {
  // Check if we're returning from product detail page
  const navState = productStore.getNavigationState();

  if (navState.shouldRestore) {
    // Restore scroll position smoothly after Vue has updated the DOM
    await nextTick();
    // Use requestAnimationFrame for smooth, jank-free scroll restoration
    requestAnimationFrame(() => {
      window.scrollTo({
        top: navState.scrollPosition,
        behavior: 'instant',
      });
    });
  }
});

// Save scroll position before navigating to product detail
onBeforeRouteLeave((to, _from, next) => {
  if (to.name === 'ProductDetail') {
    // Save scroll position before navigating to product detail
    // Filters/viewMode are preserved by KeepAlive, only need scroll position
    productStore.saveNavigationState(
      { ...filters },
      viewMode.value,
      priceRange.value,
      showAdvancedFilters.value
    );
  } else {
    // Navigating elsewhere (not to product detail), clear saved state
    productStore.clearNavigationState();
  }
  next();
});
</script>
