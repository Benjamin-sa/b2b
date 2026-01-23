<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="text-center max-w-xl">
      <!-- 404 Illustration -->
      <div class="mb-8">
        <div class="relative inline-block">
          <span class="text-9xl font-bold bg-brand-gradient bg-clip-text text-transparent"
            >404</span
          >
          <div class="absolute -top-4 -right-4 animate-bounce">
            <svg
              class="w-12 h-12 text-warning-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {{ $t('notFound.title') }}
      </h1>
      <p class="text-lg text-gray-600 mb-8">
        {{ $t('notFound.description') }}
      </p>

      <!-- Quick Actions -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <router-link to="/" class="btn-primary inline-flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {{ $t('notFound.backHome') }}
        </router-link>
        <button class="btn-secondary inline-flex items-center justify-center" @click="goBack">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {{ $t('notFound.goBack') }}
        </button>
      </div>

      <!-- Helpful Links -->
      <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          {{ $t('notFound.helpfulLinks') }}
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <router-link
            to="/products"
            class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all duration-200 group"
          >
            <div
              class="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors mb-2"
            >
              <svg
                class="w-6 h-6 text-primary-600"
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
            <span class="text-sm font-medium text-gray-700 group-hover:text-primary-600">
              {{ $t('navigation.products') }}
            </span>
          </router-link>

          <router-link
            to="/categories"
            class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-success-300 hover:shadow-md transition-all duration-200 group"
          >
            <div
              class="p-2 bg-success-100 rounded-lg group-hover:bg-success-200 transition-colors mb-2"
            >
              <svg
                class="w-6 h-6 text-success-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700 group-hover:text-success-600">
              {{ $t('navigation.categories') }}
            </span>
          </router-link>

          <router-link
            to="/orders"
            class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-warning-300 hover:shadow-md transition-all duration-200 group"
          >
            <div
              class="p-2 bg-warning-100 rounded-lg group-hover:bg-warning-200 transition-colors mb-2"
            >
              <svg
                class="w-6 h-6 text-warning-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700 group-hover:text-warning-600">
              {{ $t('navigation.orders') }}
            </span>
          </router-link>

          <router-link
            to="/profile"
            class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-100 hover:border-info-300 hover:shadow-md transition-all duration-200 group"
          >
            <div class="p-2 bg-info-100 rounded-lg group-hover:bg-info-200 transition-colors mb-2">
              <svg
                class="w-6 h-6 text-info-600"
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
            <span class="text-sm font-medium text-gray-700 group-hover:text-info-600">
              {{ $t('navigation.profile') }}
            </span>
          </router-link>
        </div>
      </div>

      <!-- Contact Support -->
      <p class="mt-8 text-gray-500 text-sm">
        {{ $t('notFound.needHelp') }}
        <a
          href="mailto:support@4Tparts.com"
          class="text-primary-600 hover:text-primary-700 font-medium"
        >
          support@4Tparts.com
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  // If there's history, go back; otherwise go to home
  if (window.history.length > 2) {
    router.back();
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
.bg-brand-gradient {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-700) 100%);
}
</style>
