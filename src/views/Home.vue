<template>
    <div>
        <!-- Welcome Banner -->
        <div class="bg-brand-gradient rounded-xl shadow-brand mb-8">
            <div class="px-8 py-12 text-center text-white">
                <!-- Logo and Title Combined -->
                <div class="flex justify-center items-center mb-6">
                    <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-lg mr-4">
                        <img src="/vite.svg" alt="4Tparts Logo" class="w-12 h-12 drop-shadow-lg">
                    </div>
                    <h1 class="text-4xl font-bold">Welcome to 4Tparts</h1>
                </div>
                <p class="text-xl text-primary-100 mb-6">
                    Your trusted partner for automotive parts and equipment
                </p>
                <div v-if="!authStore.isVerified && !authStore.isAdmin"
                    class="bg-warning-500/20 border border-warning-300 rounded-lg p-4 mb-6">
                    <p class="text-warning-100">
                        ⏳ Your account is pending verification. You'll be able to place orders once verified by our
                        team.
                    </p>
                </div>
                <router-link to="/products" class="btn-primary inline-flex items-center hover-lift transition-smooth">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Browse Our Catalog
                </router-link>
            </div>
        </div>

        <!-- Quick Stats for Users -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="card card-hover transition-smooth">
                <div class="flex items-center">
                    <div class="p-3 bg-primary-100 rounded-lg">
                        <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold" style="color: var(--color-text-primary)">Premium Parts</h3>
                        <p style="color: var(--color-text-secondary)">High-quality automotive components</p>
                    </div>
                </div>
            </div>

            <div class="card card-hover transition-smooth">
                <div class="flex items-center">
                    <div class="p-3 bg-success-100 rounded-lg">
                        <svg class="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <div class="card card-hover transition-smooth">
                <div class="flex items-center">
                    <div class="p-3 bg-secondary-100 rounded-lg">
                        <svg class="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <!-- Featured Categories Section -->
        <div class="card mb-8">
            <h2 class="text-2xl font-bold mb-6 text-center" style="color: var(--color-text-primary)">Featured Categories
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <router-link to="/products?category=Engine"
                    class="category-engine rounded-xl p-6 hover:shadow-lg transition-smooth transform hover-lift">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
                            style="background-color: var(--color-automotive-engine); color: white;">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-blue-600">Engine Parts</h3>
                        <p class="text-sm text-gray-600 mt-1">High-performance engine components</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Brakes"
                    class="category-brake rounded-xl p-6 hover:shadow-lg transition-smooth transform hover-lift">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
                            style="background-color: var(--color-automotive-brake); color: white;">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-red-600">Brake Systems</h3>
                        <p class="text-sm text-gray-600 mt-1">Safety-critical brake components</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Suspension"
                    class="category-suspension rounded-xl p-6 hover:shadow-lg transition-smooth transform hover-lift">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
                            style="background-color: var(--color-automotive-suspension); color: white;">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-green-600">Suspension</h3>
                        <p class="text-sm text-gray-600 mt-1">Comfort and handling solutions</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Tools"
                    class="category-tools rounded-xl p-6 hover:shadow-lg transition-smooth transform hover-lift">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors"
                            style="background-color: var(--color-automotive-tools); color: white;">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-purple-600">Tools & Equipment</h3>
                        <p class="text-sm text-gray-600 mt-1">Professional automotive tools</p>
                    </div>
                </router-link>
            </div>
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

const authStore = useAuthStore()
</script>
