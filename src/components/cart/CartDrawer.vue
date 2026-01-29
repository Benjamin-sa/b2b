<template>
  <!-- Cart Drawer with Transition -->
  <Teleport to="body">
    <Transition name="drawer" appear>
      <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden" @click="closeDrawer">
        <!-- Background overlay -->
        <div class="drawer-content absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
          style="box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5)"></div>

        <!-- Drawer panel -->
        <div class="drawer-content absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl" @click.stop>
          <!-- Header -->
          <div
            class="flex items-center justify-between p-4 sm:p-5 border-b-2 border-primary-100 bg-gradient-to-r from-primary-50 to-white">
            <h2 class="text-base sm:text-lg font-bold text-gray-900">
              {{ $t('cart.shoppingCart') }}
              <span v-if="cartStore.item_count > 0" class="text-xs sm:text-sm text-primary-600 ml-2 font-medium">
                {{ $t('cart.itemCount', { count: cartStore.item_count }) }}
              </span>
            </h2>
            <button class="p-2 -m-2 text-gray-400 hover:text-primary-600 transition-colors duration-200"
              @click="closeDrawer">
              >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Cart content with proper height constraints -->
          <div class="flex flex-col overflow-hidden" style="height: calc(100% - 73px)">
            <!-- Empty state -->
            <Transition name="fade" mode="out-in">
              <div v-if="cartStore.item_count === 0" key="empty"
                class="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
                <svg class="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mb-4" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m0 0l1.5-6M7 13h10" />
                </svg>
                <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  {{ $t('cart.emptyTitle') }}
                </h3>
                <p class="text-sm sm:text-base text-gray-500 text-center mb-6">
                  {{ $t('cart.emptyMessage') }}
                </p>
                <button
                  class="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base font-medium"
                  @click="goToProducts">
                  >
                  {{ $t('cart.browseProducts') }}
                </button>
              </div>

              <!-- Cart items with scrollable list -->
              <div v-else key="items" class="flex flex-col h-full overflow-hidden">
                <!-- Items list (scrollable area) -->
                <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 min-h-0">
                  <div class="space-y-0">
                    <TransitionGroup name="cart-item" tag="div">
                      <CartItem v-for="item in cartStore.items" :key="item.product_id" :item="item"
                        @update-quantity="updateQuantity" @remove-item="removeItem" />
                    </TransitionGroup>
                  </div>
                </div>

                <!-- Summary section (always visible at bottom) -->
                <div
                  class="flex-shrink-0 border-t-2 border-primary-100 p-3 sm:p-4 bg-gradient-to-r from-primary-50/50 to-white">
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
import { watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../../stores/cart';
import CartItem from './CartItem.vue';
import CartSummary from './CartSummary.vue';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const cartStore = useCartStore();
const router = useRouter();

// Watch for escape key
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleEscape);
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }
);

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDrawer();
  }
};

const closeDrawer = () => {
  emit('close');
};

const updateQuantity = async (productId: string, quantity: number) => {
  try {
    cartStore.updateQuantity(productId, quantity);
  } catch (error) {
    console.error('Error updating quantity:', error);
    // Could show toast notification here
  }
};

const removeItem = async (productId: string) => {
  try {
    cartStore.removeItem(productId);
  } catch (error) {
    console.error('Error removing item:', error);
    // Could show toast notification here
  }
};

const goToProducts = () => {
  closeDrawer();
  router.push('/products');
};

// Cleanup on unmount
const cleanup = () => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
};

// Vue 3 composition API cleanup
onUnmounted(cleanup);
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
