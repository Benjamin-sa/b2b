<template>
    <nav class="bg-white shadow-lg border-b" ref="navRef">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <!-- Logo and Brand -->
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <router-link to="/" class="flex items-center space-x-2">
                            <img src="/header.svg" alt="4Tparts Logo" class="w-25 h-12">
                        </router-link>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:ml-6 md:flex md:space-x-8">
                        <router-link to="/products"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            Products
                        </router-link>
                        <router-link to="/orders"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            My Orders
                        </router-link>
                        <router-link to="/profile"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            My Profile
                        </router-link>
                        <!-- Replace router-link with button for admin toggle -->
                        <button v-if="authStore.isAdmin" @click="$emit('toggle-admin')" :class="[
                            showAdminPanel
                                ? 'bg-primary-600 text-white'
                                : 'text-secondary-700 hover:text-primary-600',
                            'px-3 py-2 rounded-md text-sm font-medium transition-smooth btn-animate'
                        ]">
                            {{ showAdminPanel ? 'Back to Dashboard' : 'Admin Panel' }}
                        </button>
                    </div>
                </div>

                <!-- Right side -->
                <div class="flex items-center space-x-4">
                    <!-- Cart -->
                    <div class="relative">
                        <button @click="toggleCart"
                            class="p-2 text-secondary-600 hover:text-secondary-900 relative transition-smooth hover-scale">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9m0 0l1.5-6M7 13h10" />
                            </svg>
                            <Transition name="success-bounce">
                                <span v-if="cartStore.itemCount > 0"
                                    class="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center heartbeat">
                                    {{ cartStore.itemCount }}
                                </span>
                            </Transition>
                        </button>
                    </div>

                    <!-- User Menu -->
                    <div class="relative">
                        <button @click="toggleUserMenu"
                            class="flex items-center space-x-2 text-secondary-700 hover:text-secondary-900 transition-smooth">
                            <div
                                class="w-8 h-8 bg-secondary-300 rounded-full flex items-center justify-center hover-scale transition-smooth">
                                <span class="text-sm font-medium">
                                    {{ authStore.user?.email?.charAt(0).toUpperCase() }}
                                </span>
                            </div>
                            <svg class="w-4 h-4 transition-transform duration-200"
                                :class="{ 'rotate-180': showUserMenu }" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <!-- User Dropdown -->
                        <Transition name="slide-up">
                            <div v-if="showUserMenu"
                                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hover-glow">
                                <div class="px-4 py-2 text-sm text-secondary-700 border-b">
                                    {{ authStore.user?.email }}
                                </div>
                                <router-link to="/profile" @click="showUserMenu = false"
                                    class="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-smooth">
                                    My Profile
                                </router-link>
                                <router-link to="/orders" @click="showUserMenu = false"
                                    class="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-smooth">
                                    My Orders
                                </router-link>
                                <button @click="handleLogout"
                                    class="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-smooth">
                                    Sign out
                                </button>
                            </div>
                        </Transition>
                    </div>

                    <!-- Mobile menu button -->
                    <button @click="toggleMobileMenu" class="md:hidden p-2 text-secondary-600 hover:text-secondary-900">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Mobile Navigation -->
            <Transition name="slide-down">
                <div v-if="showMobileMenu" class="md:hidden hover-glow">
                    <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
                        <router-link to="/products"
                            class="block px-3 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md text-base font-medium transition-smooth hover-lift">
                            Products
                        </router-link>
                        <router-link to="/orders"
                            class="block px-3 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md text-base font-medium transition-smooth hover-lift">
                            My Orders
                        </router-link>
                        <router-link to="/profile"
                            class="block px-3 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md text-base font-medium transition-smooth hover-lift">
                            My Profile
                        </router-link>
                        <!-- Replace router-link with button for admin toggle in mobile -->
                        <button v-if="authStore.isAdmin" @click="$emit('toggle-admin')"
                            class="block w-full text-left px-3 py-2 text-secondary-900 hover:bg-secondary-100 rounded-md text-base font-medium btn-animate transition-smooth hover-lift">
                            {{ showAdminPanel ? 'Back to Dashboard' : 'Admin Panel' }}
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    </nav>

    <!-- Cart Drawer -->
    <CartDrawer :is-open="showCartDrawer" @close="closeCartDrawer" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import CartDrawer from './cart/CartDrawer.vue'

// Define props and emits
defineProps<{
    showAdminPanel: boolean
}>()
defineEmits<{
    'toggle-admin': []
}>()

const authStore = useAuthStore()
const cartStore = useCartStore()

const showUserMenu = ref(false)
const showMobileMenu = ref(false)
const showCartDrawer = ref(false)
const navRef = ref<HTMLElement | null>(null)

const toggleUserMenu = () => {
    showUserMenu.value = !showUserMenu.value
    showMobileMenu.value = false
    showCartDrawer.value = false
}

const toggleMobileMenu = () => {
    showMobileMenu.value = !showMobileMenu.value
    showUserMenu.value = false
    showCartDrawer.value = false
}

const toggleCart = () => {
    showCartDrawer.value = !showCartDrawer.value
    showUserMenu.value = false
    showMobileMenu.value = false
}

const closeCartDrawer = () => {
    showCartDrawer.value = false
}

const handleLogout = async () => {
    await authStore.logout()
    showUserMenu.value = false
}

// Close menus when clicking outside
const closeMenus = () => {
    showUserMenu.value = false
    showMobileMenu.value = false
}

// Improved click-outside handler
const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (navRef.value && !navRef.value.contains(target)) {
        closeMenus()
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>