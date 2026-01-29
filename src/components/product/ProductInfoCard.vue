<template>
  <div class="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200">
      <nav class="flex">
        <button v-for="tab in tabs" :key="tab.id" :class="[
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600 bg-primary-50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          'flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium border-b-2 transition-colors focus:outline-none',
        ]" @click="activeTab = tab.id">
          <div class="flex items-center justify-center">
            <svg v-if="tab.id === 'specifications'" class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ $t(`products.info.tabs.${tab.id}`) }}
          </div>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="p-4 sm:p-6">
      <Transition name="fade" mode="out-in">
        <!-- Specifications Tab -->
        <div v-if="activeTab === 'specifications'" key="specifications">
          <div v-if="specifications && specifications.length > 0" class="space-y-1">
            <div v-for="(spec, index) in specifications" :key="index"
              class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100 last:border-b-0">
              <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                spec.key
                }}</span>
              <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ spec.value }}</span>
            </div>
          </div>
          <div v-else class="text-center py-6 sm:py-8 text-gray-500">
            <svg class="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-300" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs sm:text-sm">{{ $t('products.info.empty.specifications') }}</p>
          </div>
        </div>

        <!-- Details Tab -->
        <div v-else-if="activeTab === 'details'" key="details">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1">
            <!-- Left Column -->
            <div class="space-y-1">
              <div v-if="product.brand" class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.brand')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ product.brand }}</span>
              </div>
              <div v-if="product.weight" class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.weight')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ product.weight }} kg</span>
              </div>
              <div v-if="product.unit" class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.unit')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ product.unit }}</span>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-1">
              <div v-if="product.dimensions" class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.dimensions')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">
                  {{ product.dimensions.length }} × {{ product.dimensions.width }} ×
                  {{ product.dimensions.height }} cm
                </span>
              </div>
              <div v-if="product.min_order_quantity"
                class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.minOrder')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ product.min_order_quantity }}
                  {{ product.unit || $t('products.info.labels.pieces') }}</span>
              </div>
              <div v-if="product.max_order_quantity"
                class="grid grid-cols-3 gap-2 sm:gap-3 py-2 border-b border-gray-100">
                <span class="text-xs sm:text-sm font-medium text-gray-600 col-span-1">{{
                  $t('products.info.labels.maxOrder')
                  }}</span>
                <span class="text-xs sm:text-sm text-gray-900 col-span-2">{{ product.max_order_quantity }}
                  {{ product.unit || $t('products.info.labels.pieces') }}</span>
              </div>
            </div>
          </div>

          <!-- Show message if no details available -->
          <div v-if="!hasAnyDetails" class="text-center py-6 sm:py-8 text-gray-500">
            <svg class="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-300" fill="none" stroke="currentColor"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs sm:text-sm">{{ $t('products.info.empty.details') }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProductWithDetails } from '@b2b/db';

interface Specification {
  key: string;
  value: string;
}

interface Props {
  product: ProductWithDetails;
  specifications?: Specification[];
}

const props = withDefaults(defineProps<Props>(), {
  specifications: () => [],
});

const activeTab = ref('specifications');

const tabs = [
  { id: 'specifications', name: 'Specifications' },
  { id: 'details', name: 'Details' },
];

const hasAnyDetails = computed(() => {
  return !!(
    props.product.brand ||
    props.product.weight ||
    props.product.unit ||
    props.product.dimensions ||
    props.product.min_order_quantity ||
    props.product.max_order_quantity
  );
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
