<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!-- Background overlay -->
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

            <!-- This invisible element is to trick the browser into centering the modal contents. -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <!-- Modal panel -->
            <div
                class="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
                <form @submit.prevent="handleSubmit">
                    <!-- Header -->
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <div class="w-full">
                                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {{ isEditing ? $t('admin.categories.edit') : $t('admin.categories.create') }}
                                </h3>

                                <div class="space-y-4">
                                    <!-- Name -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.name') }}
                                        </label>
                                        <input v-model="form.name" type="text" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            :placeholder="$t('admin.categories.namePlaceholder')" />
                                    </div>

                                    <!-- Description -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.description') }}
                                        </label>
                                        <textarea v-model="form.description" rows="3"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            :placeholder="$t('admin.categories.descriptionPlaceholder')"></textarea>
                                    </div>

                                    <!-- Parent Category -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.parent') }}
                                        </label>
                                        <select v-model="form.parentId"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                            <option value="">{{ $t('admin.categories.noParent') }}</option>
                                            <option v-for="cat in availableParents" :key="cat.id" :value="cat.id">
                                                {{ cat.name }}
                                            </option>
                                        </select>
                                    </div>

                                    <!-- Display Order -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.displayOrder') }}
                                        </label>
                                        <input v-model.number="form.displayOrder" type="number" min="0"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="0" />
                                        <p class="text-xs text-gray-500 mt-1">{{ $t('admin.categories.displayOrderHint') }}</p>
                                    </div>

                                    <!-- Color -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.color') }}
                                        </label>
                                        <div class="flex items-center space-x-2">
                                            <input v-model="form.color" type="color"
                                                class="h-10 w-16 border border-gray-300 rounded cursor-pointer" />
                                            <input v-model="form.color" type="text" placeholder="#000000"
                                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                        </div>
                                    </div>

                                    <!-- Image Upload -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            {{ $t('admin.categories.image') }}
                                        </label>
                                        <ImageUpload v-model="categoryImages" :max-images="1" :max-file-size="5" />
                                        <p class="text-xs text-gray-500 mt-1">{{ $t('admin.categories.imageHint') }}</p>
                                    </div>

                                    <!-- Active Status -->
                                    <div class="flex items-center">
                                        <input v-model="form.isActive" type="checkbox" id="isActive"
                                            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                                        <label for="isActive" class="ml-2 block text-sm text-gray-700">
                                            {{ $t('admin.categories.active') }}
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
                            {{ isSubmitting ? $t('admin.categories.saving') : (isEditing ? $t('admin.categories.update') : $t('admin.categories.createButton')) }}
                        </button>
                        <button type="button" @click="$emit('close')"
                            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                            {{ $t('common.actions.cancel') }}
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
import ImageUpload from './ImageUpload.vue'
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
    description: '',
    parentId: '',
    displayOrder: 0,
    color: '#6366f1',
    imageUrl: '',
    isActive: true
})

const categoryImages = ref<string[]>([])
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
        description: '',
        parentId: '',
        displayOrder: 0,
        color: '#6366f1',
        imageUrl: '',
        isActive: true
    }
    categoryImages.value = []
}

const handleSubmit = async () => {
    if (isSubmitting.value) return

    isSubmitting.value = true

    try {
        // Build category data object, only including fields with actual values
        const categoryData: any = {
            name: form.value.name.trim(),
            displayOrder: form.value.displayOrder || 0,
            color: form.value.color,
            isActive: form.value.isActive
        }

        // Only add optional fields if they have values
        if (form.value.description && form.value.description.trim()) {
            categoryData.description = form.value.description.trim()
        }

        if (form.value.parentId && form.value.parentId.trim()) {
            categoryData.parentId = form.value.parentId.trim()
        }

        // Use uploaded image if available, otherwise fall back to imageUrl field (backward compatibility)
        if (categoryImages.value.length > 0) {
            categoryData.imageUrl = categoryImages.value[0]
        } else if (form.value.imageUrl && form.value.imageUrl.trim()) {
            categoryData.imageUrl = form.value.imageUrl.trim()
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
                description: newCategory.description || '',
                parentId: newCategory.parentId || '',
                displayOrder: newCategory.displayOrder,
                color: newCategory.color || '#6366f1',
                imageUrl: newCategory.imageUrl || '',
                isActive: newCategory.isActive
            }
            // Set category images array if there's an existing image
            categoryImages.value = newCategory.imageUrl ? [newCategory.imageUrl] : []
        } else {
            resetForm()
        }
    },
    { immediate: true }
)

// Remove slug generation watcher since we no longer use slugs

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