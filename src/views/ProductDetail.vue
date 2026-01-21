<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div class="text-center">
                <div
                    class="w-16 h-16 sm:w-20 sm:h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4 sm:mb-6 shadow-lg">
                </div>
                <p class="text-lg sm:text-xl text-gray-700 font-bold">{{ $t('common.loading') }}...</p>
                <p class="text-xs sm:text-sm text-gray-500 mt-2">Please wait while we load product details</p>
            </div>
        </div>

        <!-- Product Not Found -->
        <div v-else-if="!product" class="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div class="text-center max-w-md mx-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-10 border border-gray-100">
                <div class="bg-gradient-to-br from-danger-100 to-danger-200 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                    <svg class="w-8 h-8 sm:w-10 sm:h-10 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{{ $t('productDetail.productNotFound') }}</h2>
                <p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">{{ $t('productDetail.productNotFoundMessage') }}</p>
                <router-link to="/products"
                    class="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-105 shadow-lg">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    {{ $t('productDetail.backToProducts') }}
                </router-link>
            </div>
        </div>

        <!-- Product Details -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <!-- Breadcrumb -->
            <nav class="flex mb-4 sm:mb-8 overflow-x-auto" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm whitespace-nowrap">
                    <li>
                        <router-link to="/" class="text-gray-500 hover:text-gray-700">{{ $t('navigation.home')
                            }}</router-link>
                    </li>
                    <li>
                        <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clip-rule="evenodd" />
                        </svg>
                    </li>
                    <li>
                        <router-link to="/products" class="text-gray-500 hover:text-gray-700">{{
                            $t('navigation.products') }}</router-link>
                    </li>
                    <li>
                        <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clip-rule="evenodd" />
                        </svg>
                    </li>
                    <li>
                        <span class="text-gray-900 font-medium truncate max-w-[150px] sm:max-w-none">{{ product.name }}</span>
                    </li>
                </ol>
            </nav>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                <!-- Left Column - Images -->
                <div class="space-y-6">
                    <ImageGallery :images="productImages" :alt="product.name" :show-thumbnails="true"
                        :allow-zoom="true" />
                </div>

                <!-- Right Column - Product Info -->
                <div class="space-y-4 sm:space-y-6 lg:space-y-8">
                    <!-- Basic Info -->
                    <div>
                        <div class="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3">
                            <div class="flex-1 w-full sm:w-auto">
                                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{{ product.name }}</h1>
                                <div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                    <span v-if="product.brand" class="font-medium">{{ product.brand }}</span>
                                    <span v-if="product.b2b_sku" class="font-mono text-primary-700">
                                        {{ $t('productDetail.sku', { sku: product.b2b_sku }) }}
                                    </span>
                                    <span v-if="product.shopify_variant_id">{{ $t('productDetail.shopifySku', {
                                        sku: product.shopify_variant_id
                                    }) }}</span>
                                    <span v-if="product.part_number">{{ $t('productDetail.partNumber', {
                                        partNumber: product.part_number
                                    }) }}</span>
                                </div>
                            </div>
                            <div class="flex items-center w-full sm:w-auto sm:ml-4">
                                <div v-if="product.coming_soon"
                                    class="bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-secondary-300 shadow-sm w-full sm:w-auto text-center whitespace-nowrap">
                                    {{ $t('productDetail.comingSoon') }}
                                </div>
                                <div v-else-if="!product.in_stock"
                                    class="bg-gradient-to-r from-danger-100 to-danger-200 text-danger-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-danger-300 shadow-sm animate-pulse w-full sm:w-auto text-center whitespace-nowrap">
                                    {{ $t('productDetail.outOfStock') }}
                                </div>
                                <div v-else-if="product.stock && product.stock < 10"
                                    class="bg-gradient-to-r from-warning-100 to-warning-200 text-warning-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-warning-300 shadow-sm w-full sm:w-auto text-center whitespace-nowrap">
                                    {{ $t('productDetail.lowStock', { count: product.stock }) }}
                                </div>
                                <div v-else
                                    class="bg-gradient-to-r from-success-100 to-success-200 text-success-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-success-300 shadow-sm w-full sm:w-auto text-center whitespace-nowrap">
                                    {{ $t('productDetail.inStock') }}
                                </div>
                            </div>
                        </div>

                        <!-- Price -->
                        <div class="mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-primary-200 shadow-md">
                            <div class="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2">
                                <span class="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                                    €{{ formatPrice(product.price) }}
                                </span>
                                <span v-if="product.original_price && product.original_price > product.price"
                                    class="text-lg sm:text-xl text-gray-500 line-through font-medium">
                                    €{{ formatPrice(product.original_price) }}
                                </span>
                                <span v-if="product.original_price && product.original_price > product.price"
                                    class="bg-gradient-to-r from-danger-600 to-danger-700 text-white text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm">
                                    {{ Math.round(((product.original_price - product.price) / product.original_price) *
                                        100) }}% OFF
                                </span>
                            </div>
                            <p class="text-sm sm:text-base text-gray-700 font-medium">{{ $t('productDetail.per', {
                                unit: product.unit ||
                                    $t('productDetail.piece')
                            }) }}</p>
                        </div>

                        <!-- Tags -->
                        <div v-if="product.tags && product.tags.length > 0" class="mb-4 sm:mb-6 lg:mb-8">
                            <div class="flex flex-wrap gap-1.5 sm:gap-2">
                                <span v-for="tag in product.tags" :key="tag"
                                    class="bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-secondary-300 shadow-sm hover:shadow-md transition-shadow">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="mb-4 sm:mb-6 lg:mb-8">
                            <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">{{ $t('productDetail.description') }}
                            </h3>
                            <div class="text-sm sm:text-base text-gray-700 leading-relaxed html-content"
                                v-html="sanitizeHtml(product.description || '')"></div>
                        </div>
                    </div>

                    <!-- Purchase Section -->
                    <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 sm:border-2 shadow-lg">
                        <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                            <span class="w-1 sm:w-1.5 h-6 sm:h-8 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full mr-2 sm:mr-3"></span>
                            {{ $t('productDetail.purchaseOptions') }}
                        </h3>

                        <!-- Quantity Selector -->
                        <div class="mb-4 sm:mb-6 lg:mb-8">
                            <label class="block text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">{{ $t('productDetail.quantity')
                            }}</label>
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                                <div class="flex items-center border border-primary-300 sm:border-2 rounded-lg sm:rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow">
                                    <button @click="decreaseQuantity"
                                        :disabled="!canAddMore || Boolean(product.coming_soon) || quantity <= inputMinValue"
                                        class="px-3 py-3 sm:px-5 sm:py-4 text-primary-600 hover:text-primary-800 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-l-lg sm:rounded-l-xl font-bold">
                                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                                d="M20 12H4"></path>
                                        </svg>
                                    </button>
                                    <input v-model.number="quantity" type="number" :min="inputMinValue"
                                        :max="inputMaxValue" :disabled="!canAddMore || Boolean(product.coming_soon)"
                                        class="w-20 sm:w-24 px-2 sm:px-4 py-3 sm:py-4 text-center border-0 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg sm:text-xl font-bold text-gray-900"
                                        @blur="validateQuantity" @input="validateQuantity" />
                                    <button @click="increaseQuantity"
                                        :disabled="!canAddMore || Boolean(product.coming_soon) || quantity >= inputMaxValue"
                                        class="px-3 py-3 sm:px-5 sm:py-4 text-primary-600 hover:text-primary-800 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-r-lg sm:rounded-r-xl font-bold">
                                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div class="text-xs sm:text-sm text-gray-600">
                                    <div v-if="product.min_order_quantity">{{ $t('productDetail.min') }} {{
                                        product.min_order_quantity }} {{ product.unit || $t('productDetail.pieces') }}
                                    </div>
                                    <div v-if="isLimitedByStock">
                                        {{ $t('productDetail.max') }} {{ inputMaxValue }} {{ product.unit ||
                                            $t('productDetail.pieces') }}
                                        <span class="text-red-600">{{ $t('productDetail.limitedByStock') }}</span>
                                    </div>
                                    <div v-else-if="product.max_order_quantity">{{ $t('productDetail.max') }} {{
                                        product.max_order_quantity }} {{ product.unit || $t('productDetail.pieces') }}
                                    </div>
                                    <div v-if="product.stock" class="text-xs text-gray-500 mt-1">
                                        {{ availableStock }} {{ $t('productDetail.available') }}
                                    </div>
                                </div>
                            </div>
                            <!-- Stock warning -->
                            <div v-if="quantity > availableStock"
                                class="mt-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
                                <p class="text-xs sm:text-sm text-red-700 flex items-center">
                                    <svg class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    {{ $t('productDetail.onlyItemsAvailable', { count: availableStock }) }}
                                </p>
                            </div>
                        </div>


                        <!-- Total Price -->
                        <div class="mb-4 sm:mb-6 lg:mb-8 p-4 sm:p-6 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg sm:rounded-xl border border-primary-300 sm:border-2 shadow-md">
                            <div class="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
                                <span class="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{{ $t('productDetail.totalPrice')
                                    }}</span>
                                <span class="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">€{{ formatPrice(product.price * quantity)
                                }}</span>
                            </div>
                        </div>

                        <!-- Add to Cart Button -->
                        <button @click="addToCart"
                            :disabled="Boolean(product.coming_soon) || !Boolean(product.in_stock) || !canOrder || isAddingToCart || !canAddMore"
                            :class="[
                                Boolean(product.coming_soon) || !Boolean(product.in_stock) || !canAddMore
                                    ? 'bg-gray-400 cursor-not-allowed shadow-none'
                                    : !canOrder
                                        ? 'bg-gradient-to-r from-warning-600 to-warning-700 hover:from-warning-700 hover:to-warning-800 shadow-lg hover:shadow-xl'
                                        : isAddingToCart
                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg'
                                            : addedToCartRecently
                                                ? 'bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 shadow-lg hover:shadow-xl'
                                                : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl',
                                'w-full text-white py-3 sm:py-4 lg:py-5 px-6 sm:px-8 rounded-lg sm:rounded-xl text-base sm:text-lg lg:text-xl font-black transition-all duration-200 flex items-center justify-center transform hover:scale-105 active:scale-95'
                            ]">
                            <!-- Loading spinner -->
                            <svg v-if="isAddingToCart" class="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none"
                                viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <!-- Success checkmark -->
                            <svg v-else-if="addedToCartRecently" class="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7"></path>
                            </svg>
                            <!-- Shopping cart icon -->
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white-400 mr-2 sm:mr-3" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
                            </svg>

                            <span v-if="isAddingToCart">{{ $t('productDetail.addingToCart') }}</span>
                            <span v-else-if="product.coming_soon">{{ $t('productDetail.comingSoon') }}</span>
                            <span v-else-if="!product.in_stock">{{ $t('productDetail.outOfStock') }}</span>
                            <span v-else-if="!canOrder">{{ $t('productDetail.accountVerificationRequired') }}</span>
                            <span v-else-if="!canAddMore">{{ $t('productDetail.onlyItemsAvailable', { count: 0 })
                            }}</span>
                            <span v-else-if="addedToCartRecently">{{ $t('productDetail.addedToCart') }}</span>
                            <span v-else>{{ $t('productDetail.addToCart') }}</span>
                        </button>

                        <!-- Quick Actions -->
                        <div v-if="addedToCartRecently" class="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <router-link to="/products"
                                class="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg sm:rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 transform hover:scale-105 shadow-md text-sm sm:text-base font-bold border border-gray-300">
                                <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                        d="M15 19l-7-7 7-7"></path>
                                </svg>
                                {{ $t('productDetail.continueShopping') }}
                            </router-link>
                            <router-link to="/checkout"
                                class="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-secondary-600 to-secondary-700 text-white rounded-lg sm:rounded-xl hover:from-secondary-700 hover:to-secondary-800 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm sm:text-base font-bold">
                                {{ $t('productDetail.viewCart') }}
                                <svg class="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                        d="M9 5l7 7-7 7"></path>
                                </svg>
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Product Information Card -->
            <div class="mt-16">
                <ProductInfoCard :product="product" :specifications="product.specifications" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/products'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useNotificationStore } from '../stores/notifications'
