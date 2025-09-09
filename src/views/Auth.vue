<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-5">
            <div class="absolute inset-0"
                style="background-image: radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0); background-size: 20px 20px;">
            </div>
        </div>

        <!-- Floating Shapes -->
        <div class="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div class="absolute top-40 right-20 w-32 h-32 bg-purple-200 rounded-full opacity-15 animate-bounce"
            style="animation-duration: 3s;"></div>
        <div class="absolute bottom-20 left-20 w-16 h-16 bg-indigo-200 rounded-full opacity-25 animate-pulse"
            style="animation-delay: 1s;"></div>

        <div class="relative z-10 flex flex-col min-h-screen">
            <!-- Header -->
            <AuthHeader :is-login-mode="isLoginMode" />

            <!-- Main Content -->
            <main class="flex-1 flex items-center justify-center px-4 py-8">
                <div class="w-full max-w-2xl">
                    <!-- Auth Card -->
                    <div
                        class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                        <!-- Error Display -->
                        <Transition name="slide-down">
                            <div v-if="authStore.error"
                                class="mx-8 mt-8 mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                                <div class="flex items-start">
                                    <svg class="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none"
                                        stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p class="text-sm text-red-700 font-medium">{{ authStore.error }}</p>
                                </div>
                            </div>
                        </Transition>

                        <!-- Content -->
                        <div class="px-8 pb-8">
                            <!-- Forms with transition -->
                            <Transition name="form-transition" mode="out-in">
                                <!-- Login Form -->
                                <LoginForm v-if="isLoginMode" key="login-form" v-model:email="loginForm.email"
                                    v-model:password="loginForm.password" :loading="authStore.loading"
                                    @submit="handleLogin" />

                                <!-- Register Form -->
                                <RegisterForm v-else key="register-form" v-model:form-data="registerForm"
                                    :loading="authStore.loading" :vat-validation="vatValidation"
                                    @submit="handleRegister" />
                            </Transition>
                        </div>

                        <!-- Footer -->
                        <div class="px-8 py-6 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
                            <p class="text-center text-sm text-slate-600">
                                {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
                                <button @click="toggleMode"
                                    class="font-semibold text-blue-600 hover:text-blue-700 ml-1 focus:outline-none focus:underline transition-colors">
                                    {{ isLoginMode ? 'Sign up here' : 'Sign in here' }}
                                </button>
                            </p>
                        </div>
                    </div>

                    <!-- Additional Info -->
                    <div class="mt-8 text-center">
                        <p class="text-sm text-slate-500">
                            By creating an account, you agree to our
                            <a href="#" class="text-blue-600 hover:text-blue-700 font-medium transition-colors">Terms of
                                Service</a>
                            and
                            <a href="#" class="text-blue-600 hover:text-blue-700 font-medium transition-colors">Privacy
                                Policy</a>
                        </p>
                    </div>
                </div>
            </main>

            <!-- Footer -->
            <footer class="w-full px-6 py-6 border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
                <div class="max-w-7xl mx-auto text-center">
                    <div class="flex items-center justify-center space-x-8 text-sm text-slate-500 mb-3">
                        <a href="#" class="hover:text-slate-700 transition-colors">Support</a>
                        <a href="#" class="hover:text-slate-700 transition-colors">Privacy</a>
                        <a href="#" class="hover:text-slate-700 transition-colors">Terms</a>
                        <a href="#" class="hover:text-slate-700 transition-colors">Contact</a>
                    </div>
                    <p class="text-xs text-slate-400">
                        © 2025 MotorDash B2B Platform. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    </div>
</template>



<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { validateVATNumber, type VATValidationResult } from '../utils/vatValidation'

// Components
import AuthHeader from '../components/auth/AuthHeader.vue'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'

const router = useRouter()
const authStore = useAuthStore()
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
        await authStore.login(loginForm.value.email, loginForm.value.password)
        router.push('/')
        // Reset form
        loginForm.value = { email: '', password: '' }
    } catch (error) {
        // Error is handled by the store
    }
}

const handleRegister = async () => {
    // Extra BTW validatie voor submit
    validateBTW()
    if (!vatValidation.value.isValid) {
        // Set error directly in the store's error ref
        authStore.error = `BTW validatie fout: ${vatValidation.value.error}`
        return
    }

    try {
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
        // Error is handled by the store
    }
}
</script>

<style scoped>
/* Enhanced Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.3s ease;
}

.slide-down-enter-from {
    transform: translateY(-10px);
    opacity: 0;
}

.slide-down-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}

.form-transition-enter-active,
.form-transition-leave-active {
    transition: all 0.4s ease;
}

.form-transition-enter-from {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
}

.form-transition-leave-to {
    opacity: 0;
    transform: translateX(-20px) scale(0.95);
}

/* Enhanced focus styles with modern colors */
input:focus,
select:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Gradient text support */
.bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
}

/* Backdrop blur fallback */
.backdrop-blur-sm {
    backdrop-filter: blur(4px);
}

@supports not (backdrop-filter: blur(4px)) {
    .backdrop-blur-sm {
        background-color: rgba(255, 255, 255, 0.95);
    }
}

/* Mobile optimizations */
@media (max-width: 640px) {
    .min-h-screen {
        min-height: 100vh;
        min-height: 100dvh;
    }

    /* Adjust floating shapes for mobile */
    .absolute.top-20 {
        top: 10px;
    }

    .absolute.top-40 {
        top: 20px;
    }

    .absolute.bottom-20 {
        bottom: 10px;
    }
}

/* Smooth hover animations */
button {
    transition: all 0.2s ease;
}

a {
    transition: all 0.2s ease;
}

/* Loading animation improvements */
@keyframes float {

    0%,
    100% {
        transform: translateY(0px);
    }

    50% {
        transform: translateY(-10px);
    }
}

.animate-float {
    animation: float 3s ease-in-out infinite;
}
</style>
