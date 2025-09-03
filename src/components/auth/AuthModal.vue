<template>
    <!-- Auth Modal with Transition -->
    <Teleport to="body">
        <Transition name="modal" appear>
            <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="closeOnOverlay">
                <!-- Backdrop -->
                <div class="modal-backdrop absolute inset-0 bg-black bg-opacity-50"></div>

                <!-- Modal -->
                <div class="modal-content relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                    @click.stop>
                    <!-- Close button -->
                    <button @click="$emit('close')"
                        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-smooth z-10"
                        aria-label="Close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <!-- Header -->
                    <div class="p-6 pb-4">
                        <Transition name="fade" mode="out-in">
                            <div v-if="isLoginMode" key="login-header">
                                <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                                <p class="text-gray-600">Sign in to your B2B account</p>
                            </div>
                            <div v-else key="register-header">
                                <h2 class="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
                                <p class="text-gray-600">Join our B2B platform</p>
                            </div>
                        </Transition>
                    </div>

                    <!-- Content -->
                    <div class="px-6 pb-6">
                        <!-- Error Display -->
                        <Transition name="slide-up">
                            <div v-if="authStore.error" class="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                                <p class="text-sm text-red-600">{{ authStore.error }}</p>
                            </div>
                        </Transition>

                        <!-- Forms with transition -->
                        <Transition name="fade" mode="out-in">
                            <!-- Login Form -->
                            <form v-if="isLoginMode" key="login-form" @submit.prevent="handleLogin" class="space-y-4">
                                <div>
                                    <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input id="login-email" v-model="loginForm.email" type="email" required
                                        :disabled="authStore.loading" placeholder="Enter your email"
                                        class="form-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <div>
                                    <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input id="login-password" v-model="loginForm.password" type="password" required
                                        :disabled="authStore.loading" placeholder="Enter your password"
                                        class="form-input w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <button type="submit" :disabled="authStore.loading"
                                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                            <form v-else @submit.prevent="handleRegister" class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="register-firstname"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            First Name
                                        </label>
                                        <input id="register-firstname" v-model="registerForm.firstName" type="text"
                                            required :disabled="authStore.loading" placeholder="First name"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                    </div>
                                    <div>
                                        <label for="register-lastname"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name
                                        </label>
                                        <input id="register-lastname" v-model="registerForm.lastName" type="text"
                                            required :disabled="authStore.loading" placeholder="Last name"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                    </div>
                                </div>

                                <div>
                                    <label for="register-company" class="block text-sm font-medium text-gray-700 mb-1">
                                        Company Name
                                    </label>
                                    <input id="register-company" v-model="registerForm.companyName" type="text" required
                                        :disabled="authStore.loading" placeholder="Your company name"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <div>
                                    <label for="register-btw" class="block text-sm font-medium text-gray-700 mb-1">
                                        BTW Number
                                    </label>
                                    <input id="register-btw" v-model="registerForm.btwNumber" type="text" required
                                        :disabled="authStore.loading" placeholder="BE0123456789"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <div>
                                    <label for="register-phone" class="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number (Optional)
                                    </label>
                                    <input id="register-phone" v-model="registerForm.phone" type="tel"
                                        :disabled="authStore.loading" placeholder="+32 123 45 67 89"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <!-- Address Section -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">Company Address</h3>

                                    <div class="grid grid-cols-3 gap-4">
                                        <div class="col-span-2">
                                            <label for="register-street"
                                                class="block text-sm font-medium text-gray-700 mb-1">
                                                Street
                                            </label>
                                            <input id="register-street" v-model="registerForm.address.street"
                                                type="text" required :disabled="authStore.loading"
                                                placeholder="Street name"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                        </div>
                                        <div>
                                            <label for="register-house"
                                                class="block text-sm font-medium text-gray-700 mb-1">
                                                Number
                                            </label>
                                            <input id="register-house" v-model="registerForm.address.houseNumber"
                                                type="text" required :disabled="authStore.loading" placeholder="123"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label for="register-postal"
                                                class="block text-sm font-medium text-gray-700 mb-1">
                                                Postal Code
                                            </label>
                                            <input id="register-postal" v-model="registerForm.address.postalCode"
                                                type="text" required :disabled="authStore.loading" placeholder="1000"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                        </div>
                                        <div>
                                            <label for="register-city"
                                                class="block text-sm font-medium text-gray-700 mb-1">
                                                City
                                            </label>
                                            <input id="register-city" v-model="registerForm.address.city" type="text"
                                                required :disabled="authStore.loading" placeholder="Brussels"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                        </div>
                                    </div>

                                    <div>
                                        <label for="register-country"
                                            class="block text-sm font-medium text-gray-700 mb-1">
                                            Country
                                        </label>
                                        <select id="register-country" v-model="registerForm.address.country" required
                                            :disabled="authStore.loading"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500">
                                            <option value="Belgium">Belgium</option>
                                            <option value="Netherlands">Netherlands</option>
                                            <option value="France">France</option>
                                            <option value="Germany">Germany</option>
                                            <option value="Luxembourg">Luxembourg</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">
                                        Business Email
                                    </label>
                                    <input id="register-email" v-model="registerForm.email" type="email" required
                                        :disabled="authStore.loading" placeholder="Business email address"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <div>
                                    <label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input id="register-password" v-model="registerForm.password" type="password"
                                        required minlength="6" :disabled="authStore.loading"
                                        placeholder="Create a password (min. 6 characters)"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <div>
                                    <label for="register-confirm" class="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password
                                    </label>
                                    <input id="register-confirm" v-model="registerForm.confirmPassword" type="password"
                                        required :disabled="authStore.loading" placeholder="Confirm your password"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" />
                                </div>

                                <!-- Password mismatch warning -->
                                <div v-if="!passwordsMatch && registerForm.confirmPassword"
                                    class="text-sm text-red-600">
                                    Passwords do not match
                                </div>

                                <button type="submit" :disabled="authStore.loading || !passwordsMatch"
                                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                    <div class="px-6 py-4 bg-gray-50 border-t">
                        <p class="text-center text-sm text-gray-600">
                            {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
                            <button @click="toggleMode"
                                class="font-medium text-blue-600 hover:text-blue-500 ml-1 focus:outline-none focus:underline transition-smooth">
                                {{ isLoginMode ? 'Sign up here' : 'Sign in here' }}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'

interface Props {
    isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
}>()

const authStore = useAuthStore()
const isLoginMode = ref(true)

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

// Clear error when switching modes
watch(isLoginMode, () => {
    authStore.clearError()
})

// Clear error when modal opens
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        authStore.clearError()
    }
})

const toggleMode = () => {
    isLoginMode.value = !isLoginMode.value
    authStore.clearError()
}

const closeOnOverlay = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
        emit('close')
    }
}

const handleLogin = async () => {
    try {
        await authStore.login(loginForm.value.email, loginForm.value.password)
        emit('close')
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

    try {
        await authStore.register(
            registerForm.value.email,
            registerForm.value.password,
            registerForm.value.companyName,
            registerForm.value.firstName,
            registerForm.value.lastName,
            registerForm.value.btwNumber,
            registerForm.value.address,
            registerForm.value.phone
        )

        // Small delay to ensure all registration processes complete
        await new Promise(resolve => setTimeout(resolve, 200))

        emit('close')
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
    } catch (error) {
        // Error is handled by the store
    }
}
</script>
