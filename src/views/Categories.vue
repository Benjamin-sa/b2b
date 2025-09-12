<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">{{ $t('categories.title') }}</h1>
                        <p class="mt-2 text-gray-600">{{ $t('categories.subtitle') }}</p>
                    </div>
                    <div class="text-sm text-gray-500">
                        {{ $t('categories.categoriesAvailable', { count: categoryStore.categories.filter(c => c.isActive).length }) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="categoryStore.isLoading && !categoryStore.hasCategories" class="text-center py-24">
            <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p class="mt-6 text-lg text-gray-600 font-medium">{{ $t('categories.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="categoryStore.error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="bg-red-50 border border-red-200 rounded-lg p-6">
                <div class="flex items-center">
                    <svg class="w-6 h-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 class="text-lg font-medium text-red-800">{{ $t('categories.error') }}</h3>
                        <p class="text-red-700 mt-1">{{ categoryStore.error }}</p>
                        <button @click="loadCategories"
                            class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                            {{ $t('categories.tryAgain') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Categories Grid -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div v-if="rootCategories.length === 0" class="text-center py-24">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">{{ $t('categories.noCategories') }}</h3>
                <p class="mt-2 text-gray-500">{{ $t('categories.noCategoriesMessage') }}</p>
            </div>

            <div v-else>
                <!-- Root Categories -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <CategoryCard v-for="category in rootCategories" :key="category.id" :category="category"
                        :subcategories="getSubcategories(category.id)" @click="handleCategoryClick" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '../stores/categories'
import CategoryCard from '../components/CategoryCard.vue'
import type { Category } from '../types/category'

const router = useRouter()
const categoryStore = useCategoryStore()

// Computed properties
const rootCategories = computed(() =>
    categoryStore.categories.filter(cat => !cat.parentId && cat.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
)

// Methods
const getSubcategories = (parentId: string): Category[] => {
    return categoryStore.categories
        .filter(cat => cat.parentId === parentId && cat.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
}

const handleCategoryClick = (category: Category) => {
    // Check if category has subcategories
    const subcategories = getSubcategories(category.id)

    if (subcategories.length > 0) {
        // If it has subcategories, we could show a modal or expand inline
        // For now, navigate to products in this category and all subcategories
        router.push({
            name: 'CategoryProducts',
            params: { categoryId: category.id }
        })
    } else {
        // Direct navigation to products in this category
        router.push({
            name: 'CategoryProducts',
            params: { categoryId: category.id }
        })
    }
}

const loadCategories = async () => {
    await categoryStore.fetchCategories()
}

// Lifecycle
onMounted(() => {
    if (!categoryStore.hasCategories) {
        loadCategories()
    }
})
</script>

<style scoped>
/* Add any specific styles for the categories view */
</style>
