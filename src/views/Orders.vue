<template>
    <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">My Orders</h1>
                    <p class="text-gray-600 mt-2">Track your invoices and order status</p>
                </div>
                <button @click="refreshOrders" :disabled="isLoading"
                    class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center">
                    <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none"
                        viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading && invoices.length === 0" class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-4 text-gray-600">Loading your orders...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div class="flex">
                    <svg class="flex-shrink-0 w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd" />
                    </svg>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">Error loading orders</h3>
                        <p class="text-sm text-red-700 mt-1">{{ error }}</p>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="invoices.length === 0" class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p class="mt-1 text-sm text-gray-500">Start shopping to see your orders here.</p>
                <div class="mt-6">
                    <router-link to="/products"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Browse Products
                    </router-link>
                </div>
            </div>

            <!-- Orders List -->
            <div v-else class="space-y-6">
                <div v-for="invoice in invoices" :key="invoice.id"
                    class="bg-white rounded-lg shadow-md overflow-hidden">

                    <!-- Order Header -->
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">
                                    Invoice {{ invoice.number || invoice.invoiceId }}
                                </h3>
                                <p class="text-sm text-gray-500">
                                    Order placed on {{ formatDate(invoice.createdAt) }}
                                </p>
                            </div>
                            <div class="flex items-center space-x-4">
                                <!-- Status Badge -->
                                <span :class="getStatusBadgeClass(invoice.status)"
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    {{ getStatusText(invoice.status) }}
                                </span>
                                <!-- Amount -->
                                <div class="text-right">
                                    <p class="text-lg font-semibold text-gray-900">
                                        €{{ formatPrice(invoice.amount / 100) }}
                                    </p>
                                    <p v-if="invoice.paid" class="text-sm text-green-600">
                                        Paid {{ formatDate(invoice.paidAt) }}
                                    </p>
                                    <p v-else-if="invoice.dueDate" class="text-sm text-gray-500">
                                        Due {{ formatDate(invoice.dueDate) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Order Details -->
                    <div class="px-6 py-4">
                        <!-- Order Items -->
                        <div v-if="invoice.items && invoice.items.length > 0" class="mb-4">
                            <h4 class="text-sm font-medium text-gray-900 mb-2">Items</h4>
                            <div class="space-y-2">
                                <div v-for="item in invoice.items" :key="item.stripePriceId"
                                    class="flex justify-between text-sm">
                                    <span class="text-gray-600">
                                        {{ item.quantity }}x {{ item.stripePriceId }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Shipping Address -->
                        <div v-if="invoice.orderMetadata?.shippingAddress" class="mb-4">
                            <h4 class="text-sm font-medium text-gray-900 mb-2">Shipping Address</h4>
                            <div class="text-sm text-gray-600">
                                <p>{{ invoice.orderMetadata.shippingAddress.company }}</p>
                                <p>{{ invoice.orderMetadata.shippingAddress.contactPerson }}</p>
                                <p>{{ invoice.orderMetadata.shippingAddress.street }}</p>
                                <p>
                                    {{ invoice.orderMetadata.shippingAddress.zipCode }}
                                    {{ invoice.orderMetadata.shippingAddress.city }}
                                </p>
                                <p>{{ invoice.orderMetadata.shippingAddress.country }}</p>
                            </div>
                        </div>

                        <!-- Order Notes -->
                        <div v-if="invoice.orderMetadata?.notes" class="mb-4">
                            <h4 class="text-sm font-medium text-gray-900 mb-2">Order Notes</h4>
                            <p class="text-sm text-gray-600">{{ invoice.orderMetadata.notes }}</p>
                        </div>

                        <!-- Error Message -->
                        <div v-if="invoice.error" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p class="text-sm text-yellow-800">{{ invoice.error }}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex space-x-3">
                                <!-- View Invoice -->
                                <a v-if="invoice.invoiceUrl" :href="invoice.invoiceUrl" target="_blank"
                                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View Invoice
                                </a>

                                <!-- Download PDF -->
                                <a v-if="invoice.invoicePdf" :href="invoice.invoicePdf" target="_blank"
                                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download PDF
                                </a>
                            </div>

                            <!-- Status Info -->
                            <div class="text-sm text-gray-500">
                                <span v-if="invoice.paid">Payment received</span>
                                <span v-else-if="invoice.status === 'sent'">Invoice sent</span>
                                <span v-else-if="invoice.status === 'open'">Awaiting payment</span>
                                <span v-else-if="invoice.status === 'draft'">Draft</span>
                                <span v-else>{{ invoice.status }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useInvoiceStore } from '../stores/invoices'

// Use the invoice store
const invoiceStore = useInvoiceStore()

// Computed properties from store
const invoices = computed(() => invoiceStore.invoices)

const isLoading = computed(() => invoiceStore.isLoading)
const error = computed(() => invoiceStore.error)

// Fetch invoices
const refreshOrders = async () => {
    await invoiceStore.refreshInvoices()
}

const formatDate = (date: any) => {


    if (!date) return 'N/A'
    // Firestore Timestamp object
    if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
    // ISO string
    if (typeof date === 'string') {
        const parsed = new Date(date)
        if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        }
        return 'N/A'
    }
    // Unix timestamp (number)
    if (typeof date === 'number') {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
    // JS Date
    if (date instanceof Date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
    return 'N/A'
}

const formatPrice = (price: number) => {
    return price.toFixed(2)
}

const getStatusText = (status: string) => {
    switch (status) {
        case 'draft': return 'Draft'
        case 'open': return 'Pending Payment'
        case 'paid': return 'Paid'
        case 'sent': return 'Sent'
        case 'voided': return 'Voided'
        case 'uncollectible': return 'Uncollectible'
        default: return status
    }
}

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'paid':
            return 'bg-green-100 text-green-800'
        case 'open':
        case 'sent':
            return 'bg-yellow-100 text-yellow-800'
        case 'draft':
            return 'bg-gray-100 text-gray-800'
        case 'voided':
        case 'uncollectible':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

// Load invoices on mount
onMounted(() => {
    invoiceStore.fetchInvoices()
})
</script>
