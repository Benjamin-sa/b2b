<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div
                    class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4">
                </div>
                <p class="text-lg text-gray-600 font-medium">{{ $t('common.loading') }}...</p>
            </div>
        </div>

        <!-- Product Not Found -->
        <div v-else-if="!product" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ $t('productDetail.productNotFound') }}</h2>
                <p class="text-gray-600 mb-6">{{ $t('productDetail.productNotFoundMessage') }}</p>
                <router-link to="/products"
                    class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    {{ $t('productDetail.backToProducts') }}
                </router-link>
            </div>
        </div>

        <!-- Product Details -->
        <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Breadcrumb -->
            <nav class="flex mb-8" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-2">
                    <li>
                        <router-link to="/" class="text-gray-500 hover:text-gray-700">{{ $t('navigation.home')
                            }}</router-link>
                    </li>
                    <li>
                        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                        <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clip-rule="evenodd" />
                        </svg>
                    </li>
                    <li>
                        <span class="text-gray-900 font-medium">{{ product.name }}</span>
                    </li>
                </ol>
            </nav>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Left Column - Images -->
                <div class="space-y-6">
                    <ImageGallery :images="productImages" :alt="product.name" :show-thumbnails="true"
                        :allow-zoom="true" />
                </div>

                <!-- Right Column - Product Info -->
                <div class="space-y-8">
                    <!-- Basic Info -->
                    <div>
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ product.name }}</h1>
                                <div class="flex items-center space-x-4 text-sm text-gray-600">
                                    <span v-if="product.brand" class="font-medium">{{ product.brand }}</span>
                                    <span v-if="product.shopifyVariantId">{{ $t('productDetail.sku', {
                                        sku:
                                            product.shopifyVariantId
                                    }) }}</span>
                                    <span v-if="product.partNumber">{{ $t('productDetail.partNumber', {
                                        partNumber:
                                            product.partNumber
                                    }) }}</span>
                                </div>
                            </div>
                            <div class="flex items-center ml-4">
                                <div v-if="product.comingSoon"
                                    class="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                                    {{ $t('productDetail.comingSoon') }}
                                </div>
                                <div v-else-if="!product.inStock"
                                    class="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                                    {{ $t('productDetail.outOfStock') }}
                                </div>
                                <div v-else-if="product.stock && product.stock < 10"
                                    class="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                                    {{ $t('productDetail.lowStock', { count: product.stock }) }}
                                </div>
                                <div v-else
                                    class="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                                    {{ $t('productDetail.inStock') }}
                                </div>
                            </div>
                        </div>

                        <!-- Price -->
                        <div class="mb-6">
                            <div class="flex items-baseline space-x-3">
                                <span class="text-4xl font-bold text-gray-900">
                                    €{{ formatPrice(product.price) }}
                                </span>
                                <span v-if="product.originalPrice && product.originalPrice > product.price"
                                    class="text-xl text-gray-500 line-through">
                                    €{{ formatPrice(product.originalPrice) }}
                                </span>
                                <span v-if="product.originalPrice && product.originalPrice > product.price"
                                    class="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">
                                    {{ Math.round(((product.originalPrice - product.price) / product.originalPrice) *
                                        100) }}% OFF
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mt-1">{{ $t('productDetail.per', {
                                unit: product.unit ||
                                    $t('productDetail.piece')
                            }) }}</p>
                        </div>

                        <!-- Tags -->
                        <div v-if="product.tags && product.tags.length > 0" class="mb-6">
                            <div class="flex flex-wrap gap-2">
                                <span v-for="tag in product.tags" :key="tag"
                                    class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="mb-8">
                            <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ $t('productDetail.description') }}
                            </h3>
                            <div class="text-gray-700 leading-relaxed html-content"
                                v-html="sanitizeHtml(product.description)"></div>
                        </div>
                    </div>

                    <!-- Purchase Section -->
                    <div class="bg-gray-50 rounded-xl p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ $t('productDetail.purchaseOptions') }}
                        </h3>

                        <!-- Quantity Selector -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('productDetail.quantity')
                            }}</label>
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center border border-gray-300 rounded-lg bg-white shadow-sm">
                                    <button @click="decreaseQuantity"
                                        :disabled="!canAddMore || product.comingSoon || quantity <= inputMinValue"
                                        class="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M20 12H4"></path>
                                        </svg>
                                    </button>
                                    <input v-model.number="quantity" type="number" :min="inputMinValue"
                                        :max="inputMaxValue" :disabled="!canAddMore || product.comingSoon"
                                        class="w-20 px-3 py-3 text-center border-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        @blur="validateQuantity" @input="validateQuantity" />
                                    <button @click="increaseQuantity"
                                        :disabled="!canAddMore || product.comingSoon || quantity >= inputMaxValue"
                                        class="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div class="text-sm text-gray-600">
                                    <div v-if="product.minOrderQuantity">{{ $t('productDetail.min') }} {{
                                        product.minOrderQuantity }} {{ product.unit || $t('productDetail.pieces') }}
                                    </div>
                                    <div v-if="isLimitedByStock">
                                        {{ $t('productDetail.max') }} {{ inputMaxValue }} {{ product.unit ||
                                            $t('productDetail.pieces') }}
                                        <span class="text-red-600">{{ $t('productDetail.limitedByStock') }}</span>
                                    </div>
                                    <div v-else-if="product.maxOrderQuantity">{{ $t('productDetail.max') }} {{
                                        product.maxOrderQuantity }} {{ product.unit || $t('productDetail.pieces') }}
                                    </div>
                                    <div v-if="product.stock" class="text-xs text-gray-500 mt-1">
                                        {{ availableStock }} {{ $t('productDetail.available') }}
                                    </div>
                                </div>
                            </div>
                            <!-- Stock warning -->
                            <div v-if="quantity > availableStock"
                                class="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <p class="text-sm text-red-700 flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clip-rule="evenodd" />
                                    </svg>
                                    {{ $t('productDetail.onlyItemsAvailable', { count: availableStock }) }}
                                </p>
                            </div>
                        </div>


                        <!-- Total Price -->
                        <div class="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                            <div class="flex justify-between items-center">
                                <span class="text-lg font-medium text-gray-900">{{ $t('productDetail.totalPrice')
                                    }}</span>
                                <span class="text-2xl font-bold text-blue-600">€{{ formatPrice(product.price * quantity)
                                }}</span>
                            </div>
                        </div>

                        <!-- Add to Cart Button -->
                        <button @click="addToCart"
                            :disabled="product.comingSoon || !product.inStock || !canOrder || isAddingToCart || !canAddMore"
                            :class="[
                                product.comingSoon || !product.inStock || !canAddMore
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : !canOrder
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : isAddingToCart
                                            ? 'bg-blue-500'
                                            : addedToCartRecently
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-blue-600 hover:bg-blue-700',
                                'w-full text-white py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center transform active:scale-95'
                            ]">
                            <!-- Loading spinner -->
                            <svg v-if="isAddingToCart" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none"
                                viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <!-- Success checkmark -->
                            <svg v-else-if="addedToCartRecently" class="w-5 h-5 mr-2" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7"></path>
                            </svg>
                            <!-- Shopping cart icon -->
                            <svg class="w-5 h-5 text-white-400 mr-3" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
                            </svg>

                            <span v-if="isAddingToCart">{{ $t('productDetail.addingToCart') }}</span>
                            <span v-else-if="product.comingSoon">{{ $t('productDetail.comingSoon') }}</span>
                            <span v-else-if="!product.inStock">{{ $t('productDetail.outOfStock') }}</span>
                            <span v-else-if="!canOrder">{{ $t('productDetail.accountVerificationRequired') }}</span>
                            <span v-else-if="!canAddMore">{{ $t('productDetail.onlyItemsAvailable', { count: 0 })
                            }}</span>
                            <span v-else-if="addedToCartRecently">{{ $t('productDetail.addedToCart') }}</span>
                            <span v-else>{{ $t('productDetail.addToCart') }}</span>
                        </button>

                        <!-- Quick Actions -->
                        <div v-if="addedToCartRecently" class="mt-4 grid grid-cols-2 gap-3">
                            <router-link to="/products"
                                class="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7"></path>
                                </svg>
                                {{ $t('productDetail.continueShopping') }}
                            </router-link>
                            <router-link to="/checkout"
                                class="flex items-center justify-center px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                                {{ $t('productDetail.viewCart') }}
                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
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
    if (product.value.imageUrl) {
        images.push(product.value.imageUrl)
    }
    if (product.value.images && product.value.images.length > 0) {
        images.push(...product.value.images.filter(img => img !== product.value!.imageUrl))
    }

    return images
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const minOrder = computed(() => product.value?.minOrderQuantity || 1)

const rawRemainingCapacity = computed(() => {
    if (!product.value) return 0
    return cartStore.getRemainingQuantity(product.value)
})

const maxAddableQuantity = computed(() => {
    if (!product.value) return 0
    const remaining = rawRemainingCapacity.value
    if (!Number.isFinite(remaining)) {
        return product.value.maxOrderQuantity || 999
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
    const maxOrderLimit = product.value.maxOrderQuantity || 999
    return remaining < maxOrderLimit
})

const canAddMore = computed(() => {
    return !!product.value && !product.value.comingSoon && product.value.inStock && maxAddableQuantity.value > 0
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
    if (!product.value || product.value.comingSoon || !product.value.inStock || !canOrder.value || maxAddableQuantity.value <= 0) return

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
            quantity.value = fetchedProduct.minOrderQuantity || 1
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
