<template>
    <div class="bg-white border-b border-gray-200">

        <!-- Main Header -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <!-- Title and Description -->
                <div class="flex-1">
                    <h1 class="text-2xl font-bold text-gray-900 mb-1">
                        {{ activeCategory || '4Tparts' }}
                    </h1>
                    <p class="text-gray-600">
                        {{ getHeaderDescription() }}
                    </p>
                </div>

                <!-- Search and Quick Actions -->
                <div class="flex-1 max-w-2xl">
                    <div class="relative">
                        <div class="relative">
                            <input v-model="searchTerm" type="text"
                                placeholder="Search by part number, brand, or description..."
                                class="w-full px-4 py-3 pl-12 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                @keyup.enter="onSearch" />
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div class="absolute inset-y-0 right-0 flex items-center">
                                <button @click="toggleAdvancedFilters"
                                    class="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border-l border-gray-300 rounded-r-lg hover:bg-gray-50">
                                    Filters
                                    <svg class="inline w-4 h-4 ml-1" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-1.447.894l-4-2A1 1 0 018 15.586V11.414a1 1 0 00-.293-.707L1.293 4.293A1 1 0 011 4V4z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Active Filters -->
                    <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-3">
                        <span v-if="activeCategory"
                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {{ activeCategory }}
                            <button @click="clearCategory"
                                class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none">
                                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                        <span v-if="inStockOnly"
                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In Stock Only
                            <button @click="clearStockFilter"
                                class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-400 hover:bg-green-200 hover:text-green-500 focus:outline-none">
                                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                        <button @click="clearAllFilters" class="text-xs text-gray-500 hover:text-gray-700 underline">
                            Clear all
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Results Bar -->
        <div class="bg-gray-50 border-t border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">
                            {{ getResultsText() }}
                        </span>
                        <div v-if="isLoading" class="flex items-center space-x-2">
                            <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin">
                            </div>
                            <span class="text-sm text-gray-500">Loading...</span>
                        </div>
                    </div>

                    <div class="flex items-center space-x-4">
                        <!-- Sort Dropdown -->
                        <div class="flex items-center space-x-2">
                            <label class="text-sm text-gray-600">Sort by:</label>
                            <select v-model="sortBy"
                                class="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                @change="onSortChange">
                                <option value="name">Name</option>
                                <option value="price">Price</option>
                                <option value="createdAt">Newest</option>
                                <option value="popularity">Popularity</option>
                            </select>
                        </div>

                        <!-- View Toggle -->
                        <div class="flex items-center border border-gray-300 rounded-md">
                            <button @click="setViewMode('grid')" :class="[
                                'p-2 border-r border-gray-300',
                                viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                            ]">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button @click="setViewMode('list')" :class="[
                                'p-2',
                                viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                            ]">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
    searchTerm?: string;
    activeCategory?: string;
    inStockOnly?: boolean;
    sortBy?: string;
    isLoading?: boolean;
    productCount?: number;
    totalCount?: number;
    viewMode?: 'grid' | 'list';
}

interface Emits {
    (e: 'search', value: string): void;
    (e: 'category-change', value: string): void;
    (e: 'stock-filter-change', value: boolean): void;
    (e: 'sort-change', value: string): void;
    (e: 'clear-filters'): void;
    (e: 'view-mode-change', value: 'grid' | 'list'): void;
    (e: 'toggle-filters'): void;
}

const props = withDefaults(defineProps<Props>(), {
    searchTerm: '',
    activeCategory: '',
    inStockOnly: false,
    sortBy: 'name',
    isLoading: false,
    productCount: 0,
    totalCount: 0,
    viewMode: 'grid'
});

const emit = defineEmits<Emits>();

// Local reactive state
const searchTerm = ref(props.searchTerm);
const sortBy = ref(props.sortBy);
const viewMode = ref(props.viewMode);

// Computed properties
const hasActiveFilters = computed(() => {
    return props.activeCategory || props.inStockOnly || searchTerm.value;
});

// Methods
const getHeaderDescription = () => {
    if (props.activeCategory) {
        return `Browse our ${props.activeCategory.toLowerCase()} collection`;
    }
    return 'Professional automotive components for your business';
};

const getResultsText = () => {
    if (props.isLoading && props.productCount === 0) {
        return 'Loading products...';
    }
    if (props.totalCount === 0) {
        return 'No products found';
    }
    if (props.productCount === props.totalCount) {
        return `${props.totalCount} products`;
    }
    return `Showing ${props.productCount} of ${props.totalCount} products`;
};

const onSearch = () => {
    emit('search', searchTerm.value);
};

const onSortChange = () => {
    emit('sort-change', sortBy.value);
};

const setViewMode = (mode: 'grid' | 'list') => {
    viewMode.value = mode;
    emit('view-mode-change', mode);
};

const toggleAdvancedFilters = () => {
    emit('toggle-filters');
};

const clearCategory = () => {
    emit('category-change', '');
};

const clearStockFilter = () => {
    emit('stock-filter-change', false);
};

const clearAllFilters = () => {
    searchTerm.value = '';
    emit('clear-filters');
};

// Watch for prop changes
watch(() => props.searchTerm, (newVal) => {
    searchTerm.value = newVal;
});

watch(() => props.sortBy, (newVal) => {
    sortBy.value = newVal;
});

watch(() => props.viewMode, (newVal) => {
    viewMode.value = newVal;
});

// Watch for local changes
watch(searchTerm, (newVal) => {
    if (newVal !== props.searchTerm) {
        // Debounce the search
        const timeoutId = setTimeout(() => {
            emit('search', newVal);
        }, 300);
        return () => clearTimeout(timeoutId);
    }
});
</script>
