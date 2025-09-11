<template>
    <div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6">
            {{ isEditing ? 'Edit Product' : 'Add New Product' }}
        </h2>

        <form @submit.prevent="submitForm" class="space-y-8">
            <!-- Images -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Product Images</h3>
                <ImageUpload v-model="form.images" :max-images="8" :max-file-size="10" />
            </div>

            <!-- Basic Information -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Basic Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Name -->
                    <div class="md:col-span-2">
                        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                            Product Name *
                        </label>
                        <input id="name" v-model="form.name" type="text" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter product name" />
                    </div>

                    <!-- Description -->
                    <div class="md:col-span-2">
                        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                        </label>
                        <textarea id="description" v-model="form.description" required rows="4"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter product description"></textarea>
                    </div>

                    <!-- Category -->
                    <div>
                        <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
                            Category *
                        </label>
                        <select id="category" v-model="form.category" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select a category</option>
                        </select>
                    </div>

                    <!-- Brand -->
                    <div>
                        <label for="brand" class="block text-sm font-medium text-gray-700 mb-2">
                            Brand
                        </label>
                        <input id="brand" v-model="form.brand" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter brand name" />
                    </div>

                    <!-- SKU -->
                    <div>
                        <label for="sku" class="block text-sm font-medium text-gray-700 mb-2">
                            SKU
                        </label>
                        <input id="sku" v-model="form.sku" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter SKU" />
                    </div>

                    <!-- Part Number -->
                    <div>
                        <label for="partNumber" class="block text-sm font-medium text-gray-700 mb-2">
                            Part Number
                        </label>
                        <input id="partNumber" v-model="form.partNumber" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter part number" />
                    </div>
                </div>
            </div>

            <!-- Pricing & Stock -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Pricing & Inventory</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Price -->
                    <div>
                        <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
                            Price (€) *
                        </label>
                        <input id="price" v-model.number="form.price" type="number" step="0.01" min="0" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Original Price -->
                    <div>
                        <label for="originalPrice" class="block text-sm font-medium text-gray-700 mb-2">
                            Original Price (€)
                        </label>
                        <input id="originalPrice" v-model.number="form.originalPrice" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Stock -->
                    <div>
                        <label for="stock" class="block text-sm font-medium text-gray-700 mb-2">
                            Stock Quantity *
                        </label>
                        <input id="stock" v-model.number="form.stock" type="number" min="0" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0" />
                    </div>

                    <!-- Unit -->
                    <div>
                        <label for="unit" class="block text-sm font-medium text-gray-700 mb-2">
                            Unit
                        </label>
                        <input id="unit" v-model="form.unit" type="text"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., piece, kg, meter" />
                    </div>

                    <!-- Min Order Quantity -->
                    <div>
                        <label for="minOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            Min Order Quantity
                        </label>
                        <input id="minOrderQuantity" v-model.number="form.minOrderQuantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1" />
                    </div>

                    <!-- Max Order Quantity -->
                    <div>
                        <label for="maxOrderQuantity" class="block text-sm font-medium text-gray-700 mb-2">
                            Max Order Quantity
                        </label>
                        <input id="maxOrderQuantity" v-model.number="form.maxOrderQuantity" type="number" min="1"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="No limit" />
                    </div>
                </div>
            </div>

            <!-- Physical Properties -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Physical Properties</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Weight -->
                    <div>
                        <label for="weight" class="block text-sm font-medium text-gray-700 mb-2">
                            Weight (kg)
                        </label>
                        <input id="weight" v-model.number="form.weight" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00" />
                    </div>

                    <!-- Dimensions -->
                    <div>
                        <label for="length" class="block text-sm font-medium text-gray-700 mb-2">
                            Length (cm)
                        </label>
                        <input id="length" v-model.number="form.dimensions!.length" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.0" />
                    </div>

                    <div>
                        <label for="width" class="block text-sm font-medium text-gray-700 mb-2">
                            Width (cm)
                        </label>
                        <input id="width" v-model.number="form.dimensions!.width" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.0" />
                    </div>

                    <div>
                        <label for="height" class="block text-sm font-medium text-gray-700 mb-2">
                            Height (cm)
                        </label>
                        <input id="height" v-model.number="form.dimensions!.height" type="number" step="0.01" min="0"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.0" />
                    </div>
                </div>
            </div>

            <!-- Tags -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Tags</h3>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Product Tags
                    </label>
                    <div class="space-y-2">
                        <div v-for="(_, index) in form.tags" :key="index" class="flex gap-2">
                            <input v-model="form.tags![index]" type="text" placeholder="Enter tag"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="button" @click="removeTag(index)"
                                class="px-3 py-2 text-red-600 hover:text-red-800">
                                Remove
                            </button>
                        </div>
                        <button type="button" @click="addTag" class="text-blue-600 hover:text-blue-800 text-sm">
                            + Add Tag
                        </button>
                    </div>
                </div>
            </div>

            <!-- Specifications -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Specifications</h3>
                <div class="space-y-2">
                    <div v-for="(_, index) in form.specifications" :key="index" class="flex gap-2">
                        <input v-model="form.specifications![index].key" type="text" placeholder="Property name"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input v-model="form.specifications![index].value" type="text" placeholder="Value"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="button" @click="removeSpecification(index)"
                            class="px-3 py-2 text-red-600 hover:text-red-800">
                            Remove
                        </button>
                    </div>
                    <button type="button" @click="addSpecification" class="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Specification
                    </button>
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end space-x-4 pt-6 border-t">
                <button type="button" @click="$emit('cancel')"
                    class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                    Cancel
                </button>
                <button type="submit" :disabled="loading"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {{ loading ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useProductStore } from '../../stores/products'
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
const loading = ref(false)


const form = reactive<Product>({
    id: '', // Will be set for editing, ignored for new products
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    imageUrl: '',
    images: [],
    category: '',
    sku: '',
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

    if (props.product) {
        Object.assign(form, {
            name: props.product.name,
            description: props.product.description,
            price: props.product.price,
            originalPrice: props.product.originalPrice || 0,
            imageUrl: props.product.imageUrl || '',
            category: props.product.category || '',
            sku: props.product.sku || '',
            inStock: props.product.inStock,
            stock: props.product.stock || 0,
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
            // Stripe fields
            stripeProductId: props.product.stripeProductId || '',
            stripePriceId: props.product.stripePriceId || ''
        })
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
            category: form.category,
            stock: form.stock!,
            specifications: cleanedSpecs,
            tags: cleanedTags,
            // Convert to proper format for the store
            imageUrl: form.images![0] || '',
            inStock: form.stock! > 0,
            images: form.images
        }

        // Only add optional fields if they have meaningful values (not defaults)
        if (form.originalPrice! > 0) {
            productData.originalPrice = form.originalPrice
        }
        if (form.brand!.trim()) productData.brand = form.brand
        if (form.sku!.trim()) productData.sku = form.sku
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
            // Add new product
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
