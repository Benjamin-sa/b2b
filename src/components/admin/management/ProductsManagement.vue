<template>
  <div class="space-y-6">
    <!-- Header with Add Product Button -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Product Management</h2>
        <p class="mt-1 text-sm text-gray-500">Manage your product catalog</p>
      </div>
      <button
        class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        @click="showAddForm = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
      <div class="p-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input v-model="searchTerm" type="text" placeholder="Search products..."
                class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @input="searchProducts" />
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <select v-model="selectedCategory"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              :style="{ backgroundImage: `url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 20 20&quot; fill=&quot;%236b7280&quot;><path fill-rule=&quot;evenodd&quot; d=&quot;M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z&quot; clip-rule=&quot;evenodd&quot;/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1rem', paddingRight: '2rem' }"
              @change="filterProducts">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <select v-model="stockFilter"
              class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              :style="{ backgroundImage: `url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 20 20&quot; fill=&quot;%236b7280&quot;><path fill-rule=&quot;evenodd&quot; d=&quot;M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z&quot; clip-rule=&quot;evenodd&quot;/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1rem', paddingRight: '2rem' }"
              @change="filterProducts">
              <option value="">All Stock</option>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading / Empty States -->
      <div v-if="productStore.isLoading" class="px-6 py-12 text-center text-gray-500">
        <div class="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
        Loading products...
      </div>
      <div v-else-if="productStore.products.length === 0" class="px-6 py-12 text-center text-gray-500">
        No products found
      </div>

      <!-- Desktop Table (hidden on mobile) -->
      <div v-else class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th class="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="product in productStore.products" :key="product.id" class="hover:bg-gray-50 cursor-pointer"
              @click="editProduct(product)">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <img v-if="product.image_url" :src="product.image_url" :alt="product.name"
                    class="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                  <div v-else class="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">{{ product.name }}</div>
                    <div class="text-xs text-gray-500 truncate html-content"
                      v-html="truncateHtml(product.description || '', 50)"></div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 text-sm text-gray-600">{{ product.category_id || '—' }}</td>
              <td class="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">
                €{{ product.price.toFixed(2) }}
                <span v-if="product.original_price && product.original_price > product.price"
                  class="text-xs text-gray-400 line-through ml-1">€{{ product.original_price.toFixed(2) }}</span>
              </td>
              <td class="px-5 py-3">
                <span
                  :class="[(product.inventory?.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700', 'inline-flex px-2 py-0.5 text-xs font-medium rounded-full']">
                  {{ (product.inventory?.stock ?? 0) > 0 ? `${product.inventory?.stock ?? 0} in stock` : 'Out of stock'
                  }}
                </span>
              </td>
              <td class="px-5 py-3 text-sm text-gray-500 font-mono">{{ product.b2b_sku || product.part_number || '—' }}
              </td>
              <td class="px-5 py-3 text-right" @click.stop>
                <button class="text-primary-600 hover:text-primary-800 text-sm font-medium mr-3"
                  @click="editProduct(product)">Edit</button>
                <button class="text-red-500 hover:text-red-700 text-sm font-medium"
                  @click="confirmDelete(product)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card Layout -->
      <div v-if="!productStore.isLoading && productStore.products.length > 0"
        class="md:hidden divide-y divide-gray-200">
        <div v-for="product in productStore.products" :key="'m-' + product.id"
          class="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
          @click="editProduct(product)">
          <img v-if="product.image_url" :src="product.image_url" :alt="product.name"
            class="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
          <div v-else class="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">{{ product.name }}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm font-semibold text-gray-900">€{{ product.price.toFixed(2) }}</span>
              <span
                :class="[(product.inventory?.stock ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700', 'inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded-full']">
                {{ (product.inventory?.stock ?? 0) > 0 ? `${product.inventory?.stock ?? 0}` : 'Out' }}
              </span>
            </div>
            <div v-if="product.b2b_sku || product.part_number" class="text-xs text-gray-400 mt-0.5 truncate">{{
              product.b2b_sku || product.part_number }}</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
            <button class="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete" @click="confirmDelete(product)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="productStore.totalPages > 1" class="px-4 py-3 border-t border-gray-200">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="text-xs text-gray-500 order-2 sm:order-1">
            {{ (productStore.currentPage - 1) * productStore.pageSize + 1 }}–{{ Math.min(productStore.currentPage *
              productStore.pageSize, productStore.totalItems) }} of {{ productStore.totalItems }}
          </div>
          <div class="flex items-center gap-1 order-1 sm:order-2">
            <button :disabled="productStore.currentPage === 1"
              :class="[productStore.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100', 'hidden sm:inline-flex px-2 py-1.5 rounded-md text-xs font-medium transition-colors']"
              @click="goToPage(1)">First</button>
            <button :disabled="productStore.currentPage === 1"
              :class="[productStore.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100', 'px-2 py-1.5 rounded-md text-xs font-medium transition-colors']"
              @click="goToPage(productStore.currentPage - 1)">
              <svg class="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="hidden sm:inline">Previous</span>
            </button>
            <div class="flex items-center gap-0.5">
              <template v-for="page in visiblePages" :key="page">
                <span v-if="page === -1" class="px-1 text-gray-400 text-xs">…</span>
                <button v-else
                  :class="[page === productStore.currentPage ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100', 'w-8 h-8 rounded-md text-xs font-medium transition-colors']"
                  @click="goToPage(page)">{{ page }}</button>
              </template>
            </div>
            <button :disabled="productStore.currentPage === productStore.totalPages"
              :class="[productStore.currentPage === productStore.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100', 'px-2 py-1.5 rounded-md text-xs font-medium transition-colors']"
              @click="goToPage(productStore.currentPage + 1)">
              <svg class="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span class="hidden sm:inline">Next</span>
            </button>
            <button :disabled="productStore.currentPage === productStore.totalPages"
              :class="[productStore.currentPage === productStore.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100', 'hidden sm:inline-flex px-2 py-1.5 rounded-md text-xs font-medium transition-colors']"
              @click="goToPage(productStore.totalPages)">Last</button>
          </div>
        </div>
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
            Are you sure you want to delete "{{ productToDelete.name }}"? This action cannot be
            undone.
          </p>
          <div class="flex justify-end space-x-4">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              @click="productToDelete = null">
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              @click="deleteProduct">
              Delete
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
import type { Product, ProductWithRelations } from '../../../types';
import ProductForm from '../ProductForm.vue';
import { truncateHtml } from '../../../utils/htmlUtils';

const productStore = useProductStore();

const showAddForm = ref(false);
const editingProduct = ref<ProductWithRelations | null>(null);
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

const editProduct = async (product: Product) => {
  // Fetch full product details with images, specifications, etc.
  const fullProduct = await productStore.getProductById(product.id);
  if (fullProduct) {
    editingProduct.value = fullProduct;
  }
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
    filters.search = searchTerm.value;
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
    filters.search = searchTerm.value;
  }

  productStore.fetchProducts(filters);
};
</script>
