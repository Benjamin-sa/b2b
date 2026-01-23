<template>
  <div class="space-y-6">
    <!-- Header with Add Product Button -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Product Management</h2>
        <p class="mt-1 text-sm text-gray-500">Manage your product catalog</p>
      </div>
      <button
        class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        @click="showAddForm = true"
      >
        >
        <svg
          class="w-5 h-5 inline-block mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Product
      </button>
    </div>

    <!-- Add/Edit Product Form -->
    <ProductForm
      v-if="showAddForm || editingProduct"
      :product="editingProduct"
      @cancel="cancelForm"
      @save="handleSave"
    />

    <!-- Products List -->
    <div v-if="!showAddForm && !editingProduct" class="bg-white shadow rounded-lg">
      <!-- Search and Filters -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search products..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              @input="searchProducts"
            />
          </div>
          <div class="flex gap-2">
            <select
              v-model="selectedCategory"
              class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              @change="filterProducts"
            >
              >
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <select
              v-model="stockFilter"
              class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              @change="filterProducts"
            >
              >
              <option value="">All Stock Status</option>
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
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Product
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Category
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Price
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Stock
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                SKU
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="productStore.isLoading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading products...</td>
            </tr>
            <tr v-else-if="productStore.products.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">No products found</td>
            </tr>
            <tr
              v-for="product in productStore.products"
              v-else
              :key="product.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <img
                      v-if="product.image_url"
                      :src="product.image_url"
                      :alt="product.name"
                      class="h-10 w-10 rounded-lg object-cover"
                    />
                    <div
                      v-else
                      class="h-10 w-10 rounded-lg bg-gray-300 flex items-center justify-center"
                    >
                      <svg
                        class="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                    <div
                      class="text-sm text-gray-500 html-content"
                      v-html="truncateHtml(product.description || '', 60)"
                    ></div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ product.category_id || 'No Category' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                €{{ product.price.toFixed(2) }}
                <span
                  v-if="product.original_price && product.original_price > product.price"
                  class="text-xs text-gray-500 line-through ml-1"
                >
                  €{{ product.original_price.toFixed(2) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    (product.inventory?.stock ?? 0) > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  ]"
                >
                  {{ (product.inventory?.stock ?? 0) > 0 ? 'In Stock' : 'Out of Stock' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ product.inventory?.shopify_variant_id || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  class="text-blue-600 hover:text-blue-900 mr-3"
                  @click="editProduct(product)"
                >
                  Edit
                </button>
                <button class="text-red-600 hover:text-red-900" @click="confirmDelete(product)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div v-if="productStore.totalPages > 1" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {{ (productStore.currentPage - 1) * productStore.pageSize + 1 }} to
            {{
              Math.min(productStore.currentPage * productStore.pageSize, productStore.totalItems)
            }}
            of {{ productStore.totalItems }} products
          </div>
          <div class="flex items-center space-x-2">
            <!-- First Page -->
            <button
              :disabled="productStore.currentPage === 1"
              :class="[
                productStore.currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
                'px-3 py-1 border border-gray-300 rounded-md text-sm font-medium',
              ]"
              @click="goToPage(1)"
            >
              First
            </button>

            <!-- Previous Page -->
            <button
              :disabled="productStore.currentPage === 1"
              :class="[
                productStore.currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
                'px-3 py-1 border border-gray-300 rounded-md text-sm font-medium',
              ]"
              @click="goToPage(productStore.currentPage - 1)"
            >
              Previous
            </button>

            <!-- Page Numbers -->
            <div class="flex items-center space-x-1">
              <template v-for="page in visiblePages" :key="page">
                <!-- Ellipsis -->
                <span v-if="page === -1" class="px-2 text-gray-500">...</span>
                <!-- Page Button -->
                <button
                  v-else
                  :class="[
                    page === productStore.currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
                    'px-3 py-1 border rounded-md text-sm font-medium',
                  ]"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </template>
            </div>

            <!-- Next Page -->
            <button
              :disabled="productStore.currentPage === productStore.totalPages"
              :class="[
                productStore.currentPage === productStore.totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
                'px-3 py-1 border border-gray-300 rounded-md text-sm font-medium',
              ]"
              @click="goToPage(productStore.currentPage + 1)"
            >
              Next
            </button>

            <!-- Last Page -->
            <button
              :disabled="productStore.currentPage === productStore.totalPages"
              :class="[
                productStore.currentPage === productStore.totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
                'px-3 py-1 border border-gray-300 rounded-md text-sm font-medium',
              ]"
              @click="goToPage(productStore.totalPages)"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="productToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click="productToDelete = null"
    >
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" @click.stop>
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Delete Product</h3>
          <p class="text-sm text-gray-500 mb-4">
            Are you sure you want to delete "{{ productToDelete.name }}"? This action cannot be
            undone.
          </p>
          <div class="flex justify-end space-x-4">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              @click="productToDelete = null"
            >
              > Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              @click="deleteProduct"
            >
              > Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useProductStore } from '../../../stores/products';
