import { defineStore } from 'pinia'
import { ref } from 'vue'
import { httpsCallable } from 'firebase/functions'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore'
import { db, functions } from '../init/firebase'
import { useAuthStore } from './auth'
import type { Order, ShippingAddress, CartItem } from '../types'

// Firebase function
const createInvoiceFunction = httpsCallable(functions, 'createInvoice')

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let unsubscribeOrders: Unsubscribe | null = null

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

  const mapOrderDoc = (doc: QueryDocumentSnapshot<DocumentData>): Order => {
    const data = doc.data()
    const totals = data.totals || {}

    const items = (data.items || []).map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice ?? (item.unitPrice || 0) * (item.quantity || 0),
      imageUrl: item.imageUrl,
      stripeInvoiceItemId: item.stripeInvoiceItemId || item.metadata?.stripeInvoiceItemId,
      taxCents:
        typeof item.taxCents === 'number'
          ? item.taxCents
          : typeof item.metadata?.taxCents === 'number'
            ? item.metadata.taxCents
            : null,
      metadata: item.metadata || {}
    }))

    const subtotal = typeof totals.subtotal === 'number' ? totals.subtotal : data.subtotal || 0
    const tax = typeof totals.tax === 'number' ? totals.tax : data.tax || 0
    const shipping = typeof totals.shipping === 'number' ? totals.shipping : data.shipping || 0
    const grandTotal = typeof totals.grandTotal === 'number' ? totals.grandTotal : subtotal + tax + shipping

    const createdAt = toDate(data.createdAt) || new Date()
    const updatedAt = toDate(data.updatedAt) || createdAt

    return {
      id: doc.id,
      userId: data.userId,
      items,
      totalAmount: grandTotal,
      subtotal,
      tax,
      shipping,
      status: data.status || data.stripeStatus || 'pending',
      orderDate: createdAt,
      shippingAddress: data.shippingAddress || null,
      billingAddress: data.billingAddress || null,
      paymentMethod: data.paymentMethod || 'invoice',
      notes: data.notes || '',
      createdAt,
      updatedAt,
      estimatedDelivery: toDate(data.estimatedDelivery),
  dueDate: toDate(data.dueDate),
  paidAt: toDate(data.paidAt),
      trackingNumber: data.trackingNumber,
      invoiceUrl: data.invoiceUrl,
      invoicePdf: data.invoicePdf,
      stripeInvoiceId: data.stripeInvoiceId || doc.id,
      stripeStatus: data.stripeStatus,
      invoiceNumber: data.stripeNumber,
      shippingCostCents: totals.shippingCents,
      stripeShippingInvoiceItemId: data.stripeShippingInvoiceItemId,
      metadata: data.metadata || {}
    } as Order
  }

  const subscribeToOrders = () => {
    const authStore = useAuthStore()
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return
    }

    if (unsubscribeOrders) {
      return
    }

    isLoading.value = true

    const ordersRef = collection(db, 'orders')
    const ordersQuery = query(
      ordersRef,
      where('userId', '==', authStore.user.uid),
      orderBy('createdAt', 'desc')
    )

    unsubscribeOrders = onSnapshot(
      ordersQuery,
      snapshot => {
        orders.value = snapshot.docs.map(mapOrderDoc)
        isLoading.value = false
      },
      err => {
        console.error('Error fetching orders:', err)
        error.value = err.message || 'Failed to fetch orders'
        isLoading.value = false
      }
    )
  }

  const stopOrdersSubscription = () => {
    if (unsubscribeOrders) {
      unsubscribeOrders()
      unsubscribeOrders = null
    }
  }

  const refreshOrders = () => {
    stopOrdersSubscription()
    subscribeToOrders()
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

      // Create invoice via Firebase function
      const result = await createInvoiceFunction({
        items: itemsWithMetadata,
        shippingCost: Math.round(shippingCost * 100), // Stuur als centen
        taxAmount: Math.round(tax * 100),
        metadata: generalMetadata
      })

      const invoiceData = result.data as {
        invoiceId: string
        invoiceUrl: string
        amount: number
        currency: string
      }

      // Clear invoice cache so new invoice appears immediately
      try {
        const { useInvoiceStore } = await import('./invoices')
        const invoiceStore = useInvoiceStore()
        await invoiceStore.refreshInvoices()
      } catch (err) {
        console.warn('Could not refresh invoices:', err)
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
    subscribeToOrders,
    stopOrdersSubscription,
    refreshOrders,
    createOrder,
    getOrderById,
    clearError
  }
})
