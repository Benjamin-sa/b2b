import { defineStore } from 'pinia'
import { ref } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../init/firebase'
import { useAuthStore } from './auth'
import type { Order, OrderItem, ShippingAddress, CartItem } from '../types'

// Firebase function
const createInvoiceFunction = httpsCallable(functions, 'createInvoice')

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const formatOrderItems = (cartItems: CartItem[]): OrderItem[] => {
    return cartItems.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      imageUrl: item.product.imageUrl
    }))
  }

  const createOrder = async (
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    subtotal: number,
    tax: number,
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

      // Prepare metadata with user and order information
      const orderMetadata = {
        shippingAddress,
        notes: notes || '',
        subtotal,
        tax,
        userInfo: authStore.userProfile ? {
          companyName: authStore.userProfile.companyName,
          contactPerson: `${authStore.userProfile.firstName} ${authStore.userProfile.lastName}`,
          email: authStore.userProfile.email,
          btwNumber: authStore.userProfile.btwNumber
        } : {},
        orderItems: cartItems.map(item => ({
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      }

      // Create invoice via Firebase function
      const result = await createInvoiceFunction({
        items: stripeItems,
        metadata: orderMetadata
      })

      const invoiceData = result.data as {
        invoiceId: string
        invoiceUrl: string
        amount: number
        currency: string
      }

      // Create order record locally
      const order: Order = {
        id: invoiceData.invoiceId,
        userId: authStore.user?.uid || '',
        items: formatOrderItems(cartItems),
        totalAmount: invoiceData.amount / 100, // Stripe amounts are in cents
        subtotal,
        tax,
        shipping: 0, // Free shipping for B2B
        status: 'pending',
        orderDate: new Date(),
        shippingAddress,
        paymentMethod: 'invoice',
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Add to local orders
      orders.value.unshift(order)

      // Clear invoice cache so new invoice appears immediately
      try {
        const { useInvoiceStore } = await import('./invoices')
        const invoiceStore = useInvoiceStore()
        invoiceStore.clearCache()
      } catch (err) {
        console.warn('Could not clear invoice cache:', err)
      }

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

  const clearError = () => {
    error.value = null
  }

  return {
    orders,
    isLoading,
    error,
    createOrder,
    getOrderById,
    clearError
  }
})
