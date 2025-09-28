<template>
    <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">{{ $t('cart.summaryTitle') }}</h3>

        <!-- Summary Lines -->
        <div class="space-y-2">
            <!-- Item Count -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">
                    {{ $t('cart.items', { count: itemCount }) }}
                </span>
                <span class="text-gray-900">
                    €{{ formatPrice(subtotal) }}
                </span>
            </div>

            <!-- Shipping (Free for B2B) -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">{{ $t('cart.shipping') }}</span>
                <span :class="shippingCost === 0 ? 'text-green-600 font-medium' : 'text-gray-900'">
                    <template v-if="shippingCost === 0">
                        {{ $t('cart.free') }}
                    </template>
                    <template v-else>
                        €{{ formatPrice(shippingCost) }}
                    </template>
                </span>
            </div>

            <!-- Tax -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">{{ $t('cart.vat') }}</span>
                <span class="text-gray-900">
                    €{{ formatPrice(tax) }}
                </span>
            </div>

            <!-- Divider -->
            <hr class="border-gray-200">

            <!-- Total -->
            <div class="flex justify-between text-base font-medium">
                <span class="text-gray-900">{{ $t('cart.total') }}</span>
                <span class="text-gray-900">
                    €{{ formatPrice(grandTotal) }}
                </span>
            </div>

            <!-- VAT Info -->
            <p class="text-xs text-gray-500 mt-2">
                {{ $t('cart.vatInfo') }}
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
                <span v-if="isLoading">{{ $t('cart.processing') }}</span>
                <span v-else>{{ $t('cart.checkout') }}</span>
            </button>

            <!-- Continue Shopping -->
            <button @click="continueShopping"
                class="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200">
                {{ $t('cart.continueShopping') }}
            </button>

            <!-- Clear Cart -->
            <button v-if="itemCount > 0" @click="clearCart" :disabled="isLoading"
                class="w-full text-red-600 hover:text-red-800 text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ $t('cart.clearCart') }}
            </button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCartStore } from '../../stores/cart'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
    close: []
}>()

const cartStore = useCartStore()
const router = useRouter()
const isLoading = ref(false)

// Computed properties from cart store
const itemCount = computed(() => cartStore.itemCount)
const subtotal = computed(() => cartStore.subtotal)
const shippingCost = computed(() => cartStore.shippingCost)
const tax = computed(() => cartStore.tax)
const grandTotal = computed(() => cartStore.grandTotal)


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
    if (confirm(t('cart.clearCartConfirm'))) {
        cartStore.clearCart()
    }
}
</script>