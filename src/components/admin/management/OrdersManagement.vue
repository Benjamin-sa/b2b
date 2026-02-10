<template>
  <div class="space-y-5">
    <!-- Stats Row — compact -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900">{{ stats?.overall?.total_invoices || 0 }}</p>
      </div>
      <div class="bg-white rounded-lg border border-yellow-200 p-4">
        <p class="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending</p>
        <p class="mt-1 text-2xl font-semibold text-yellow-700">{{ stats?.overall?.pending_count || 0 }}</p>
      </div>
      <div class="bg-white rounded-lg border border-green-200 p-4">
        <p class="text-xs font-medium text-green-600 uppercase tracking-wide">Paid</p>
        <p class="mt-1 text-2xl font-semibold text-green-700">{{ stats?.overall?.confirmed_count || 0 }}</p>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900">€{{ formatCurrency(stats?.overall?.total_revenue || 0) }}
        </p>
      </div>
    </div>

    <!-- Quick-filter chips + search -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <!-- Status chip row -->
      <div class="flex flex-wrap gap-2">
        <button v-for="chip in statusChips" :key="chip.value" :class="[
          filters.status === chip.value
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        ]" @click="setStatusFilter(chip.value)">
          {{ chip.label }}
        </button>
      </div>

      <!-- Search + date row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input v-model="filters.search" type="text" placeholder="Search orders..."
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              @input="debouncedSearch" />
          </div>
        </div>
        <input v-model="filters.date_from" type="date"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="loadInvoices" />
        <input v-model="filters.date_to" type="date"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          @change="loadInvoices" />
      </div>

      <!-- Active filter indicator + clear -->
      <div v-if="hasActiveFilters" class="flex items-center justify-between">
        <span class="text-xs text-gray-500">{{ pagination.total }} results</span>
        <button class="text-xs text-primary-600 hover:text-primary-700 font-medium" @click="clearFilters">
          Clear all filters
        </button>
      </div>
    </div>

    <!-- Sort controls -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Sort:</span>
        <select v-model="sorting.field"
          class="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none bg-white"
          :style="{ backgroundImage: `url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 20 20&quot; fill=&quot;%236b7280&quot;><path fill-rule=&quot;evenodd&quot; d=&quot;M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z&quot; clip-rule=&quot;evenodd&quot;/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '1rem', paddingRight: '1.75rem' }"
          @change="loadInvoices">
          <option value="created_at">Date</option>
          <option value="total_amount">Amount</option>
          <option value="status">Status</option>
        </select>
        <button class="p-1 rounded hover:bg-gray-100 transition-colors" @click="toggleSortOrder">
          <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="sorting.order === 'desc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 9l-7 7-7-7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Per page:</span>
        <select v-model.number="pagination.limit"
          class="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none bg-white"
          :style="{ backgroundImage: `url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 20 20&quot; fill=&quot;%236b7280&quot;><path fill-rule=&quot;evenodd&quot; d=&quot;M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z&quot; clip-rule=&quot;evenodd&quot;/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '1rem', paddingRight: '1.75rem' }"
          @change="changePageSize">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="invoices.length === 0" class="bg-white rounded-lg border border-gray-200 py-12 text-center">
      <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="mt-2 text-sm text-gray-500">No orders found</p>
    </div>

    <!-- Orders — Desktop Table -->
    <div v-else class="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="invoice in invoices" :key="invoice.id" class="hover:bg-gray-50 cursor-pointer transition-colors"
            @click="viewInvoiceDetails(invoice.id)">
            <td class="px-4 py-3">
              <span class="text-sm font-medium text-gray-900">{{ invoice.invoice_number || '—' }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="text-sm font-medium text-gray-900">{{ invoice.customer_company || invoice.customer_email }}
              </div>
              <div v-if="invoice.customer_company" class="text-xs text-gray-500">{{ invoice.customer_email }}</div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{{ formatDateShort(invoice.created_at) }}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">€{{
              formatCurrency(invoice.total_amount) }}</td>
            <td class="px-4 py-3 text-center">
              <span
                :class="[getStatusColor(invoice.status), 'inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full']">
                {{ getStatusLabel(invoice.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <svg class="h-4 w-4 text-gray-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Orders — Mobile Cards -->
    <div v-if="!loading && invoices.length > 0" class="md:hidden space-y-3">
      <div v-for="invoice in invoices" :key="'m-' + invoice.id"
        class="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 cursor-pointer"
        @click="viewInvoiceDetails(invoice.id)">
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ invoice.invoice_number || '—' }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ invoice.customer_company || invoice.customer_email }}</p>
          </div>
          <span :class="[getStatusColor(invoice.status), 'inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full']">
            {{ getStatusLabel(invoice.status) }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ formatDateShort(invoice.created_at) }}</span>
          <span class="text-sm font-semibold text-gray-900">€{{ formatCurrency(invoice.total_amount) }}</span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex items-center justify-between">
      <span class="text-xs text-gray-500">
        Page {{ pagination.page }} of {{ pagination.totalPages }}
      </span>
      <div class="flex gap-1">
        <button :disabled="!pagination.hasPrevPage"
          class="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          @click="goToPage(pagination.page - 1)">
          Previous
        </button>
        <button :disabled="!pagination.hasNextPage"
          class="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          @click="goToPage(pagination.page + 1)">
          Next
        </button>
      </div>
    </div>

    <!-- Invoice Details Slide-over -->
    <Teleport to="body">
      <div v-if="selectedInvoice" class="fixed inset-0 z-50 overflow-hidden">
        <div class="absolute inset-0 bg-black/40 transition-opacity" @click="closeModal"></div>
        <div class="absolute inset-y-0 right-0 w-full max-w-lg flex">
          <div class="w-full bg-white shadow-xl flex flex-col overflow-hidden" @click.stop>
            <!-- Slide-over header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 class="text-base font-semibold text-gray-900">{{ selectedInvoice.invoice_number || 'Order Details'
                  }}</h3>
                <span
                  :class="[getStatusColor(selectedInvoice.status), 'inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full mt-1']">
                  {{ getStatusLabel(selectedInvoice.status) }}
                </span>
              </div>
              <button class="p-1 rounded-md hover:bg-gray-100 transition-colors" @click="closeModal">
                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Slide-over body -->
            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <!-- Customer -->
              <section>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</h4>
                <div class="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p class="text-sm font-medium text-gray-900">{{ selectedInvoice.customer_company || '—' }}</p>
                  <p class="text-sm text-gray-700">{{ selectedInvoice.customer_first_name }} {{
                    selectedInvoice.customer_last_name }}</p>
                  <p class="text-sm text-gray-500">{{ selectedInvoice.customer_email }}</p>
                </div>
              </section>

              <!-- Shipping -->
              <section v-if="selectedInvoice.shipping_address_street">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shipping Address</h4>
                <div class="bg-gray-50 rounded-lg p-3 space-y-0.5">
                  <p v-if="selectedInvoice.shipping_address_contact" class="text-sm font-medium text-gray-900">{{
                    selectedInvoice.shipping_address_contact }}</p>
                  <p v-if="selectedInvoice.shipping_address_company" class="text-sm text-gray-700">{{
                    selectedInvoice.shipping_address_company }}</p>
                  <p class="text-sm text-gray-700">{{ selectedInvoice.shipping_address_street }}</p>
                  <p class="text-sm text-gray-700">{{ selectedInvoice.shipping_address_city }}, {{
                    selectedInvoice.shipping_address_country }}</p>
                </div>
              </section>

              <!-- Order info -->
              <section>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Info</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-gray-50 rounded-lg p-3">
                    <p class="text-xs text-gray-500">Created</p>
                    <p class="text-sm font-medium text-gray-900">{{ formatDateShort(selectedInvoice.created_at) }}</p>
                  </div>
                  <div v-if="selectedInvoice.due_date" class="bg-gray-50 rounded-lg p-3">
                    <p class="text-xs text-gray-500">Due Date</p>
                    <p class="text-sm font-medium text-gray-900">{{ formatDateShort(selectedInvoice.due_date) }}</p>
                  </div>
                  <div v-if="selectedInvoice.paid_at" class="bg-gray-50 rounded-lg p-3">
                    <p class="text-xs text-gray-500">Paid At</p>
                    <p class="text-sm font-medium text-green-700">{{ formatDateShort(selectedInvoice.paid_at) }}</p>
                  </div>
                  <div v-if="selectedInvoice.stripe_invoice_id" class="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p class="text-xs text-gray-500">Stripe Invoice</p>
                    <p class="text-xs font-mono text-gray-700 truncate">{{ selectedInvoice.stripe_invoice_id }}</p>
                  </div>
                </div>
              </section>

              <!-- Line Items -->
              <section>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</h4>
                <div v-if="loadingDetails" class="flex justify-center py-6">
                  <div class="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                </div>
                <div v-else-if="selectedInvoice.items && selectedInvoice.items.length > 0" class="space-y-2">
                  <div v-for="item in selectedInvoice.items" :key="item.id"
                    class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ item.product_name || 'Unknown Product' }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ item.b2b_sku ? `SKU: ${item.b2b_sku}` : '' }}
                        <span v-if="item.b2b_sku"> · </span>
                        Qty: {{ item.quantity }} × €{{ item.unit_price?.toFixed(2) }}
                      </p>
                    </div>
                    <span class="text-sm font-medium text-gray-900 ml-3 whitespace-nowrap">€{{
                      item.total_price?.toFixed(2) }}</span>
                  </div>
                </div>
                <p v-else class="text-sm text-gray-400 text-center py-4">No items loaded</p>
              </section>

              <!-- Totals -->
              <section class="border-t border-gray-200 pt-3">
                <div class="space-y-1">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Subtotal</span>
                    <span class="text-gray-900">€{{ formatCurrency(selectedInvoice.subtotal) }}</span>
                  </div>
                  <div v-if="selectedInvoice.shipping > 0" class="flex justify-between text-sm">
                    <span class="text-gray-500">Shipping</span>
                    <span class="text-gray-900">€{{ formatCurrency(selectedInvoice.shipping) }}</span>
                  </div>
                  <div v-if="selectedInvoice.tax > 0" class="flex justify-between text-sm">
                    <span class="text-gray-500">Tax</span>
                    <span class="text-gray-900">€{{ formatCurrency(selectedInvoice.tax) }}</span>
                  </div>
                  <div class="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>€{{ formatCurrency(selectedInvoice.total_amount) }}</span>
                  </div>
                </div>
              </section>
            </div>

            <!-- Slide-over footer -->
            <div class="flex-shrink-0 border-t border-gray-200 px-5 py-3 flex flex-wrap gap-2">
              <a v-if="selectedInvoice.invoice_url" :href="selectedInvoice.invoice_url" target="_blank"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors">
                <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Invoice
              </a>
              <a v-if="selectedInvoice.invoice_pdf" :href="selectedInvoice.invoice_pdf" target="_blank"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </a>
              <button
                class="ml-auto inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                @click="closeModal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
  b2b_sku: string | null;
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
const loadingDetails = ref(false);
const invoices = ref<Invoice[]>([]);
const selectedInvoice = ref<Invoice | null>(null);
const stats = ref<StatsData | null>(null);

