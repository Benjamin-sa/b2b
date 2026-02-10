<template>
  <div>
    <!-- Welcome Banner -->
    <div class="bg-primary-700 rounded-lg shadow-md mb-8">
      <div class="px-8 py-10 text-center text-white">
        <!-- Centered Logo -->
        <div class="flex justify-center items-center mb-5">
          <img src="/vite.svg" alt="4Tparts Logo" class="w-24 h-24 opacity-90" />
        </div>
        <p class="text-lg text-primary-100 mb-6 max-w-xl mx-auto">
          {{ $t('home.welcome.trustedPartner') }}
        </p>
        <div v-if="!authStore.isVerified && !authStore.isAdmin"
          class="bg-warning-500/20 border border-warning-300/50 rounded-md p-3 mb-6 max-w-md mx-auto">
          <p class="text-warning-100 text-sm">
            {{ $t('home.welcome.pendingVerification') }}
          </p>
        </div>
        <router-link to="/products"
          class="inline-flex items-center bg-white text-primary-700 hover:bg-gray-50 px-6 py-3 rounded-md font-semibold transition-colors duration-150 shadow-sm">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {{ $t('home.welcome.viewProducts') }}
        </router-link>
      </div>
    </div>

    <!-- Quick Stats for Users -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2.5 bg-primary-50 rounded-lg">
            <svg class="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ $t('home.features.partsTitle') }}
            </h3>
            <p class="text-gray-600 text-sm mt-1">{{ $t('home.features.partsDesc') }}</p>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2.5 bg-green-50 rounded-lg">
            <svg class="w-7 h-7 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ $t('home.features.fastDeliveryTitle') }}
            </h3>
            <p class="text-gray-600 text-sm mt-1">{{ $t('home.features.fastDeliveryDesc') }}</p>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-gray-200">
        <div class="flex items-center">
          <div class="p-2.5 bg-gray-100 rounded-lg">
            <svg class="w-7 h-7 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ $t('home.features.b2bSupportTitle') }}
            </h3>
            <p class="text-gray-600 text-sm mt-1">{{ $t('home.features.b2bSupportDesc') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Coming Soon Products Carousel -->
    <div class="mb-8">
      <div v-if="categoriesReady">
        <ProductCarousel :title="$t('home.carousel.comingSoon')" :coming-soon-only="true"
          view-all-link="/products?comingSoon=true" :can-order="false" />
      </div>
      <div v-else class="bg-white rounded-lg border border-gray-200 p-6">
        <div v-if="categoryStore.error" class="text-center py-10">
          <p class="text-sm text-gray-600 mb-4">{{ categoryStore.error || $t('categories.error') }}</p>
          <button class="btn-primary" @click="loadCategories">
            {{ $t('categories.tryAgain') }}
          </button>
        </div>
        <div v-else class="flex items-center justify-center h-48">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      </div>
    </div>

    <!-- Recent Activity or Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Quick Actions -->
      <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">{{ $t('home.quickActions.title') }}</h3>
        <div class="space-y-2">
          <router-link to="/products"
            class="flex items-center p-3 bg-gray-50 rounded-md hover:bg-primary-50 transition-colors duration-150 group border border-gray-100">
            <div class="p-1.5 bg-white rounded-md shadow-sm">
              <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span class="ml-3 text-gray-700 group-hover:text-primary-700 font-medium text-sm transition-colors">{{
              $t('home.quickActions.browseProducts') }}</span>
          </router-link>
          <router-link to="/orders"
            class="flex items-center p-3 bg-gray-50 rounded-md hover:bg-green-50 transition-colors duration-150 group border border-gray-100">
            <div class="p-1.5 bg-white rounded-md shadow-sm">
              <svg class="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span class="ml-3 text-gray-700 group-hover:text-success-700 font-medium text-sm transition-colors">{{
              $t('home.quickActions.viewOrderHistory') }}</span>
          </router-link>
          <router-link to="/profile"
            class="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors duration-150 group border border-gray-100">
            <div class="p-1.5 bg-white rounded-md shadow-sm">
              <svg class="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span class="ml-3 text-gray-700 group-hover:text-secondary-700 font-medium text-sm transition-colors">{{
              $t('home.quickActions.manageProfile') }}</span>
          </router-link>
        </div>
      </div>

      <!-- Account Status -->
      <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">{{ $t('home.accountStatus.title') }}</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium text-sm">{{
              $t('home.accountStatus.accountType')
            }}</span>
            <span class="font-semibold text-gray-900 text-sm">
              {{
                authStore.isAdmin
                  ? $t('home.accountStatus.administrator')
                  : $t('home.accountStatus.businessCustomer')
              }}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium text-sm">{{
              $t('home.accountStatus.verificationStatus')
            }}</span>
            <span class="flex items-center">
              <div :class="[
                'w-2 h-2 rounded-full mr-2',
                authStore.isVerified || authStore.isAdmin ? 'bg-success-500' : 'bg-warning-500',
              ]"></div>
              <span :class="[
                'font-semibold',
                authStore.isVerified || authStore.isAdmin
                  ? 'text-success-700'
                  : 'text-warning-700',
              ]">
                {{
                  authStore.isVerified || authStore.isAdmin
                    ? $t('home.accountStatus.verified')
                    : $t('home.accountStatus.pending')
                }}
              </span>
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium text-sm">{{
              $t('home.accountStatus.orderingCapability')
            }}</span>
            <span :class="[
              'font-semibold text-sm',
              authStore.isVerified || authStore.isAdmin ? 'text-success-700' : 'text-gray-500',
            ]">
              {{
                authStore.isVerified || authStore.isAdmin
                  ? $t('home.accountStatus.enabled')
                  : $t('home.accountStatus.disabled')
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useCategoryStore } from '../stores/categories';
import ProductCarousel from '../components/product/ProductCarousel.vue';

const authStore = useAuthStore();
const categoryStore = useCategoryStore();

const categoriesReady = computed(() => categoryStore.hasCategories);

const loadCategories = async () => {
  if (!categoryStore.isLoading) {
    await categoryStore.fetchCategories({ is_active: true });
  }
};

onMounted(loadCategories);
</script>
