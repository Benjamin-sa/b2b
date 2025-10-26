<template>
    <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6">
            {{ isEditing ? $t('admin.products.edit') : $t('admin.products.add') }}
        </h2>

        <form @submit.prevent="submitForm" class="space-y-8">
            <!-- Images -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.images') }}</h3>
                <ImageUpload v-model="form.images" :max-images="8" :max-file-size="10" />
            </div>

            <!-- Basic Information -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.basicInfo') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Name -->
                    <div class="md:col-span-2">
                        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.name') }}
                        </label>
                        <input id="name" v-model="form.name" type="text" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.namePlaceholder')" />
                    </div>

                    <!-- Description -->
                    <div class="md:col-span-2">
                        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.description') }}
                        </label>

                        <!-- Rich Text Editor Toolbar -->
                        <div class="border border-gray-300 rounded-md overflow-hidden">
                            <div class="bg-gray-50 px-3 py-2 border-b border-gray-300 flex gap-1">
                                <button type="button" @click="formatText('bold')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Bold">
                                    <strong>B</strong>
                                </button>
                                <button type="button" @click="formatText('italic')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Italic">
                                    <em>I</em>
                                </button>
                                <button type="button" @click="formatText('underline')"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-100"
                                    title="Underline">
                                    <u>U</u>
                                </button>
                            </div>
                            <div ref="descriptionEditor" contenteditable="true" @input="onDescriptionChange"
                                @blur="onDescriptionChange" @focus="onEditorFocus"
                                class="w-full px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                :placeholder="$t('admin.products.descriptionPlaceholder')"
                                style="white-space: pre-wrap;">
                            </div>
                        </div>
                    </div>

                    <!-- Category -->
                    <div>
                        <label for="categoryId" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.category') }}
                        </label>
                        <select id="category" v-model="form.categoryId" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">{{ $t('admin.products.selectCategory') }}</option>
                            <option v-for="category in availableCategories" :key="category.id" :value="category.id">
                                {{ getIndentedCategoryName(category) }}
                            </option>
                        </select>
                    </div>

                    <!-- Brand -->
                    <div>
                        <label for="brand" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.brand') }}
                        </label>
                        <input id="brand" v-model="form.brand" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.brandPlaceholder')" />
                    </div>
                    <!-- Shopify Product ID -->
                    <div>
                        <label for="shopifyProductId" class="block text-sm font-medium text-gray-700 mb-2">
                            Shopify Product ID
                        </label>
                        <input id="shopifyProductId" v-model="form.shopifyProductId" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Shopify Product ID" />
                    </div>

                    <!-- Shopify Product Search (Debug Tool) -->
                    <div class="md:col-span-2 border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            🔍 Shopify Product Search (Link Inventory)
                        </h4>
                        
                        <!-- Search Input -->
                        <div class="mb-3">
                            <input 
                                v-model="shopifySearchQuery" 
                                type="text"
                                placeholder="Search by product name, variant ID, or SKU..."
                                class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                @keyup.enter="searchShopifyProducts"
                            />
                            <button 
                                type="button"
                                @click="searchShopifyProducts"
                                :disabled="shopifySearchLoading"
                                class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                            >
                                {{ shopifySearchLoading ? 'Searching...' : 'Search Shopify' }}
                            </button>
                        </div>

                        <!-- Search Results -->
                        <div v-if="shopifySearchResults.length > 0" class="max-h-60 overflow-y-auto space-y-2">
                            <div 
                                v-for="variant in shopifySearchResults" 
                                :key="variant.id"
                                @click="selectShopifyVariant(variant)"
                                class="p-3 bg-white border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition"
                            >
                                <div class="font-semibold text-sm text-gray-900">{{ variant.title }}</div>
                                <div class="text-xs text-gray-600 mt-1">
                                    <span class="font-mono">Variant ID:</span> {{ extractShopifyId(variant.id) }}
                                </div>
                                <div class="text-xs text-gray-600">
                                    <span class="font-mono">Inventory ID:</span> {{ extractShopifyId(variant.inventoryItemId) }}
                                </div>
                                <div class="text-xs text-gray-600">
                                    <span class="font-mono">SKU:</span> {{ variant.sku || 'N/A' }} | 
                                    <span class="font-mono">Stock:</span> {{ variant.inventoryQuantity }}
                                </div>
                            </div>
                        </div>

                        <!-- Selected Variant Info -->
                        <div v-if="form.shopifyVariantId" class="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm relative">
                            <button 
                                type="button"
                                @click="delinkShopifyProduct"
                                class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                title="Delink Shopify Product"
                            >
                                ✕
                            </button>
                            <div class="font-semibold text-green-900">✅ Linked to Shopify</div>
                            <div class="text-xs text-green-700 mt-1">
                                Variant ID: {{ form.shopifyVariantId }}
                            </div>
                            <div v-if="form.shopifyInventoryItemId" class="text-xs text-green-700">
                                Inventory ID: {{ form.shopifyInventoryItemId }}
                            </div>
                        </div>

                        <!-- Error Display -->
                        <div v-if="shopifySearchError" class="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                            ❌ {{ shopifySearchError }}
                        </div>
                    </div>

                    <!-- Part Number -->
                    <div>
                        <label for="partNumber" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.partNumber') }}
                        </label>
                        <input id="partNumber" v-model="form.partNumber" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.partNumberPlaceholder')" />
                    </div>
                </div>
            </div>

            <!-- Pricing -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.pricing') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Price -->
                    <div>
                        <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.price') }}
                        </label>
                        <input id="price" v-model.number="form.price" type="number" step="0.01" min="0" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.pricePlaceholder')" />
                    </div>

                    <!-- Original Price -->
                    <div>
                        <label for="originalPrice" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.originalPrice') }}
                        </label>
                        <input id="originalPrice" v-model.number="form.originalPrice" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.pricePlaceholder')" />
                    </div>

                    <!-- Coming Soon Toggle -->
                    <div class="md:col-span-2">
                        <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4 flex flex-col gap-2">
                            <label class="flex items-center">
                                <input v-model="form.comingSoon" type="checkbox"
                                    class="mr-2 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded" />
                                <span class="text-sm font-medium text-gray-800">{{ $t('admin.products.comingSoon')
                                    }}</span>
                            </label>
                            <p class="text-xs text-gray-600">
                                {{ $t('admin.products.comingSoonHint') }}
                            </p>
                        </div>
                    </div>

                    <!-- Unit -->
                    <div>
                        <label for="unit" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.unit') }}
                        </label>
                        <input id="unit" v-model="form.unit" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.unitPlaceholder')" />
                    </div>

                    <!-- Min Order Quantity -->
                    <div>
                        <label for="minOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.minOrder') }}
                        </label>
                        <input id="minOrderQuantity" v-model.number="form.minOrderQuantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.minOrderPlaceholder')" />
                    </div>

                    <!-- Max Order Quantity -->
                    <div>
                        <label for="maxOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.maxOrder') }}
                        </label>
                        <input id="maxOrderQuantity" v-model.number="form.maxOrderQuantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.maxOrderPlaceholder')" />
                    </div>
                </div>
            </div>

            <!-- Physical Properties -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.physical') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Weight -->
                    <div>
                        <label for="weight" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.weight') }}
                        </label>
                        <input id="weight" v-model.number="form.weight" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.weightPlaceholder')" />
                    </div>

                    <!-- Dimensions -->
                    <div>
                        <label for="length" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.length') }}
                        </label>
                        <input id="length" v-model.number="form.dimensions!.length" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.lengthPlaceholder')" />
                    </div>

                    <div>
                        <label for="width" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.width') }}
                        </label>
                        <input id="width" v-model.number="form.dimensions!.width" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.widthPlaceholder')" />
                    </div>

                    <div>
                        <label for="height" class="block text-sm font-medium text-gray-700 mb-2">
                            {{ $t('admin.products.height') }}
                        </label>
                        <input id="height" v-model.number="form.dimensions!.height" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="$t('admin.products.heightPlaceholder')" />
                    </div>
                </div>
            </div>

            <!-- Tags -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.tags') }}</h3>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        {{ $t('admin.products.productTags') }}
                    </label>
                    <div class="space-y-2">
                        <div v-for="(_, index) in form.tags" :key="index" class="flex gap-2">
                            <input v-model="form.tags![index]" type="text" :placeholder="$t('admin.products.enterTag')"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="button" @click="removeTag(index)"
                                class="px-3 py-2 text-red-600 hover:text-red-800">
                                {{ $t('admin.products.remove') }}
                            </button>
                        </div>
                        <button type="button" @click="addTag" class="text-blue-600 hover:text-blue-800 text-sm">
                            {{ $t('admin.products.addTag') }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Specifications -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.specifications') }}</h3>
                <div class="space-y-2">
                    <div v-for="(_, index) in form.specifications" :key="index" class="flex gap-2">
                        <input v-model="form.specifications![index].key" type="text"
                            :placeholder="$t('admin.products.propertyName')"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input v-model="form.specifications![index].value" type="text"
                            :placeholder="$t('admin.products.value')"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" @click="removeSpecification(index)"
                            class="px-3 py-2 text-red-600 hover:text-red-800">
                            {{ $t('admin.products.remove') }}
                        </button>
                    </div>
                    <button type="button" @click="addSpecification" class="text-blue-600 hover:text-blue-800 text-sm">
                        {{ $t('admin.products.addSpecification') }}
                    </button>
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" @click="$emit('cancel')"
                    class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                    {{ $t('common.actions.cancel') }}
                </button>
                <button type="submit" :disabled="loading"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {{ loading ? $t('admin.products.saving') : (isEditing ? $t('admin.products.update') :
                        $t('admin.products.addProduct')) }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useProductStore } from '../../stores/products'
import { useCategoryStore } from '../../stores/categories'
import type { Product } from '../../types'
import ImageUpload from './ImageUpload.vue'

interface Props {
    product?: Product | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    cancel: []
    save: []
}>()

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const loading = ref(false)

// Get available categories sorted by display order
const availableCategories = computed(() => {
    return categoryStore.categories
        .filter(cat => cat.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder)
})

// Helper to show indented category names for nested structure
const getIndentedCategoryName = (category: any) => {
    if (!category.parentId) return category.name
    return `└ ${category.name}`
}

// Inventory linking variables
const enableInventoryLinking = ref(false)
const selectedInventoryProduct = ref<any>(null)

// Shopify product search variables
const shopifySearchQuery = ref('')
const shopifySearchResults = ref<any[]>([])
const shopifySearchLoading = ref(false)
const shopifySearchError = ref('')

const form = reactive<Product>({
    id: '', // Will be set for editing, ignored for new products
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    imageUrl: '',
    images: [],
    categoryId: '', // Use categoryId instead of category
    category: '', // Keep for backward compatibility
    inStock: false,
    comingSoon: false,
    brand: '',
    partNumber: '',
    specifications: [],
    unit: '',
    minOrderQuantity: 1,
    maxOrderQuantity: 1,
    tags: [],
    weight: 0,
    dimensions: {
        length: 0,
        width: 0,
        height: 0
    },
    // Shopify inventory linking fields (required)
    shopifyProductId: '',
    shopifyVariantId: '',
    shopifyInventoryItemId: '', // ✅ CRITICAL: Required for inventory sync
    // Stripe fields - not used in form but part of Product interface
    stripeProductId: '',
    stripePriceId: '',
    // Timestamps - will be set by backend
    createdAt: null,
    updatedAt: null
})

const isEditing = computed(() => !!props.product)


// Initialize form data when editing
onMounted(async () => {
    // Load categories
    await categoryStore.fetchCategories()

    if (props.product) {
        Object.assign(form, {
            name: props.product.name,
            description: props.product.description,
            price: props.product.price,
            originalPrice: props.product.originalPrice || 0,
            imageUrl: props.product.imageUrl || '',
            categoryId: props.product.categoryId || '',
            category: props.product.category || '',
            inStock: props.product.inStock,
            comingSoon: props.product.comingSoon ?? false,
            brand: props.product.brand || '',
            partNumber: props.product.partNumber || '',
            images: props.product.images || [],
            specifications: props.product.specifications || [],
            unit: props.product.unit || '',
            minOrderQuantity: props.product.minOrderQuantity || 1,
            maxOrderQuantity: props.product.maxOrderQuantity || 1,
            tags: props.product.tags || [],
            weight: props.product.weight || 0,
            dimensions: props.product.dimensions || { length: 0, width: 0, height: 0 },
            // Shopify inventory linking fields
            shopifyProductId: props.product.shopifyProductId || '',
            shopifyVariantId: props.product.shopifyVariantId || '',
            // Stripe fields
            stripeProductId: props.product.stripeProductId || '',
            stripePriceId: props.product.stripePriceId || ''
        })

        // Enable inventory linking if product has inventory data
        enableInventoryLinking.value = !!(props.product.shopifyVariantId || props.product.shopifyProductId)

        // If editing and has inventory link, load inventory info
        if (props.product.shopifyVariantId) {
            loadInventoryInfo(props.product.shopifyVariantId)
        }
    }

    // Initialize the rich text editor after Vue has rendered
    await nextTick()
    if (descriptionEditor.value) {
        if (form.description) {
            descriptionEditor.value.innerHTML = form.description
        } else {
            descriptionEditor.value.innerHTML = ''
        }
    }
})

const addTag = () => {
    form.tags!.push('')
}

const removeTag = (index: number) => {
    form.tags!.splice(index, 1)
}

const addSpecification = () => {
    form.specifications!.push({ key: '', value: '' })
}

const removeSpecification = (index: number) => {
    form.specifications!.splice(index, 1)
}

// Rich text editor methods
const descriptionEditor = ref<HTMLElement | null>(null)

const formatText = (command: string) => {
    document.execCommand(command, false, undefined)
    // Keep focus on the editor
    if (descriptionEditor.value) {
        descriptionEditor.value.focus()
    }
}

const onEditorFocus = () => {
    // Clear placeholder content when focused if empty
    if (descriptionEditor.value && descriptionEditor.value.textContent?.trim() === '') {
        descriptionEditor.value.innerHTML = ''
    }
}

const onDescriptionChange = () => {
    if (descriptionEditor.value) {
        // Get the HTML content and store it in the form
        let content = descriptionEditor.value.innerHTML

        // Clean up empty paragraphs and unnecessary HTML
        content = content
            .replace(/<p><br><\/p>/g, '<br>')
            .replace(/<p><\/p>/g, '')
            .replace(/^<br>/, '') // Remove leading breaks
            .replace(/<br>$/, '') // Remove trailing breaks
            .replace(/^<div><br><\/div>$/, '') // Remove empty div with br
            .replace(/^<div><\/div>$/, '') // Remove empty div

        // If content is just whitespace or empty tags, clear it
        if (content.replace(/<[^>]*>/g, '').trim() === '') {
            content = ''
        }

        form.description = content
    }
}


// Generate a random product SKU for standalone products
const generateRandomSKU = () => {
    const timestamp = Date.now().toString(36)
    const randomString = Math.random().toString(36).substring(2, 8)
    return `SKU-${timestamp}-${randomString}`.toUpperCase()
}

const loadInventoryInfo = async (shopifyVariantId: string) => {
    try {
        const inventoryInfo = await productStore.getInventoryInfo(shopifyVariantId)
        if (inventoryInfo) {
            selectedInventoryProduct.value = inventoryInfo

            // If we're editing an existing product, keep the current form stock value
            // (don't sync from inventory service as stock management is handled by Firebase functions)
        }
    } catch (error) {
        console.error('Error loading inventory info:', error)
    }
}

// ============================================================================
// SHOPIFY PRODUCT SEARCH FUNCTIONS
// ============================================================================

/**
 * Search Shopify products via API Gateway
 * Sends query to: API Gateway → Shopify Sync Service → Shopify GraphQL API
 */
const searchShopifyProducts = async () => {
    if (!shopifySearchQuery.value.trim()) {
        shopifySearchError.value = 'Please enter a search query'
        return
    }

    shopifySearchLoading.value = true
    shopifySearchError.value = ''
    shopifySearchResults.value = []

    try {
        const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787'
        
        // Build query params
        const params = new URLSearchParams({ 
            query: shopifySearchQuery.value.trim(), 
            limit: '20' 
        })
        
        const response = await fetch(`${API_URL}/api/shopify/shopify/products?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
            shopifySearchResults.value = result.data
            
            if (result.data.length === 0) {
                shopifySearchError.value = 'No products found. Try a different search term.'
            }
        } else {
            shopifySearchError.value = result.error || 'Search failed'
        }
    } catch (error: any) {
        console.error('Shopify search error:', error)
        shopifySearchError.value = error.message || 'Failed to search Shopify products'
    } finally {
        shopifySearchLoading.value = false
    }
}

/**
 * Select a Shopify variant and populate form fields
 * Extracts numeric IDs from Shopify GID format
 */
const selectShopifyVariant = (variant: any) => {
    // Extract numeric IDs from Shopify GID format
    form.shopifyProductId = extractShopifyId(variant.productId)
    form.shopifyVariantId = extractShopifyId(variant.id)
    form.shopifyInventoryItemId = extractShopifyId(variant.inventoryItemId)
    
    // Clear search results
    shopifySearchResults.value = []
    shopifySearchQuery.value = ''
    
    console.log('✅ Selected Shopify variant:', {
        productId: form.shopifyProductId,
        variantId: form.shopifyVariantId,
        inventoryItemId: form.shopifyInventoryItemId,
    })
}

/**
 * Extract numeric ID from Shopify GID format
 * Examples:
 * - "gid://shopify/ProductVariant/123" → "123"
 * - "123" → "123"
 */
const extractShopifyId = (gid: string): string => {
    if (!gid) return ''
    if (gid.startsWith('gid://')) {
        return gid.split('/').pop() || gid
    }
    return gid
}

/**
 * Delink Shopify product - removes all Shopify variant/product IDs
 */
const delinkShopifyProduct = () => {
    
        form.shopifyProductId = ''
        form.shopifyVariantId = ''
        form.shopifyInventoryItemId = ''
        
        console.log('🔗 Shopify product delinked')
}

const submitForm = async () => {
   
    loading.value = true

    try {
        // Filter out empty specifications and tags
        const cleanedSpecs = form.specifications!.filter(spec => spec.key.trim() && spec.value.trim())
        const cleanedTags = form.tags!.filter(tag => tag.trim())

        // Build product data object, excluding default/empty values for optional fields
        const productData: any = {
            name: form.name,
            description: form.description,
            price: form.price,
            categoryId: form.categoryId, // Use categoryId primarily
            specifications: cleanedSpecs,
            tags: cleanedTags,
            // Convert to proper format for the store
            imageUrl: form.images![0] || '',
            images: form.images,
            comingSoon: form.comingSoon
        }

        // Stock and inventory fields depend on whether inventory linking is enabled
        if (enableInventoryLinking.value) {
            // Stock management will be handled via dedicated admin page (product_inventory table)
            productData.shopifyProductId = form.shopifyProductId
            productData.shopifyVariantId = form.shopifyVariantId
            productData.shopifyInventoryItemId = form.shopifyInventoryItemId // ✅ CRITICAL for inventory sync
        } else {
            // For standalone products (no Shopify link), generate random IDs
            // Stock management will be handled via dedicated admin page
            if (!props.product) {
                // Only generate for new products, keep existing for edits
                productData.shopifyVariantId = generateRandomSKU()
                productData.shopifyProductId = generateRandomSKU()
            } else {
                // Keep existing IDs when editing
                productData.shopifyVariantId = form.shopifyVariantId || generateRandomSKU()
                productData.shopifyProductId = form.shopifyProductId || generateRandomSKU()
            }
        }

        // Keep category field for backward compatibility
        if (form.categoryId) {
            const selectedCategory = categoryStore.categories.find(cat => cat.id === form.categoryId)
            if (selectedCategory) {
                productData.category = selectedCategory.name
            }
        }

        // Only add optional fields if they have meaningful values (not defaults)
        if (form.originalPrice! > 0) {
            productData.originalPrice = form.originalPrice
        }
        if (form.brand!.trim()) productData.brand = form.brand
        if (form.partNumber!.trim()) productData.partNumber = form.partNumber
        if (form.unit!.trim()) productData.unit = form.unit
        if (form.minOrderQuantity! > 1) productData.minOrderQuantity = form.minOrderQuantity
        if (form.maxOrderQuantity! > 1) productData.maxOrderQuantity = form.maxOrderQuantity
        if (form.weight! > 0) productData.weight = form.weight

        // Clean up dimensions if any dimension is greater than 0
        if (form.dimensions!.length > 0 || form.dimensions!.width > 0 || form.dimensions!.height > 0) {
            productData.dimensions = form.dimensions
        }

        if (props.product) {
            // Update existing product
            await productStore.updateProduct(props.product.id, productData)
        } else {
            // Add new product - all stock management will be handled by Firebase functions
            await productStore.addProduct(productData)
        }

        emit('save')
    } catch (error) {
        console.error('Error saving product:', error)
        alert('Failed to save product. Please try again.')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* Rich text editor styles */
[contenteditable]:empty::before {
    content: attr(placeholder);
    color: #9ca3af;
}

[contenteditable]:focus::before {
    content: none;
}

/* Basic formatting styles for the rich text content */
[contenteditable] strong {
    font-weight: bold;
}

[contenteditable] em {
    font-style: italic;
}

[contenteditable] u {
    text-decoration: underline;
}

[contenteditable] ul {
    margin: 1rem 0;
    padding-left: 2rem;
}

[contenteditable] li {
    margin: 0.25rem 0;
}
</style>
