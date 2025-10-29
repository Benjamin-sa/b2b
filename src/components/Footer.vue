<template>
    <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="max-w-screen-2xl mx-auto py-8 px-4 sm:px-8 lg:px-14">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Company Info -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ $t('footer.company.title') }}</h3>
                    <p class="text-gray-600 text-sm">
                        {{ $t('footer.company.description') }}
                    </p>
                </div>

                <!-- Quick Links -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ $t('footer.quickLinks.title') }}</h3>
                    <ul class="space-y-2">
                        <li>
                            <router-link to="/" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                {{ $t('footer.quickLinks.home') }}
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/products"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                {{ $t('footer.quickLinks.products') }}
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/orders"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                {{ $t('footer.quickLinks.orders') }}
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/profile"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                {{ $t('footer.quickLinks.profile') }}
                            </router-link>
                        </li>
                    </ul>
                </div>

                <!-- Contact Info -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ $t('footer.contact.title') }}</h3>
                    <div class="space-y-2 text-sm text-gray-600">
                        <p>{{ $t('footer.contact.email') }}</p>
                        <p>{{ $t('footer.contact.phone') }}</p>
                    </div>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-gray-200 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center">
                <p class="text-sm text-gray-500">
                    © {{ currentYear }} {{ $t('footer.bottom.copyright') }}
                </p>
                <div class="flex space-x-6 mt-4 sm:mt-0">
                    <router-link to="/privacy" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {{ $t('footer.bottom.privacy') }}
                    </router-link>
                    <router-link to="/terms" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {{ $t('footer.bottom.terms') }}
                    </router-link>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>
