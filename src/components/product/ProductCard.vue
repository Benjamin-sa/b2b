<template>
  <div
    class="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-100 transform hover:-translate-y-1"
  >
    <RouterLink
      :to="{ name: 'ProductDetail', params: { id: product.id } }"
      class="flex flex-col flex-grow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <!-- Product Image -->
      <div class="relative bg-secondary-200">
        <img
          v-if="product.image_url"
          :src="product.image_url"
          :alt="product.name"
          class="w-full h-64 object-contain bg-white"
          @error="handleImageError"
        />
        <div v-else class="w-full h-64 bg-secondary-200 flex items-center justify-center">
          <svg
            class="w-12 h-12 text-secondary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      <!-- Product Info -->
      <div class="p-4 flex flex-col flex-grow">
        <div class="flex flex-col space-y-2 mb-2">
          <!-- Title with tooltip for full text -->
          <h3
            class="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors cursor-help group relative"
            :title="product.name"
          >
            {{ product.name }}
            <!-- Tooltip on hover for long titles -->
            <span
              class="invisible group-hover:visible absolute left-0 top-full mt-1 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-xl"
            >
              {{ product.name }}
            </span>
          </h3>

          <!-- Badges stacked below title -->
          <div v-if="product.coming_soon || !product.in_stock" class="flex">
            <span
              v-if="product.coming_soon"
              class="bg-warning-100 text-warning-800 border border-warning-200 text-xs font-bold px-2.5 py-1 rounded-full"
            >
              {{ $t('products.card.comingSoon') }}
            </span>
            <span
              v-else-if="product.in_stock == 0"
              class="bg-danger-100 text-danger-800 border border-danger-200 text-xs font-bold px-2.5 py-1 rounded-full"
            >
              {{ $t('products.card.outOfStock') }}
            </span>
          </div>
        </div>

        <p
          class="text-gray-600 text-sm mb-3 line-clamp-2 flex-shrink-0 html-content"
          v-html="truncateHtml(product.description || '', 100)"
        ></p>

        <!-- Pricing -->
        <div class="mb-4 flex-shrink-0">
          <div class="flex items-baseline space-x-2">
            <span class="text-2xl font-bold text-primary-700">
              €{{ formatPrice(product.price) }}
            </span>
            <span
              v-if="product.original_price && product.original_price > product.price"
              class="text-sm text-gray-500 line-through"
            >
              €{{ formatPrice(product.original_price) }}
            </span>
          </div>
          <p class="text-sm text-gray-600 font-medium mt-1">
            {{ product.unit || $t('products.card.perPiece') }}
          </p>
        </div>

        <!-- Product Details -->
        <div class="space-y-1 mb-4 flex-grow">
          <div v-if="categoryName" class="flex items-center text-sm text-gray-600">
            <span class="font-medium">{{ $t('products.card.category') }}:</span>
            <span class="ml-1">{{ categoryName }}</span>
          </div>
          <div v-if="product.b2b_sku" class="flex items-center text-sm text-gray-600">
            <span class="font-medium">{{ $t('products.card.sku') }}:</span>
            <span class="ml-1 font-mono text-primary-700">{{ product.b2b_sku }}</span>
          </div>
          <div v-if="product.barcode" class="flex items-center text-sm text-gray-600">
            <span class="font-medium">{{ $t('products.card.barcode') }}:</span>
            <span class="ml-1 font-mono text-gray-800">{{ product.barcode }}</span>
          </div>
          <div v-if="product.min_order_quantity" class="flex items-center text-sm text-gray-600">
            <span class="font-medium">{{ $t('products.card.minOrder') }}:</span>
            <span class="ml-1"
              >{{ product.min_order_quantity }}
              {{ product.unit || $t('products.card.pieces') }}</span
            >
          </div>
        </div>
      </div>
    </RouterLink>

    <!-- Actions -->
    <div class="px-4 pb-4 pt-0 flex flex-col space-y-2">
      <!-- Quantity Selector -->
      <div
        class="flex items-center justify-between space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200"
      >
        <label class="text-sm font-semibold text-gray-700"
          >{{ $t('products.card.quantity') }}:</label
        >
        <div
          class="flex items-center border-2 border-primary-200 rounded-lg bg-white overflow-hidden"
        >
          <button
            :disabled="quantity <= minSelectableQuantity || product.coming_soon === 1"
            class="px-3 py-2 text-primary-600 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
            @click="decreaseQuantity"
          >
            -
          </button>
          <input
            v-model.number="quantity"
            type="number"
            :min="minInputValue"
            :max="maxInputValue"
            :disabled="maxAddableQuantity <= 0 || product.coming_soon === 1"
            class="w-14 px-2 py-2 text-center border-0 focus:ring-0 font-bold text-gray-900"
            @blur="validateQuantity"
          />
          <button
            :disabled="quantity >= maxAddableQuantity || product.coming_soon === 1"
            class="px-3 py-2 text-primary-600 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
            @click="increaseQuantity"
          >
            +
          </button>
        </div>
      </div>

      <!-- Add to Cart Button -->
      <button
        :disabled="
          product.coming_soon === 1 ||
          product.in_stock === 0 ||
          isLoading ||
          maxAddableQuantity <= 0
        "
        :class="[
          product.coming_soon === 1 || product.in_stock === 0 || maxAddableQuantity <= 0
            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
            : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transform hover:scale-105 shadow-md hover:shadow-lg',
          'w-full text-white py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center font-semibold',
        ]"
        @click="addToCart"
      >
        <svg
          v-if="isLoading"
          class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
        <span v-if="isLoading">{{ $t('products.card.adding') }}</span>
        <span v-else-if="product.coming_soon">{{ $t('products.card.comingSoon') }}</span>
        <span v-else-if="!product.in_stock">{{ $t('products.card.outOfStock') }}</span>
        <span v-else-if="maxAddableQuantity <= 0">{{ $t('products.card.outOfStock') }}</span>
        <span v-else-if="isInCart">{{ $t('products.card.addedToCart') }}</span>
        <span v-else>{{ $t('products.card.addToCart') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCartStore } from '../../stores/cart';
import { useCategoryStore } from '../../stores/categories';
import { useNotificationStore } from '../../stores/notifications';
import { truncateHtml } from '../../utils/htmlUtils';
import type { Product, CartItem } from '../../types';

interface Props {
  product: Product;
  canOrder?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canOrder: false,
});

