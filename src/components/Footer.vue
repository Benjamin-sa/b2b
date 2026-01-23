<template>
  <footer
    class="bg-gradient-to-br from-white to-gray-50 border-t-2 border-primary-200 mt-auto shadow-2xl"
  >
    <div class="max-w-screen-2xl mx-auto py-12 px-4 sm:px-8 lg:px-14">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
        <!-- Company Info -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-primary-700 mb-4 flex items-center">
            <div
              class="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mr-3"
            >
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            {{ $t('footer.company.title') }}
          </h3>
          <p class="text-gray-600 text-sm leading-relaxed">
            {{ $t('footer.company.description') }}
          </p>
        </div>

        <!-- Quick Links -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-primary-700 mb-4 flex items-center">
            <div
              class="w-8 h-8 bg-gradient-to-br from-success-100 to-success-200 rounded-lg flex items-center justify-center mr-3"
            >
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            {{ $t('footer.quickLinks.title') }}
          </h3>
          <ul class="space-y-3">
            <li>
              <router-link
                to="/"
                class="text-gray-600 hover:text-primary-600 text-sm transition-all duration-200 flex items-center group"
              >
                <svg
                  class="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {{ $t('footer.quickLinks.home') }}
              </router-link>
            </li>
            <li>
              <router-link
                to="/products"
                class="text-gray-600 hover:text-primary-600 text-sm transition-all duration-200 flex items-center group"
              >
                <svg
                  class="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {{ $t('footer.quickLinks.products') }}
              </router-link>
            </li>
            <li>
              <router-link
                to="/orders"
                class="text-gray-600 hover:text-primary-600 text-sm transition-all duration-200 flex items-center group"
              >
                <svg
                  class="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {{ $t('footer.quickLinks.orders') }}
              </router-link>
            </li>
            <li>
              <router-link
                to="/profile"
                class="text-gray-600 hover:text-primary-600 text-sm transition-all duration-200 flex items-center group"
              >
                <svg
                  class="w-4 h-4 mr-2 text-gray-400 group-hover:text-primary-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {{ $t('footer.quickLinks.profile') }}
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Contact Info -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-primary-700 mb-4 flex items-center">
            <div
              class="w-8 h-8 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-lg flex items-center justify-center mr-3"
            >
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            {{ $t('footer.contact.title') }}
          </h3>
          <div class="space-y-3 text-sm text-gray-600">
            <p class="flex items-center">
              <svg
                class="w-4 h-4 mr-2 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {{ $t('footer.contact.email') }}
            </p>
            <p class="flex items-center">
              <svg
                class="w-4 h-4 mr-2 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {{ $t('footer.contact.phone') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div
        class="border-t-2 border-primary-100 pt-8 mt-10 flex flex-col sm:flex-row justify-between items-center bg-gradient-to-r from-primary-50 to-white rounded-lg px-6 py-4"
      >
        <p class="text-sm text-gray-600 font-medium">
          © {{ currentYear }} {{ $t('footer.bottom.copyright') }}
        </p>
        <div class="flex space-x-6 mt-4 sm:mt-0">
          <router-link
            to="/privacy"
            class="text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium"
          >
            {{ $t('footer.bottom.privacy') }}
          </router-link>
          <router-link
            to="/terms"
            class="text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium"
          >
            {{ $t('footer.bottom.terms') }}
          </router-link>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>
