import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '../init/firebase'
import { useAuthStore } from './auth'

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

const toDate = (value: any) => {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const mapInvoiceDoc = (doc: QueryDocumentSnapshot<DocumentData>): Invoice => {
  const data = doc.data()
  const totals = data.totals || {}
  const amountCents =
    typeof data.amount === 'number'
      ? data.amount
      : typeof totals.grandTotalCents === 'number'
        ? totals.grandTotalCents
        : undefined
  const amountPaidCents =
    typeof data.amountPaid === 'number'
      ? data.amountPaid
      : typeof data.stripeAmountPaidCents === 'number'
        ? data.stripeAmountPaidCents
        : undefined

  const items = Array.isArray(data.items)
    ? data.items.map((item: any) => {
        const metadata = item.metadata || {}
        return {
          stripePriceId: metadata.stripePriceId || item.stripePriceId || '',
          productName: item.productName || metadata.productName || '',
          quantity: item.quantity || 0,
          unitPrice:
            typeof item.unitPrice === 'number'
              ? item.unitPrice
              : typeof item.totalPrice === 'number' && item.quantity
                ? item.totalPrice / item.quantity
                : 0,
          totalPrice:
            typeof item.totalPrice === 'number'
              ? item.totalPrice
              : (item.unitPrice || 0) * (item.quantity || 0),
          metadata: {
            shopifyVariantId: metadata.shopifyVariantId || '',
            productName: metadata.productName || item.productName || '',
            productId: metadata.productId || item.productId || ''
          }
        }
      })
    : []

  return {
    id: doc.id,
    invoiceId: data.invoiceId || doc.id,
    amount:
      typeof amountCents === 'number'
        ? amountCents / 100
        : typeof totals.grandTotal === 'number'
          ? totals.grandTotal
          : 0,
    amountPaid:
      typeof amountPaidCents === 'number'
        ? amountPaidCents / 100
        : undefined,
    currency: data.currency || 'eur',
    status: data.status || 'pending',
    paid: data.paid ?? data.status === 'paid',
    createdAt: toDate(data.createdAt),
    dueDate: toDate(data.dueDate),
    paidAt: toDate(data.paidAt),
    invoiceUrl: data.invoiceUrl || '',
    invoicePdf: data.invoicePdf,
    number: data.invoiceNumber || data.number,
    orderMetadata: data.metadata || data.orderMetadata,
    items,
    error: undefined
  }
}

export const useInvoiceStore = defineStore('invoices', () => {
  const invoices = ref<Invoice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchInvoices = async () => {
    const authStore = useAuthStore()
    if (!authStore.user) {
      error.value = 'User not authenticated'
      invoices.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const invoicesRef = collection(db, 'invoices')
      const invoicesQuery = query(
        invoicesRef,
        where('userId', '==', authStore.user.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(invoicesQuery)
      invoices.value = snapshot.docs.map(mapInvoiceDoc)
    } catch (err: any) {
      console.error('Error fetching invoices:', err)
      error.value = err.message || 'Failed to fetch invoices'
    } finally {
      isLoading.value = false
    }
  }
  const getInvoiceById = (invoiceId: string) => {
    return invoices.value.find(
      invoice => invoice.invoiceId === invoiceId || invoice.id === invoiceId
    )
  }

  const clearError = () => {
    error.value = null
  }

  const refreshInvoices = async () => {
    await fetchInvoices()
  }

  return {
    invoices,
    isLoading,
    error,
    fetchInvoices,
    getInvoiceById,
    clearError,
    refreshInvoices
  }
})
