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
                    <h1 class="text-2xl font-bold text-gray-900">{{ currentCategory.name }}</h1>
                    <p v-if="currentCategory.description" class="text-sm text-gray-600 mt-1">
                        {{ currentCategory.description }}
                    </p>
                </div>
            </div>
        </div>

        <ProductsHeader :search-term="filters.search_term" :active-category="filters.category_id"
            :in-stock-only="filters.in_stock" :sort-by="filters.sort_by" :is-loading="productStore.isLoading"
            :product-count="productStore.products.length" :total-count="productStore.products.length"
            :view-mode="viewMode" :price-range="priceRange" :has-advanced-filters="showAdvancedFilters"
            @search="handleSearch" @category-change="handleCategoryChange"
            @stock-filter-change="handleStockFilterChange" @sort-change="handleSortChange" @clear-filters="clearFilters"
            @view-mode-change="handleViewModeChange" @toggle-filters="toggleAdvancedFilters" />

        <!-- Advanced Filters Panel -->
        <div v-if="showAdvancedFilters" class="bg-white border-b border-gray-200 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('products.filters.category_id')
                        }}</label>
                        <select v-model="filters.category_id"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">{{ $t('products.filters.allCategories') }}</option>
                            <option v-for="category in categories" :key="category" :value="category">{{ category }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">{{
                            $t('products.filters.availability') }}</label>
                        <select v-model="filters.in_stock"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option :value="undefined">{{ $t('products.filters.allProducts') }}</option>
                            <option :value="true">{{ $t('products.filters.in_stockOnly') }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('products.filters.priceRange')
                        }}</label>
                        <select v-model="priceRange"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            @change="handlePriceRangeChange">
                            <option value="">{{ $t('products.filters.anyPrice') }}</option>
                            <option value="0-50">€0 - €50</option>
                            <option value="50-100">€50 - €100</option>
                            <option value="100-500">€100 - €500</option>
                            <option value="500+">€500+</option>
                        </select>
                    </div>
                    <div class="flex flex-col space-y-2">
                        <button @click="clearFilters"
                            class="w-full px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-300 rounded-md font-medium">
                            {{ $t('products.filters.clear') }}
                        </button>
                        <button @click="toggleAdvancedFilters"
                            class="w-full px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-300 rounded-md font-medium">
                            {{ $t('products.filters.hideFilters') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Products Grid/List -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div v-if="productStore.isLoading && !productStore.hasProducts" class="text-center py-24">
                <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto">
                </div>
                <p class="mt-6 text-lg text-gray-600 font-medium">{{ $t('products.header.loading') }}</p>
            </div>

            <div v-else-if="!productStore.hasProducts" class="text-center py-24">
                <div class="max-w-md mx-auto">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4h-3a2 2 0 00-2 2v1m-3 0V9a2 2 0 012-2h3m-6 3h2m-2 0v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">{{ $t('products.empty.title') }}</h3>
                    <p class="mt-2 text-gray-500">{{ $t('products.empty.description') }}</p>
                    <button @click="clearFilters"
                        class="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {{ $t('products.empty.clearFilters') }}
                    </button>
                </div>
            </div>

            <div v-else>
                <!-- Grid View -->
                <div v-if="viewMode === 'grid'"
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <ProductCard v-for="product in productStore.products" :key="product.id" :product="product"
                        class="transform hover:scale-102 transition-transform duration-200" />
                </div>

                <!-- List View -->
                <div v-else class="space-y-4">
                    <div v-for="product in productStore.products" :key="product.id"
                        class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-center space-x-6">
                            <img :src="product.image_url || '/placeholder-product.jpg'" :alt="product.name"
                                class="w-24 h-24 object-cover rounded-lg">
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-gray-900">{{ product.name }}</h3>
                                <div class="text-gray-600 mt-1 html-content"
                                    v-html="truncateHtml(product.description || '', 150)"></div>
                                <div class="flex items-center justify-between mt-3">
                                    <span class="text-xl font-bold text-blue-600">€{{ product.price }}</span>
                                    <button :disabled="product.coming_soon === 1 || (product.inventory?.b2b_stock ?? 0) <= 0" :class="[
                                            product.coming_soon === 1 || (product.inventory?.b2b_stock ?? 0) <= 0
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700',
                                            'px-4 py-2 text-white rounded-md'
                                        ]">
                                        <span v-if="product.coming_soon === 1">{{ $t('products.card.comingSoon') }}</span>
                                        <span v-else-if="(product.inventory?.b2b_stock ?? 0) <= 0">{{ $t('products.card.outOfStock') }}</span>
                                        <span v-else>{{ $t('products.card.addToCart') }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Load More Button -->
                <div v-if="productStore.hasMoreProducts" class="mt-12 text-center">
                    <button @click="loadMore" :disabled="productStore.isLoading"
                        class="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                        {{ productStore.isLoading ? $t('common.actions.loading') : $t('products.loadMore') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '../stores/products';
import { useCategoryStore } from '../stores/categories';
import ProductCard from '../components/product/ProductCard.vue';
import ProductsHeader from '../components/product/ProductsHeader.vue';
import { truncateHtml } from '../utils/htmlUtils';
import type { ProductFilter } from '../types';

const productStore = useProductStore();
const categoryStore = useCategoryStore();
const route = useRoute();

// Local state
const viewMode = ref<'grid' | 'list'>('grid');
const showAdvancedFilters = ref(false);
const priceRange = ref('');

// Simple debounce implementation
const debounce = (func: Function, wait: number) => {
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
const categoryIdFromRoute = computed(() => route.params.categoryId as string || null);

// --- Local State for Filters ---
const filters = reactive<ProductFilter>({
    search_term: '',
    category_id: '',
    in_stock: undefined,
    sort_by: 'name',
    sort_order: 'asc',
    limit: 12, // How many items to fetch per page
});

const categories = ref<string[]>([]);

// Watch for route changes to update category filter
watch(categoryIdFromRoute, (newCategoryId) => {
    if (newCategoryId) {
        filters.category_id = newCategoryId;
    } else {
        filters.category_id = '';
    }
}, { immediate: true });

// Get current category info for display
const currentCategory = computed(() => {
    if (!filters.category_id) return null;
    return categoryStore.categories.find(cat => cat.id === filters.category_id);
});

// --- Event Handlers ---
const handleSearch = (searchTerm: string) => {
    filters.search_term = searchTerm;
};

const handleCategoryChange = (category: string) => {
    filters.category_id = category;
};

const handleStockFilterChange = (inStock: boolean) => {
    filters.in_stock = inStock || undefined;
};

const handleSortChange = (sortBy: string) => {
    filters.sort_by = sortBy as 'name' | 'price' | 'created_at' | 'updated_at' | 'stock';
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
    console.log('🔍 Applying filters and fetching products with:');
    console.log('  - Search term:', filters.search_term);
    console.log('  - Category:', filters.category_id);
    console.log('  - In stock:', filters.in_stock);
    console.log('  - Price range:', filters.min_price, 'to', filters.max_price);
    console.log('  - Sort by:', filters.sort_by);
    console.log('  - Load more:', loadMore);
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
    filters.search_term = '';
    filters.category_id = categoryIdFromRoute.value || ''; // Keep category from route
    filters.in_stock = undefined;
    filters.min_price = undefined;
    filters.max_price = undefined;
    filters.sort_by = 'name';
    priceRange.value = '';
    showAdvancedFilters.value = false;
    // The watch effect will automatically trigger a re-fetch
};

// --- Lifecycle ---
onMounted(async () => {
    // Load categories first
    await categoryStore.fetchCategories();

    // Initial fetch when the component loads
    applyFiltersAndFetch(false);

    // Fetch available categories for the dropdown (legacy support)
    categories.value = await productStore.getCategories();
});
</script>