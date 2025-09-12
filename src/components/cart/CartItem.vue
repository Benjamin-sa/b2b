<template>
    <div class="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
        <!-- Product Image -->
        <div class="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-md overflow-hidden">
            <img v-if="item.product.imageUrl" :src="item.product.imageUrl" :alt="item.product.name"
                class="w-full h-full object-cover" @error="handleImageError" />
            <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        </div>

        <!-- Product Details -->
        <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-gray-900 truncate">
                {{ item.product.name }}
            </h4>
            <p class="text-sm text-gray-500 truncate">
                {{ item.product.category }}
            </p>
            <p v-if="item.product.sku" class="text-xs text-gray-400">
                {{ $t('cart.sku', { sku: item.product.sku }) }}
            </p>
            <div class="mt-1">
                <span class="text-sm font-medium text-gray-900">
                    €{{ formatPrice(item.price) }}
                </span>
                <span class="text-xs text-gray-500 ml-1">
                    {{ $t('cart.perPiece', { unit: item.product.unit || 'piece' }) }}
                </span>
            </div>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center space-x-2">
            <div class="flex items-center border rounded-md">
                <button @click="decreaseQuantity"
                    :disabled="quantity <= (item.product.minOrderQuantity || 1) || isUpdating"
                    class="px-2 py-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                    -
                </button>
                <input v-model.number="quantity" type="number" :min="item.product.minOrderQuantity || 1"
                    :max="item.product.maxOrderQuantity || 999"
                    class="w-12 px-1 py-1 text-center border-0 text-sm focus:ring-0" @blur="validateAndUpdate"
                    @keyup.enter="validateAndUpdate" :disabled="isUpdating" />
                <button @click="increaseQuantity"
                    :disabled="quantity >= (item.product.maxOrderQuantity || 999) || isUpdating"
                    class="px-2 py-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                    +
                </button>
            </div>
        </div>

        <!-- Line Total & Remove -->
        <div class="flex flex-col items-end space-y-2">
            <div class="text-sm font-medium text-gray-900">
                €{{ formatPrice(item.price * item.quantity) }}
            </div>
            <button @click="removeItem" :disabled="isUpdating"
                class="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <!-- Loading Overlay -->
        <div v-if="isUpdating" class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <svg class="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CartItem } from '../../types'

interface Props {
    item: CartItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    updateQuantity: [productId: string, quantity: number]
    removeItem: [productId: string]
}>()

const quantity = ref(props.item.quantity)
const isUpdating = ref(false)

// Watch for external quantity changes
watch(() => props.item.quantity, (newQuantity) => {
    quantity.value = newQuantity
})

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const validateQuantity = () => {
    const min = props.item.product.minOrderQuantity || 1
    const max = props.item.product.maxOrderQuantity || 999

    if (quantity.value < min) quantity.value = min
    if (quantity.value > max) quantity.value = max
}

const validateAndUpdate = async () => {
    validateQuantity()

    if (quantity.value !== props.item.quantity) {
        isUpdating.value = true
        try {
            emit('updateQuantity', props.item.productId, quantity.value)
            // Small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 200))
        } finally {
            isUpdating.value = false
        }
    }
}

const increaseQuantity = async () => {
    const max = props.item.product.maxOrderQuantity || 999
    if (quantity.value < max) {
        quantity.value++
        await validateAndUpdate()
    }
}

const decreaseQuantity = async () => {
    const min = props.item.product.minOrderQuantity || 1
    if (quantity.value > min) {
        quantity.value--
        await validateAndUpdate()
    }
}

const removeItem = async () => {
    isUpdating.value = true
    try {
        emit('removeItem', props.item.productId)
        await new Promise(resolve => setTimeout(resolve, 200))
    } finally {
        isUpdating.value = false
    }
}

const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    target.style.display = 'none'
}
</script>

<style scoped>
.relative {
    position: relative;
}
</style>