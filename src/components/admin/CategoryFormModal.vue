<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

            <!-- Modal panel -->
            <div
                class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form @submit.prevent="handleSubmit">
                    <!-- Header -->
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <div class="w-full">
                                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {{ isEditing ? 'Edit Category' : 'Create New Category' }}
                                </h3>

                                <div class="space-y-4">
                                    <!-- Name -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Name *
                                        </label>
                                        <input v-model="form.name" type="text" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Enter category name" />
                                    </div>

                                    <!-- Slug -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Slug *
                                        </label>
                                        <input v-model="form.slug" type="text" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="url-friendly-name" />
                                        <p class="text-xs text-gray-500 mt-1">Used in URLs. Auto-generated from name if
                                            left empty.</p>
                                    </div>

                                    <!-- Description -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <textarea v-model="form.description" rows="3"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Optional category description"></textarea>
                                    </div>

                                    <!-- Parent Category -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Parent Category
                                        </label>
                                        <select v-model="form.parentId"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                            <option value="">None (Root Category)</option>
                                            <option v-for="cat in availableParents" :key="cat.id" :value="cat.id">
                                                {{ cat.name }}
                                            </option>
                                        </select>
                                    </div>

                                    <!-- Display Order -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Display Order
                                        </label>
                                        <input v-model.number="form.displayOrder" type="number" min="0"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="0" />
                                        <p class="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                                    </div>

                                    <!-- Color -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Color
                                        </label>
                                        <div class="flex items-center space-x-2">
                                            <input v-model="form.color" type="color"
                                                class="h-10 w-16 border border-gray-300 rounded cursor-pointer" />
                                            <input v-model="form.color" type="text" placeholder="#000000"
                                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                        </div>
                                    </div>

                                    <!-- Image URL -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            Image URL
                                        </label>
                                        <input v-model="form.imageUrl" type="url"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="https://example.com/image.jpg" />
                                    </div>

                                    <!-- Active Status -->
                                    <div class="flex items-center">
                                        <input v-model="form.isActive" type="checkbox" id="isActive"
                                            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                                        <label for="isActive" class="ml-2 block text-sm text-gray-700">
                                            Active
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="submit" :disabled="isSubmitting"
                            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                            <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                        </button>
                        <button type="button" @click="$emit('close')"
                            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCategoryStore } from '../../stores/categories'
import type { Category } from '../../types/category'

interface Props {
    isOpen: boolean
    category?: Category | null
    categories: Category[]
}

interface Emits {
    (e: 'close'): void
    (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const categoryStore = useCategoryStore()

// Form state
const form = ref({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    displayOrder: 0,
    color: '#6366f1',
    imageUrl: '',
    isActive: true
})

const isSubmitting = ref(false)

// Computed
const isEditing = computed(() => !!props.category)

const availableParents = computed(() => {
    // Exclude current category and its descendants to prevent circular references
    if (!isEditing.value) {
        return props.categories.filter(cat => cat.isActive)
    }

    return props.categories.filter(cat =>
        cat.isActive &&
        cat.id !== props.category?.id &&
        cat.parentId !== props.category?.id
    )
})

// Methods
const resetForm = () => {
    form.value = {
        name: '',
        slug: '',
        description: '',
        parentId: '',
        displayOrder: 0,
        color: '#6366f1',
        imageUrl: '',
        isActive: true
    }
}

const generateSlug = (name: string): string => {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
}

const handleSubmit = async () => {
    if (isSubmitting.value) return

    isSubmitting.value = true

    try {
        // Auto-generate slug if empty
        if (!form.value.slug && form.value.name) {
            form.value.slug = generateSlug(form.value.name)
        }

        const categoryData = {
            name: form.value.name,
            slug: form.value.slug,
            description: form.value.description || undefined,
            parentId: form.value.parentId || undefined,
            displayOrder: form.value.displayOrder,
            color: form.value.color,
            imageUrl: form.value.imageUrl || undefined,
            isActive: form.value.isActive
        }

        if (isEditing.value && props.category) {
            await categoryStore.updateCategory(props.category.id, categoryData)
        } else {
            await categoryStore.addCategory(categoryData)
        }

        emit('saved')
    } catch (error: any) {
        console.error('Error saving category:', error)
        // Error handling would be done by the parent component
        throw error
    } finally {
        isSubmitting.value = false
    }
}

// Watch for category changes to populate form
watch(
    () => props.category,
    (newCategory) => {
        if (newCategory) {
            form.value = {
                name: newCategory.name,
                slug: newCategory.slug,
                description: newCategory.description || '',
                parentId: newCategory.parentId || '',
                displayOrder: newCategory.displayOrder,
                color: newCategory.color || '#6366f1',
                imageUrl: newCategory.imageUrl || '',
                isActive: newCategory.isActive
            }
        } else {
            resetForm()
        }
    },
    { immediate: true }
)

// Auto-generate slug when name changes (only for new categories)
watch(
    () => form.value.name,
    (newName) => {
        if (!isEditing.value && newName && !form.value.slug) {
            form.value.slug = generateSlug(newName)
        }
    }
)

// Reset form when modal opens
watch(
    () => props.isOpen,
    (isOpen) => {
        if (isOpen && !props.category) {
            resetForm()
        }
    }
)
</script>
