<template>
    <div>
        <!-- Welcome Banner -->
        <div class="bg-brand-gradient rounded-xl shadow-brand mb-8">
            <div class="px-8 py-8 text-center text-white">
                <!-- Centered Logo -->
                <div class="flex justify-center items-center mb-4">
                    <img src="/vite.svg" alt="4Tparts Logo" class="w-30 h-30">
                </div>
                <p class="text-xl text-primary-100 mb-4">
                    Your trusted partner for 4-stroke parts and accessories.
                </p>
                <div v-if="!authStore.isVerified && !authStore.isAdmin"
                    class="bg-warning-500/20 border border-warning-300 rounded-lg p-4 mb-6">
                    <p class="text-warning-100">
                        ⏳ Your account is pending verification. You'll be able to place orders once verified by our
                        team.
                    </p>
                </div>
                <router-link to="/products"
                    class="btn-primary inline-flex items-center hover:bg-brand-primary-hover transition-smooth text-lg font-semibold">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    View products
                </router-link>
            </div>
        </div>

        <!-- Quick Stats for Users -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="card card-hover transition-smooth py-4">
                <div class="flex items-center">
                    <div class="p-2 bg-primary-100 rounded-lg">
                        <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold" style="color: var(--color-text-primary)">4 -stroke Parts</h3>
                        <p style="color: var(--color-text-secondary)">Parts and accessories for Dax, Monkey, Pitbike and
                            more</p>
                    </div>
                </div>
            </div>

            <div class="card card-hover transition-smooth py-4">
                <div class="flex items-center">
                    <div class="p-2 bg-success-100 rounded-lg">
                        <svg class="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold" style="color: var(--color-text-primary)">Fast Delivery</h3>
                        <p style="color: var(--color-text-secondary)">Quick shipping across Europe</p>
                    </div>
                </div>
            </div>

            <div class="card card-hover transition-smooth py-4">
                <div class="flex items-center">
                    <div class="p-2 bg-secondary-100 rounded-lg">
                        <svg class="w-8 h-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold" style="color: var(--color-text-primary)">B2B Support</h3>
                        <p style="color: var(--color-text-secondary)">Dedicated business support</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Newest Products Carousel -->
        <div class="mb-8">
            <ProductCarousel title="Newest products"
                :filters="{ sortBy: 'createdAt', sortOrder: 'desc', inStock: true }"
                view-all-link="/products?sort=newest" :can-order="authStore.canAccess" />
        </div>


        <!-- Recent Activity or Quick Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Quick Actions -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text-primary)">Quick Actions</h3>
                <div class="space-y-3">
                    <router-link to="/products"
                        class="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-smooth hover-lift group">
                        <svg class="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-primary-600 font-medium transition-smooth">Browse
                            All Products</span>
                    </router-link>
                    <router-link to="/orders"
                        class="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-smooth hover-lift group">
                        <svg class="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-primary-600 font-medium transition-smooth">View
                            Order History</span>
                    </router-link>
                    <router-link to="/profile"
                        class="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-smooth hover-lift group">
                        <svg class="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-primary-600 font-medium transition-smooth">Manage My
                            Profile</span>
                    </router-link>
                </div>
            </div>

            <!-- Account Status -->
            <div class="card">
                <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text-primary)">Account Status</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <span style="color: var(--color-text-secondary)">Account Type</span>
                        <span class="font-medium" style="color: var(--color-text-primary)">
                            {{ authStore.isAdmin ? 'Administrator' : 'Business Customer' }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <span style="color: var(--color-text-secondary)">Verification Status</span>
                        <span class="flex items-center">
                            <div :class="[
                                'w-2 h-2 rounded-full mr-2',
                                authStore.isVerified || authStore.isAdmin ? 'bg-success-500' : 'bg-warning-500'
                            ]"></div>
                            <span class="font-medium" style="color: var(--color-text-primary)">
                                {{ authStore.isVerified || authStore.isAdmin ? 'Verified' : 'Pending' }}
                            </span>
                        </span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <span style="color: var(--color-text-secondary)">Ordering Capability</span>
                        <span class="font-medium" style="color: var(--color-text-primary)">
                            {{ authStore.isVerified || authStore.isAdmin ? 'Enabled' : 'Disabled' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import ProductCarousel from '../components/ProductCarousel.vue'

const authStore = useAuthStore()
</script>
