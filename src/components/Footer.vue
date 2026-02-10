<template>
  <footer class="bg-white border-t border-gray-200 mt-auto">
    <div class="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Company Info -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
            <svg class="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {{ $t('footer.company.title') }}
          </h3>
          <p class="text-gray-500 text-sm leading-relaxed">
            {{ $t('footer.company.description') }}
          </p>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
            <svg class="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ $t('footer.quickLinks.title') }}
          </h3>
          <ul class="space-y-2">
            <li>
              <router-link to="/" class="text-gray-500 hover:text-primary-600 text-sm transition-colors duration-150">
                {{ $t('footer.quickLinks.home') }}
              </router-link>
            </li>
            <li>
              <router-link to="/products"
                class="text-gray-500 hover:text-primary-600 text-sm transition-colors duration-150">
                {{ $t('footer.quickLinks.products') }}
              </router-link>
            </li>
            <li>
              <router-link to="/orders"
                class="text-gray-500 hover:text-primary-600 text-sm transition-colors duration-150">
                {{ $t('footer.quickLinks.orders') }}
              </router-link>
            </li>
            <li>
              <router-link to="/profile"
                class="text-gray-500 hover:text-primary-600 text-sm transition-colors duration-150">
                {{ $t('footer.quickLinks.profile') }}
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Contact Info -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
            <svg class="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {{ $t('footer.contact.title') }}
          </h3>
          <div class="space-y-2 text-sm text-gray-500">
            <p class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {{ $t('footer.contact.email') }}
            </p>
            <p class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {{ $t('footer.contact.phone') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-gray-100 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center">
        <p class="text-xs text-gray-400">
          © {{ currentYear }} {{ $t('footer.bottom.copyright') }}
        </p>
        <div class="flex space-x-6 mt-3 sm:mt-0">
          <router-link to="/privacy" class="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150">
            {{ $t('footer.bottom.privacy') }}
          </router-link>
          <router-link to="/terms" class="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150">
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
