<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Order Management</h2>
      <p class="mt-1 text-sm text-gray-500">Manage customer invoices and orders</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  class="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {{ stats?.overall?.total_invoices || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  class="h-5 w-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Pending Invoices</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {{ stats?.overall?.pending_count || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  class="h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Paid Invoices</dt>
                <dd class="text-lg font-medium text-gray-900">
                  {{ stats?.overall?.confirmed_count || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  class="h-5 w-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd class="text-lg font-medium text-gray-900">
                  €{{ stats?.overall?.total_revenue || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search invoices..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="loadInvoices"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
            <option value="uncollectible">Uncollectible</option>
          </select>
        </div>

        <!-- Date From -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date From</label>
          <input
            v-model="filters.date_from"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="loadInvoices"
          />
        </div>

        <!-- Date To -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date To</label>
          <input
            v-model="filters.date_to"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="loadInvoices"
          />
        </div>
      </div>

      <!-- Filter Actions -->
      <div class="mt-4 flex justify-between items-center">
        <button class="text-sm text-gray-600 hover:text-gray-900" @click="clearFilters">
          Clear Filters
        </button>
        <div class="text-sm text-gray-500">Showing {{ pagination.total }} results</div>
      </div>
    </div>

    <!-- Invoices Table -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-900">All Invoices</h3>
        <div class="flex items-center space-x-2">
          <label class="text-sm text-gray-600">Sort by:</label>
          <select
            v-model="sorting.field"
            class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="loadInvoices"
          >
            <option value="created_at">Date</option>
            <option value="total_amount">Amount</option>
            <option value="status">Status</option>
          </select>
          <button
            class="p-1 border border-gray-300 rounded-md hover:bg-gray-50"
            @click="toggleSortOrder"
          >
            <svg
              v-if="sorting.order === 'desc'"
              class="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <svg
              v-else
              class="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Invoice Number
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Customer
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Amount
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading...</td>
            </tr>
            <tr v-else-if="invoices.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">No invoices found</td>
            </tr>
            <tr v-for="invoice in invoices" v-else :key="invoice.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ invoice.invoice_number || 'N/A' }}
                </div>
                <div v-if="invoice.stripe_invoice_id" class="text-xs text-gray-500">
                  {{ invoice.stripe_invoice_id }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ invoice.customer_company || 'N/A' }}
                </div>
                <div class="text-sm text-gray-500">{{ invoice.customer_email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(invoice.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">€{{ invoice.total_amount }}</div>
                <div v-if="invoice.tax > 0" class="text-xs text-gray-500">
                  Tax: €{{ invoice.tax }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    getStatusColor(invoice.status),
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  ]"
                >
                  {{ getStatusLabel(invoice.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  @click="viewInvoiceDetails(invoice.id)"
                >
                  <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">Per page:</label>
            <select
              v-model.number="pagination.limit"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @change="changePageSize"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600">
              Page {{ pagination.page }} of {{ pagination.totalPages }} ({{ invoices.length }} of
              {{ pagination.total }} items)
            </span>
            <div class="flex space-x-1">
              <button
                :disabled="!pagination.hasPrevPage"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                @click="goToPage(1)"
              >
                First
              </button>
              <button
                :disabled="!pagination.hasPrevPage"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                @click="goToPage(pagination.page - 1)"
              >
                Previous
              </button>
              <button
                :disabled="!pagination.hasNextPage"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                @click="goToPage(pagination.page + 1)"
              >
                Next
              </button>
              <button
                :disabled="!pagination.hasNextPage"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                @click="goToPage(pagination.totalPages)"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoice Details Modal -->
    <div
      v-if="selectedInvoice"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
      @click="closeModal"
    >
      <div
        class="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-start border-b pb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Invoice Details</h3>
              <p class="text-sm text-gray-500">{{ selectedInvoice.invoice_number }}</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600" @click="closeModal">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Invoice Information -->
          <div class="mt-6 space-y-6">
            <!-- Customer & Order Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Customer -->
              <div>
                <h4 class="text-md font-medium text-gray-900 mb-3">Customer Information</h4>
                <div class="space-y-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Company</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {{ selectedInvoice.customer_company || 'N/A' }}
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Customer Name</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {{ selectedInvoice.customer_first_name }}
                      {{ selectedInvoice.customer_last_name }}
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <p class="mt-1 text-sm text-gray-900">{{ selectedInvoice.customer_email }}</p>
                  </div>
                </div>
              </div>

              <!-- Order Info -->
              <div>
                <h4 class="text-md font-medium text-gray-900 mb-3">Order Information</h4>
                <div class="space-y-2">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Status</label>
                    <span
                      :class="[
                        getStatusColor(selectedInvoice.status),
                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1',
                      ]"
                    >
                      {{ getStatusLabel(selectedInvoice.status) }}
                    </span>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Created At</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {{ formatDate(selectedInvoice.created_at) }}
                    </p>
                  </div>
                  <div v-if="selectedInvoice.due_date">
                    <label class="block text-sm font-medium text-gray-700">Due Date</label>
                    <p class="mt-1 text-sm text-gray-900">
                      {{ formatDate(selectedInvoice.due_date) }}
                    </p>
                  </div>
                  <div v-if="selectedInvoice.stripe_invoice_id">
                    <label class="block text-sm font-medium text-gray-700">Stripe ID</label>
                    <p class="mt-1 text-sm text-gray-900 font-mono">
                      {{ selectedInvoice.stripe_invoice_id }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Shipping Address -->
            <div v-if="selectedInvoice.shipping_address_street">
              <h4 class="text-md font-medium text-gray-900 mb-3">Shipping Address</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p
                  v-if="selectedInvoice.shipping_address_contact"
                  class="text-sm text-gray-900 font-medium"
                >
                  {{ selectedInvoice.shipping_address_contact }}
                </p>
                <p v-if="selectedInvoice.shipping_address_company" class="text-sm text-gray-900">
                  {{ selectedInvoice.shipping_address_company }}
                </p>
                <p class="text-sm text-gray-900">{{ selectedInvoice.shipping_address_street }}</p>
                <p class="text-sm text-gray-900">
                  {{ selectedInvoice.shipping_address_city }},
                  {{ selectedInvoice.shipping_address_country }}
                </p>
              </div>
            </div>

            <!-- Line Items -->
            <div v-if="selectedInvoice.items && selectedInvoice.items.length > 0">
              <h4 class="text-md font-medium text-gray-900 mb-3">Line Items</h4>
              <div class="border rounded-lg overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="item in selectedInvoice.items" :key="item.id">
                      <td class="px-4 py-2 text-sm text-gray-900">
                        {{ item.product_name || 'Unknown Product' }}
                      </td>
                      <td class="px-4 py-2 text-sm text-gray-900 text-right">
                        {{ item.quantity }}
                      </td>
                      <td class="px-4 py-2 text-sm text-gray-900 text-right">
                        €{{ item.unit_price }}
                      </td>
                      <td class="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                        €{{ item.total_price }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Totals -->
            <div class="border-t pt-4">
              <div class="flex justify-end">
                <div class="w-64 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Subtotal:</span>
                    <span class="text-gray-900">€{{ selectedInvoice.subtotal }}</span>
                  </div>
                  <div v-if="selectedInvoice.shipping > 0" class="flex justify-between text-sm">
                    <span class="text-gray-600">Shipping:</span>
                    <span class="text-gray-900">€{{ selectedInvoice.shipping }}</span>
                  </div>
                  <div v-if="selectedInvoice.tax > 0" class="flex justify-between text-sm">
                    <span class="text-gray-600">Tax:</span>
                    <span class="text-gray-900">€{{ selectedInvoice.tax }}</span>
                  </div>
                  <div class="flex justify-between text-base font-semibold border-t pt-2">
                    <span class="text-gray-900">Total:</span>
                    <span class="text-gray-900">€{{ selectedInvoice.total_amount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="mt-6 flex justify-between items-center border-t pt-4">
            <div class="flex space-x-2">
              <a
                v-if="selectedInvoice.invoice_url"
                :href="selectedInvoice.invoice_url"
                target="_blank"
                class="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View Invoice
              </a>
              <a
                v-if="selectedInvoice.invoice_pdf"
                :href="selectedInvoice.invoice_pdf"
                target="_blank"
                class="inline-flex items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF
              </a>
            </div>
            <button
              class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              @click="closeModal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';

const authStore = useAuthStore();

interface Invoice {
  id: string;
  invoice_number: string | null;
  stripe_invoice_id: string | null;
  user_id: string;
  customer_email: string;
  customer_company: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  status: string;
  stripe_status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total_amount: number;
  order_date: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  due_date: string | null;
  invoice_url: string | null;
  invoice_pdf: string | null;
  shipping_address_company: string | null;
  shipping_address_contact: string | null;
  shipping_address_street: string | null;
  shipping_address_city: string | null;
  shipping_address_country: string | null;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface StatsData {
  overall: {
    total_invoices: number;
    pending_count: number;
    confirmed_count: number;
    processing_count: number;
    shipped_count: number;
    delivered_count: number;
    cancelled_count: number;
    total_revenue: number;
    average_order_value: number;
  };
  recent: {
    recent_count: number;
    recent_revenue: number;
  };
}

const loading = ref(false);
const invoices = ref<Invoice[]>([]);
const selectedInvoice = ref<Invoice | null>(null);
const stats = ref<StatsData | null>(null);

const filters = ref({
  search: '',
  status: '',
  date_from: '',
  date_to: '',
});

const sorting = ref({
  field: 'created_at',
  order: 'desc',
});

const pagination = ref<PaginationData>({
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await Promise.all([loadInvoices(), loadStats()]);
});

const loadInvoices = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
      sort: sorting.value.field,
      order: sorting.value.order,
    });

    if (filters.value.search) params.append('search', filters.value.search);
    if (filters.value.status) params.append('status', filters.value.status);
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);

    const response = await authStore.authenticatedFetch(
      `${import.meta.env.VITE_API_GATEWAY_URL}/admin/invoices?${params}`
    );

    if (!response.ok) throw new Error('Failed to fetch invoices');

    const result = await response.json();
    invoices.value = result.data.invoices;
    pagination.value = result.data.pagination;
  } catch (error) {
    console.error('Error loading invoices:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await authStore.authenticatedFetch(
      `${import.meta.env.VITE_API_GATEWAY_URL}/admin/invoices/stats/summary`
    );

    if (!response.ok) throw new Error('Failed to fetch stats');

    const result = await response.json();
    stats.value = result.data;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const viewInvoiceDetails = (invoiceId: string) => {
  // Find the invoice in the already-loaded invoices array
  const invoice = invoices.value.find((inv) => inv.id === invoiceId);
  if (invoice) {
    selectedInvoice.value = invoice;
  } else {
    console.error('Invoice not found:', invoiceId);
  }
};

const closeModal = () => {
  selectedInvoice.value = null;
};

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    loadInvoices();
  }, 500);
};

const clearFilters = () => {
  filters.value = {
    search: '',
    status: '',
    date_from: '',
    date_to: '',
  };
  pagination.value.page = 1;
  loadInvoices();
};

const toggleSortOrder = () => {
  sorting.value.order = sorting.value.order === 'desc' ? 'asc' : 'desc';
  loadInvoices();
};

const goToPage = (page: number) => {
  pagination.value.page = page;
  loadInvoices();
};

const changePageSize = () => {
  pagination.value.page = 1;
  loadInvoices();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    open: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    void: 'bg-red-100 text-red-800',
    uncollectible: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    open: 'Open',
    draft: 'Draft',
    void: 'Void',
    uncollectible: 'Uncollectible',
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
};
</script>