import { useI18n } from 'vue-i18n'
import { sanitizeHtml } from '../utils/htmlUtils'
import ImageGallery from '../components/ImageGallery.vue'
import ProductInfoCard from '../components/product/ProductInfoCard.vue'
import type { Product } from '../types/product'
import type { CartItem } from '../types'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const authStore = useAuthStore()
const cartStore = useCartStore()
const notificationStore = useNotificationStore()
const { t } = useI18n()

const product = ref<Product | null>(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)
const addedToCartRecently = ref(false)
const quantity = ref(0)

const canOrder = computed(() => {
    console.log('Checking order eligibility...', authStore.isAuthenticated, authStore.isVerified, authStore.isAdmin)
    return authStore.isAuthenticated && (authStore.isVerified || authStore.isAdmin)
})

const productImages = computed(() => {
    if (!product.value) return []

    const images = []
    if (product.value.image_url) {
        images.push(product.value.image_url)
    }
    if (product.value.images && product.value.images.length > 0) {
        images.push(...product.value.images.filter(img => img !== product.value!.image_url))
    }

    return images
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const minOrder = computed(() => product.value?.min_order_quantity || 1)

const rawRemainingCapacity = computed(() => {
    if (!product.value) return 0
    return cartStore.getRemainingQuantity(product.value)
})

const maxAddableQuantity = computed(() => {
    if (!product.value) return 0
    const remaining = rawRemainingCapacity.value
    if (!Number.isFinite(remaining)) {
        return product.value.max_order_quantity || 999
    }
    return Math.max(0, remaining)
})

const minSelectableQuantity = computed(() => {
    const max = maxAddableQuantity.value
    if (max <= 0) return 0
    return Math.min(minOrder.value, max)
})

const inputMaxValue = computed(() => maxAddableQuantity.value)

const inputMinValue = computed(() => {
    if (maxAddableQuantity.value <= 0) return 0
    return minSelectableQuantity.value
})

const availableStock = computed(() => {
    if (!product.value) return 0
    const remaining = rawRemainingCapacity.value
    if (!Number.isFinite(remaining)) {
        return product.value.stock ?? 0
    }
    return Math.max(0, remaining)
})

const isLimitedByStock = computed(() => {
    if (!product.value) return false
    const remaining = rawRemainingCapacity.value
    if (!Number.isFinite(remaining)) return false
    const maxOrderLimit = product.value.max_order_quantity || 999
    return remaining < maxOrderLimit
})

const canAddMore = computed(() => {
    return !!product.value && !product.value.coming_soon && product.value.in_stock && maxAddableQuantity.value > 0
})

const validateQuantity = () => {
    if (!product.value) return

    const max = maxAddableQuantity.value
    if (max <= 0) {
        quantity.value = 0
        return
    }

    const min = minSelectableQuantity.value
    const clamped = Math.min(Math.max(quantity.value, min), max)
    quantity.value = clamped
}

const increaseQuantity = () => {
    if (!product.value || maxAddableQuantity.value <= 0) return
    if (quantity.value < maxAddableQuantity.value) {
        quantity.value++
    }
}

const decreaseQuantity = () => {
    if (!product.value) return
    const min = minSelectableQuantity.value
    if (quantity.value > min) {
        quantity.value--
    }
}

const addToCart = async () => {
    if (!product.value || product.value.coming_soon || !product.value.in_stock || !canOrder.value || maxAddableQuantity.value <= 0) return

    isAddingToCart.value = true
    addedToCartRecently.value = false

    try {
        const cartItem: CartItem = {
            productId: product.value.id,
            product: product.value,
            quantity: quantity.value,
            price: product.value.price,
            addedAt: new Date()
        }

        const result = await cartStore.addItem(cartItem)

        if (result.status === 'unavailable') {
            await notificationStore.warning(
                t('productDetail.outOfStock'),
                t('productDetail.onlyItemsAvailable', { count: 0 })
            )
            return
        }

        if (result.status === 'partial' || result.status === 'adjusted') {
            await notificationStore.warning(
                t('productDetail.limitedByStock'),
                t('productDetail.onlyItemsAvailable', { count: result.appliedQuantity })
            )
        } else {
            await notificationStore.success(
                t('productDetail.addedToCart'),
                t('cart.items', { count: cartStore.itemCount })
            )
        }

        addedToCartRecently.value = true

        setTimeout(() => {
            addedToCartRecently.value = false
        }, 5000)

        console.log(`✅ Added ${quantity.value} × ${product.value.name} to cart`)

    } catch (error) {
        console.error('Error adding to cart:', error)

        const errorMessage = error instanceof Error ? error.message : t('common.messages.error')
        await notificationStore.error(t('productDetail.addToCart'), errorMessage)

    } finally {
        isAddingToCart.value = false

        if (!product.value) {
            quantity.value = 0
            return
        }

        if (maxAddableQuantity.value <= 0) {
            quantity.value = 0
        } else {
            quantity.value = minSelectableQuantity.value
        }
    }
}

watch(
    () => [product.value ? product.value.id : null, minSelectableQuantity.value, maxAddableQuantity.value],
    () => {
        if (!product.value) {
            quantity.value = 0
            return
        }

        if (maxAddableQuantity.value <= 0) {
            quantity.value = 0
            return
        }

        if (quantity.value === 0) {
            quantity.value = minSelectableQuantity.value
            return
        }

        validateQuantity()
    },
    { immediate: true }
)

onMounted(async () => {
    const productId = route.params.id as string

    if (!productId) {
        router.push('/products')
        return
    }

    try {
        isLoading.value = true
        const fetchedProduct = await productStore.getProductById(productId)

        if (fetchedProduct) {
            product.value = fetchedProduct
            quantity.value = fetchedProduct.min_order_quantity || 1
        } else {
            // Product not found
            product.value = null
        }
    } catch (error) {
        console.error('Error fetching product:', error)
        product.value = null
    } finally {
        isLoading.value = false
    }
})
</script>
