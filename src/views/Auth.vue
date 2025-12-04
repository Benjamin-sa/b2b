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

                <!-- Language Toggler -->
                <div class="relative">
                    <button @click="toggleLanguageMenu" 
                        class="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span class="text-sm font-medium text-gray-700">{{ currentLanguage?.name }}</span>
                        <svg class="w-4 h-4 text-gray-500 transition-transform duration-200" 
                            :class="{ 'rotate-180': isLanguageMenuOpen }"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    <!-- Language Dropdown -->
                    <Transition name="dropdown">
                        <div v-if="isLanguageMenuOpen" 
                            class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 overflow-hidden">
                            <button v-for="lang in languages" 
                                :key="lang.code" 
                                @click="setLanguage(lang.code)"
                                :class="[
                                    'w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center justify-between',
                                    locale === lang.code 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'text-gray-700 hover:bg-gray-50'
                                ]">
                                <span>{{ lang.name }}</span>
                                <svg v-if="locale === lang.code" class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </Transition>
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
                            <div v-if="isPasswordResetMode" key="reset-header">
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">{{ $t('auth.resetYourPassword') }}</h2>
                                <p class="text-gray-600">{{ $t('auth.resetPasswordInstruction') }}</p>
                            </div>
                            <div v-else-if="isLoginMode" key="login-header">
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
                            <!-- Password Reset Form -->
                            <PasswordResetForm v-if="isPasswordResetMode" key="reset-form" 
                                :resetToken="resetToken"
                                @back-to-login="handleBackToLogin" />

                            <!-- Login Form -->
                            <LoginForm v-else-if="isLoginMode" key="login-form" :loading="authStore.loading"
                                @login="handleLogin" />

                            <!-- Register Form -->
                            <RegisterForm v-else key="register-form" :loading="authStore.loading"
                                :vatValidation="vatValidation" :canSubmit="canSubmitRegister"
                                :passwordsMatch="passwordsMatch" :form="registerForm" @vat-input="validateBTW"
                                @submit="handleRegister" />
                        </Transition>
                    </div>

                    <!-- Footer -->
                    <div v-if="!isPasswordResetMode" class="px-8 py-6 bg-gray-50 border-t border-gray-100">
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
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'
import PasswordResetForm from '../components/auth/PasswordResetForm.vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { validateVATNumber, type VATValidationResult } from '../utils/vatValidation'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const isLoginMode = ref(true)

// Password reset mode detection
const isPasswordResetMode = ref(false)
const resetToken = ref('')

// Function to check and set password reset mode
const checkPasswordResetMode = () => {
    if (route.query.mode === 'resetPassword' && route.query.token) {
        console.log('Password reset mode detected:', route.query.token)
        isPasswordResetMode.value = true
        resetToken.value = route.query.token as string
        isLoginMode.value = false
    } else {
        // Reset if no query params
        if (isPasswordResetMode.value) {
            isPasswordResetMode.value = false
            resetToken.value = ''
        }
    }
}

// Check URL query params on mount
onMounted(() => {
    checkPasswordResetMode()
})

// Watch for route changes (in case query params change while component is mounted)
watch(() => route.query, () => {
    checkPasswordResetMode()
}, { deep: true })

// Handle back to login from password reset
const handleBackToLogin = () => {
    isPasswordResetMode.value = false
    resetToken.value = ''
    isLoginMode.value = true
    // Clear query params
    router.replace('/auth')
}

// Language toggler state
const isLanguageMenuOpen = ref(false)

const languages = [
    { code: 'nl', name: 'Nederlands' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
]

const currentLanguage = computed(() => {
    return languages.find(lang => lang.code === locale.value) || languages[0]
})

const toggleLanguageMenu = () => {
    isLanguageMenuOpen.value = !isLanguageMenuOpen.value
}

const setLanguage = (langCode: string) => {
    locale.value = langCode
    localStorage.setItem('language', langCode)
    isLanguageMenuOpen.value = false
}

// Close language menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.relative') && isLanguageMenuOpen.value) {
        isLanguageMenuOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
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
        // Translate the error message with parameters if available
        const errorMessage = vatValidation.value.error 
            ? t(vatValidation.value.error, vatValidation.value.errorParams || {})
            : t('auth.invalidVatNumber')
        await notificationStore.error(t('auth.vatValidationFailed'), errorMessage)
        return
    }

    try {
        console.log('Attempting registration...')
        
        // Prepare registration data as a single object with snake_case
        const registrationData = {
            email: registerForm.value.email,
            password: registerForm.value.password,
            confirm_password: registerForm.value.confirmPassword,
            company_name: registerForm.value.companyName,
            first_name: registerForm.value.firstName,
            last_name: registerForm.value.lastName,
            btw_number: registerForm.value.btwNumber.replace(/\s/g, '').toUpperCase(),
            phone: registerForm.value.phone,
            address: {
                street: registerForm.value.address.street,
                house_number: registerForm.value.address.houseNumber,
                postal_code: registerForm.value.address.postalCode,
                city: registerForm.value.address.city,
                country: registerForm.value.address.country
            }
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

/* Dropdown transition for language menu */
.dropdown-enter-active {
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.dropdown-leave-active {
    transition: all 0.15s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.dropdown-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
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

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    .dropdown-enter-active,
    .dropdown-leave-active,
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.2s ease !important;
    }

    .dropdown-enter-from,
    .dropdown-leave-to {
        transform: none !important;
    }
}
</style>
