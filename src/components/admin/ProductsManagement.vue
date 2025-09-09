<template>
    <div class="space-y-6">
        <!-- Header with Add Product Button -->
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-gray-900">Products Management</h2>
                <p class="mt-1 text-sm text-gray-500">Add, edit, and manage your product catalog</p>
            </div>
            <button @click="showAddForm = true"
                class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
            </button>
        </div>

        <!-- Add/Edit Product Form -->
        <ProductForm v-if="showAddForm || editingProduct" :product="editingProduct" @cancel="cancelForm"
            @save="handleSave" />

        <!-- Products List -->
        <div v-if="!showAddForm && !editingProduct" class="bg-white shadow rounded-lg">
            <!-- Search and Filters -->
            <div class="p-6 border-b border-gray-200">
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <input v-model="searchTerm" @input="searchProducts" type="text" placeholder="Search products..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div class="flex gap-2">
                        <select v-model="selectedCategory" @change="filterProducts"
                            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="">All Categories</option>
                            <option v-for="category in categories" :key="category" :value="category">
                                {{ category }}
                            </option>
                        </select>
                        <select v-model="stockFilter" @change="filterProducts"
                            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="">All Stock</option>
                            <option value="true">In Stock</option>
                            <option value="false">Out of Stock</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Products Table -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SKU
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-if="productStore.isLoading">
                            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                Loading products...
                            </td>
                        </tr>
                        <tr v-else-if="productStore.products.length === 0">
                            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                No products found
                            </td>
                        </tr>
                        <tr v-else v-for="product in productStore.products" :key="product.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10">
                                        <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name"
                                            class="h-10 w-10 rounded-lg object-cover" />
                                        <div v-else
                                            class="h-10 w-10 rounded-lg bg-gray-300 flex items-center justify-center">
                                            <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                                        <div class="text-sm text-gray-500">{{ truncateText(product.description, 60) }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ product.category || 'No Category' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                €{{ product.price.toFixed(2) }}
                                <span v-if="product.originalPrice && product.originalPrice > product.price"
                                    class="text-xs text-gray-500 line-through ml-1">
                                    €{{ product.originalPrice.toFixed(2) }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="[
                                    product.inStock
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800',
                                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
                                ]">
                                    {{ product.inStock ? 'In Stock' : 'Out of Stock' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ product.sku || '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button @click="editProduct(product)" class="text-blue-600 hover:text-blue-900 mr-3">
                                    Edit
                                </button>
                                <button @click="confirmDelete(product)" class="text-red-600 hover:text-red-900">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="productToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4"
            @click="productToDelete = null">
            <div class="absolute inset-0 bg-black bg-opacity-50"></div>
            <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" @click.stop>
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Product</h3>
                    <p class="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete "{{ productToDelete.name }}"? This action cannot be undone.
                    </p>
                    <div class="flex justify-end space-x-4">
                        <button @click="productToDelete = null"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                            Cancel
                        </button>
                        <button @click="deleteProduct"
                            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProductStore } from '../../stores/products'
import type { Product } from '../../types'
import ProductForm from './ProductForm.vue'

const productStore = useProductStore()

const showAddForm = ref(false)
const editingProduct = ref<Product | null>(null)
const productToDelete = ref<Product | null>(null)
const searchTerm = ref('')
const selectedCategory = ref('')
const stockFilter = ref('')
const categories = ref<string[]>([])

onMounted(async () => {
    await productStore.fetchProducts()
    categories.value = await productStore.getCategories()
})

const cancelForm = () => {
    showAddForm.value = false
    editingProduct.value = null
}

const handleSave = () => {
    showAddForm.value = false
    editingProduct.value = null
    // Refresh products list
    productStore.fetchProducts()
}

const editProduct = (product: Product) => {
    editingProduct.value = product
}

const confirmDelete = (product: Product) => {
    productToDelete.value = product
}

const deleteProduct = async () => {
    if (productToDelete.value) {
        try {
            await productStore.deleteProduct(productToDelete.value.id)
            productToDelete.value = null
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Failed to delete product')
        }
    }
}

const searchProducts = () => {
    if (searchTerm.value.trim()) {
    } else {
        filterProducts()
    }
}

const filterProducts = () => {
    const filters: any = {}

    if (selectedCategory.value) {
        filters.category = selectedCategory.value
    }

    if (stockFilter.value !== '') {
        filters.inStock = stockFilter.value === 'true'
    }

    if (searchTerm.value.trim()) {
        filters.searchTerm = searchTerm.value
    }

    if (Object.keys(filters).length > 0) {
    } else {
        productStore.fetchProducts()
    }
}

const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}
</script>
