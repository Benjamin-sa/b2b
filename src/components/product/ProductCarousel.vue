<template>
    <div class="relative overflow-hidden">
        <!-- Header -->
        <div class="flex justify-center items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900 text-center w-full">{{ title }}</h2>
            <div class="flex items-center space-x-2">
                <!-- Navigation buttons -->
                <button @click="scrollLeft" :disabled="!canScrollLeft"
                    class="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="canScrollLeft ? 'text-primary-600 hover:text-primary-700' : 'text-gray-400'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button @click="scrollRight" :disabled="!canScrollRight"
                    class="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="canScrollRight ? 'text-primary-600 hover:text-primary-700' : 'text-gray-400'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8">
            <p class="text-red-600 mb-4">{{ error }}</p>
            <button @click="loadProducts" class="btn-primary">
                {{ $t('productCarousel.tryAgain') }}
            </button>
        </div>

        <!-- Empty state -->
        <div v-else-if="products.length === 0" class="text-center py-8 text-gray-500">
            <p>{{ $t('productCarousel.noProducts') }}</p>
        </div>

        <!-- Products carousel -->
        <div v-else class="relative">
            <div ref="carouselContainer" class="flex overflow-x-auto scrollbar-hide space-x-4 pb-4"
                style="scroll-behavior: smooth;" @scroll="updateScrollState">
                <div v-for="product in products" :key="product.id" class="flex-none w-80 lg:w-72">
                    <ProductCard :product="product" @add-to-cart="handleAddToCart" />
                </div>
            </div>

            <!-- Gradient overlays for visual scroll indication -->
            <div v-if="canScrollLeft"
                class="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10">
            </div>
            <div v-if="canScrollRight"
                class="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10">
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import ProductCard from './ProductCard.vue'
import { useProductStore } from '../../stores/products'
import type { Product, ProductFilter } from '../../types/product'

interface Props {
    title: string
    filters?: ProductFilter
    viewAllLink: string
    canOrder?: boolean
    comingSoonOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    canOrder: false,
    comingSoonOnly: false
})

const productStore = useProductStore()
const carouselContainer = ref<HTMLElement>()

// State
const products = ref<Product[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Load products
const loadProducts = async () => {
    loading.value = true
    error.value = null

    try {
        // Create filters with default limit
        const filters: ProductFilter = {
            ...props.filters,
            limit: 8, // Show 8 products in carousel
            sort_by: 'created_at', // Sort by newest first
            sort_order: 'desc'
        }

        // Add comingSoon filter if specified
        if (props.comingSoonOnly) {
            filters.coming_soon = true
        }

        await productStore.fetchProducts(filters)
        products.value = [...productStore.products]
    } catch (err) {
        console.error('Error loading carousel products:', err)
        error.value = 'Failed to load products'
    } finally {
        loading.value = false

        // Update scroll state after products are loaded
        await nextTick()
        updateScrollState()
    }
}

// Scroll functions
const scrollLeft = () => {
    if (carouselContainer.value) {
        carouselContainer.value.scrollBy({ left: -320, behavior: 'smooth' })
    }
}

const scrollRight = () => {
    if (carouselContainer.value) {
        carouselContainer.value.scrollBy({ left: 320, behavior: 'smooth' })
    }
}

// Update scroll button states
const updateScrollState = () => {
    if (!carouselContainer.value) return

    const container = carouselContainer.value
    canScrollLeft.value = container.scrollLeft > 0
    canScrollRight.value = container.scrollLeft < (container.scrollWidth - container.clientWidth - 10)
}

// Handle add to cart from product card
const handleAddToCart = (productId: string, quantity: number) => {
    // This is handled by the ProductCard component itself
    console.log(`Added product ${productId} with quantity ${quantity} to cart`)
}

onMounted(() => {
    loadProducts()
})
</script>

<style scoped>
/* Hide scrollbar while maintaining scroll functionality */
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

/* Ensure smooth scrolling on iOS */
.scrollbar-hide {
    -webkit-overflow-scrolling: touch;
}
</style>
