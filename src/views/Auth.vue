<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        <!-- Header -->
        <header class="w-full px-6 py-4">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <!-- Logo -->
                <div class="flex items-center space-x-3">
                    <div class="w-20 h-20 bg-white/0 rounded-lg flex items-center justify-center shadow-md">
                        <img src="/vite.svg" alt="4Tparts Logo" class="w-20 h-20 drop-shadow" />
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">4Tparts</h1>
                        <p class="text-sm text-gray-500">{{ $t('auth.b2bPlatform') }}</p>
                    </div>
                </div>

            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 flex items-center justify-center px-4 py-8">
            <div class="w-full max-w-lg">
                <!-- Auth Card -->
                <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <!-- Header -->
                    <div class="px-8 pt-8 pb-6 text-center">
                        <Transition name="fade" mode="out-in">
                            <div v-if="isLoginMode" key="login-header">
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">{{ $t('auth.welcomeBack') }}</h2>
                                <p class="text-gray-600">{{ $t('auth.signInToB2B') }}</p>
                            </div>
                            <div v-else key="register-header">
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">{{ $t('auth.join4Tparts') }}</h2>
                                <p class="text-gray-600">{{ $t('auth.createB2BAccount') }}</p>
                            </div>
                        </Transition>
                    </div>

                    <!-- Content -->
                    <div class="px-8 pb-8">
                        <!-- Forms with transition -->
                        <Transition name="fade" mode="out-in">
                            <!-- Login Form -->
                            <LoginForm v-if="isLoginMode" key="login-form" :loading="authStore.loading"
                                @login="handleLogin" />

                            <!-- Register Form -->
                            <RegisterForm v-else key="register-form" :loading="authStore.loading"
                                :vatValidation="vatValidation" :canSubmit="canSubmitRegister"
                                :passwordsMatch="passwordsMatch" :form="registerForm" @vat-input="validateBTW"
                                @submit="handleRegister" />
                        </Transition>
                    </div>

                    <!-- Footer -->
                    <div class="px-8 py-6 bg-gray-50 border-t border-gray-100">
                        <p class="text-center text-sm text-gray-600">
                            {{ isLoginMode ? $t('auth.dontHaveAccount') : $t('auth.alreadyHaveAccount') }}
                            <button @click="toggleMode"
                                class="font-semibold text-blue-600 hover:text-blue-500 ml-1 focus:outline-none focus:underline transition-colors cursor-pointer">
                                {{ isLoginMode ? $t('auth.signUpHere') : $t('auth.signInHere') }}
                            </button>
                        </p>
                    </div>
                </div>

                <!-- Additional Info -->
                <div class="mt-8 text-center">
                    <p class="text-sm text-gray-500">
                        {{ $t('auth.agreeToTerms') }}
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium cursor-pointer">
                            {{ $t('auth.termsOfService') }}
                        </a>
                        &
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium cursor-pointer">
                            {{ $t('auth.privacyPolicy') }}
                        </a>
                    </p>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full px-6 py-4 border-t border-gray-200">
            <div class="max-w-7xl mx-auto text-center text-sm text-gray-500">
                {{ $t('auth.copyright') }}
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { validateVATNumber, type VATValidationResult } from '../utils/vatValidation'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const isLoginMode = ref(true)

// Redirect if already authenticated
onMounted(() => {
    if (authStore.isAuthenticated) {
        router.push('/')
    }
})

// Form data
const registerForm = ref({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    btwNumber: '',
    address: {
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        country: 'Belgium'
    }
})

const passwordsMatch = computed(() =>
    registerForm.value.password === registerForm.value.confirmPassword
)

// BTW validation
const vatValidation = ref<VATValidationResult>({ isValid: true })

const validateBTW = () => {
    if (!registerForm.value.btwNumber.trim()) {
        vatValidation.value = { isValid: false, error: t('auth.vatRequired') }
        return
    }
    vatValidation.value = validateVATNumber(registerForm.value.btwNumber)
}

// Watch BTW input for real-time validation  
let btwTimeout: number | null = null
watch(() => registerForm.value.btwNumber, () => {
    if (btwTimeout) clearTimeout(btwTimeout)
    btwTimeout = setTimeout(() => {
        if (registerForm.value.btwNumber.trim()) {
            validateBTW()
        } else {
            vatValidation.value = { isValid: true }
        }
    }, 500)
})

const canSubmitRegister = computed(() =>
    passwordsMatch.value &&
    vatValidation.value.isValid &&
    registerForm.value.btwNumber.trim() !== ''
)

// Clear error when switching modes
watch(isLoginMode, () => {
    authStore.clearError()
})

const toggleMode = () => {
    isLoginMode.value = !isLoginMode.value
    authStore.clearError()
}

const handleLogin = async (loginData: { email: string; password: string }) => {
    try {
        await authStore.login(loginData)
        router.push('/')
    } catch (error) {
        // Error notifications are now handled by the auth store
        console.error('Login error:', error)
    }
}

const handleRegister = async () => {
    if (!passwordsMatch.value) {
        await notificationStore.warning(t('auth.passwordMismatch'), t('auth.passwordMismatchMessage'))
        return
    }

    // Extra BTW validatie voor submit
    validateBTW()
    if (!vatValidation.value.isValid) {
        await notificationStore.error(t('auth.vatValidationFailed'), vatValidation.value.error || t('auth.invalidVatNumber'))
        return
    }

    try {
        console.log('Attempting registration...')
        
        // Prepare registration data as a single object
        const registrationData = {
            email: registerForm.value.email,
            password: registerForm.value.password,
            confirmPassword: registerForm.value.confirmPassword,
            companyName: registerForm.value.companyName,
            firstName: registerForm.value.firstName,
            lastName: registerForm.value.lastName,
            btwNumber: registerForm.value.btwNumber.replace(/\s/g, '').toUpperCase(),
            phone: registerForm.value.phone,
            address: registerForm.value.address
        }
        
        await authStore.register(registrationData)

        console.log('Registration successful')

        // Small delay to ensure all registration processes complete
        await new Promise(resolve => setTimeout(resolve, 200))

        router.push('/')
        // Reset form
        registerForm.value = {
            firstName: '',
            lastName: '',
            companyName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            btwNumber: '',
            address: {
                street: '',
                houseNumber: '',
                postalCode: '',
                city: '',
                country: 'Belgium'
            }
        }
        vatValidation.value = { isValid: true }
    } catch (error) {
        // Error notifications are now handled by the auth store
        console.error('Registration error:', error)
    }
}
</script>

<style scoped>
/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-up-enter-active {
    transition: all 0.3s ease;
}

.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from {
    transform: translateY(-10px);
    opacity: 0;
}

.slide-up-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}

/* Enhanced focus styles */
input:focus,
select:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Mobile optimizations */
@media (max-width: 640px) {
    .min-h-screen {
        min-height: 100vh;
        min-height: 100dvh;
        /* Dynamic viewport height for mobile */
    }
}
</style>
