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
            <div class="flex">
              <div class="relative flex-1">
                <input v-model="searchTerm" type="text" :placeholder="$t('products.header.searchPlaceholder')"
                  class="w-full px-4 py-3 pl-12 pr-10 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  @keyup.enter="onSearch" />
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <!-- Clear search button -->
                <button v-if="searchTerm"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  @click="clearSearch">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button :class="[
                'px-5 py-3 text-white border transition-colors duration-150 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                hasUnsearchedText
                  ? 'bg-orange-500 border-orange-500 hover:bg-orange-600'
                  : 'bg-primary-600 border-primary-600 hover:bg-primary-700',
              ]" @click="onSearch">
                {{ $t('common.actions.search') }}
              </button>
              <button :class="[
                'px-4 py-3 border border-l-0 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-150',
                hasAdvancedFilters
                  ? 'text-primary-600 bg-primary-50 border-primary-300 hover:bg-primary-100'
                  : 'text-gray-500 hover:text-gray-700 border-gray-300 hover:bg-gray-50',
              ]" @click="toggleAdvancedFilters">
                {{ $t('common.actions.filter') }}
                <svg class="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-1.447.894l-4-2A1 1 0 018 15.586V11.414a1 1 0 00-.293-.707L1.293 4.293A1 1 0 011 4V4z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Active Filters -->
          <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-3">
            <span v-if="activeCategory"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ activeCategory }}
              <button
                class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                @click="clearCategory">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <span v-if="inStockOnly"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {{ $t('products.header.inStockOnly') }}
              <button
                class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-green-400 hover:bg-green-200 hover:text-green-500 focus:outline-none"
                @click="clearStockFilter">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <span v-if="priceRange"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {{ getPriceRangeLabel(priceRange) }}
              <button
                class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-purple-400 hover:bg-purple-200 hover:text-purple-500 focus:outline-none"
                @click="clearPriceRange">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <button class="text-xs text-gray-500 hover:text-gray-700 underline" @click="clearAllFilters">
              {{ $t('products.header.clearAll') }}
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
              <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span class="text-sm text-gray-500">{{ $t('products.header.loading') }}</span>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <!-- Sort Dropdown -->
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">{{ $t('products.header.sortBy') }}</label>
              <select v-model="sortBy"
                class="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                @change="onSortChange">
                <option value="name">{{ $t('products.header.name') }}</option>
                <option value="price">{{ $t('products.header.price') }}</option>
                <option value="createdAt">{{ $t('products.header.newest') }}</option>
                <option value="popularity">{{ $t('products.header.popularity') }}</option>
              </select>
            </div>

            <!-- View Toggle -->
            <div class="flex items-center border border-gray-300 rounded-md">
              <button :class="[
                'p-2 border-r border-gray-300',
                viewMode === 'grid'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600',
              ]" @click="setViewMode('grid')">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button :class="[
                'p-2',
                viewMode === 'list'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600',
              ]" @click="setViewMode('list')">
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
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  searchTerm?: string;
  activeCategory?: string;
  inStockOnly?: boolean;
  sortBy?: string;
  isLoading?: boolean;
  productCount?: number;
  totalCount?: number;
  viewMode?: 'grid' | 'list';
  priceRange?: string;
  hasAdvancedFilters?: boolean;
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
  viewMode: 'grid',
  priceRange: '',
  hasAdvancedFilters: false,
});

const emit = defineEmits<Emits>();

// Local reactive state
const searchTerm = ref(props.searchTerm);
const sortBy = ref(props.sortBy);
const viewMode = ref(props.viewMode);

// Track if there's unsearched text
const hasUnsearchedText = computed(() => {
  return (
    searchTerm.value !== props.searchTerm &&
    searchTerm.value.length > (props.searchTerm?.length || 0)
  );
});

// Computed properties
const hasActiveFilters = computed(() => {
  return props.activeCategory || props.inStockOnly || searchTerm.value || props.priceRange;
});

// Methods
const getHeaderDescription = () => {
  if (props.activeCategory) {
    return t('products.header.browseCollection', { category: props.activeCategory.toLowerCase() });
  }
  return t('products.header.professionalDescription');
};

const getResultsText = () => {
  if (props.isLoading && props.productCount === 0) {
    return t('products.header.loading');
  }
  if (props.totalCount === 0) {
    return t('products.header.noProducts');
  }
  if (props.productCount === props.totalCount) {
    return t('products.header.totalProducts', { total: props.totalCount });
  }
  return t('products.header.showingProducts', {
    count: props.productCount,
    total: props.totalCount,
  });
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

const clearSearch = () => {
  searchTerm.value = '';
  emit('search', '');
};

const getPriceRangeLabel = (range: string) => {
  switch (range) {
    case '0-50':
      return '€0 - €50';
    case '50-100':
      return '€50 - €100';
    case '100-500':
      return '€100 - €500';
    case '500+':
      return '€500+';
    default:
      return range;
  }
};

const clearPriceRange = () => {
  emit('clear-filters'); // Let parent handle clearing all filters
};

const clearAllFilters = () => {
  searchTerm.value = '';
  emit('clear-filters');
};

// Watch for prop changes
watch(
  () => props.searchTerm,
  (newVal) => {
    searchTerm.value = newVal;
  }
);

watch(
  () => props.sortBy,
  (newVal) => {
    sortBy.value = newVal;
  }
);

watch(
  () => props.viewMode,
  (newVal) => {
    viewMode.value = newVal;
  }
);

// Smart search behavior:
// - When adding text: manual search only (Enter key or Search button)
// - When removing/clearing text: automatic search to show more results
watch(searchTerm, (newVal, oldVal) => {
  if (newVal !== props.searchTerm) {
    // Determine if text was removed (shorter) or added (longer)
    const isTextRemoved = newVal.length < (oldVal?.length || 0);

    if (isTextRemoved) {
      // Auto-search when removing text so users see more results immediately
      const timeoutId = setTimeout(() => {
        emit('search', newVal);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // For adding text, no auto-search - user must press Enter or click Search button
  }
});
</script>
