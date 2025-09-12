<template>
    <div>
        <!-- Navigation Tabs -->
        <div class="mb-8">
            <nav class="flex space-x-8" aria-label="Tabs">
                <button @click="activeTab = 'products'" :class="[
                    activeTab === 'products'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                ]">
                    {{ $t('admin.tabs.products') }}
                </button>
                <button @click="activeTab = 'categories'" :class="[
                    activeTab === 'categories'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                ]">
                    {{ $t('admin.tabs.categories') }}
                </button>
                <button @click="activeTab = 'users'" :class="[
                    activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                ]">
                    {{ $t('admin.tabs.users') }}
                </button>
                <button @click="activeTab = 'orders'" :class="[
                    activeTab === 'orders'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                ]">
                    {{ $t('admin.tabs.orders') }}
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

            <!-- Orders Tab -->
            <div v-if="activeTab === 'orders'">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">{{ $t('admin.orders.title') }}</h3>
                    <p class="text-gray-500">{{ $t('admin.orders.comingSoon') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import ProductsManagement from '../components/admin/management/ProductsManagement.vue'
import CategoriesManagement from '../components/admin/management/CategoriesManagement.vue'
import UsersManagement from '../components/admin/management/UsersManagement.vue'

const authStore = useAuthStore()
const activeTab = ref('products')

onMounted(() => {
    // Redirect if not admin
    if (!authStore.isAdmin) {
        window.location.href = '/'
    }
})
</script>
