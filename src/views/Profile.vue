<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h1 class="text-3xl font-bold text-gray-900">{{ $t('profile.header.title') }}</h1>
        <p class="text-gray-600 mt-2">{{ $t('profile.header.subtitle') }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Profile Information -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="px-6 py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-900">
                  {{ $t('profile.sections.profileInfo') }}
                </h2>
              </div>
            </div>

            <div class="px-6 py-8">
              <!-- Read-only Profile Display -->
              <div class="space-y-8">
                <!-- Personal Information -->
                <div>
                  <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Personal Information
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.firstName')
                      }}</label>
                      <p class="text-gray-900 font-medium">
                        {{ authStore.userProfile?.first_name }}
                      </p>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.lastName')
                      }}</label>
                      <p class="text-gray-900 font-medium">{{ authStore.userProfile?.last_name }}</p>
                    </div>
                  </div>
                </div>

                <!-- Company Information -->
                <div>
                  <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Company Information
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.companyName')
                      }}</label>
                      <p class="text-gray-900 font-medium">
                        {{ authStore.userProfile?.company_name }}
                      </p>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.btwNumber')
                      }}</label>
                      <p class="text-gray-900 font-medium">
                        {{ authStore.userProfile?.btw_number }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Contact Information -->
                <div>
                  <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.email')
                      }}</label>
                      <p class="text-gray-900 font-medium">{{ authStore.userProfile?.email }}</p>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <label class="block text-sm font-semibold text-gray-600 mb-2">{{
                        $t('profile.fields.phone')
                      }}</label>
                      <p class="text-gray-900 font-medium">
                        {{ authStore.userProfile?.phone || $t('profile.fields.notProvided') }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Address Information -->
                <div>
                  <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Address
                  </h3>
                  <div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div class="text-gray-900 font-medium space-y-1">
                      <p>
                        {{ authStore.userProfile?.address_street }}
                        {{ authStore.userProfile?.address_house_number }}
                      </p>
                      <p>
                        {{ authStore.userProfile?.address_postal_code }}
                        {{ authStore.userProfile?.address_city }}
                      </p>
                      <p>{{ authStore.userProfile?.address_country }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Sidebar -->
        <div class="space-y-6">
          <!-- Account Status -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="px-6 py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <h3 class="text-lg font-bold text-gray-900">
                {{ $t('profile.sections.accountStatus') }}
              </h3>
            </div>
            <div class="px-6 py-6 space-y-4">
              <!-- Account Status -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span class="text-sm font-semibold text-gray-700">{{
                  $t('profile.status.accountStatus')
                }}</span>
                <span :class="[
                  authStore.isActiveUser
                    ? 'text-success-700 bg-success-100 border-success-200'
                    : 'text-danger-700 bg-danger-100 border-danger-200',
                  'px-3 py-1.5 rounded-full text-xs font-bold border',
                ]">
                  {{
                    authStore.isActiveUser
                      ? $t('profile.status.active')
                      : $t('profile.status.inactive')
                  }}
                </span>
              </div>

              <!-- Verification Status -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span class="text-sm font-semibold text-gray-700">{{
                  $t('profile.status.verificationStatus')
                }}</span>
                <span :class="[
                  authStore.isVerified
                    ? 'text-success-700 bg-success-100 border-success-200'
                    : 'text-warning-700 bg-warning-100 border-warning-200',
                  'px-3 py-1.5 rounded-full text-xs font-bold border flex items-center space-x-1',
                ]">
                  <div :class="[
                    'w-2 h-2 rounded-full animate-pulse',
                    authStore.isVerified ? 'bg-success-500' : 'bg-warning-500',
                  ]"></div>
                  <span>{{
                    authStore.isVerified
                      ? $t('profile.status.verified')
                      : $t('profile.status.pendingVerification')
                  }}</span>
                </span>
              </div>

              <!-- Account Type -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span class="text-sm font-semibold text-gray-700">{{
                  $t('profile.status.accountType')
                }}</span>
                <span
                  class="px-3 py-1.5 bg-primary-100 text-primary-700 border border-primary-200 rounded-full text-xs font-bold">
                  {{
                    authStore.userProfile?.role === 'admin'
                      ? $t('profile.status.administrator')
                      : $t('profile.status.businessCustomer')
                  }}
                </span>
              </div>

              <!-- Member Since -->
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span class="text-sm font-semibold text-gray-700">{{
                  $t('profile.status.memberSince')
                }}</span>
                <span class="text-sm font-bold text-gray-900">
                  {{ formatDate(authStore.userProfile?.created_at ?? undefined) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div class="px-6 py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <h3 class="text-lg font-bold text-gray-900">
                {{ $t('profile.sections.quickActions') }}
              </h3>
            </div>
            <div class="px-4 py-5 space-y-2">
              <router-link to="/orders"
                class="flex items-center p-4 text-gray-700 bg-gradient-to-r from-success-50 to-success-100 hover:from-success-100 hover:to-success-200 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md border border-success-200 group">
                <div class="p-2 bg-white rounded-lg shadow-sm">
                  <svg class="w-5 h-5 text-success-600 group-hover:text-success-700" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="ml-3">
                  <div class="font-bold text-gray-900">
                    {{ $t('profile.actions.myOrders.title') }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ $t('profile.actions.myOrders.description') }}
                  </div>
                </div>
              </router-link>

              <router-link to="/products"
                class="flex items-center p-4 text-gray-700 bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md border border-primary-200 group">
                <div class="p-2 bg-white rounded-lg shadow-sm">
                  <svg class="w-5 h-5 text-primary-600 group-hover:text-primary-700" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div class="ml-3">
                  <div class="font-bold text-gray-900">
                    {{ $t('profile.actions.browseProducts.title') }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ $t('profile.actions.browseProducts.description') }}
                  </div>
                </div>
              </router-link>

              <button
                class="flex items-center w-full p-4 text-gray-700 bg-gradient-to-r from-danger-50 to-danger-100 hover:from-danger-100 hover:to-danger-200 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md border border-danger-200 group"
                @click="authStore.logout">
                <div class="p-2 bg-white rounded-lg shadow-sm">
                  <svg class="w-5 h-5 text-danger-600 group-hover:text-danger-700" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div class="ml-3 text-left">
                  <div class="font-bold text-gray-900">
                    {{ $t('profile.actions.signOut.title') }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ $t('profile.actions.signOut.description') }}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Verification Notice -->
          <div v-if="!authStore.isVerified" class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div class="flex">
              <svg class="flex-shrink-0 w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">
                  {{ $t('profile.verification.title') }}
                </h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <p>{{ $t('profile.verification.message') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

// Make sure user profile is loaded
onMounted(() => {
  if (!authStore.userProfile && authStore.user) {
    // Try to reload user profile if not available
    authStore.initAuth();
  }
});
</script>

<style scoped>
/* No additional styles needed */
</style>
