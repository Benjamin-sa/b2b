import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import type { Order, ShippingAddress, CartItem } from '../types'

// Firebase function

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const toDate = (value: any): Date | undefined => {
    if (!value) return undefined
    if (typeof value.toDate === 'function') {
      return value.toDate()
    }
    if (value instanceof Date) {
      return value
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

 


  const createOrder = async (
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    subtotal: number,
    tax: number,
    shippingCost: number, // Voeg shippingCost toe
    notes?: string
  ): Promise<{ success: boolean; invoiceUrl?: string; orderId?: string; error?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      // Get auth store for user information
      const authStore = useAuthStore()
      
      // Prepare items for Stripe (need stripePriceId)
      const stripeItems = cartItems.map(item => ({
        stripePriceId: item.product.stripePriceId,
        quantity: item.quantity
      }))

      // Check if all products have Stripe price IDs
      const missingPriceIds = stripeItems.filter(item => !item.stripePriceId)
      if (missingPriceIds.length > 0) {
        throw new Error('Some products are not properly configured for payment. Please contact support.')
      }

      // Prepare items with individual metadata for each item
      const itemsWithMetadata = cartItems.map(item => ({
        stripePriceId: item.product.stripePriceId,
        quantity: item.quantity,
        metadata: {
          shopifyVariantId: item.product.shopifyVariantId,
          productName: item.product.name,
          productId: item.productId
        }
      }))

      // Prepare general order metadata for the invoice level
      const generalMetadata = {
        shippingAddress,
        notes: notes || '',
        subtotal,
        tax,
        userInfo: authStore.userProfile ? {
          companyName: authStore.userProfile.companyName,
          contactPerson: `${authStore.userProfile.firstName} ${authStore.userProfile.lastName}`,
          email: authStore.userProfile.email,
          btwNumber: authStore.userProfile.btwNumber
        } : {}
      }
      // TODO call cloud function to create Stripe invoice

      return {
        success: true,
        invoiceUrl: invoiceData.invoiceUrl,
        orderId: invoiceData.invoiceId
      }

    } catch (err: any) {
      console.error('Error creating order:', err)
      error.value = err.message || 'Failed to create order'
      
      return {
        success: false,
        error: error.value || undefined
      }
    } finally {
      isLoading.value = false
    }
  }

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.value.find(order => order.id === orderId)
  }

  // Invoice-specific getters (using the same cached data)
  const getInvoiceById = (invoiceId: string): Order | undefined => {
    return orders.value.find(order => 
      order.id === invoiceId || 
      order.stripeInvoiceId === invoiceId ||
      order.invoiceNumber === invoiceId
    )
  }

  const getPaidInvoices = (): Order[] => {
    return orders.value.filter(order => order.status === 'confirmed' || order.paidAt)
  }

  const getPendingInvoices = (): Order[] => {
    return orders.value.filter(order => order.status === 'pending' && !order.paidAt)
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // Data
    orders,
    isLoading,
    error,
    
    
    
    // Order operations
    createOrder,
    getOrderById,
    
    // Invoice operations (same data, different views)
    getInvoiceById,
    getPaidInvoices,
    getPendingInvoices,
    
    // Utility
    clearError
  }
})
