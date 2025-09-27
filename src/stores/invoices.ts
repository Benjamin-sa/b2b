import { defineStore } from 'pinia'
import { ref } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../init/firebase'
import { useAuthStore } from './auth'
import { appCache } from '../services/cache'

interface InvoiceItem {
  stripePriceId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  metadata: {
    shopifyVariantId: string
    productName: string
    productId: string
  }
}

interface Invoice {
  id: string
  invoiceId: string
  amount: number
  amountPaid?: number
  currency: string
  status: string
  paid?: boolean
  createdAt: any
  dueDate: any
  paidAt?: any
  invoiceUrl: string
  invoicePdf?: string
  number?: string
  orderMetadata?: any
  items?: InvoiceItem[]
  error?: string
}

// Firebase function
const getUserInvoicesFunction = httpsCallable(functions, 'getUserInvoices')

export const useInvoiceStore = defineStore('invoices', () => {
  const invoices = ref<Invoice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch invoices from backend (Stripe + Firestore) with caching
  const fetchInvoices = async (forceRefresh = false) => {
    const authStore = useAuthStore()
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return
    }

    // Check cache first (unless force refresh)
    const cacheKey = `invoices_${authStore.user.uid}`
    if (!forceRefresh) {
      const cachedInvoices = appCache.get<Invoice[]>(cacheKey)
      if (cachedInvoices) {
        invoices.value = cachedInvoices
        return
      }
    }

    isLoading.value = true
    error.value = null

    try {
      // Call backend function to get invoices with Stripe status
      const result = await getUserInvoicesFunction()
      const data = result.data as { invoices: Invoice[]; total: number }
      invoices.value = data.invoices || []
      
      // Cache the results for 2 minutes
      appCache.set(cacheKey, invoices.value, 2 * 60 * 1000)
      
    } catch (err: any) {
      console.error('Error fetching invoices from backend:', err)
      error.value = err.message || 'Failed to fetch invoices'
      
    } finally {
      isLoading.value = false
    }
  }
  const getInvoiceById = (invoiceId: string) => {
    return invoices.value.find(invoice => invoice.invoiceId === invoiceId)
  }

  const clearError = () => {
    error.value = null
  }

  const clearCache = () => {
    const authStore = useAuthStore()
    if (authStore.user) {
      const cacheKey = `invoices_${authStore.user.uid}`
      appCache.invalidate(cacheKey)
    }
  }

  const refreshInvoices = async () => {
    clearCache()
    await fetchInvoices(true)
  }

  return {
    invoices,
    isLoading,
    error,
    fetchInvoices,
    getInvoiceById,
    clearError,
    clearCache,
    refreshInvoices
  }
})
