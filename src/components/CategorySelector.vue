<template>
    <div class="bg-white shadow-sm border-b sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-4">
                <!-- Loading state -->
                <div v-if="categoryStore.isLoading && !categoryStore.hasCategories" class="flex justify-center">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>

                <!-- Category navigation -->
                <div v-else class="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                    <!-- All Categories -->
                    <button @click="selectCategory(null)" :class="[
                        'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                        !selectedCategory
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]">
                        {{ $t('categorySelector.allCategories') }}
                    </button>

                    <!-- Root Categories -->
                    <template v-for="category in categoryStore.rootCategories" :key="category.id">
                        <button @click="selectCategory(category)" :class="[
                            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                            selectedCategory?.id === category.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        ]">
                            <span v-if="category.color" :style="{ backgroundColor: category.color }"
                                class="w-3 h-3 rounded-full inline-block mr-2"></span>
                            {{ category.name }}
                        </button>

                        <!-- Subcategories (if parent is selected) -->
                        <template v-if="selectedCategory?.id === category.id">
                            <span class="text-gray-400">→</span>
                            <div class="flex space-x-1">
                                <button v-for="child in getChildCategories(category.id)" :key="child.id"
                                    @click="selectCategory(child)" :class="[
                                        'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                                        selectedCategory?.id === child.id
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    ]">
                                    <span v-if="child.color" :style="{ backgroundColor: child.color }"
                                        class="w-2 h-2 rounded-full inline-block mr-1"></span>
                                    {{ child.name }}
                                </button>
                            </div>
                        </template>
                    </template>
                </div>

                <!-- Breadcrumb (if subcategory is selected) -->
                <div v-if="breadcrumb.length > 1" class="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                    <template v-for="(item, index) in breadcrumb" :key="index">
                        <button v-if="index < breadcrumb.length - 1" @click="selectCategory(item.category)"
                            class="hover:text-gray-700 transition-colors">
                            {{ item.name }}
                        </button>
                        <span v-else class="text-gray-900 font-medium">{{ item.name }}</span>
                        <svg v-if="index < breadcrumb.length - 1" class="w-4 h-4 text-gray-400" fill="none"
                            stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </template>
                </div>

                <!-- Category description -->
                <div v-if="selectedCategory?.description" class="mt-2">
                    <p class="text-sm text-gray-600">{{ selectedCategory.description }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCategoryStore } from '../stores/categories'
import type { Category } from '../types/category'

interface Props {
    modelValue?: Category | null
}

interface Emits {
    (e: 'update:modelValue', category: Category | null): void
    (e: 'change', category: Category | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const categoryStore = useCategoryStore()

// Local state
const selectedCategory = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value ?? null)
})

// Computed
const getChildCategories = (parentId: string) => {
    return categoryStore.categories.filter(cat =>
        cat.parentId === parentId && cat.isActive
    ).sort((a, b) => a.displayOrder - b.displayOrder)
}

const breadcrumb = computed(() => {
    if (!selectedCategory.value) return []

    const crumbs: { name: string; category: Category | null }[] = []
    let current: Category | null = selectedCategory.value

    // Build breadcrumb from child to parent
    while (current) {
        crumbs.unshift({ name: current.name, category: current })

        if (current.parentId) {
            current = categoryStore.categories.find(cat => cat.id === current?.parentId) || null
        } else {
            current = null
        }
    }

    return crumbs
})

// Methods
const selectCategory = (category: Category | null) => {
    selectedCategory.value = category
    emit('change', category)
}

// Load categories on mount
onMounted(async () => {
    if (!categoryStore.hasCategories) {
        await categoryStore.fetchCategories()
    }
})

// Watch for external changes
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue !== selectedCategory.value) {
            selectedCategory.value = newValue
        }
    }
)
</script>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
</style>
