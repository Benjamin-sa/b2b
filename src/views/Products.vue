<template>
    <div class="min-h-screen bg-gray-50">
        <div class="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div class="text-center">
                    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                        Premium Automotive Parts
                    </h1>
                    <p class="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
                        Discover our extensive collection of high-quality automotive components for professionals
                    </p>
                    <div class="relative max-w-lg mx-auto">
                        <input v-model="filters.searchTerm" type="text"
                            placeholder="Search for parts, brands, or categories..."
                            class="w-full px-6 py-4 text-lg rounded-full border-0 shadow-xl focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-300" />
                        <div class="absolute right-2 top-2 p-2 text-gray-400">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                        <select v-model="filters.category"
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                            <option value="">All Categories</option>
                            <option v-for="category in categories" :key="category" :value="category">{{ category }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Availability</label>
                        <select v-model="filters.inStock"
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                            <option :value="undefined">All Products</option>
                            <option :value="true">✅ In Stock</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
                        <select v-model="filters.sortBy"
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                            <option value="name">Name</option>
                            <option value="price">Price</option>
                            <option value="createdAt">Newest</option>
                        </select>
                    </div>
                    <div class="flex justify-end">
                        <button @click="clearFilters"
                            class="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl font-medium">
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="productStore.isLoading && !productStore.hasProducts" class="text-center py-24">
                <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto">
                </div>
                <p class="mt-6 text-lg text-gray-600 font-medium">Loading premium products...</p>
            </div>

            <div v-else-if="!productStore.hasProducts" class="text-center py-24">
                <h3 class="text-2xl font-bold text-gray-900 mb-3">No products found</h3>
                <p class="text-gray-600 mb-6">Try adjusting your search criteria or filters.</p>
                <button @click="clearFilters"
                    class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700">
                    Clear All Filters
                </button>
            </div>

            <div v-else>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <ProductCard v-for="product in productStore.products" :key="product.id" :product="product"
                        :canOrder="authStore.isVerified || authStore.isAdmin"
                        class="transform hover:scale-105 transition-transform duration-200" />
                </div>

                <div v-if="productStore.hasMoreProducts" class="mt-12 text-center">
                    <button @click="loadMore" :disabled="productStore.isLoading"
                        class="px-8 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                        {{ productStore.isLoading ? 'Loading...' : 'Load More Products' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue';
import { useProductStore } from '../stores/products';
import { useAuthStore } from '../stores/auth';
import ProductCard from '../components/ProductCard.vue';
import type { ProductFilter } from '../types';

const productStore = useProductStore();
const authStore = useAuthStore();

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

// --- Local State for Filters ---
const filters = reactive<ProductFilter>({
    searchTerm: '',
    category: '',
    inStock: undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    limit: 12, // How many items to fetch per page
});

const categories = ref<string[]>([]);

// --- Data Fetching Logic ---

// The single, unified function to fetch data based on current filters
const applyFiltersAndFetch = (loadMore = false) => {
    console.log('Applying filters and fetching products with:', filters, 'Load more:', loadMore);
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
    filters.searchTerm = '';
    filters.category = '';
    filters.inStock = undefined;
    filters.sortBy = 'name';
    // The watch effect will automatically trigger a re-fetch
};

// --- Lifecycle ---
onMounted(async () => {
    // Initial fetch when the component loads
    applyFiltersAndFetch(false);

    // Fetch available categories for the dropdown
    categories.value = await productStore.getCategories();
});
</script>