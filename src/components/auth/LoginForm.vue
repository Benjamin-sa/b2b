<template>
    <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-4">
            <div>
                <label for="login-email" class="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                </label>
                <input id="login-email" v-model="email" type="email" required :disabled="loading"
                    placeholder="Enter your email"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            </div>

            <div>
                <label for="login-password" class="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                </label>
                <input id="login-password" v-model="password" type="password" required :disabled="loading"
                    placeholder="Enter your password"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
            </div>
        </div>

        <!-- Forgot Password Link -->
        <div class="text-right">
            <button type="button" 
                @click="handleForgotPassword"
                :disabled="loading || !email"
                class="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:underline">
                Forgot Password?
            </button>
        </div>

        <button type="submit" :disabled="loading"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
            <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                Signing In...
            </span>
            <span v-else>Sign In</span>
        </button>
    </form>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notifications';

defineProps({
    loading: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['login']);
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const email = ref('');
const password = ref('');

const handleLogin = () => {
    emit('login', { email: email.value, password: password.value });
};

const handleForgotPassword = async () => {
    if (!email.value.trim()) {
        await notificationStore.warning('Email Required', 'Please enter your email address first to reset your password.');
        return;
    }

    try {
        await authStore.requestPasswordReset(email.value);
        await notificationStore.success(
            'Reset Email Sent', 
            `Password reset instructions have been sent to ${email.value}. Please check your email and follow the instructions.`
        );
    } catch (error) {
        console.error('Password reset request failed:', error);
        await notificationStore.error(
            'Reset Failed', 
            'Failed to send password reset email. Please try again or contact support if the problem persists.'
        );
    }
};
</script>