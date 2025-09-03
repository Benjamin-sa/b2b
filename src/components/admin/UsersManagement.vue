<template>
    <div class="space-y-6">
        <!-- Header -->
        <div>
            <h2 class="text-2xl font-bold text-gray-900">Users Management</h2>
            <p class="mt-1 text-sm text-gray-500">Manage user accounts and verification status</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                <dd class="text-lg font-medium text-gray-900">{{ allUsers.length }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <svg class="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Pending Verification</dt>
                                <dd class="text-lg font-medium text-gray-900">{{ unverifiedUsers.length }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Verified Users</dt>
                                <dd class="text-lg font-medium text-gray-900">{{ verifiedUsers.length }}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">All Users</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Company
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                Loading users...
                            </td>
                        </tr>
                        <tr v-else-if="allUsers.length === 0">
                            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                No users found
                            </td>
                        </tr>
                        <tr v-else v-for="user in allUsers" :key="user.uid" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="h-10 w-10 flex-shrink-0">
                                        <div
                                            class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span class="text-sm font-medium text-gray-700">
                                                {{ getInitials(user.firstName, user.lastName) }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">
                                            {{ user.firstName }} {{ user.lastName }}
                                        </div>
                                        <div class="text-sm text-gray-500">{{ user.email }}</div>
                                        <div v-if="user.phone" class="text-xs text-gray-400">
                                            {{ user.phone }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">{{ user.companyName }}</div>
                                <div v-if="user.btwNumber" class="text-xs text-gray-500">
                                    VAT: {{ user.btwNumber }}
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span :class="[
                                    user.role === 'admin'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800',
                                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
                                ]">
                                    {{ user.role }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex flex-col space-y-1">
                                    <span :class="[
                                        user.isVerified
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800',
                                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
                                    ]">
                                        {{ user.isVerified ? 'Verified' : 'Pending' }}
                                    </span>
                                    <span :class="[
                                        user.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800',
                                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
                                    ]">
                                        {{ user.isActive ? 'Active' : 'Inactive' }}
                                    </span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ formatDate(user.createdAt) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex justify-end space-x-2">
                                    <button @click="viewUserDetails(user)"
                                        class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                    </button>
                                    <button v-if="user.isActive" @click="confirmDeactivateUser(user)"
                                        class="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                        Deactivate
                                    </button>
                                    <button v-else @click="confirmActivateUser(user)"
                                        class="inline-flex items-center px-3 py-1 border border-green-300 shadow-sm text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                        Activate
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- User Details Modal -->
        <div v-if="selectedUser" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
            @click="closeModal">
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white"
                @click.stop>
                <div class="mt-3">
                    <!-- Modal Header -->
                    <div class="flex justify-between items-start border-b pb-4">
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">User Details</h3>
                            <p class="text-sm text-gray-500">Manage user verification and account status</p>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- User Information -->
                    <div class="mt-6 space-y-6">
                        <!-- Personal Information -->
                        <div>
                            <h4 class="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Full Name</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ selectedUser.firstName }} {{
                                        selectedUser.lastName }}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Email</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ selectedUser.email }}</p>
                                </div>
                                <div v-if="selectedUser.phone">
                                    <label class="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ selectedUser.phone }}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Role</label>
                                    <span :class="[
                                        selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
                                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1'
                                    ]">
                                        {{ selectedUser.role }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Company Information -->
                        <div>
                            <h4 class="text-md font-medium text-gray-900 mb-3">Company Information</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Company Name</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ selectedUser.companyName }}</p>
                                </div>
                                <div v-if="selectedUser.btwNumber">
                                    <label class="block text-sm font-medium text-gray-700">VAT Number</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ selectedUser.btwNumber }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Account Status -->
                        <div>
                            <h4 class="text-md font-medium text-gray-900 mb-3">Account Status</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Verification Status</label>
                                    <span :class="[
                                        selectedUser.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
                                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1'
                                    ]">
                                        {{ selectedUser.isVerified ? 'Verified' : 'Pending Verification' }}
                                    </span>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Account Status</label>
                                    <span :class="[
                                        selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                                        'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1'
                                    ]">
                                        {{ selectedUser.isActive ? 'Active' : 'Inactive' }}
                                    </span>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Member Since</label>
                                    <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedUser.createdAt) }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Verification Actions -->
                        <div v-if="selectedUser.role === 'customer'" class="border-t pt-6">
                            <h4 class="text-md font-medium text-gray-900 mb-3">Verification Management</h4>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">
                                            User Verification Status
                                        </p>
                                        <p class="text-sm text-gray-500">
                                            {{ selectedUser.isVerified
                                                ? 'This user has been verified and can access all features.'
                                                : 'This user is pending verification. Review their information.'
                                            }}
                                        </p>
                                    </div>
                                    <div class="flex space-x-3">
                                        <button v-if="!selectedUser.isVerified" @click="confirmVerifyUser(selectedUser)"
                                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M5 13l4 4L19 7" />
                                            </svg>
                                            Verify User
                                        </button>
                                        <button v-else @click="confirmUnverifyUser(selectedUser)"
                                            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Remove Verification
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Actions -->
                    <div class="mt-6 flex justify-end border-t pt-4">
                        <button @click="closeModal"
                            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Confirmation Modal -->
        <div v-if="confirmationModal.show"
            class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
            @click="closeConfirmation">
            <div class="relative top-1/2 transform -translate-y-1/2 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
                @click.stop>
                <div class="mt-3 text-center">
                    <div :class="[
                        confirmationModal.type === 'verify' ? 'bg-green-100' :
                            confirmationModal.type === 'unverify' ? 'bg-yellow-100' : 'bg-red-100',
                        'mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4'
                    ]">
                        <svg v-if="confirmationModal.type === 'verify'" class="h-6 w-6 text-green-600" fill="none"
                            stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <svg v-else-if="confirmationModal.type === 'unverify'" class="h-6 w-6 text-yellow-600"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <svg v-else class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900">{{ confirmationModal.title }}</h3>
                    <div class="mt-2 px-7 py-3">
                        <p class="text-sm text-gray-500">{{ confirmationModal.message }}</p>
                    </div>
                    <div class="flex justify-center space-x-3 mt-4">
                        <button @click="closeConfirmation"
                            class="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300">
                            Cancel
                        </button>
                        <button @click="executeConfirmation" :class="[
                            confirmationModal.type === 'verify' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                confirmationModal.type === 'unverify' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' :
                                    'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                            'px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2'
                        ]">
                            {{ confirmationModal.confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import type { UserProfile } from '../../types'

const authStore = useAuthStore()
const loading = ref(false)
const allUsers = ref<UserProfile[]>([])
const selectedUser = ref<UserProfile | null>(null)
const confirmationModal = ref({
    show: false,
    type: '' as 'verify' | 'unverify' | 'activate' | 'deactivate',
    title: '',
    message: '',
    confirmText: '',
    user: null as UserProfile | null,
    action: null as (() => Promise<void>) | null
})

const unverifiedUsers = computed(() =>
    allUsers.value.filter(user => !user.isVerified && user.role === 'customer')
)

const verifiedUsers = computed(() =>
    allUsers.value.filter(user => user.isVerified || user.role === 'admin')
)

onMounted(async () => {
    await loadUsers()
})

const loadUsers = async () => {
    loading.value = true
    try {
        allUsers.value = await authStore.getAllUsers()
    } catch (error) {
        console.error('Error loading users:', error)
    } finally {
        loading.value = false
    }
}

const verifyUser = async (uid: string) => {
    try {
        await authStore.updateUserVerification(uid, true)
        await loadUsers() // Refresh the list
    } catch (error) {
        console.error('Error verifying user:', error)
        alert('Failed to verify user')
    }
}

const unverifyUser = async (uid: string) => {
    try {
        await authStore.updateUserVerification(uid, false)
        await loadUsers() // Refresh the list
    } catch (error) {
        console.error('Error unverifying user:', error)
        alert('Failed to unverify user')
    }
}

const activateUser = async (uid: string) => {
    try {
        await authStore.updateUserStatus(uid, true)
        await loadUsers() // Refresh the list
    } catch (error) {
        console.error('Error activating user:', error)
        alert('Failed to activate user')
    }
}

const deactivateUser = async (uid: string) => {
    try {
        await authStore.updateUserStatus(uid, false)
        await loadUsers() // Refresh the list
    } catch (error) {
        console.error('Error deactivating user:', error)
        alert('Failed to deactivate user')
    }
}

const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const viewUserDetails = (user: UserProfile) => {
    selectedUser.value = user
}

const closeModal = () => {
    selectedUser.value = null
}

const confirmVerifyUser = (user: UserProfile) => {
    confirmationModal.value = {
        show: true,
        type: 'verify',
        title: 'Verify User',
        message: `Are you sure you want to verify ${user.firstName} ${user.lastName}? This will grant them full access to the platform.`,
        confirmText: 'Verify',
        user,
        action: () => verifyUser(user.uid)
    }
}

const confirmUnverifyUser = (user: UserProfile) => {
    confirmationModal.value = {
        show: true,
        type: 'unverify',
        title: 'Remove Verification',
        message: `Are you sure you want to remove verification for ${user.firstName} ${user.lastName}? This will restrict their access to the platform.`,
        confirmText: 'Remove Verification',
        user,
        action: () => unverifyUser(user.uid)
    }
}

const confirmActivateUser = (user: UserProfile) => {
    confirmationModal.value = {
        show: true,
        type: 'activate',
        title: 'Activate User',
        message: `Are you sure you want to activate ${user.firstName} ${user.lastName}?`,
        confirmText: 'Activate',
        user,
        action: () => activateUser(user.uid)
    }
}

const confirmDeactivateUser = (user: UserProfile) => {
    confirmationModal.value = {
        show: true,
        type: 'deactivate',
        title: 'Deactivate User',
        message: `Are you sure you want to deactivate ${user.firstName} ${user.lastName}? They will not be able to access their account.`,
        confirmText: 'Deactivate',
        user,
        action: () => deactivateUser(user.uid)
    }
}

const closeConfirmation = () => {
    confirmationModal.value.show = false
    confirmationModal.value.action = null
}

const executeConfirmation = async () => {
    if (confirmationModal.value.action) {
        await confirmationModal.value.action()
        closeConfirmation()
        if (selectedUser.value && confirmationModal.value.user) {
            // Update selected user if it's the same user
            if (selectedUser.value.uid === confirmationModal.value.user.uid) {
                const updatedUser = allUsers.value.find(u => u.uid === selectedUser.value!.uid)
                if (updatedUser) {
                    selectedUser.value = updatedUser
                }
            }
        }
    }
}
</script>