import type { Product } from '../../../types';
import ProductForm from '../ProductForm.vue';
import { truncateHtml } from '../../../utils/htmlUtils';

const productStore = useProductStore();

const showAddForm = ref(false);
const editingProduct = ref<Product | null>(null);
const productToDelete = ref<Product | null>(null);
const searchTerm = ref('');
const selectedCategory = ref('');
const stockFilter = ref('');
const categories = ref<string[]>([]);

// Computed property for visible page numbers
const visiblePages = computed(() => {
  const current = productStore.currentPage;
  const total = productStore.totalPages;
  const pages: number[] = [];

  if (total <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    // Adjust if we're near the start
    if (current <= 3) {
      start = 2;
      end = 5;
    }

    // Adjust if we're near the end
    if (current >= total - 2) {
      start = total - 4;
      end = total - 1;
    }

    // Add ellipsis if needed
    if (start > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis if needed
    if (end < total - 1) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Always show last page
    pages.push(total);
  }

  return pages;
});

onMounted(async () => {
  await productStore.fetchProducts();
  categories.value = await productStore.getCategories();
});

const cancelForm = () => {
  showAddForm.value = false;
  editingProduct.value = null;
};

const handleSave = () => {
  showAddForm.value = false;
  editingProduct.value = null;
  // Refresh products list
  productStore.fetchProducts();
};

const editProduct = (product: Product) => {
  editingProduct.value = product;
};

const confirmDelete = (product: Product) => {
  productToDelete.value = product;
};

const deleteProduct = async () => {
  if (productToDelete.value) {
    try {
      await productStore.deleteProduct(productToDelete.value.id);
      productToDelete.value = null;
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  }
};

const searchProducts = () => {
  filterProducts(); // Just call filterProducts which handles both search and filters
};

const filterProducts = () => {
  const filters: any = {};

  if (selectedCategory.value) {
    filters.category_id = selectedCategory.value;
  }

  if (stockFilter.value !== '') {
    filters.in_stock = stockFilter.value === 'true';
  }

  if (searchTerm.value.trim()) {
    filters.search_term = searchTerm.value;
  }

  // Always call fetchProducts with filters (empty object will fetch all)
  productStore.fetchProducts(filters);
};

const goToPage = (page: number) => {
  if (page < 1 || page > productStore.totalPages || page === productStore.currentPage) {
    return;
  }

  const filters: any = { page };

  if (selectedCategory.value) {
    filters.category_id = selectedCategory.value;
  }

  if (stockFilter.value !== '') {
    filters.in_stock = stockFilter.value === 'true';
  }

  if (searchTerm.value.trim()) {
    filters.search_term = searchTerm.value;
  }

  productStore.fetchProducts(filters);
};
</script>
