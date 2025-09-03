import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem } from '../types'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const itemCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => total + (item.price * item.quantity), 0)
  })

   const totalWeight = computed(() => {
    return items.value.reduce((total, item) => {
      const weight = item.product.weight || 0;
      return total + (weight * item.quantity);
    }, 0)
  })

  const shippingCost = computed(() => {
    if (itemCount.value === 0) return 0;
    if (totalWeight.value === 0) return 7.00;

    const shippingRate = 7.00; // 7 euro
    const weightPerRate = 20; // per 20kg
    return Math.ceil(totalWeight.value / weightPerRate) * shippingRate;
  })

  const subtotal = computed(() => totalPrice.value)
  
  const tax = computed(() => totalPrice.value * 0.21) // 21% VAT for BE B2B
  
  const grandTotal = computed(() => subtotal.value + shippingCost.value + tax.value)

  const addItem = async (item: CartItem) => {
    const existingItem = items.value.find(i => i.productId === item.productId)
    
    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      items.value.push({
        ...item,
        addedAt: new Date()
      })
    }
  }

  const removeItem = (productId: string) => {
    const index = items.value.findIndex(item => item.productId === productId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    const item = items.value.find(i => i.productId === productId)
    if (item) {
      if (quantity <= 0) {
        removeItem(productId)
      } else {
        item.quantity = quantity
      }
    }
  }

  const clearCart = () => {
    items.value = []
  }

  const getItemQuantity = (productId: string): number => {
    const item = items.value.find(i => i.productId === productId)
    return item?.quantity || 0
  }

  const isInCart = (productId: string): boolean => {
    return items.value.some(item => item.productId === productId)
  }

  return {
    items,
    itemCount,
    totalPrice,
    totalWeight,
    shippingCost,
    subtotal,
    tax,
    grandTotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart
  }
})