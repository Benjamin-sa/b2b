<template>
    <div class="space-y-6">
        <!-- Head                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Parent
                            </th>      <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-gray-900">{{ $t('admin.categories.managementTitle') }}</h2>
                <p class="text-gray-600 mt-1">{{ $t('admin.categories.managementSubtitle') }}</p>
            </div>
            <button @click="openModal()"
                class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                {{ $t('admin.categories.add') }}
            </button>
        </div>

        <!-- Loading state -->
        <div v-if="categoryStore.isLoading && !categoryStore.hasCategories" class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p class="text-gray-500 mt-4">{{ $t('admin.categories.loading') }}</p>
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
                    {{ $t('admin.categories.tryAgain') }}
                </button>
            </div>
        </div>

        <!-- Search and filters -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                    <input v-model="searchTerm" type="text" :placeholder="$t('admin.categories.searchPlaceholder')"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <select v-model="statusFilter"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    <option value="">{{ $t('admin.categories.allStatus') }}</option>
                    <option value="active">{{ $t('admin.categories.active') }}</option>
                    <option value="inactive">{{ $t('admin.categories.inactive') }}</option>
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
                                {{ $t('admin.categories.category') }}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {{ $t('admin.categories.parent') }}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {{ $t('admin.categories.order') }}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {{ $t('admin.categories.status') }}
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {{ $t('admin.categories.products') }}
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {{ $t('admin.categories.actions') }}
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
                                    {{ category.isActive ? $t('admin.categories.active') : $t('admin.categories.inactive') }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ category.productCount || 0 }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex items-center justify-end space-x-2">
                                    <button @click="openModal(category)" class="text-indigo-600 hover:text-indigo-900">
                                        {{ $t('admin.categories.edit') }}
                                    </button>
                                    <button @click="deleteCategory(category)" class="text-red-600 hover:text-red-900">
                                        {{ $t('admin.categories.delete') }}
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
                <h3 class="mt-2 text-sm font-medium text-gray-900">{{ $t('admin.categories.noCategories') }}</h3>
                <p class="mt-1 text-sm text-gray-500">{{ $t('admin.categories.noCategoriesMessage') }}</p>
                <div class="mt-6">
                    <button @click="openModal()"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                        {{ $t('admin.categories.add') }}
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
    return parent?.name || t('admin.categories.unknown')
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
        editingCategory.value ? t('admin.categories.updated') : t('admin.categories.created'),
        editingCategory.value
            ? t('admin.categories.updatedMessage')
            : t('admin.categories.createdMessage')
    )
}

const deleteCategory = async (category: Category) => {
    if (!confirm(t('admin.categories.confirmDelete', { categoryName: category.name }))) {
        return
    }

    try {
        await categoryStore.deleteCategory(category.id)
        notificationStore.success(
            t('admin.categories.deleted'),
            t('admin.categories.deletedMessage')
        )
    } catch (error: any) {
        notificationStore.error(
            t('admin.categories.deleteFailed'),
            error.message || t('admin.categories.deleteFailedMessage')
        )
    }
}

// Load categories on mount
onMounted(() => {
    loadCategories()
})
</script>
