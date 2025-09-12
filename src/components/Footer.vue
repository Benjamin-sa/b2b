<template>
    <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="max-w-screen-2xl mx-auto py-8 px-4 sm:px-8 lg:px-14">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Company Info -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">B2B Platform</h3>
                    <p class="text-gray-600 text-sm">
                        Your trusted business partner for wholesale products and services.
                    </p>
                </div>

                <!-- Quick Links -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
                    <ul class="space-y-2">
                        <li>
                            <router-link to="/" class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                Home
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/products"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                Products
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/orders"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                Orders
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/profile"
                                class="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                                Profile
                            </router-link>
                        </li>
                    </ul>
                </div>

                <!-- Contact Info -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
                    <div class="space-y-2 text-sm text-gray-600">
                        <p>Email: support@b2bplatform.com</p>
                        <p>Phone: +31 (0) 20 123 4567</p>
                    </div>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-gray-200 pt-6 mt-6 flex flex-col sm:flex-row justify-between items-center">
                <p class="text-sm text-gray-500">
                    © {{ currentYear }} B2B Platform. All rights reserved.
                </p>
                <div class="flex space-x-6 mt-4 sm:mt-0">
                    <a href="#" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        Privacy Policy
                    </a>
                    <a href="#" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        Terms of Service
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>
