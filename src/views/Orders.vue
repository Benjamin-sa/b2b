<template>
  <div class="min-h-screen bg-secondary-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-primary-200 gap-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 flex items-center">
            <span
              class="w-1.5 sm:w-2 h-8 sm:h-10 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full mr-2 sm:mr-4"
            ></span>
            {{ $t('orders.title') }}
          </h1>
          <p class="text-sm sm:text-base text-gray-700 mt-2 sm:mt-3 ml-4 sm:ml-6 font-medium">
            {{ $t('orders.subtitle') }}
          </p>
        </div>
        <button
          :disabled="isLoading"
          class="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 flex items-center text-sm sm:text-base font-bold shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 w-full sm:w-auto justify-center"
          @click="refreshOrders"
        >
          <svg
            v-if="isLoading"
            class="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <svg
            v-else
            class="w-4 h-4 sm:w-5 sm:h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ $t('orders.refresh') }}
        </button>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading && orders.length === 0"
        class="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-lg"
      >
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-primary-200 border-t-primary-600 shadow-md"
        ></div>
        <p class="mt-4 sm:mt-6 text-base sm:text-xl text-gray-700 font-bold">
          {{ $t('orders.loading') }}
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-gradient-to-br from-danger-50 to-danger-100 border-2 border-danger-300 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-md"
      >
        <div class="flex">
          <svg
            class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-danger-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm sm:text-base font-bold text-danger-900">{{ $t('orders.error') }}</h3>
            <p class="text-xs sm:text-sm text-danger-800 mt-1 font-medium">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="orders.length === 0"
        class="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-lg"
      >
        <div
          class="bg-gradient-to-br from-primary-100 to-primary-200 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center"
        >
          <svg
            class="h-8 w-8 sm:h-10 sm:w-10 text-primary-600"
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
        <h3 class="mt-2 text-lg sm:text-xl font-bold text-gray-900">{{ $t('orders.noOrders') }}</h3>
        <p class="mt-2 text-sm sm:text-base text-gray-600 px-4">
          {{ $t('orders.noOrdersMessage') }}
        </p>
        <div class="mt-6 sm:mt-8">
          <router-link
            to="/products"
            class="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 border border-transparent shadow-lg text-sm sm:text-base font-bold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-105"
          >
            {{ $t('orders.browseProducts') }}
          </router-link>
        </div>
      </div>

      <!-- Orders List -->
      <div v-else class="space-y-4 sm:space-y-6">
        <div
          v-for="order in orders"
          :key="order.id"
          class="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-200"
        >
          <!-- Order Header -->
          <div
            class="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b-2 border-primary-200"
          >
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
            >
              <div class="w-full sm:w-auto">
                <h3 class="text-base sm:text-xl font-bold text-gray-900 flex items-center">
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary-600 flex-shrink-0"
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
                  <span class="truncate"
                    >{{ $t('orders.invoice') }}
                    {{ order.invoiceNumber || order.stripeInvoiceId || order.id }}</span
                  >
                </h3>
                <p class="text-xs sm:text-sm text-gray-700 mt-1 ml-6 sm:ml-7 font-medium">
                  {{ $t('orders.orderPlacedOn') }} {{ formatDate(order.orderDate) }}
                </p>
              </div>
              <div
                class="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end"
              >
                <!-- Status Badge -->
                <span
                  :class="getStatusBadgeClass(order.stripeStatus || order.status)"
                  class="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border-2 shadow-sm whitespace-nowrap"
                >
                  {{ getStatusText(order.stripeStatus || order.status) }}
                </span>
                <!-- Amount -->
                <div class="text-right">
                  <p
                    class="text-lg sm:text-2xl font-black bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent"
                  >
                    €{{ formatPrice(order.totalAmount) }}
                  </p>
                  <p
                    v-if="order.stripeStatus === 'paid'"
                    class="text-xs sm:text-sm text-success-700 font-bold"
                  >
                    {{ $t('orders.paidOn') }} {{ formatDate(order.paidAt || order.updatedAt) }}
                  </p>
                  <p v-else-if="order.dueDate" class="text-xs sm:text-sm text-gray-700 font-medium">
                    {{ $t('orders.dueOn') }} {{ formatDate(order.dueDate) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Details -->
          <div class="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
            <!-- Line Items Table -->
            <div v-if="order.items && order.items.length > 0">
              <h4
                class="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center"
              >
                <span
                  class="w-1 h-5 sm:h-6 bg-gradient-to-b from-secondary-600 to-secondary-700 rounded-full mr-2"
                ></span>
                {{ $t('orders.items') }}
              </h4>
              <div
                class="overflow-x-auto rounded-lg sm:rounded-xl border border-gray-200 sm:border-2"
              >
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th
                        scope="col"
                        class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {{ $t('orders.product') }}
                      </th>
                      <th
                        scope="col"
                        class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {{ $t('orders.sku') }}
                      </th>
                      <th
                        scope="col"
                        class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {{ $t('orders.quantity') }}
                      </th>
                      <th
                        scope="col"
                        class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {{ $t('orders.unitPrice') }}
                      </th>
                      <th
                        scope="col"
                        class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {{ $t('orders.total') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="item in order.items"
                      :key="item.id || item.stripeLineItemId"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-3 py-4">
                        <div class="flex items-center">
                          <img
                            v-if="item.imageUrl"
                            :src="item.imageUrl"
                            :alt="item.productName"
                            class="h-10 w-10 rounded object-cover mr-3"
                          />
                          <div>
                            <div class="text-sm font-medium text-gray-900">
                              {{ item.productName }}
                            </div>
                            <div v-if="item.brand" class="text-xs text-gray-500">
                              {{ item.brand }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-4 text-sm text-gray-500">
                        {{ item.productSku || '-' }}
                      </td>
                      <td class="px-3 py-4 text-sm text-gray-900 text-right">
                        {{ item.quantity }}
                      </td>
                      <td class="px-3 py-4 text-sm text-gray-900 text-right">
                        €{{ formatPrice(item.unitPrice) }}
                      </td>
                      <td class="px-3 py-4 text-sm font-medium text-gray-900 text-right">
                        €{{ formatPrice(item.totalPrice) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="border-t border-gray-200 sm:border-t-2 pt-4 sm:pt-6">
              <h4
                class="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center"
              >
                <span
                  class="w-1 h-5 sm:h-6 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full mr-2"
                ></span>
                {{ $t('orders.orderSummary') }}
              </h4>
              <div
                class="space-y-2 sm:space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 rounded-lg sm:rounded-xl"
              >
                <!-- Subtotal (calculated from line items) -->
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ $t('orders.subtotal') }}</span>
                  <span class="text-gray-900">€{{ formatPrice(calculateSubtotal(order)) }}</span>
                </div>

                <!-- Shipping -->
                <div
                  v-if="order.shipping && order.shipping > 0"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">{{ $t('orders.shipping') }}</span>
                  <span class="text-gray-900">€{{ formatPrice(order.shipping) }}</span>
                </div>

                <!-- Tax -->
                <div v-if="order.tax && order.tax > 0" class="flex justify-between text-sm">
                  <span class="text-gray-600">{{ $t('orders.tax') }}</span>
                  <span class="text-gray-900">€{{ formatPrice(order.tax) }}</span>
                </div>

                <!-- Total -->
                <div
                  class="flex justify-between text-base sm:text-lg font-bold border-t-2 border-gray-300 pt-2 sm:pt-3 mt-2 sm:mt-3"
                >
                  <span class="text-gray-900">{{ $t('orders.total') }}</span>
                  <span
                    class="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent text-lg sm:text-xl"
                    >€{{ formatPrice(order.totalAmount) }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 sm:border-t-2"
          >
            <div
              class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0"
            >
              <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <!-- View Invoice -->
                <a
                  v-if="order.invoiceUrl"
                  :href="order.invoiceUrl"
                  target="_blank"
                  class="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border border-primary-300 sm:border-2 shadow-md text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl text-primary-700 bg-white hover:bg-primary-50 transition-all duration-200 transform hover:scale-105"
                >
                  <svg
                    class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {{ $t('orders.viewInvoice') }}
                </a>

                <!-- Download PDF -->
                <a
                  v-if="order.invoicePdf"
                  :href="order.invoicePdf"
                  target="_blank"
                  class="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border border-secondary-300 sm:border-2 shadow-md text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl text-secondary-700 bg-white hover:bg-secondary-50 transition-all duration-200 transform hover:scale-105"
                >
                  <svg
                    class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {{ $t('orders.downloadPdf') }}
                </a>
              </div>

              <!-- Status Info -->
              <div class="text-sm text-gray-500">
                <span v-if="order.stripeStatus === 'paid'">{{ $t('orders.paymentReceived') }}</span>
                <span v-else-if="order.stripeStatus === 'sent'">{{
                  $t('orders.invoiceSent')
                }}</span>
                <span v-else-if="order.stripeStatus === 'open'">{{
                  $t('orders.awaitingPayment')
                }}</span>
                <span v-else-if="order.stripeStatus === 'draft'">{{
                  $t('orders.status.draft')
                }}</span>
                <span v-else>{{ getStatusText(order.stripeStatus || order.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useOrderStore } from '../stores/orders';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const orderStore = useOrderStore();

const orders = computed(() => orderStore.orders);
const isLoading = computed(() => orderStore.isLoading);
const error = computed(() => orderStore.error);

const refreshOrders = () => {
  orderStore.refreshOrders();
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';

  // Handle ISO string (from D1 database)
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return 'N/A';
  }

  // Handle Unix timestamp (milliseconds)
  if (typeof date === 'number') {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Handle Date object
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return 'N/A';
};

const formatPrice = (price: number) => {
  return price.toFixed(2);
};

const calculateSubtotal = (order: any) => {
  // Calculate subtotal from line items (excludes shipping and tax)
  if (order.items && order.items.length > 0) {
    return order.items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
  }
  // Fallback to order.subtotal if no items
  return order.subtotal || 0;
};

const getStatusText = (status?: string) => {
  const normalized = status || 'pending';
  switch (normalized) {
    case 'draft':
      return t('orders.status.draft');
    case 'open':
      return t('orders.status.open');
    case 'paid':
      return t('orders.status.paid');
    case 'sent':
      return t('orders.status.sent');
    case 'voided':
      return t('orders.status.voided');
    case 'uncollectible':
      return t('orders.status.uncollectible');
    default:
      return normalized;
  }
};

const getStatusBadgeClass = (status?: string) => {
  const normalized = status || 'pending';
  switch (normalized) {
    case 'paid':
      return 'bg-gradient-to-r from-success-100 to-success-200 text-success-800 border-success-300';
    case 'open':
    case 'sent':
      return 'bg-gradient-to-r from-warning-100 to-warning-200 text-warning-800 border-warning-300';
    case 'draft':
    case 'pending':
      return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
    case 'voided':
    case 'uncollectible':
      return 'bg-gradient-to-r from-danger-100 to-danger-200 text-danger-800 border-danger-300';
    default:
      return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
  }
};

onMounted(() => {
  orderStore.subscribeToOrders();
});

onUnmounted(() => {
  orderStore.stopOrdersSubscription();
});
</script>
