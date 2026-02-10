<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">User Management</h2>
      <p class="mt-1 text-sm text-gray-500">Manage user accounts and permissions</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Users</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900">{{ allUsers.length }}</p>
      </div>

      <div class="bg-white rounded-lg border border-yellow-200 p-4">
        <p class="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending Verification</p>
        <p class="mt-1 text-2xl font-semibold text-yellow-700">{{ unverifiedUsers.length }}</p>
      </div>

      <div class="bg-white rounded-lg border border-green-200 p-4 col-span-2 lg:col-span-1">
        <p class="text-xs font-medium text-green-600 uppercase tracking-wide">Verified Users</p>
        <p class="mt-1 text-2xl font-semibold text-green-700">{{ verifiedUsers.length }}</p>
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
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading users...</td>
            </tr>
            <tr v-else-if="allUsers.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">No users found</td>
            </tr>
            <tr v-for="user in allUsers" v-else :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span class="text-sm font-medium text-gray-700">
                        {{ getInitials(user.first_name, user.last_name) }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.first_name }} {{ user.last_name }}
                    </div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                    <div v-if="user.phone" class="text-xs text-gray-400">
                      {{ user.phone }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ user.company_name }}</div>
                <div v-if="user.btw_number" class="flex items-center space-x-1 mt-1">
                  <span class="text-xs text-gray-500">VAT: {{ user.btw_number }}</span>
                  <svg v-if="user.btw_number_validated === 1" class="h-3 w-3 text-blue-500" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24" title="VIES data available">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800',
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                ]">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col space-y-1">
                  <span :class="[
                    user.is_verified === 1
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  ]">
                    {{ user.is_verified === 1 ? 'Verified' : 'Pending' }}
                  </span>
                  <span :class="[
                    user.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  ]">
                    {{ user.is_active === 1 ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.created_at || '') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <button
                    class="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    @click="viewUserDetails(user)">
                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button v-if="user.is_active === 1"
                    class="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    @click="confirmDeactivateUser(user)">
                    Deactivate
                  </button>
                  <button v-else
                    class="inline-flex items-center px-3 py-1 border border-green-300 shadow-sm text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    @click="confirmActivateUser(user)">
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
              <p class="text-sm text-gray-500">View and manage user information</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600" @click="closeModal">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
                  <p class="mt-1 text-sm text-gray-900">
                    {{ selectedUser.first_name }} {{ selectedUser.last_name }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Email</label>
                  <p class="mt-1 text-sm text-gray-900">{{ selectedUser.email }}</p>
                </div>
                <div v-if="selectedUser.phone">
                  <label class="block text-sm font-medium text-gray-700">Phone</label>
                  <p class="mt-1 text-sm text-gray-900">{{ selectedUser.phone }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Role</label>
                  <span :class="[
                    selectedUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1',
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
                  <p class="mt-1 text-sm text-gray-900">{{ selectedUser.company_name }}</p>
                </div>
                <div v-if="selectedUser.btw_number">
                  <label class="block text-sm font-medium text-gray-700">VAT Number</label>
                  <div class="flex items-center space-x-2 mt-1">
                    <p class="text-sm text-gray-900">{{ selectedUser.btw_number }}</p>
                    <span v-if="selectedUser.btw_number_validated === 1"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      title="VAT number exists in VIES database">
                      <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      VIES Check Passed
                    </span>
                    <span v-else
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Not Checked
                    </span>
                  </div>
                </div>
              </div>

              <!-- BTW Verification Details (if available) -->
              <div v-if="
                selectedUser.btw_verified_name ||
                selectedUser.btw_verified_address
              " class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-start">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="ml-3 flex-1">
                    <h5 class="text-sm font-medium text-blue-900">VIES Database Information</h5>
                    <p class="text-xs text-blue-700 mt-1 mb-3">
                      This is the official data from the European VAT registry. Please verify it
                      matches the customer-provided information below.
                    </p>
                    <div class="mt-2 text-sm text-blue-900 space-y-2">
                      <div v-if="selectedUser.btw_verified_name">
                        <span class="font-medium">Official Company Name:</span>
                        <p class="mt-0.5 text-blue-800">
                          {{ selectedUser.btw_verified_name }}
                        </p>
                      </div>
                      <div v-if="selectedUser.btw_verified_address">
                        <span class="font-medium">Official Registered Address:</span>
                        <p class="mt-0.5 text-blue-800 whitespace-pre-line">
                          {{ selectedUser.btw_verified_address }}
                        </p>
                      </div>
                      <div v-if="selectedUser.btw_verified_at"
                        class="text-xs text-blue-600 pt-2 border-t border-blue-200">
                        Retrieved from VIES on
                        {{ formatDate(selectedUser.btw_verified_at || '') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Address Information -->
            <div v-if="selectedUser.address_street">
              <h4 class="text-md font-medium text-gray-900 mb-3">Customer-Provided Information</h4>
              <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p class="text-sm text-gray-900">
                  {{ selectedUser.address_street }} {{ selectedUser.address_house_number }}<br />
                  {{ selectedUser.address_postal_code }} {{ selectedUser.address_city }}<br />
                  {{ selectedUser.address_country }}
                </p>
              </div>
              <p v-if="selectedUser.btw_number" class="mt-2 text-xs text-gray-500">
                ⚠️ Compare this address with the official VIES address above before verifying the
                account.
              </p>
            </div>

            <!-- Account Status -->
            <div>
              <h4 class="text-md font-medium text-gray-900 mb-3">Account Status</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Verification Status</label>
                  <span :class="[
                    selectedUser.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1',
                  ]">
                    {{ selectedUser.is_verified ? 'Verified' : 'Pending Verification' }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Account Status</label>
                  <span :class="[
                    selectedUser.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800',
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1',
                  ]">
                    {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Member Since</label>
                  <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedUser.created_at || '') }}</p>
                </div>
              </div>
            </div>

            <!-- Verification Actions -->
            <div v-if="selectedUser.role === 'customer'" class="border-t pt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Verification Management</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-900">Verification Status</p>
                    <p class="text-sm text-gray-500">
                      {{
                        selectedUser.is_verified
                          ? 'This user has been verified and can access all features.'
                          : 'This user is pending verification and has limited access.'
                      }}
                    </p>
                  </div>
                  <div class="flex space-x-3">
                    <button v-if="!selectedUser.is_verified"
                      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                      @click="confirmVerifyUser(selectedUser)">
                      <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Verify User
                    </button>
                    <button v-else
                      class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      @click="confirmUnverifyUser(selectedUser)">
                      <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <button
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              @click="closeModal">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="confirmationModal.show"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeConfirmation">
      <div class="relative top-1/2 transform -translate-y-1/2 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop>
        <div class="mt-3 text-center">
          <div :class="[
            confirmationModal.type === 'verify'
              ? 'bg-green-100'
              : confirmationModal.type === 'unverify'
                ? 'bg-yellow-100'
                : 'bg-red-100',
            'mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4',
          ]">
            <svg v-if="confirmationModal.type === 'verify'" class="h-6 w-6 text-green-600" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else-if="confirmationModal.type === 'unverify'" class="h-6 w-6 text-yellow-600" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
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
            <button
              class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              @click="closeConfirmation">
              Cancel
            </button>
            <button :class="[
              confirmationModal.type === 'verify'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : confirmationModal.type === 'unverify'
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
              'px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
            ]" @click="executeConfirmation">
              {{ confirmationModal.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import type { UserProfile } from '../../../types';

const authStore = useAuthStore();
const loading = ref(false);
const allUsers = ref<UserProfile[]>([]);
const selectedUser = ref<UserProfile | null>(null);
const confirmationModal = ref({
  show: false,
  type: '' as 'verify' | 'unverify' | 'activate' | 'deactivate',
  title: '',
  message: '',
  confirmText: '',
  user: null as UserProfile | null,
  action: null as (() => Promise<void>) | null,
});

const unverifiedUsers = computed(() =>
  allUsers.value.filter((user) => (user as any).is_verified !== 1 && user.role === 'customer')
);

const verifiedUsers = computed(() =>
  allUsers.value.filter((user) => (user as any).is_verified === 1 || user.role === 'admin')
);

onMounted(async () => {
  await loadUsers();
});

const loadUsers = async () => {
  loading.value = true;
  try {
    allUsers.value = await authStore.getAllUsers();
  } catch (error) {
    console.error('Error loading users:', error);
  } finally {
    loading.value = false;
  }
};

const verifyUser = async (id: string) => {
  try {
    await authStore.updateUserVerification(id, true);
    await loadUsers();
  } catch (error) {
    console.error('Error verifying user:', error);
    alert('Failed to verify user');
  }
};

const unverifyUser = async (id: string) => {
  try {
    await authStore.updateUserVerification(id, false);
    await loadUsers();
  } catch (error) {
    console.error('Error unverifying user:', error);
    alert('Failed to remove verification');
  }
};

const activateUser = async (id: string) => {
  try {
    await authStore.updateUserStatus(id, true);
    await loadUsers();
  } catch (error) {
    console.error('Error activating user:', error);
    alert('Failed to activate user');
  }
};

const deactivateUser = async (id: string) => {
  try {
    await authStore.updateUserStatus(id, false);
    await loadUsers();
  } catch (error) {
    console.error('Error deactivating user:', error);
    alert('Failed to deactivate user');
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (firstName: string, lastName: string): string => {
  if (!firstName || !lastName) return '??';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const viewUserDetails = (user: UserProfile) => {
  selectedUser.value = user;
};

const closeModal = () => {
  selectedUser.value = null;
};

const confirmVerifyUser = (user: UserProfile) => {
  const u = user as any;
  confirmationModal.value = {
    show: true,
    type: 'verify',
    title: 'Verify User',
    message: `Are you sure you want to verify ${u.first_name} ${u.last_name}? This will grant them full access to the platform.`,
    confirmText: 'Verify User',
    user,
    action: () => verifyUser(u.id),
  };
};

const confirmUnverifyUser = (user: UserProfile) => {
  const u = user as any;
  confirmationModal.value = {
    show: true,
    type: 'unverify',
    title: 'Remove Verification',
    message: `Are you sure you want to remove verification for ${u.first_name} ${u.last_name}? This will limit their access.`,
    confirmText: 'Remove Verification',
    user,
    action: () => unverifyUser(u.id),
  };
};

const confirmActivateUser = (user: UserProfile) => {
  const u = user as any;
  confirmationModal.value = {
    show: true,
    type: 'activate',
    title: 'Activate User',
    message: `Are you sure you want to activate ${u.first_name} ${u.last_name}?`,
    confirmText: 'Activate',
    user,
    action: () => activateUser(u.id),
  };
};

const confirmDeactivateUser = (user: UserProfile) => {
  const u = user as any;
  confirmationModal.value = {
    show: true,
    type: 'deactivate',
    title: 'Deactivate User',
    message: `Are you sure you want to deactivate ${u.first_name} ${u.last_name}? They will not be able to access the platform.`,
    confirmText: 'Deactivate',
    user,
    action: () => deactivateUser(u.id),
  };
};

const closeConfirmation = () => {
  confirmationModal.value.show = false;
  confirmationModal.value.action = null;
};

const executeConfirmation = async () => {
  if (confirmationModal.value.action) {
    await confirmationModal.value.action();
    closeConfirmation();
    if (selectedUser.value && confirmationModal.value.user) {
      // Update selected user if it's the same user
      const selectedId = (selectedUser.value as any).id;
      const confirmedId = (confirmationModal.value.user as any).id;
      if (selectedId === confirmedId) {
        const updatedUser = allUsers.value.find((u: any) => u.id === selectedId);
        if (updatedUser) {
          selectedUser.value = updatedUser;
        }
      }
    }
  }
};
</script>
