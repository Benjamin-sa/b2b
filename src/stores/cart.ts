import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { CartItem, Product } from '../types';
import { useAuthStore } from './auth';

// LocalStorage key for cart persistence
const CART_STORAGE_KEY = 'b2b_cart_items';

type CartMutationStatus = 'added' | 'partial' | 'unavailable' | 'adjusted' | 'updated' | 'removed';

export interface CartMutationResult {
  status: CartMutationStatus;
  requestedQuantity: number;
  appliedQuantity: number;
  totalQuantity: number;
  remainingQuantity: number;
  limit: number;
}

// Load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects for addedAt
      return parsed.map((item: any) => ({
        ...item,
        addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
      }));
    }
  } catch {
    // Ignore storage errors
  }
  return [];
};

// Save cart to localStorage
const saveCartToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
};

export const useCartStore = defineStore('cart', () => {
  const authStore = useAuthStore();

  // Initialize items from localStorage
  const items = ref<CartItem[]>(loadCartFromStorage());

  // Watch for changes and persist to localStorage
  watch(
    items,
    (newItems) => {
      saveCartToStorage(newItems);
    },
    { deep: true }
  );

  const getItemQuantity = (productId: string): number => {
    const item = items.value.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  const calculateLimit = (product: Product): number => {
    if (product.coming_soon === 1) {
      return 0;
    }
    // Use inventory.stock as the source of truth for available stock
    const stock = product.inventory?.stock ?? 0;
    const maxOrder =
      typeof product.max_order_quantity === 'number' && product.max_order_quantity > 0
        ? product.max_order_quantity
        : Infinity;

    return Math.min(stock, maxOrder);
  };

  const getRemainingQuantity = (product: Product): number => {
    const limit = calculateLimit(product);
    if (limit === Infinity) return Infinity;

    const existing = getItemQuantity(product.id);
    return Math.max(0, limit - existing);
  };

  const enforceLimitOnExisting = (
    existingItem: CartItem | undefined,
    limit: number
  ): {
    existingQuantity: number;
    adjusted: boolean;
  } => {
    if (!existingItem) {
      return { existingQuantity: 0, adjusted: false };
    }

    if (existingItem.quantity <= limit || limit === Infinity) {
      return { existingQuantity: existingItem.quantity, adjusted: false };
    }

    existingItem.quantity = limit;
    return { existingQuantity: limit, adjusted: true };
  };

  const itemCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0);
  });

  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => total + item.price * item.quantity, 0);
  });

  const totalWeight = computed(() => {
    return items.value.reduce((total, item) => {
      const weight = item.product.weight || 0;
      return total + weight * item.quantity;
    }, 0);
  });

  const shippingCost = computed(() => {
    if (itemCount.value === 0) return 0;
    if (totalWeight.value === 0) return 7.0;

    const shippingRate = 7.0; // 7 euro
    const weightPerRate = 20; // per 20kg
    return Math.ceil(totalWeight.value / weightPerRate) * shippingRate;
  });

  const subtotal = computed(() => totalPrice.value);

  // VAT/BTW: Only Belgian customers pay 21% VAT
  // Non-Belgian EU B2B customers are VAT exempt (reverse charge mechanism)
  const tax = computed(() => {
    if (!authStore.isBelgianCustomer) {
      return 0;
    }
    return (totalPrice.value + shippingCost.value) * 0.21; // 21% VAT for Belgian B2B
  });

  // Computed to check if VAT should be displayed in UI
  const shouldShowVAT = computed(() => authStore.isBelgianCustomer);

  const grandTotal = computed(() => subtotal.value + shippingCost.value + tax.value);

  const addItem = async (item: CartItem): Promise<CartMutationResult> => {
    if (!item.product.in_stock || item.product.coming_soon) {
      return {
        status: 'unavailable',
        requestedQuantity: item.quantity,
        appliedQuantity: 0,
        totalQuantity: getItemQuantity(item.productId),
        remainingQuantity: 0,
        limit: 0,
      };
    }

    const existingItem = items.value.find((i) => i.productId === item.productId);

    const limit = calculateLimit(item.product);
    const { existingQuantity, adjusted } = enforceLimitOnExisting(existingItem, limit);

    const desiredTotal = existingQuantity + item.quantity;
    const clampedTotal = Math.min(desiredTotal, limit);
    const appliedQuantity = Math.max(0, clampedTotal - existingQuantity);

    if (existingItem) {
      existingItem.quantity = clampedTotal;
    } else if (appliedQuantity > 0) {
      items.value.push({
        ...item,
        quantity: appliedQuantity,
        addedAt: new Date(),
      });
    }

    const totalQuantity = existingItem
      ? existingItem.quantity
      : appliedQuantity > 0
        ? appliedQuantity
        : 0;

    const remainingQuantity = limit === Infinity ? Infinity : Math.max(0, limit - totalQuantity);

    let status: CartMutationStatus = 'added';
    if (appliedQuantity === 0) {
      status = adjusted ? 'adjusted' : 'unavailable';
    } else if (appliedQuantity < item.quantity) {
      status = 'partial';
    }

    return {
      status,
      requestedQuantity: item.quantity,
      appliedQuantity,
      totalQuantity,
      remainingQuantity,
      limit: limit === Infinity ? Infinity : limit,
    };
  };

  const removeItem = (productId: string) => {
    const index = items.value.findIndex((item) => item.productId === productId);
    if (index > -1) {
      items.value.splice(index, 1);
    }
  };

  const updateQuantity = (productId: string, quantity: number): CartMutationResult => {
    const item = items.value.find((i) => i.productId === productId);

    if (!item) {
      return {
        status: 'unavailable',
        requestedQuantity: quantity,
        appliedQuantity: 0,
        totalQuantity: 0,
        remainingQuantity: 0,
        limit: 0,
      };
    }

    const limit = calculateLimit(item.product);

    if (quantity <= 0) {
      removeItem(productId);

      return {
        status: 'removed',
        requestedQuantity: quantity,
        appliedQuantity: 0,
        totalQuantity: 0,
        remainingQuantity: limit === Infinity ? Infinity : limit,
        limit: limit === Infinity ? Infinity : limit,
      };
    }

    const minOrder =
      typeof item.product.min_order_quantity === 'number' && item.product.min_order_quantity > 0
        ? item.product.min_order_quantity
        : 1;

    const clampedQuantity = Math.min(Math.max(quantity, minOrder), limit);
    item.quantity = clampedQuantity;

    const remainingQuantity = limit === Infinity ? Infinity : Math.max(0, limit - clampedQuantity);

    let status: CartMutationStatus = 'updated';
    if (clampedQuantity < quantity) {
      status = 'partial';
    }

    return {
      status,
      requestedQuantity: quantity,
      appliedQuantity: clampedQuantity,
      totalQuantity: clampedQuantity,
      remainingQuantity,
      limit: limit === Infinity ? Infinity : limit,
    };
  };

  const clearCart = () => {
    items.value = [];
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const isInCart = (productId: string): boolean => {
    return items.value.some((item) => item.productId === productId);
  };

  return {
    items,
    itemCount,
    totalPrice,
    totalWeight,
    shippingCost,
    subtotal,
    tax,
    shouldShowVAT,
    grandTotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    getRemainingQuantity,
    isInCart,
  };
});
