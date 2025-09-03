<template>
    <div>
        <!-- Welcome Banner -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg mb-8">
            <div class="px-8 py-12 text-center text-white">
                <h1 class="text-4xl font-bold mb-4">Welcome to Motordash B2B</h1>
                <p class="text-xl text-blue-100 mb-6">
                    Your trusted partner for automotive parts and equipment
                </p>
                <div v-if="!authStore.isVerified && !authStore.isAdmin"
                    class="bg-yellow-500 bg-opacity-20 border border-yellow-300 rounded-lg p-4 mb-6">
                    <p class="text-yellow-100">
                        ⏳ Your account is pending verification. You'll be able to place orders once verified by our
                        team.
                    </p>
                </div>
                <router-link to="/products"
                    class="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg">
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
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-blue-100 rounded-lg">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-900">Premium Parts</h3>
                        <p class="text-gray-600">High-quality automotive components</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-green-100 rounded-lg">
                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-900">Fast Delivery</h3>
                        <p class="text-gray-600">Quick shipping across Europe</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-purple-100 rounded-lg">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-900">B2B Support</h3>
                        <p class="text-gray-600">Dedicated business support</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Featured Categories Section -->
        <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Featured Categories</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <router-link to="/products?category=Engine"
                    class="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 transform hover:scale-105">
                    <div class="text-center">
                        <div
                            class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 transition-colors">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-blue-600">Engine Parts</h3>
                        <p class="text-sm text-gray-600 mt-1">High-performance engine components</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Brakes"
                    class="group bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 hover:from-red-100 hover:to-red-200 transition-all duration-200 transform hover:scale-105">
                    <div class="text-center">
                        <div
                            class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-600 transition-colors">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-red-600">Brake Systems</h3>
                        <p class="text-sm text-gray-600 mt-1">Safety-critical brake components</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Suspension"
                    class="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 hover:from-green-100 hover:to-green-200 transition-all duration-200 transform hover:scale-105">
                    <div class="text-center">
                        <div
                            class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 transition-colors">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-green-600">Suspension</h3>
                        <p class="text-sm text-gray-600 mt-1">Comfort and handling solutions</p>
                    </div>
                </router-link>

                <router-link to="/products?category=Tools"
                    class="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 hover:from-purple-100 hover:to-purple-200 transition-all duration-200 transform hover:scale-105">
                    <div class="text-center">
                        <div
                            class="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 transition-colors">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div class="space-y-3">
                    <router-link to="/products"
                        class="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                        <svg class="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-blue-600 font-medium">Browse All Products</span>
                    </router-link>
                    <router-link to="/products"
                        class="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                        <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-blue-600 font-medium">View Order History</span>
                    </router-link>
                    <router-link to="/checkout"
                        class="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                        <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9" />
                        </svg>
                        <span class="text-gray-700 group-hover:text-blue-600 font-medium">View checkout</span>
                    </router-link>
                </div>
            </div>

            <!-- Account Status -->
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span class="text-gray-700">Account Type</span>
                        <span class="font-medium text-gray-900">
                            {{ authStore.isAdmin ? 'Administrator' : 'Business Customer' }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span class="text-gray-700">Verification Status</span>
                        <span class="flex items-center">
                            <div :class="[
                                'w-2 h-2 rounded-full mr-2',
                                authStore.isVerified || authStore.isAdmin ? 'bg-green-500' : 'bg-yellow-500'
                            ]"></div>
                            <span class="font-medium text-gray-900">
                                {{ authStore.isVerified || authStore.isAdmin ? 'Verified' : 'Pending' }}
                            </span>
                        </span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span class="text-gray-700">Ordering Capability</span>
                        <span class="font-medium text-gray-900">
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