const emit = defineEmits<{
  addToCart: [product_id: string, quantity: number];
}>();

const cartStore = useCartStore();
const categoryStore = useCategoryStore();
const notificationStore = useNotificationStore();
const { t } = useI18n();

const minOrder = computed(() => props.product.min_order_quantity || 1);

// Get category name from category_id
const categoryName = computed(() => {
  if (!props.product.category_id) return null;
  const category = categoryStore.categories.find((cat) => cat.id === props.product.category_id);
  return category?.name || props.product.category_id;
});

const remainingCapacity = computed(() => cartStore.getRemainingQuantity(props.product));

const maxAddableQuantity = computed(() => {
  const remaining = remainingCapacity.value;
  if (!Number.isFinite(remaining)) {
    return props.product.max_order_quantity || 999;
  }
  return remaining;
});

const minSelectableQuantity = computed(() => {
  const max = maxAddableQuantity.value;
  if (max <= 0) return 0;
  return Math.min(minOrder.value, max);
});

const maxInputValue = computed(() => {
  const max = maxAddableQuantity.value;
  return Number.isFinite(max) ? max : props.product.max_order_quantity || 999;
});

const minInputValue = computed(() => {
  if (maxAddableQuantity.value <= 0) return 0;
  return minSelectableQuantity.value;
});

const quantity = ref(0);
const isLoading = ref(false);

// Check if product is already in cart
const isInCart = computed(() => cartStore.isInCart(props.product.id));

const formatPrice = (price: number) => {
  return price.toFixed(2);
};

const validateQuantity = () => {
  const max = maxAddableQuantity.value;
  if (max <= 0) {
    quantity.value = 0;
    return;
  }

  const min = minSelectableQuantity.value;
  const clamped = Math.min(Math.max(quantity.value, min), max);
  quantity.value = clamped;
};

const increaseQuantity = () => {
  const max = maxAddableQuantity.value;
  if (max <= 0) return;
  if (quantity.value < max) {
    quantity.value++;
  }
};

const decreaseQuantity = () => {
  const min = minSelectableQuantity.value;
  if (quantity.value > min) {
    quantity.value--;
  }
};

const addToCart = async () => {
  if (!props.product.in_stock || props.product.coming_soon || maxAddableQuantity.value <= 0) return;

  isLoading.value = true;
  try {
    const cartItem: CartItem = {
      productId: props.product.id,
      product: props.product,
      quantity: quantity.value,
      price: props.product.price,
      addedAt: new Date(),
    };

    const result = await cartStore.addItem(cartItem);

    if (result.status === 'unavailable') {
      await notificationStore.warning(
        t('productDetail.outOfStock'),
        t('productDetail.onlyItemsAvailable', { count: 0 })
      );
      return;
    }

    if (result.status === 'partial' || result.status === 'adjusted') {
      await notificationStore.warning(
        t('productDetail.limitedByStock'),
        t('productDetail.onlyItemsAvailable', { count: result.appliedQuantity })
      );
    } else {
      await notificationStore.success(
        t('productDetail.addedToCart'),
        t('cart.items', { count: cartStore.itemCount })
      );
    }

    // Emit for backwards compatibility with parent components that might listen
    emit('addToCart', props.product.id, result.appliedQuantity);

    // Reset quantity to minimum after a short delay
    setTimeout(() => {
      if (maxAddableQuantity.value <= 0) {
        quantity.value = 0;
      } else {
        quantity.value = minSelectableQuantity.value;
      }
    }, 500);
  } catch (error) {
    console.error('Error adding to cart:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
};

watch(
  () => [props.product, minSelectableQuantity.value, maxAddableQuantity.value],
  () => {
    if (maxAddableQuantity.value <= 0) {
      quantity.value = 0;
      return;
    }

    if (quantity.value === 0) {
      quantity.value = minSelectableQuantity.value;
      return;
    }

    validateQuantity();
  },
  { immediate: true }
);
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
