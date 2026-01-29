<template>
  <div>
    <!-- Navigation Tabs -->
    <div class="mb-8">
      <nav class="flex space-x-8" aria-label="Tabs">
        <button :class="[
          activeTab === 'products'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
        ]" @click="activeTab = 'products'">
          Products
        </button>
        <button :class="[
          activeTab === 'categories'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
        ]" @click="activeTab = 'categories'">
          Categories
        </button>
        <button :class="[
          activeTab === 'users'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
        ]" @click="activeTab = 'users'">
          Users
        </button>
        <button :class="[
          activeTab === 'stock'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
        ]" @click="activeTab = 'stock'">
          Stock Management
        </button>
        <button :class="[
          activeTab === 'orders'
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
        ]" @click="activeTab = 'orders'">
          Orders
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div>
      <!-- Products Tab -->
      <div v-if="activeTab === 'products'">
        <ProductsManagement />
      </div>

      <!-- Categories Tab -->
      <div v-if="activeTab === 'categories'">
        <CategoriesManagement />
      </div>

      <!-- Users Tab -->
      <div v-if="activeTab === 'users'">
        <UsersManagement />
      </div>

      <!-- Stock Management Tab -->
      <div v-if="activeTab === 'stock'">
        <StockManagement />
      </div>

      <!-- Orders Tab -->
      <div v-if="activeTab === 'orders'">
        <OrdersManagement />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import ProductsManagement from '../components/admin/management/ProductsManagement.vue';
import CategoriesManagement from '../components/admin/management/CategoriesManagement.vue';
import UsersManagement from '../components/admin/management/UsersManagement.vue';
import OrdersManagement from '../components/admin/management/OrdersManagement.vue';
import StockManagement from '../components/admin/management/StockManagement.vue';

const authStore = useAuthStore();
const activeTab = ref('products');

onMounted(() => {
  // Redirect if not admin
  if (!authStore.isAdmin) {
    window.location.href = '/';
  }
});
</script>
