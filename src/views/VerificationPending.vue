<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div class="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <!-- Verification Icon -->
            <div class="mb-6">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                    <svg class="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd" />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ $t('verificationPending.title') }}</h1>
                <p class="text-gray-600 mb-6">
                    {{ $t('verificationPending.subtitle') }}
                </p>
            </div>

            <!-- User Info -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div class="mb-2">
                    <span class="text-sm font-medium text-gray-700">{{ $t('verificationPending.company') }}</span>
                    <span class="text-sm text-gray-900 ml-2">{{ userProfile?.companyName }}</span>
                </div>
                <div class="mb-2">
                    <span class="text-sm font-medium text-gray-700">{{ $t('verificationPending.email') }}</span>
                    <span class="text-sm text-gray-900 ml-2">{{ userProfile?.email }}</span>
                </div>
                <div class="mb-2">
                    <span class="text-sm font-medium text-gray-700">{{ $t('verificationPending.btwNumber') }}</span>
                    <span class="text-sm text-gray-900 ml-2">{{ userProfile?.btwNumber }}</span>
                </div>
            </div>

            <!-- Main Message -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h2 class="text-lg font-semibold text-blue-900 mb-2">{{ $t('verificationPending.whatHappensNext') }}</h2>
                <p class="text-blue-800 text-sm" v-html="$t('verificationPending.whatHappensNextMessage')">
                </p>
            </div>
            <!-- Action Buttons -->
            <div class="space-y-3">
                <button @click="logout"
                    class="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
                    {{ $t('verificationPending.signOut') }}
                </button>
                </div>
            </div>
        </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const userProfile = computed(() => authStore.userProfile)

const logout = async () => {
    try {
        await authStore.logout()
        router.push('/auth')
    } catch (error) {
        console.error('Logout error:', error)
    }
}
</script>

<style scoped>
/* Custom animations for this view */
@keyframes pulse-slow {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.8;
    }
}

.animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
}
</style>
