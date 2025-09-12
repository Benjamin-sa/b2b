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
                        <p class="text-sm text-gray-500">B2B Platform</p>
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
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
                                <p class="text-gray-600">Sign in to your B2B account</p>
                            </div>
                            <div v-else key="register-header">
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">Join 4Tparts</h2>
                                <p class="text-gray-600">Create your B2B account</p>
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
                            {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
                            <button @click="toggleMode"
                                class="font-semibold text-blue-600 hover:text-blue-500 ml-1 focus:outline-none focus:underline transition-colors cursor-pointer">
                                {{ isLoginMode ? 'Sign up here' : 'Sign in here' }}
                            </button>
                        </p>
                    </div>
                </div>

                <!-- Additional Info -->
                <div class="mt-8 text-center">
                    <p class="text-sm text-gray-500">
                        By creating an account, you agree to our
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium cursor-pointer">Terms of
                            Service</a>
                        and
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium cursor-pointer">Privacy
                            Policy</a>
                    </p>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full px-6 py-4 border-t border-gray-200">
            <div class="max-w-7xl mx-auto text-center text-sm text-gray-500">
                © 2025 4Tparts B2B Platform. All rights reserved.
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { validateVATNumber, type VATValidationResult } from '../utils/vatValidation'

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
const loginForm = ref({
    email: '',
    password: ''
})

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
        vatValidation.value = { isValid: false, error: 'BTW nummer is verplicht' }
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

const handleLogin = async () => {
    try {
        console.log('Attempting login...')
        await authStore.login(loginForm.value.email, loginForm.value.password)
        console.log('Login successful, showing notification')
        await notificationStore.success('Welcome back!', 'You have been successfully logged in.')
        router.push('/')
        // Reset form
        loginForm.value = { email: '', password: '' }
    } catch (error) {
        console.error('Login error:', error)
        const errorMessage = authStore.error || 'An unexpected error occurred during login.'
        console.log('Showing error notification:', errorMessage)
        await notificationStore.error('Login failed', errorMessage)
    }
}

const handleRegister = async () => {
    if (!passwordsMatch.value) {
        await notificationStore.warning('Password mismatch', 'Please make sure your passwords match.')
        return
    }

    // Extra BTW validatie voor submit
    validateBTW()
    if (!vatValidation.value.isValid) {
        await notificationStore.error('VAT validation failed', vatValidation.value.error || 'Invalid VAT number.')
        return
    }

    try {
        console.log('Attempting registration...')
        await authStore.register(
            registerForm.value.email,
            registerForm.value.password,
            registerForm.value.companyName,
            registerForm.value.firstName,
            registerForm.value.lastName,
            registerForm.value.btwNumber.replace(/\s/g, '').toUpperCase(), // Clean BTW for backend
            registerForm.value.address,
            registerForm.value.phone
        )

        console.log('Registration successful, showing notification')
        await notificationStore.success('Account created!', 'Welcome to 4Tparts B2B Platform.')

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
        console.error('Registration error:', error)
        const errorMessage = authStore.error || 'An unexpected error occurred during registration.'
        console.log('Showing registration error notification:', errorMessage)
        await notificationStore.error('Registration failed', errorMessage)
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
