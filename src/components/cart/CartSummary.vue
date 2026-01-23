<template>
  <div
    class="bg-gradient-to-br from-gray-50 to-primary-50/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-primary-100"
  >
    <h3 class="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
      {{ $t('cart.summaryTitle') }}
    </h3>

    <!-- Summary Lines -->
    <div class="space-y-2">
      <!-- Item Count -->
      <div class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">
          {{ $t('cart.items', { count: itemCount }) }}
        </span>
        <span class="text-gray-900 font-medium"> €{{ formatPrice(subtotal) }} </span>
      </div>

      <!-- Shipping -->
      <div class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">{{ $t('cart.shipping') }}</span>
        <span
          :class="shippingCost === 0 ? 'text-success-600 font-bold' : 'text-gray-900 font-medium'"
        >
          <template v-if="shippingCost === 0">
            {{ $t('cart.free') }}
          </template>
          <template v-else> €{{ formatPrice(shippingCost) }} </template>
        </span>
      </div>

      <!-- Tax (only for Belgian customers) -->
      <div v-if="shouldShowVAT" class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">{{ $t('cart.vat') }}</span>
        <span class="text-gray-900 font-medium"> €{{ formatPrice(tax) }} </span>
      </div>

      <!-- Divider -->
      <hr class="border-primary-200" />

      <!-- Total -->
      <div class="flex justify-between text-sm sm:text-base font-bold pt-1">
        <span class="text-gray-900">{{ $t('cart.total') }}</span>
        <span class="text-primary-700"> €{{ formatPrice(grandTotal) }} </span>
      </div>

      <!-- VAT Info (only for Belgian customers) -->
      <p v-if="shouldShowVAT" class="text-xs text-gray-500 mt-2">
        {{ $t('cart.vatInfo') }}
      </p>
      <!-- VAT Exempt notice (for non-Belgian customers) -->
      <p v-else class="text-xs text-success-600 mt-2 font-medium">
        {{ $t('cart.vatExempt') || 'VAT exempt (Intra-EU B2B delivery)' }}
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
      <!-- Checkout Button -->
      <button
        :disabled="itemCount === 0 || isLoading"
        class="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none text-sm sm:text-base font-bold"
        @click="proceedToCheckout"
      >
        <svg
          v-if="isLoading"
          class="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span v-if="isLoading">{{ $t('cart.processing') }}</span>
        <span v-else>{{ $t('cart.checkout') }}</span>
      </button>

      <!-- Continue Shopping -->
      <button
        class="w-full bg-white border border-primary-200 text-primary-700 py-2 px-4 rounded-lg sm:rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-colors duration-200 text-sm sm:text-base font-medium"
        @click="continueShopping"
      >
        >
        {{ $t('cart.continueShopping') }}
      </button>

      <!-- Clear Cart -->
      <button
        v-if="itemCount > 0"
        :disabled="isLoading"
        class="w-full text-danger-600 hover:text-danger-800 text-xs sm:text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="clearCart"
      >
        {{ $t('cart.clearCart') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCartStore } from '../../stores/cart';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits<{
  close: [];
}>();

const cartStore = useCartStore();
const router = useRouter();
const isLoading = ref(false);

// Computed properties from cart store
const itemCount = computed(() => cartStore.itemCount);
const subtotal = computed(() => cartStore.subtotal);
const shippingCost = computed(() => cartStore.shippingCost);
const tax = computed(() => cartStore.tax);
const grandTotal = computed(() => cartStore.grandTotal);
const shouldShowVAT = computed(() => cartStore.shouldShowVAT);

const formatPrice = (price: number) => {
  return price.toFixed(2);
};

const proceedToCheckout = async () => {
  if (itemCount.value === 0) return;

  isLoading.value = true;
  try {
    // For now, just close the cart and navigate to products
    // In a real app, this would navigate to checkout
    emit('close');
    await router.push('/checkout'); // This route would need to be created
  } catch (error) {
    console.error('Checkout error:', error);
    // Could show a toast notification here
  } finally {
    isLoading.value = false;
  }
};

const continueShopping = () => {
  emit('close');
  router.push('/products');
};

const clearCart = () => {
  if (confirm(t('cart.clearCartConfirm'))) {
    cartStore.clearCart();
  }
};
</script>
