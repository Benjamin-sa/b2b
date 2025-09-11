<template>
    <div class="space-y-6">
        <!-- Head                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Parent
                            </th>      <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-gray-900">Category Management</h2>
                <p class="text-gray-600 mt-1">Manage product categories and subcategories</p>
            </div>
            <button @click="openModal()"
                class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                Add Category
            </button>
        </div>

        <!-- Loading state -->
        <div v-if="categoryStore.isLoading && !categoryStore.hasCategories" class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p class="text-gray-500 mt-4">Loading categories...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="categoryStore.error" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
                <svg class="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-red-800">{{ categoryStore.error }}</p>
                <button @click="loadCategories" class="ml-auto text-red-600 hover:text-red-700 font-medium">
                    Try Again
                </button>
            </div>
        </div>

        <!-- Search and filters -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                    <input v-model="searchTerm" type="text" placeholder="Search categories..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <select v-model="statusFilter"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
        </div>

        <!-- Categories Table -->
        <div class="bg-white shadow-sm rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Parent
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Products
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="category in filteredCategories" :key="category.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div v-if="category.color" :style="{ backgroundColor: category.color }"
                                        class="w-4 h-4 rounded-full mr-3">
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-gray-900">
                                            {{ getIndentedName(category) }}
                                        </div>
                                        <div v-if="category.description" class="text-sm text-gray-500">
                                            {{ category.description }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ getParentName(category.parentId) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ category.displayOrder }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="[
                                    'px-2 py-1 text-xs font-semibold rounded-full',
                                    category.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                ]">
                                    {{ category.isActive ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ category.productCount || 0 }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex items-center justify-end space-x-2">
                                    <button @click="openModal(category)" class="text-indigo-600 hover:text-indigo-900">
                                        Edit
                                    </button>
                                    <button @click="deleteCategory(category)" class="text-red-600 hover:text-red-900">
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty state -->
            <div v-if="filteredCategories.length === 0 && !categoryStore.isLoading" class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
                <p class="mt-1 text-sm text-gray-500">Get started by creating your first category.</p>
                <div class="mt-6">
                    <button @click="openModal()"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                        Add Category
                    </button>
                </div>
            </div>
        </div>

        <!-- Category Form Modal -->
        <CategoryFormModal :is-open="isModalOpen" :category="editingCategory" :categories="categoryStore.categories"
            @close="closeModal" @saved="handleCategorySaved" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '../../../stores/categories'
import { useNotificationStore } from '../../../stores/notifications'
import type { Category } from '../../../types/category'
import CategoryFormModal from '../CategoryFormModal.vue'

const categoryStore = useCategoryStore()
const notificationStore = useNotificationStore()

// Local state
const searchTerm = ref('')
const statusFilter = ref('')
const isModalOpen = ref(false)
const editingCategory = ref<Category | null>(null)

// Computed
const filteredCategories = computed(() => {
    let filtered = categoryStore.categories

    // Apply search filter
    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase()
        filtered = filtered.filter(cat =>
            cat.name.toLowerCase().includes(term) ||
            cat.description?.toLowerCase().includes(term)
        )
    }

    // Apply status filter
    if (statusFilter.value === 'active') {
        filtered = filtered.filter(cat => cat.isActive)
    } else if (statusFilter.value === 'inactive') {
        filtered = filtered.filter(cat => !cat.isActive)
    }

    // Sort by displayOrder, then by name
    return filtered.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder
        }
        return a.name.localeCompare(b.name)
    })
})

// Methods
const loadCategories = async () => {
    await categoryStore.fetchCategories()
}

const getParentName = (parentId?: string) => {
    if (!parentId) return '-'
    const parent = categoryStore.categories.find(cat => cat.id === parentId)
    return parent?.name || 'Unknown'
}

const getIndentedName = (category: Category) => {
    if (!category.parentId) return category.name
    return `└ ${category.name}`
}

const openModal = (category?: Category) => {
    editingCategory.value = category || null
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
    editingCategory.value = null
}

const handleCategorySaved = () => {
    closeModal()
    loadCategories() // Refresh the list
    notificationStore.success(
        editingCategory.value ? 'Category Updated' : 'Category Created',
        editingCategory.value
            ? 'The category has been successfully updated.'
            : 'The new category has been successfully created.'
    )
}

const deleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
        return
    }

    try {
        await categoryStore.deleteCategory(category.id)
        notificationStore.success(
            'Category Deleted',
            'The category has been successfully deleted.'
        )
    } catch (error: any) {
        notificationStore.error(
            'Delete Failed',
            error.message || 'Failed to delete the category.'
        )
    }
}

// Load categories on mount
onMounted(() => {
    loadCategories()
})
</script>
