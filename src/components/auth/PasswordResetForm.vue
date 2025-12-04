<template>
    <div class="space-y-6">
        <!-- Success State -->
        <div v-if="resetSuccess" class="text-center space-y-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">{{ $t('auth.passwordResetSuccess') }}</h3>
                <p class="text-gray-600 mb-6">{{ $t('auth.passwordResetSuccessMessage') }}</p>
                <button @click="$emit('back-to-login')"
                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl">
                    {{ $t('auth.backToLogin') }}
                </button>
            </div>
        </div>

        <!-- Reset Form -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-6">

            <!-- Error Display -->
            <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                    <span>{{ error }}</span>
                </div>
            </div>

            <div class="space-y-4">
                <!-- New Password -->
                <div>
                    <label for="new-password" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.newPassword') }}
                    </label>
                    <input 
                        id="new-password" 
                        v-model="newPassword" 
                        type="password" 
                        required 
                        :disabled="loading"
                        :placeholder="$t('auth.newPasswordPlaceholder')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                    />
                    <p class="mt-1 text-xs text-gray-500">{{ $t('auth.passwordMin') }}</p>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirm-password" class="block text-sm font-semibold text-gray-700 mb-2">
                        {{ $t('auth.confirmNewPassword') }}
                    </label>
                    <input 
                        id="confirm-password" 
                        v-model="confirmPassword" 
                        type="password" 
                        required 
                        :disabled="loading"
                        :placeholder="$t('auth.confirmPasswordPlaceholder')"
                        class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                        :class="{ 'border-red-500': confirmPassword && !passwordsMatch }"
                    />
                    <p v-if="confirmPassword && !passwordsMatch" class="mt-1 text-xs text-red-600">
                        {{ $t('auth.passwordsDoNotMatch') }}
                    </p>
                </div>
            </div>

            <!-- Submit Button -->
            <button 
                type="submit" 
                :disabled="loading || !passwordsMatch || !newPassword || !confirmPassword"
                class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
                <span v-if="loading" class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ $t('auth.resettingPassword') }}
                </span>
                <span v-else>{{ $t('auth.resetPasswordButton') }}</span>
            </button>

            <!-- Back to Login -->
            <div class="text-center">
                <button 
                    type="button" 
                    @click="$emit('back-to-login')" 
                    :disabled="loading"
                    class="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:underline">
                    {{ $t('auth.backToLogin') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    resetToken: string;
}>();

const emit = defineEmits(['back-to-login']);

const authStore = useAuthStore();

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const resetSuccess = ref(false);

const passwordsMatch = computed(() => 
    newPassword.value === confirmPassword.value
);

const handleSubmit = async () => {
    if (!passwordsMatch.value) {
        error.value = t('auth.passwordsDoNotMatch');
        return;
    }

    if (newPassword.value.length < 6) {
        error.value = t('auth.passwordTooShort');
        return;
    }

    error.value = '';
    loading.value = true;

    try {
        const success = await authStore.confirmPasswordReset(props.resetToken, newPassword.value);
        
        if (success) {
            resetSuccess.value = true;
            // Auto-redirect to login after 3 seconds
            setTimeout(() => {
                emit('back-to-login');
            }, 3000);
        } else {
            error.value = authStore.error || t('auth.resetFailed');
        }
    } catch (err: any) {
        console.error('Password reset error:', err);
        error.value = err.message || t('auth.resetFailed');
    } finally {
        loading.value = false;
    }
};
</script>
