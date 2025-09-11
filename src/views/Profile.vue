<template>
    <div class="min-h-screen bg-secondary-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-secondary-900">Account</h1>
                <p class="text-secondary-600 mt-2">Manage your profile and account settings</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Profile Information -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-secondary-200">
                            <div class="flex items-center justify-between">
                                <h2 class="text-xl font-semibold text-secondary-900">Profile Information</h2>
                            </div>
                        </div>

                        <div class="px-6 py-6">
                            <!-- Read-only Profile Display -->
                            <div class="space-y-6">
                                <!-- Personal Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.firstName }}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.lastName }}</p>
                                    </div>
                                </div>

                                <!-- Company Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.companyName }}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">BTW Number</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.btwNumber }}</p>
                                    </div>
                                </div>

                                <!-- Contact Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.email }}</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <p class="text-gray-900">{{ authStore.userProfile?.phone || 'Not provided' }}
                                        </p>
                                    </div>
                                </div>

                                <!-- Address Information -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <div class="text-gray-900">
                                        <p>{{ authStore.userProfile?.address.street }} {{
                                            authStore.userProfile?.address.houseNumber }}</p>
                                        <p>{{ authStore.userProfile?.address.postalCode }} {{
                                            authStore.userProfile?.address.city }}</p>
                                        <p>{{ authStore.userProfile?.address.country }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Account Sidebar -->
                <div class="space-y-6">
                    <!-- Account Status -->
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900">Account Status</h3>
                        </div>
                        <div class="px-6 py-4 space-y-4">
                            <!-- Account Status -->
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Account Status</span>
                                <span :class="[
                                    authStore.isActiveUser ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100',
                                    'px-2 py-1 rounded-full text-xs font-medium'
                                ]">
                                    {{ authStore.isActiveUser ? 'Active' : 'Inactive' }}
                                </span>
                            </div>

                            <!-- Verification Status -->
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Verification Status</span>
                                <span :class="[
                                    authStore.isVerified ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100',
                                    'px-2 py-1 rounded-full text-xs font-medium'
                                ]">
                                    {{ authStore.isVerified ? 'Verified' : 'Pending Verification' }}
                                </span>
                            </div>

                            <!-- Account Type -->
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Account Type</span>
                                <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                                    {{ authStore.userProfile?.role === 'admin' ? 'Administrator' : 'Business Customer'
                                    }}
                                </span>
                            </div>

                            <!-- Member Since -->
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Member Since</span>
                                <span class="text-sm text-gray-900">
                                    {{ formatDate(authStore.userProfile?.createdAt) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
                        </div>
                        <div class="px-6 py-4 space-y-3">
                            <router-link to="/orders"
                                class="flex items-center p-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                    <div class="font-medium">My Orders</div>
                                    <div class="text-sm text-gray-500">View order history and invoices</div>
                                </div>
                            </router-link>

                            <router-link to="/products"
                                class="flex items-center p-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <div>
                                    <div class="font-medium">Browse Products</div>
                                    <div class="text-sm text-gray-500">Explore our product catalog</div>
                                </div>
                            </router-link>

                            <button @click="authStore.logout"
                                class="flex items-center w-full p-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                <svg class="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <div>
                                    <div class="font-medium">Sign Out</div>
                                    <div class="text-sm text-gray-500">Logout from your account</div>
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
                                    Account Verification Pending
                                </h3>
                                <div class="mt-2 text-sm text-yellow-700">
                                    <p>Your account is pending verification by our team. You'll receive an email
                                        confirmation once approved.</p>
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
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'

    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    } catch {
        return 'N/A'
    }
}

// Make sure user profile is loaded
onMounted(() => {
    if (!authStore.userProfile && authStore.user) {
        // Try to reload user profile if not available
        authStore.initAuth()
    }
})
</script>

<style scoped>
/* No additional styles needed */
</style>
