<template>
    <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer h-full flex flex-col"
        role="button" tabindex="0" @click="onCardClick" @keydown.enter="onCardClick">
        <!-- Product Image -->
        <div class="relative bg-secondary-200">
            <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name"
                class="w-full h-64 object-contain bg-white" @error="handleImageError" />
            <div v-else class="w-full h-64 bg-secondary-200 flex items-center justify-center">
                <svg class="w-12 h-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>


        </div>

        <!-- Product Info -->
        <div class="p-4 flex flex-col flex-grow">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-semibold text-secondary-900 line-clamp-2 flex-shrink-0">
                    {{ product.name }}
                </h3>
                <span v-if="!product.inStock"
                    class="bg-danger-100 text-danger-800 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2">
                    {{ $t('products.card.outOfStock') }}
                </span>
            </div>

            <p class="text-secondary-600 text-sm mb-3 line-clamp-2 flex-shrink-0">
                {{ product.description }}
            </p>

            <!-- Pricing -->
            <div class="mb-4 flex-shrink-0">
                <div class="flex items-baseline space-x-2">
                    <span class="text-2xl font-bold text-gray-900">
                        €{{ formatPrice(product.price) }}
                    </span>
                    <span v-if="product.originalPrice && product.originalPrice > product.price"
                        class="text-sm text-gray-500 line-through">
                        €{{ formatPrice(product.originalPrice) }}
                    </span>
                </div>
                <p class="text-sm text-gray-500">
                    {{ product.unit || $t('products.card.perPiece') }}
                </p>
            </div>

            <!-- Product Details -->
            <div class="space-y-1 mb-4 flex-grow">
                <div v-if="product.category" class="flex items-center text-sm text-gray-600">
                    <span class="font-medium">{{ $t('products.card.category') }}:</span>
                    <span class="ml-1">{{ product.category }}</span>
                </div>
                <div v-if="product.shopifyVariantId" class="flex items-center text-sm text-gray-600">
                    <span class="font-medium">{{ $t('products.card.sku') }}:</span>
                    <span class="ml-1">{{ product.shopifyVariantId }}</span>
                </div>
                <div v-if="product.minOrderQuantity" class="flex items-center text-sm text-gray-600">
                    <span class="font-medium">{{ $t('products.card.minOrder') }}:</span>
                    <span class="ml-1">{{ product.minOrderQuantity }} {{ product.unit || $t('products.card.pieces')
                    }}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col space-y-2 mt-auto" @click.stop>
                <!-- Quantity Selector -->
                <div class="flex items-center space-x-2">
                    <label class="text-sm font-medium text-gray-700">{{ $t('products.card.quantity') }}:</label>
                    <div class="flex items-center border rounded-md">
                        <button @click="decreaseQuantity" :disabled="quantity <= (product.minOrderQuantity || 1)"
                            class="px-2 py-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                            -
                        </button>
                        <input v-model.number="quantity" type="number" :min="product.minOrderQuantity || 1"
                            :max="effectiveMaxQuantity"
                            class="w-16 px-2 py-1 text-center border-0 focus:ring-0" @blur="validateQuantity" />
                        <button @click="increaseQuantity" :disabled="quantity >= effectiveMaxQuantity"
                            class="px-2 py-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                            +
                        </button>
                    </div>
                </div>

                <!-- Add to Cart Button -->
                <button @click="addToCart" :disabled="!product.inStock || !canOrder || isLoading || quantity > effectiveMaxQuantity" :class="[
                    !product.inStock || quantity > effectiveMaxQuantity
                        ? 'bg-gray-300 cursor-not-allowed'
                        : !canOrder
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-blue-600 hover:bg-blue-700',
                    'w-full text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center'
                ]">
                    <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none"
                        viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    <span v-if="isLoading">{{ $t('products.card.adding') }}</span>
                    <span v-else-if="!product.inStock">{{ $t('products.card.outOfStock') }}</span>
                    <span v-else-if="quantity > effectiveMaxQuantity">{{ $t('products.card.insufficientStock') }}</span>
                    <span v-else-if="!canOrder">{{ $t('products.card.accountVerificationRequired') }}</span>
                    <span v-else-if="isInCart">{{ $t('products.card.addedToCart') }}</span>
                    <span v-else>{{ $t('products.card.addToCart') }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../../stores/cart'
import type { Product, CartItem } from '../../types'

interface Props {
    product: Product
    canOrder?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    canOrder: false
})

const emit = defineEmits<{
    addToCart: [productId: string, quantity: number]
}>()

const cartStore = useCartStore()

const router = useRouter()

const onCardClick = () => {
    router.push({ name: 'ProductDetail', params: { id: props.product.id } })
}

const quantity = ref(props.product.minOrderQuantity || 1)
const isLoading = ref(false)

// Calculate effective max quantity based on stock and product limits
const effectiveMaxQuantity = computed(() => {
    const stock = props.product.stock ?? 999
    const maxOrder = props.product.maxOrderQuantity || 999
    return Math.min(stock, maxOrder)
})

// Check if product is already in cart
const isInCart = computed(() => cartStore.isInCart(props.product.id))

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const validateQuantity = () => {
    const min = props.product.minOrderQuantity || 1
    
    if (quantity.value < min) quantity.value = min
    if (quantity.value > effectiveMaxQuantity.value) quantity.value = effectiveMaxQuantity.value
}

const increaseQuantity = () => {
    if (quantity.value < effectiveMaxQuantity.value) {
        quantity.value++
    }
}

const decreaseQuantity = () => {
    const min = props.product.minOrderQuantity || 1
    if (quantity.value > min) {
        quantity.value--
    }
}

const addToCart = async () => {
    if (!props.product.inStock || !props.canOrder) return

    isLoading.value = true
    try {
        const cartItem: CartItem = {
            productId: props.product.id,
            product: props.product,
            quantity: quantity.value,
            price: props.product.price,
            addedAt: new Date()
        }

        await cartStore.addItem(cartItem)

        // Emit for backwards compatibility with parent components that might listen
        emit('addToCart', props.product.id, quantity.value)

        // Reset quantity to minimum after a short delay
        setTimeout(() => {
            quantity.value = props.product.minOrderQuantity || 1
        }, 500)
    } catch (error) {
        console.error('Error adding to cart:', error)
    } finally {
        isLoading.value = false
    }
}

const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    target.style.display = 'none'
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>