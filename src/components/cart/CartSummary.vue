<template>
    <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>

        <!-- Summary Lines -->
        <div class="space-y-2">
            <!-- Item Count -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">
                    Items ({{ itemCount }})
                </span>
                <span class="text-gray-900">
                    €{{ formatPrice(subtotal) }}
                </span>
            </div>

            <!-- Shipping (Free for B2B) -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Shipping</span>
                <span class="text-green-600 font-medium">Free</span>
            </div>

            <!-- Tax -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">VAT (21%)</span>
                <span class="text-gray-900">
                    €{{ formatPrice(tax) }}
                </span>
            </div>

            <!-- Divider -->
            <hr class="border-gray-200">

            <!-- Total -->
            <div class="flex justify-between text-base font-medium">
                <span class="text-gray-900">Total</span>
                <span class="text-gray-900">
                    €{{ formatPrice(grandTotal) }}
                </span>
            </div>

            <!-- VAT Info -->
            <p class="text-xs text-gray-500 mt-2">
                VAT will be shown on your invoice. Prices exclude VAT.
            </p>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 space-y-3">
            <!-- Checkout Button -->
            <button @click="proceedToCheckout" :disabled="itemCount === 0 || isLoading"
                class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center">
                <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none"
                    viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                <span v-if="isLoading">Processing...</span>
                <span v-else>Proceed to Checkout</span>
            </button>

            <!-- Continue Shopping -->
            <button @click="continueShopping"
                class="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200">
                Continue Shopping
            </button>

            <!-- Clear Cart -->
            <button v-if="itemCount > 0" @click="clearCart" :disabled="isLoading"
                class="w-full text-red-600 hover:text-red-800 text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                Clear Cart
            </button>
        </div>

        <!-- Minimum Order Info -->
        <div v-if="hasMinimumOrderItems" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div class="flex">
                <svg class="flex-shrink-0 w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd" />
                </svg>
                <div class="ml-3">
                    <h4 class="text-sm font-medium text-yellow-800">
                        Minimum Order Requirements
                    </h4>
                    <p class="text-sm text-yellow-700 mt-1">
                        Some items have minimum order quantities. Please check individual items.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCartStore } from '../../stores/cart'
import { useRouter } from 'vue-router'

const emit = defineEmits<{
    close: []
}>()

const cartStore = useCartStore()
const router = useRouter()
const isLoading = ref(false)

// Computed properties from cart store
const itemCount = computed(() => cartStore.itemCount)
const subtotal = computed(() => cartStore.subtotal)
const tax = computed(() => cartStore.tax)
const grandTotal = computed(() => cartStore.grandTotal)

// Check if any items have minimum order quantities
const hasMinimumOrderItems = computed(() => {
    return cartStore.items.some(item =>
        item.product.minOrderQuantity && item.product.minOrderQuantity > 1
    )
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const proceedToCheckout = async () => {
    if (itemCount.value === 0) return

    isLoading.value = true
    try {
        // For now, just close the cart and navigate to products
        // In a real app, this would navigate to checkout
        emit('close')
        await router.push('/checkout') // This route would need to be created
    } catch (error) {
        console.error('Checkout error:', error)
        // Could show a toast notification here
    } finally {
        isLoading.value = false
    }
}

const continueShopping = () => {
    emit('close')
    router.push('/products')
}

const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
        cartStore.clearCart()
    }
}
</script>