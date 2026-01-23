<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/20">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b-2 border-primary-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1
              class="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent"
            >
              {{ $t('categories.title') }}
            </h1>
            <p class="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              {{ $t('categories.subtitle') }}
            </p>
          </div>
          <div
            class="text-xs sm:text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-full w-fit"
          >
            {{
              $t('categories.categoriesAvailable', {
                count: categoryStore.categories.filter((c) => c.isActive).length,
              })
            }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="categoryStore.isLoading && !categoryStore.hasCategories"
      class="text-center py-16 sm:py-24"
    >
      <div
        class="w-14 h-14 sm:w-16 sm:h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"
      ></div>
      <p class="mt-4 sm:mt-6 text-base sm:text-lg text-gray-600 font-medium">
        {{ $t('categories.loading') }}
      </p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="categoryStore.error"
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
    >
      <div class="bg-danger-50 border-2 border-danger-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-0">
          <svg
            class="w-5 h-5 sm:w-6 sm:h-6 text-danger-500 sm:mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="flex-1">
            <h3 class="text-base sm:text-lg font-medium text-danger-800">
              {{ $t('categories.error') }}
            </h3>
            <p class="text-sm sm:text-base text-danger-700 mt-1">{{ categoryStore.error }}</p>
            <button
              class="mt-3 sm:mt-4 px-4 py-2 bg-gradient-to-r from-danger-600 to-danger-700 text-white rounded-lg sm:rounded-xl hover:from-danger-700 hover:to-danger-800 font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              @click="loadCategories"
            >
              >
              {{ $t('categories.tryAgain') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Grid -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div v-if="rootCategories.length === 0" class="text-center py-16 sm:py-24">
        <svg
          class="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 class="mt-4 text-base sm:text-lg font-medium text-gray-900">
          {{ $t('categories.noCategories') }}
        </h3>
        <p class="mt-2 text-sm sm:text-base text-gray-500">
          {{ $t('categories.noCategoriesMessage') }}
        </p>
      </div>

      <div v-else>
        <!-- Root Categories -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6"
        >
          <CategoryCard
            v-for="category in rootCategories"
            :key="category.id"
            :category="category"
            :subcategories="getSubcategories(category.id)"
            @click="handleCategoryClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCategoryStore } from '../stores/categories';
import CategoryCard from '../components/CategoryCard.vue';
import type { Category } from '../types/category';

const router = useRouter();
const categoryStore = useCategoryStore();

// Computed properties
const rootCategories = computed(() =>
  categoryStore.categories
    .filter((cat) => !cat.parentId && cat.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
);

// Methods
const getSubcategories = (parentId: string): Category[] => {
  return categoryStore.categories
    .filter((cat) => cat.parentId === parentId && cat.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const handleCategoryClick = (category: Category) => {
  // Check if category has subcategories
  const subcategories = getSubcategories(category.id);

  if (subcategories.length > 0) {
    // If it has subcategories, we could show a modal or expand inline
    // For now, navigate to products in this category and all subcategories
    router.push({
      name: 'CategoryProducts',
      params: { categoryId: category.id },
    });
  } else {
    // Direct navigation to products in this category
    router.push({
      name: 'CategoryProducts',
      params: { categoryId: category.id },
    });
  }
};

const loadCategories = async () => {
  await categoryStore.fetchCategories();
};

// Lifecycle
onMounted(() => {
  if (!categoryStore.hasCategories) {
    loadCategories();
  }
});
</script>

<style scoped>
/* Add any specific styles for the categories view */
</style>
