<template>
  <div>
    <!-- Welcome Banner -->
    <div class="bg-brand-gradient rounded-xl shadow-brand mb-8">
      <div class="px-8 py-8 text-center text-white">
        <!-- Centered Logo -->
        <div class="flex justify-center items-center mb-4">
          <img src="/vite.svg" alt="4Tparts Logo" class="w-30 h-30" />
        </div>
        <p class="text-xl text-primary-100 mb-4">
          {{ $t('home.welcome.trustedPartner') }}
        </p>
        <div
          v-if="!authStore.isVerified && !authStore.isAdmin"
          class="bg-warning-500/20 border border-warning-300 rounded-lg p-4 mb-6"
        >
          <p class="text-warning-100">
            {{ $t('home.welcome.pendingVerification') }}
          </p>
        </div>
        <router-link
          to="/products"
          class="btn-primary inline-flex items-center hover:bg-brand-primary-hover transition-smooth text-lg font-semibold"
        >
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          {{ $t('home.welcome.viewProducts') }}
        </router-link>
      </div>
    </div>

    <!-- Quick Stats for Users -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-primary-100"
      >
        <div class="flex items-center">
          <div class="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
            <svg
              class="w-8 h-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
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
        class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-success-100"
      >
        <div class="flex items-center">
          <div class="p-3 bg-gradient-to-br from-success-100 to-success-200 rounded-xl">
            <svg
              class="w-8 h-8 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
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
        class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-secondary-200"
      >
        <div class="flex items-center">
          <div class="p-3 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-xl">
            <svg
              class="w-8 h-8 text-secondary-600"
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
      <ProductCarousel
        :title="$t('home.carousel.comingSoon')"
        :coming-soon-only="true"
        view-all-link="/products?comingSoon=true"
        :can-order="false"
      />
    </div>

    <!-- Recent Activity or Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Quick Actions -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h3 class="text-xl font-bold mb-5 text-gray-900">{{ $t('home.quickActions.title') }}</h3>
        <div class="space-y-3">
          <router-link
            to="/products"
            class="flex items-center p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg hover:from-primary-100 hover:to-primary-200 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md group border border-primary-200"
          >
            <div class="p-2 bg-white rounded-lg shadow-sm">
              <svg
                class="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <span
              class="ml-3 text-gray-900 group-hover:text-primary-700 font-semibold transition-colors"
              >{{ $t('home.quickActions.browseProducts') }}</span
            >
          </router-link>
          <router-link
            to="/orders"
            class="flex items-center p-4 bg-gradient-to-r from-success-50 to-success-100 rounded-lg hover:from-success-100 hover:to-success-200 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md group border border-success-200"
          >
            <div class="p-2 bg-white rounded-lg shadow-sm">
              <svg
                class="w-5 h-5 text-success-600"
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
            <span
              class="ml-3 text-gray-900 group-hover:text-success-700 font-semibold transition-colors"
              >{{ $t('home.quickActions.viewOrderHistory') }}</span
            >
          </router-link>
          <router-link
            to="/profile"
            class="flex items-center p-4 bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-lg hover:from-secondary-100 hover:to-secondary-200 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md group border border-secondary-200"
          >
            <div class="p-2 bg-white rounded-lg shadow-sm">
              <svg
                class="w-5 h-5 text-secondary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <span
              class="ml-3 text-gray-900 group-hover:text-secondary-700 font-semibold transition-colors"
              >{{ $t('home.quickActions.manageProfile') }}</span
            >
          </router-link>
        </div>
      </div>

      <!-- Account Status -->
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h3 class="text-xl font-bold mb-5 text-gray-900">{{ $t('home.accountStatus.title') }}</h3>
        <div class="space-y-3">
          <div
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
          >
            <span class="text-gray-600 font-medium">{{
              $t('home.accountStatus.accountType')
            }}</span>
            <span class="font-semibold text-gray-900">
              {{
                authStore.isAdmin
                  ? $t('home.accountStatus.administrator')
                  : $t('home.accountStatus.businessCustomer')
              }}
            </span>
          </div>
          <div
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
          >
            <span class="text-gray-600 font-medium">{{
              $t('home.accountStatus.verificationStatus')
            }}</span>
            <span class="flex items-center">
              <div
                :class="[
                  'w-2.5 h-2.5 rounded-full mr-2 animate-pulse',
                  authStore.isVerified || authStore.isAdmin ? 'bg-success-500' : 'bg-warning-500',
                ]"
              ></div>
              <span
                :class="[
                  'font-semibold',
                  authStore.isVerified || authStore.isAdmin
                    ? 'text-success-700'
                    : 'text-warning-700',
                ]"
              >
                {{
                  authStore.isVerified || authStore.isAdmin
                    ? $t('home.accountStatus.verified')
                    : $t('home.accountStatus.pending')
                }}
              </span>
            </span>
          </div>
          <div
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
          >
            <span class="text-gray-600 font-medium">{{
              $t('home.accountStatus.orderingCapability')
            }}</span>
            <span
              :class="[
                'font-semibold',
                authStore.isVerified || authStore.isAdmin ? 'text-success-700' : 'text-gray-500',
              ]"
            >
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
import { useAuthStore } from '../stores/auth';
import ProductCarousel from '../components/product/ProductCarousel.vue';

const authStore = useAuthStore();
</script>