const statusChips = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Open', value: 'open' },
  { label: 'Draft', value: 'draft' },
  { label: 'Void', value: 'void' },
  { label: 'Uncollectible', value: 'uncollectible' },
];

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
  limit: 25,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

const hasActiveFilters = computed(() =>
  filters.value.search || filters.value.status || filters.value.date_from || filters.value.date_to
);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await Promise.all([loadInvoices(), loadStats()]);
});

const setStatusFilter = (value: string) => {
  filters.value.status = value;
  pagination.value.page = 1;
  loadInvoices();
};

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

const viewInvoiceDetails = async (invoiceId: string) => {
  loadingDetails.value = true;

  const invoice = invoices.value.find((inv) => inv.id === invoiceId);
  if (invoice) {
    selectedInvoice.value = { ...invoice };
  }

  try {
    const response = await authStore.authenticatedFetch(
      `${import.meta.env.VITE_API_GATEWAY_URL}/admin/invoices/${invoiceId}`
    );

    if (!response.ok) throw new Error('Failed to fetch invoice details');

    const result = await response.json();
    selectedInvoice.value = {
      ...result.data.invoice,
      items: result.data.items,
    };
  } catch (error) {
    console.error('Error loading invoice details:', error);
  } finally {
    loadingDetails.value = false;
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
  filters.value = { search: '', status: '', date_from: '', date_to: '' };
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

const formatCurrency = (value: number): string => {
  return typeof value === 'number' ? value.toFixed(2) : '0.00';
};

const formatDateShort = (dateString: string): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    open: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-600',
    void: 'bg-red-100 text-red-700',
    uncollectible: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
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
