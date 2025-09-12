<template>
    <!-- Cart Drawer with Transition -->
    <Teleport to="body">
        <Transition name="drawer" appear>
            <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden" @click="closeDrawer">
                <!-- Background overlay -->
                <div class="drawer-content absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
                    style="box-shadow: -20px 0 50px rgba(0,0,0,0.50);"></div>

                <!-- Drawer panel -->
                <div class="drawer-content absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
                    @click.stop>
                    <!-- Header -->
                    <div class="flex items-center justify-between p-4 border-b border-gray-200">
                        <h2 class="text-lg font-medium text-gray-900">
                            {{ $t('cart.shoppingCart') }}
                            <span v-if="cartStore.itemCount > 0" class="text-sm text-gray-500 ml-2">
                                {{ $t('cart.itemCount', { count: cartStore.itemCount }) }}
                            </span>
                        </h2>
                        <button @click="closeDrawer"
                            class="p-2 -m-2 text-gray-400 hover:text-gray-600 transition-smooth">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- Cart content -->
                    <div class="flex flex-col h-full">
                        <!-- Empty state -->
                        <Transition name="fade" mode="out-in">
                            <div v-if="cartStore.itemCount === 0" key="empty"
                                class="flex-1 flex flex-col items-center justify-center p-8">
                                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m0 0l1.5-6M7 13h10" />
                                </svg>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">{{ $t('cart.emptyTitle') }}</h3>
                                <p class="text-gray-500 text-center mb-6">
                                    {{ $t('cart.emptyMessage') }}
                                </p>
                                <button @click="goToProducts"
                                    class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 btn-animate transition-smooth">
                                    {{ $t('cart.browseProducts') }}
                                </button>
                            </div>

                            <!-- Cart items -->
                            <div v-else key="items" class="flex-1 flex flex-col">
                                <!-- Items list -->
                                <div class="flex-1 overflow-y-auto p-4">
                                    <div class="space-y-0">
                                        <TransitionGroup name="cart-item" tag="div">
                                            <CartItem v-for="item in cartStore.items" :key="item.productId" :item="item"
                                                @update-quantity="updateQuantity" @remove-item="removeItem" />
                                        </TransitionGroup>
                                    </div>
                                </div>

                                <!-- Summary section (sticky at bottom) -->
                                <div class="border-t border-gray-200 p-4 bg-white">
                                    <CartSummary @close="closeDrawer" />
                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../../stores/cart'
import CartItem from './CartItem.vue'
import CartSummary from './CartSummary.vue'

interface Props {
    isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
}>()

const cartStore = useCartStore()
const router = useRouter()

// Watch for escape key
watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        // Prevent body scroll when drawer is open
        document.body.style.overflow = 'hidden'
    } else {
        document.removeEventListener('keydown', handleEscape)
        // Restore body scroll
        document.body.style.overflow = ''
    }
})

const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        closeDrawer()
    }
}

const closeDrawer = () => {
    emit('close')
}

const updateQuantity = async (productId: string, quantity: number) => {
    try {
        cartStore.updateQuantity(productId, quantity)
    } catch (error) {
        console.error('Error updating quantity:', error)
        // Could show toast notification here
    }
}

const removeItem = async (productId: string) => {
    try {
        cartStore.removeItem(productId)
    } catch (error) {
        console.error('Error removing item:', error)
        // Could show toast notification here
    }
}

const goToProducts = () => {
    closeDrawer()
    router.push('/products')
}

// Cleanup on unmount
const cleanup = () => {
    document.removeEventListener('keydown', handleEscape)
    document.body.style.overflow = ''
}

// Vue 3 composition API cleanup
onUnmounted(cleanup)
</script>

<style scoped>
/* Ensure smooth transitions */
.transition-transform {
    transition-property: transform;
}

.transition-opacity {
    transition-property: opacity;
}

/* Custom scrollbar for cart items */
.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}
</style>