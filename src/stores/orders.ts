import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import type { Order, OrderItem, ShippingAddress, CartItem } from '../types'

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787'

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch user's invoices from Cloudflare API Gateway
   * 
   * Queries D1 database for invoices synced via Stripe webhooks.
   */
  const fetchOrders = async (): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      
      if (!authStore.isAuthenticated) {
        throw new Error('User must be authenticated to fetch orders')
      }

      const response = await fetch(`${API_GATEWAY_URL}/api/invoices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authStore.accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch invoices')
      }

      const data = await response.json()
      
      // Map the new D1 invoice structure with line items to our Order type
      orders.value = (data.invoices || []).map((invoice: any) => {
        // Map line items with historical pricing/product details
        const items: OrderItem[] = (invoice.items || []).map((item: any) => ({
          id: item.id,
          stripeLineItemId: item.stripeLineItemId,
          productId: item.metadata?.productId || item.metadata?.product_id || '',
          productName: item.productName,
          productSku: item.sku,
          brand: item.brand,
          quantity: item.quantity,
          unitPrice: item.unitPrice, // Already in euros from API
          totalPrice: item.totalPrice, // Already in euros from API
          tax: item.tax, // Already in euros from API
          imageUrl: item.imageUrl,
          currency: item.currency || 'eur',
          metadata: item.metadata || {}
        }))

        // Calculate totals from line items if available
        const subtotal = items.reduce((sum: number, item: OrderItem) => sum + item.totalPrice, 0)
        const totalTax = items.reduce((sum: number, item: OrderItem) => sum + (item.tax || 0), 0)

        return {
          id: invoice.id,
          stripeInvoiceId: invoice.stripeInvoiceId,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status, // draft, open, paid, void
          stripeStatus: invoice.status,
          totalAmount: invoice.amount / 100, // Convert cents to euros
          subtotal: subtotal > 0 ? subtotal : invoice.amount / 100, // Use calculated or fallback
          tax: totalTax,
          shipping: 0, // Calculate from items if needed (filter items with type='shipping')
          currency: invoice.currency || 'EUR',
          invoiceUrl: invoice.hostedInvoiceUrl,
          invoicePdf: invoice.invoicePdf,
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          orderDate: invoice.createdAt,
          updatedAt: invoice.updatedAt,
          items, // ⭐ Now includes full historical line items data
          shippingAddress: null, // Not stored in D1
          notes: null, // Not stored in D1
          userId: '', // Not needed for display
          createdAt: invoice.createdAt,
        }
      })
      
      console.log(`📋 Fetched ${orders.value.length} invoices with line items from Cloudflare D1`)
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      error.value = err.message || 'Failed to fetch orders'
      orders.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refresh orders (alias for fetchOrders)
   */
  const refreshOrders = async (): Promise<void> => {
    await fetchOrders()
  }

  /**
   * Subscribe to orders (auto-fetch on mount)
   * In the new Cloudflare architecture, we just fetch once on mount.
   * Webhooks keep D1 in sync automatically.
   */
  const subscribeToOrders = async (): Promise<void> => {
    await fetchOrders()
  }

  /**
   * Stop orders subscription (no-op in Cloudflare architecture)
   * Previously used for Firebase realtime listeners
   */
  const stopOrdersSubscription = (): void => {
    // No-op: We don't have real-time subscriptions in the new architecture
    // Invoices are synced via webhooks to D1, and we fetch on demand
  }

  /**
   * Create an order/invoice via Cloudflare API Gateway
   * 
   * This replaces the Firebase Functions createInvoice callable
   * and now calls the Cloudflare Workers API Gateway which orchestrates
   * the invoice creation through the Stripe service.
   */
  const createOrder = async (
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    _subtotal: number, // Not used - Stripe calculates total from line items
    tax: number,
    shippingCost: number,
    notes?: string
  ): Promise<{ success: boolean; invoiceUrl?: string; orderId?: string; error?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      // Get auth store for user information and authentication token
      const authStore = useAuthStore()
      
      if (!authStore.isAuthenticated) {
        throw new Error('User must be authenticated to create an order')
      }

      // Check if all products have Stripe price IDs
      const missingPriceIds = cartItems.filter(item => !item.product.stripe_price_id)
      if (missingPriceIds.length > 0) {
        throw new Error('Some products are not properly configured for payment. Please contact support.')
      }

      // Prepare items with individual metadata for each item
      // This matches the format expected by the API Gateway
      const itemsWithMetadata = cartItems.map(item => ({
        stripePriceId: item.product.stripe_price_id!,
        quantity: item.quantity,
        metadata: {
          productId: item.productId,
          productName: item.product.name,
          shopifyVariantId: item.product.shopify_variant_id || '',
        }
      }))

      // Prepare general order metadata for the invoice level
      const generalMetadata = {
        notes: notes || '',
        shippingAddress,
        billingAddress: shippingAddress, // Use same address for billing
        userInfo: authStore.userProfile ? {
          companyName: authStore.userProfile.companyName,
          contactPerson: `${authStore.userProfile.firstName} ${authStore.userProfile.lastName}`,
          email: authStore.userProfile.email,
          btwNumber: authStore.userProfile.btwNumber
        } : {}
      }

      // Convert amounts to cents (Stripe expects amounts in cents)
      const shippingCostCents = Math.round(shippingCost * 100)
      const taxAmountCents = Math.round(tax * 100)

      // Call Cloudflare API Gateway to create invoice
      const response = await fetch(`${API_GATEWAY_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        body: JSON.stringify({
          items: itemsWithMetadata,
          shippingCost: shippingCostCents,
          taxAmount: taxAmountCents,
          metadata: generalMetadata
        })
      })

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific error types from the API Gateway
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.')
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Invalid order data. Please check your cart and try again.')
        } else if (errorData.error === 'failed-precondition') {
          throw new Error(errorData.message || 'Please complete your profile before placing an order.')
        } else {
          throw new Error(errorData.message || 'Failed to create invoice. Please try again.')
        }
      }

      const invoiceData = await response.json()

      console.log('✅ Invoice created successfully:', invoiceData.invoiceId)

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
    
    // Fetch operations
    fetchOrders,
    refreshOrders,
    subscribeToOrders,
    stopOrdersSubscription,
    
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
