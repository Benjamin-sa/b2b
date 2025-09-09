<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        <!-- Header -->
        <header class="w-full px-6 py-4">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <!-- Logo -->
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">MotorDash</h1>
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
                                <h2 class="text-3xl font-bold text-gray-900 mb-3">Join MotorDash</h2>
                                <p class="text-gray-600">Create your B2B account</p>
                            </div>
                        </Transition>
                    </div>

                    <!-- Content -->
                    <div class="px-8 pb-8">
                        <!-- Error Display -->
                        <Transition name="slide-up">
                            <div v-if="authStore.error" class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                                <div class="flex items-start">
                                    <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none"
                                        stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p class="text-sm text-red-600">{{ authStore.error }}</p>
                                </div>
                            </div>
                        </Transition>

                        <!-- Forms with transition -->
                        <Transition name="fade" mode="out-in">
                            <!-- Login Form -->
                            <form v-if="isLoginMode" key="login-form" @submit.prevent="handleLogin" class="space-y-6">
                                <div class="space-y-4">
                                    <div>
                                        <label for="login-email" class="block text-sm font-semibold text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input id="login-email" v-model="loginForm.email" type="email" required
                                            :disabled="authStore.loading" placeholder="Enter your email"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                    </div>

                                    <div>
                                        <label for="login-password"
                                            class="block text-sm font-semibold text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <input id="login-password" v-model="loginForm.password" type="password" required
                                            :disabled="authStore.loading" placeholder="Enter your password"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                    </div>
                                </div>

                                <button type="submit" :disabled="authStore.loading"
                                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
                                    <span v-if="authStore.loading" class="flex items-center justify-center">
                                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                            </path>
                                        </svg>
                                        Signing In...
                                    </span>
                                    <span v-else>Sign In</span>
                                </button>
                            </form>

                            <!-- Register Form -->
                            <form v-else key="register-form" @submit.prevent="handleRegister" class="space-y-6">
                                <div class="space-y-4">
                                    <!-- Name Fields -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label for="register-firstname"
                                                class="block text-sm font-semibold text-gray-700 mb-2">
                                                First Name
                                            </label>
                                            <input id="register-firstname" v-model="registerForm.firstName" type="text"
                                                required :disabled="authStore.loading" placeholder="First name"
                                                class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                        </div>
                                        <div>
                                            <label for="register-lastname"
                                                class="block text-sm font-semibold text-gray-700 mb-2">
                                                Last Name
                                            </label>
                                            <input id="register-lastname" v-model="registerForm.lastName" type="text"
                                                required :disabled="authStore.loading" placeholder="Last name"
                                                class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                        </div>
                                    </div>

                                    <!-- Company Name -->
                                    <div>
                                        <label for="register-company"
                                            class="block text-sm font-semibold text-gray-700 mb-2">
                                            Company Name
                                        </label>
                                        <input id="register-company" v-model="registerForm.companyName" type="text"
                                            required :disabled="authStore.loading" placeholder="Your company name"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                    </div>

                                    <!-- BTW Number with enhanced styling -->
                                    <div>
                                        <label for="register-btw"
                                            class="block text-sm font-semibold text-gray-700 mb-2">
                                            BTW/VAT Number *
                                        </label>
                                        <input id="register-btw" v-model="registerForm.btwNumber" type="text" required
                                            :disabled="authStore.loading" placeholder="BE0123456789 (EU VAT number)"
                                            :class="[
                                                'w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all duration-200',
                                                !vatValidation.isValid && registerForm.btwNumber ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                                            ]" />

                                        <!-- BTW Validation Messages -->
                                        <div v-if="!vatValidation.isValid && registerForm.btwNumber"
                                            class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div class="flex items-start">
                                                <svg class="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none"
                                                    stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p class="text-sm text-red-600 font-medium">{{ vatValidation.error
                                                        }}</p>
                                                    <div v-if="vatValidation.format" class="text-xs text-red-500 mt-1">
                                                        Expected format: {{ vatValidation.format }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-else-if="vatValidation.isValid && vatValidation.countryName"
                                            class="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div class="flex items-center">
                                                <svg class="w-4 h-4 text-green-400 mr-2" fill="none"
                                                    stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                        stroke-width="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <p class="text-sm text-green-600 font-medium">Valid {{
                                                    vatValidation.countryName }} VAT number</p>
                                            </div>
                                        </div>

                                        <!-- Help text -->
                                        <p class="mt-2 text-xs text-gray-500">
                                            Only EU VAT/BTW numbers are accepted for B2B accounts
                                        </p>
                                    </div>

                                    <!-- Phone -->
                                    <div>
                                        <label for="register-phone"
                                            class="block text-sm font-semibold text-gray-700 mb-2">
                                            Phone Number <span class="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input id="register-phone" v-model="registerForm.phone" type="tel"
                                            :disabled="authStore.loading" placeholder="+32 123 45 67 89"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                    </div>

                                    <!-- Address Section -->
                                    <div class="bg-gray-50 rounded-xl p-6 space-y-4">
                                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Company Address</h3>

                                        <!-- Street and Number -->
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div class="sm:col-span-2">
                                                <label for="register-street"
                                                    class="block text-sm font-semibold text-gray-700 mb-2">
                                                    Street
                                                </label>
                                                <input id="register-street" v-model="registerForm.address.street"
                                                    type="text" required :disabled="authStore.loading"
                                                    placeholder="Street name"
                                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                                            </div>
                                            <div>
                                                <label for="register-house"
                                                    class="block text-sm font-semibold text-gray-700 mb-2">
                                                    Number
                                                </label>
                                                <input id="register-house" v-model="registerForm.address.houseNumber"
                                                    type="text" required :disabled="authStore.loading" placeholder="123"
                                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                                            </div>
                                        </div>

                                        <!-- Postal Code and City -->
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label for="register-postal"
                                                    class="block text-sm font-semibold text-gray-700 mb-2">
                                                    Postal Code
                                                </label>
                                                <input id="register-postal" v-model="registerForm.address.postalCode"
                                                    type="text" required :disabled="authStore.loading"
                                                    placeholder="1000"
                                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                                            </div>
                                            <div>
                                                <label for="register-city"
                                                    class="block text-sm font-semibold text-gray-700 mb-2">
                                                    City
                                                </label>
                                                <input id="register-city" v-model="registerForm.address.city"
                                                    type="text" required :disabled="authStore.loading"
                                                    placeholder="Brussels"
                                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white" />
                                            </div>
                                        </div>

                                        <!-- Country -->
                                        <div>
                                            <label for="register-country"
                                                class="block text-sm font-semibold text-gray-700 mb-2">
                                                Country
                                            </label>
                                            <select id="register-country" v-model="registerForm.address.country"
                                                required :disabled="authStore.loading"
                                                class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white">
                                                <option value="Belgium">Belgium</option>
                                                <option value="Netherlands">Netherlands</option>
                                                <option value="Germany">Germany</option>
                                                <option value="France">France</option>
                                                <option value="Italy">Italy</option>
                                                <option value="Spain">Spain</option>
                                                <option value="Portugal">Portugal</option>
                                                <option value="Austria">Austria</option>
                                                <option value="Luxembourg">Luxembourg</option>
                                                <option value="Ireland">Ireland</option>
                                                <option value="Denmark">Denmark</option>
                                                <option value="Sweden">Sweden</option>
                                                <option value="Finland">Finland</option>
                                                <option value="Poland">Poland</option>
                                                <option value="Czech Republic">Czech Republic</option>
                                                <option value="Slovakia">Slovakia</option>
                                                <option value="Hungary">Hungary</option>
                                                <option value="Slovenia">Slovenia</option>
                                                <option value="Croatia">Croatia</option>
                                                <option value="Bulgaria">Bulgaria</option>
                                                <option value="Romania">Romania</option>
                                                <option value="Lithuania">Lithuania</option>
                                                <option value="Latvia">Latvia</option>
                                                <option value="Estonia">Estonia</option>
                                                <option value="Malta">Malta</option>
                                                <option value="Cyprus">Cyprus</option>
                                                <option value="Greece">Greece</option>
                                                <option value="Norway">Norway</option>
                                                <option value="Iceland">Iceland</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Email -->
                                    <div>
                                        <label for="register-email"
                                            class="block text-sm font-semibold text-gray-700 mb-2">
                                            Business Email
                                        </label>
                                        <input id="register-email" v-model="registerForm.email" type="email" required
                                            :disabled="authStore.loading" placeholder="Business email address"
                                            class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                    </div>

                                    <!-- Password Fields -->
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label for="register-password"
                                                class="block text-sm font-semibold text-gray-700 mb-2">
                                                Password
                                            </label>
                                            <input id="register-password" v-model="registerForm.password"
                                                type="password" required minlength="6" :disabled="authStore.loading"
                                                placeholder="Min. 6 characters"
                                                class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                        </div>
                                        <div>
                                            <label for="register-confirm"
                                                class="block text-sm font-semibold text-gray-700 mb-2">
                                                Confirm Password
                                            </label>
                                            <input id="register-confirm" v-model="registerForm.confirmPassword"
                                                type="password" required :disabled="authStore.loading"
                                                placeholder="Confirm password"
                                                class="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Validation warnings -->
                                <div v-if="!passwordsMatch && registerForm.confirmPassword"
                                    class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div class="flex items-center">
                                        <svg class="w-4 h-4 text-amber-400 mr-2" fill="none" stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p class="text-sm text-amber-600 font-medium">Passwords do not match</p>
                                    </div>
                                </div>

                                <div v-if="!vatValidation.isValid && registerForm.btwNumber"
                                    class="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div class="flex items-center">
                                        <svg class="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p class="text-sm text-red-600 font-medium">Valid VAT number required to
                                            continue</p>
                                    </div>
                                </div>

                                <button type="submit" :disabled="authStore.loading || !canSubmitRegister"
                                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">
                                    <span v-if="authStore.loading" class="flex items-center justify-center">
                                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                            </path>
                                        </svg>
                                        Creating Account...
                                    </span>
                                    <span v-else>Create Account</span>
                                </button>
                            </form>
                        </Transition>
                    </div>

                    <!-- Footer -->
                    <div class="px-8 py-6 bg-gray-50 border-t border-gray-100">
                        <p class="text-center text-sm text-gray-600">
                            {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
                            <button @click="toggleMode"
                                class="font-semibold text-blue-600 hover:text-blue-500 ml-1 focus:outline-none focus:underline transition-colors">
                                {{ isLoginMode ? 'Sign up here' : 'Sign in here' }}
                            </button>
                        </p>
                    </div>
                </div>

                <!-- Additional Info -->
                <div class="mt-8 text-center">
                    <p class="text-sm text-gray-500">
                        By creating an account, you agree to our
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium">Terms of Service</a>
                        and
                        <a href="#" class="text-blue-600 hover:text-blue-500 font-medium">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full px-6 py-4 border-t border-gray-200">
            <div class="max-w-7xl mx-auto text-center text-sm text-gray-500">
                © 2025 MotorDash B2B Platform. All rights reserved.
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { validateVATNumber, type VATValidationResult } from '../utils/vatValidation'

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
        await authStore.login(loginForm.value.email, loginForm.value.password)
        router.push('/')
        // Reset form
        loginForm.value = { email: '', password: '' }
    } catch (error) {
        // Error is handled by the store
    }
}

const handleRegister = async () => {
    if (!passwordsMatch.value) {
        return
    }

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
