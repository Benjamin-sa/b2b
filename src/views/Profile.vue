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
                                <button v-if="!isEditing" @click="startEditing"
                                    class="inline-flex items-center px-3 py-1.5 border border-secondary-300 shadow-sm text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50">
                                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Profile
                                </button>
                            </div>
                        </div>

                        <div class="px-6 py-6">
                            <form v-if="isEditing" @submit.prevent="saveProfile" class="space-y-6">
                                <!-- Personal Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-secondary-700 mb-2">
                                            First Name *
                                        </label>
                                        <input v-model="editForm.firstName" type="text" required
                                            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-secondary-700 mb-2">
                                            Last Name *
                                        </label>
                                        <input v-model="editForm.lastName" type="text" required
                                            class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                    </div>
                                </div>

                                <!-- Company Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Company Name *
                                        </label>
                                        <input v-model="editForm.companyName" type="text" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            BTW Number *
                                        </label>
                                        <input v-model="editForm.btwNumber" type="text" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    </div>
                                </div>

                                <!-- Contact Information -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input :value="authStore.userProfile?.email" type="email" disabled
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                                        <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Phone
                                        </label>
                                        <input v-model="editForm.phone" type="tel"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    </div>
                                </div>

                                <!-- Address Information -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">Address</h3>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div class="md:col-span-2">
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                Street *
                                            </label>
                                            <input v-model="editForm.address.street" type="text" required
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                House Number *
                                            </label>
                                            <input v-model="editForm.address.houseNumber" type="text" required
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                Postal Code *
                                            </label>
                                            <input v-model="editForm.address.postalCode" type="text" required
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                City *
                                            </label>
                                            <input v-model="editForm.address.city" type="text" required
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                Country *
                                            </label>
                                            <input v-model="editForm.address.country" type="text" required
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        </div>
                                    </div>
                                </div>

                                <!-- Form Actions -->
                                <div class="flex items-center justify-end space-x-4 pt-4 border-t border-secondary-200">
                                    <button type="button" @click="cancelEditing"
                                        class="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 bg-white hover:bg-secondary-50">
                                        Cancel
                                    </button>
                                    <button type="submit" :disabled="loading"
                                        class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-secondary-300 flex items-center">
                                        <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                                            fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                            </path>
                                        </svg>
                                        Save Changes
                                    </button>
                                </div>
                            </form>

                            <!-- Read-only Profile Display -->
                            <div v-else class="space-y-6">
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

            <!-- Success Message -->
            <Transition name="slide-up">
                <div v-if="showSuccessMessage"
                    class="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-md p-4 shadow-lg z-50">
                    <div class="flex">
                        <svg class="flex-shrink-0 w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd" />
                        </svg>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-green-800">Profile updated successfully!</p>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- Error Message -->
            <Transition name="slide-up">
                <div v-if="error"
                    class="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-md p-4 shadow-lg z-50">
                    <div class="flex">
                        <svg class="flex-shrink-0 w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clip-rule="evenodd" />
                        </svg>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-red-800">{{ error }}</p>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../init/firebase'
import { useAuthStore } from '../stores/auth'
import type { UserProfile } from '../types'

const authStore = useAuthStore()

const isEditing = ref(false)
const loading = ref(false)
const error = ref('')
const showSuccessMessage = ref(false)

// Form for editing profile
const editForm = reactive({
    firstName: '',
    lastName: '',
    companyName: '',
    btwNumber: '',
    phone: '',
    address: {
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        country: ''
    }
})

const startEditing = () => {
    // Populate form with current user data
    if (authStore.userProfile) {
        editForm.firstName = authStore.userProfile.firstName
        editForm.lastName = authStore.userProfile.lastName
        editForm.companyName = authStore.userProfile.companyName
        editForm.btwNumber = authStore.userProfile.btwNumber
        editForm.phone = authStore.userProfile.phone || ''
        editForm.address = { ...authStore.userProfile.address }
    }
    isEditing.value = true
}

const cancelEditing = () => {
    isEditing.value = false
    error.value = ''
}

const saveProfile = async () => {
    if (!authStore.userProfile) return

    loading.value = true
    error.value = ''

    try {
        const updatedProfile: Partial<UserProfile> = {
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            companyName: editForm.companyName,
            btwNumber: editForm.btwNumber,
            phone: editForm.phone || undefined,
            address: editForm.address
        }

        // Update in Firestore
        await updateDoc(doc(db, 'users', authStore.userProfile.uid), updatedProfile)

        // Update local store
        authStore.userProfile = {
            ...authStore.userProfile,
            ...updatedProfile
        }

        isEditing.value = false
        showSuccessMessage.value = true

        // Hide success message after 3 seconds
        setTimeout(() => {
            showSuccessMessage.value = false
        }, 3000)

    } catch (err: any) {
        console.error('Error updating profile:', err)
        error.value = err.message || 'Failed to update profile'

        // Hide error message after 5 seconds
        setTimeout(() => {
            error.value = ''
        }, 5000)
    } finally {
        loading.value = false
    }
}

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
/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(20px);
    opacity: 0;
}
</style>
