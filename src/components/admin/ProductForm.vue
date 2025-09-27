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

            <!-- Pricing & Stock -->
            <div>
                <h3 class="text-lg font-semibold mb-4">{{ $t('admin.products.pricing') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                    <!-- Inventory Product Linking (Optional) -->
                    <div class="md:col-span-3">
                        <div :class="[
                            'border-2 rounded-lg p-4',
                            !enableInventoryLinking
                                ? 'border-gray-300 bg-gray-50'
                                : showValidationErrors && !form.shopifyVariantId
                                    ? 'border-red-300 bg-red-50'
                                    : form.shopifyVariantId
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-blue-300 bg-blue-50'
                        ]">
                            <!-- Toggle for Inventory Linking -->
                            <div class="mb-4 flex items-center justify-between">
                                <h4 class="text-lg font-medium flex items-center">
                                    <span class="mr-2">🔗</span>
                                    Inventory Product Linking
                                    <span v-if="enableInventoryLinking && form.shopifyVariantId"
                                        class="ml-2 text-green-600">✅</span>
                                    <span v-else-if="enableInventoryLinking && showValidationErrors"
                                        class="ml-2 text-red-600">⚠️</span>
                                </h4>
                                <label class="flex items-center">
                                    <input v-model="enableInventoryLinking" type="checkbox"
                                        class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        @change="onInventoryLinkingToggle" />
                                    <span class="text-sm font-medium text-gray-700">Enable inventory linking</span>
                                </label>
                            </div>

                            <div v-if="!enableInventoryLinking"
                                class="text-sm text-gray-600 p-3 bg-gray-100 rounded-md">
                                <p>💡 Inventory linking is disabled. The product will be created as a standalone item
                                    without connection to the inventory system. You'll manage stock manually.</p>
                            </div>

                            <!-- Search for inventory products -->
                            <div v-if="enableInventoryLinking" class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Search Inventory Products
                                </label>
                                <div class="flex gap-2">
                                    <input v-model="inventorySearchQuery" type="text"
                                        placeholder="Search by product name or Shopify ID..."
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        @input="searchInventoryProducts" />
                                    <button type="button" @click="searchInventoryProducts"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        Search
                                    </button>
                                </div>
                            </div>

                            <!-- Selected Product Display -->
                            <div v-if="enableInventoryLinking && form.shopifyVariantId && selectedInventoryProduct"
                                class="mb-4 p-4 bg-green-50 border border-green-300 rounded-md">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <h5 class="font-medium text-green-900">✅ Linked Product:</h5>
                                        <div class="text-sm text-green-800 mt-1">
                                            <div><strong>Name:</strong> {{ selectedInventoryProduct?.title }}</div>
                                            <div><strong>Shopify Product ID:</strong> {{
                                                selectedInventoryProduct?.shopify_product_id }}</div>
                                            <div><strong>Shopify Variant ID:</strong> {{
                                                selectedInventoryProduct?.shopify_variant_id }}</div>
                                            <div><strong>Current Stock:</strong> B2C: {{
                                                selectedInventoryProduct?.b2c_stock }}, B2B: {{
                                                    selectedInventoryProduct?.b2b_stock }}</div>
                                        </div>
                                    </div>
                                    <button type="button" @click="clearSelectedProduct"
                                        class="text-red-600 hover:text-red-800 text-sm">
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <!-- Stock Amount Input (when inventory linking is enabled) -->
                            <div v-if="enableInventoryLinking && form.shopifyVariantId && selectedInventoryProduct"
                                class="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-md">
                                <h5 class="font-medium text-blue-900 mb-3">� Set B2B Stock Amount</h5>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">
                                            B2B Stock Amount
                                        </label>
                                        <input v-model.number="form.stock" type="number" min="0"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter desired B2B stock amount" />
                                        <!-- Warning for potential negative B2C stock -->
                                        <div v-if="(form.stock || 0) > (selectedInventoryProduct?.b2c_stock || 0)"
                                            class="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
                                            ⚠️ Warning: This amount ({{ form.stock || 0 }}) is higher than available B2C
                                            stock ({{ selectedInventoryProduct?.b2c_stock || 0 }}).
                                            This will result in negative B2C stock.
                                        </div>
                                    </div>
                                    <div class="text-sm text-gray-600">
                                        <p class="font-medium mb-1">Current Stock Distribution:</p>
                                        <p>B2C: {{ selectedInventoryProduct?.b2c_stock || 0 }}</p>
                                        <p>B2B: {{ selectedInventoryProduct?.b2b_stock || 0 }}</p>
                                        <p>Total: {{ selectedInventoryProduct?.total_stock || 0 }}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-600 mt-2">
                                    💡 Stock management and transfers will be handled automatically by Firebase
                                    functions when the product is saved
                                </p>
                            </div>

                            <!-- Validation Error -->
                            <div v-if="enableInventoryLinking && showValidationErrors && !form.shopifyVariantId"
                                class="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
                                <p class="text-red-700 text-sm">⚠️ You must select an inventory product before saving.
                                </p>
                            </div>

                            <!-- Search Results -->
                            <div v-if="enableInventoryLinking && inventorySearchResults.length > 0" class="mb-4">
                                <h5 class="font-medium text-gray-900 mb-2">Search Results (click to select):</h5>
                                <div class="max-h-60 overflow-y-auto space-y-2">
                                    <div v-for="item in inventorySearchResults" :key="item.id"
                                        class="p-3 bg-white border rounded-md cursor-pointer hover:bg-blue-50 transition-colors"
                                        @click="selectInventoryProduct(item)">
                                        <div class="font-medium">{{ item.title }}</div>
                                        <div class="text-sm text-gray-600">
                                            Product ID: {{ item.shopify_product_id }} | Variant ID: {{
                                                item.shopify_variant_id }}
                                        </div>
                                        <div class="text-sm text-gray-500">
                                            Stock - B2C: {{ item.b2c_stock }}, B2B: {{ item.b2b_stock }}, Total: {{
                                                item.total_stock }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div v-if="enableInventoryLinking && inventorySearchAttempted && inventorySearchResults.length === 0 && inventorySearchQuery"
                                class="text-sm text-gray-500">
                                No products found matching "{{ inventorySearchQuery }}"
                            </div>
                        </div>
                    </div>

                    <!-- Manual Stock Management (when inventory linking is disabled) -->
                    <div v-if="!enableInventoryLinking" class="md:col-span-3">
                        <div class="border-2 border-gray-300 bg-gray-50 rounded-lg p-4">
                            <h4 class="text-lg font-medium mb-3 flex items-center">
                                <span class="mr-2">📦</span>
                                Manual Stock Management
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="manualStock" class="block text-sm font-medium text-gray-700 mb-2">
                                        Stock Quantity
                                    </label>
                                    <input id="manualStock" v-model.number="form.stock" type="number" min="0"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter stock quantity" />
                                </div>
                                <div class="flex items-center">
                                    <label class="flex items-center">
                                        <input v-model="form.inStock" type="checkbox"
                                            class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                        <span class="text-sm font-medium text-gray-700">Product is in stock</span>
                                    </label>
                                </div>
                            </div>
                            <p class="text-xs text-gray-600 mt-2">
                                💡 Without inventory linking, you'll need to manually manage stock levels.
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
const inventorySearchQuery = ref('')
const inventorySearchResults = ref<any[]>([])
const inventorySearchAttempted = ref(false)
const selectedInventoryProduct = ref<any>(null)
const showValidationErrors = ref(false)

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
    stock: 0,
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
            stock: props.product.stock || 0, // B2B stock amount
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

// Inventory management functions
const searchInventoryProducts = async () => {
    if (!inventorySearchQuery.value.trim()) {
        inventorySearchResults.value = []
        inventorySearchAttempted.value = false
        return
    }

    try {
        const inventoryServiceUrl = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://127.0.0.1:8787'
        const response = await fetch(`${inventoryServiceUrl}/api/inventory/search?q=${encodeURIComponent(inventorySearchQuery.value)}`)
        const data = await response.json()

        inventorySearchAttempted.value = true

        if (data.success && data.data) {
            inventorySearchResults.value = data.data
        } else {
            inventorySearchResults.value = []
        }
    } catch (error) {
        console.error('Error searching inventory:', error)
        inventorySearchResults.value = []
        inventorySearchAttempted.value = true
    }
}

const selectInventoryProduct = (product: any) => {
    form.shopifyProductId = product.shopify_product_id
    form.shopifyVariantId = product.shopify_variant_id
    selectedInventoryProduct.value = product
    inventorySearchResults.value = []
    inventorySearchQuery.value = ''
    showValidationErrors.value = false
}

const clearSelectedProduct = () => {
    form.shopifyProductId = ''
    form.shopifyVariantId = ''
    selectedInventoryProduct.value = null
    form.stock = 0
}

const onInventoryLinkingToggle = () => {
    if (!enableInventoryLinking.value) {
        // Clear inventory data when disabling
        clearSelectedProduct()
        showValidationErrors.value = false
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

const submitForm = async () => {
    // Validate required inventory linking only if enabled for new products
    if (enableInventoryLinking.value && !props.product && !form.shopifyVariantId) {
        showValidationErrors.value = true
        return
    }

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
            images: form.images
        }

        // Stock and inventory fields depend on whether inventory linking is enabled
        if (enableInventoryLinking.value) {
            productData.inStock = (form.stock || 0) > 0 // Calculate based on B2B stock
            productData.stock = form.stock || 0 // B2B stock amount
            productData.shopifyProductId = form.shopifyProductId
            productData.shopifyVariantId = form.shopifyVariantId
        } else {
            // For standalone products, use manual stock input and generate random SKU
            productData.inStock = form.inStock
            productData.stock = form.stock || 0
            // Generate random SKU/variant ID for standalone products
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
