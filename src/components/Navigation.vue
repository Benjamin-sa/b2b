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
                        <router-link to="/"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            {{ $t('navigation.home') }}
                        </router-link>
                        <router-link to="/products"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            {{ $t('navigation.products') }}
                        </router-link>
                        <router-link to="/categories"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            {{ $t('navigation.categories') }}
                        </router-link>
                        <router-link to="/orders"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            {{ $t('navigation.orders') }}
                        </router-link>
                        <router-link to="/profile"
                            class="text-secondary-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-smooth hover-lift">
                            {{ $t('navigation.profile') }}
                        </router-link>
                        <!-- Replace router-link with button for admin toggle -->
                        <button v-if="authStore.isAdmin" @click="$emit('toggle-admin')" :class="[
                            showAdminPanel
                                ? 'bg-primary-600 text-white'
                                : 'text-secondary-700 hover:text-primary-600',
                            'px-3 py-2 rounded-md text-sm font-medium transition-smooth btn-animate'
                        ]">
                            {{ showAdminPanel ? $t('navigation.backToDashboard') : $t('navigation.adminPanel') }}
                        </button>
                    </div>
                </div>

                <!-- Right side - Desktop -->
                <div class="hidden md:flex items-center space-x-4">
                    <!-- Language Switcher -->
                    <LanguageSwitcher />
                    <!-- Cart -->
                    <div class="relative">
                        <button @click="toggleCart"
                            class="p-2 text-secondary-600 hover:text-secondary-900 relative transition-smooth hover-scale cursor-pointer">
                            <img src="../assets/shoppingcart.svg" alt="Shopping Cart" class="w-6 h-6">
                            <Transition name="cart-badge">
                                <div v-if="cartStore.itemCount > 0" class="absolute -top-1 -right-1 cart-count-badge">
                                    <span class="cart-count-text">
                                        {{ cartStore.itemCount > 99 ? '99+' : cartStore.itemCount }}
                                    </span>
                                </div>
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
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
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
                        <Transition name="slide-fade">
                            <div v-if="showUserMenu"
                                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 transform-gpu backdrop-blur-sm"
                                style="max-height: calc(100vh - 120px); overflow-y: auto;">
                                <div
                                    class="px-4 py-3 text-sm text-secondary-700 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                    <div class="font-medium truncate">{{ authStore.user?.email }}</div>
                                    <div class="text-xs text-gray-500 mt-1">{{ $t('navigation.accountSettings') }}</div>
                                </div>
                                <router-link to="/profile" @click="showUserMenu = false"
                                    class="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-all duration-200 cursor-pointer">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>{{ $t('navigation.profile') }}</span>
                                    </div>
                                </router-link>
                                <router-link to="/orders" @click="showUserMenu = false"
                                    class="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-all duration-200 cursor-pointer">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>{{ $t('navigation.orders') }}</span>
                                    </div>
                                </router-link>
                                <hr class="my-1 border-gray-100">
                                <button @click="handleLogout"
                                    class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>{{ $t('navigation.signOut') }}</span>
                                    </div>
                                </button>
                            </div>
                        </Transition>
                    </div>
                </div>

                <!-- Right side - Mobile -->
                <div class="md:hidden flex items-center space-x-2">
                    <!-- Mobile Cart Button -->
                    <button @click="toggleCart"
                        class="p-2 text-secondary-600 hover:text-secondary-900 relative transition-smooth">
                        <img src="../assets/shoppingcart.svg" alt="Shopping Cart" class="w-6 h-6">
                        <Transition name="cart-badge">
                            <div v-if="cartStore.itemCount > 0"
                                class="absolute -top-1 -right-1 cart-count-badge mobile-badge">
                                <span class="cart-count-text">
                                    {{ cartStore.itemCount > 99 ? '99+' : cartStore.itemCount }}
                                </span>
                            </div>
                        </Transition>
                    </button>

                    <!-- Mobile menu button -->
                    <button @click="toggleMobileMenu"
                        class="p-2 text-secondary-600 hover:text-secondary-900 transition-smooth"
                        :class="{ 'text-primary-600': showMobileMenu }">
                        <svg class="w-6 h-6 transition-transform duration-300" :class="{ 'rotate-90': showMobileMenu }"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="!showMobileMenu" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

        </div>
    </nav>

    <!-- Mobile Navigation -->
    <MobileNavigation :is-open="showMobileMenu" :user-email="authStore.user?.email || undefined"
        :is-admin="authStore.isAdmin" :show-admin-panel="showAdminPanel" @close="closeMobileMenu"
        @admin-toggle="handleAdminToggle" @logout="handleMobileLogout" />

    <!-- Cart Drawer -->
    <CartDrawer :is-open="showCartDrawer" @close="closeCartDrawer" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import CartDrawer from './cart/CartDrawer.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import MobileNavigation from './MobileNavigation.vue'

// Define props and emits
defineProps<{
    showAdminPanel: boolean
}>()
const emit = defineEmits<{
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

const closeMobileMenu = () => {
    showMobileMenu.value = false
}

const handleAdminToggle = () => {
    closeMobileMenu()
    emit('toggle-admin')
}

const handleMobileLogout = async () => {
    await authStore.logout()
    closeMobileMenu()
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

<style scoped>
/* Smooth dropdown animation */
.slide-fade-enter-active {
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.slide-fade-leave-active {
    transition: all 0.2s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.slide-fade-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

/* Enhanced hover effects */
.hover-scale {
    transition: transform 0.2s ease;
}

.hover-scale:hover {
    transform: scale(1.05);
}

/* Smooth transitions for all interactive elements */
.transition-smooth {
    transition: all 0.2s ease;
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {

    .slide-fade-enter-from,
    .slide-fade-leave-to {
        transform: translateY(-5px) scale(0.98);
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

    .slide-fade-enter-active,
    .slide-fade-leave-active,
    .hover-scale,
    .transition-smooth {
        transition: none !important;
    }

    .slide-fade-enter-from,
    .slide-fade-leave-to {
        transform: none !important;
    }

    .hover-scale:hover {
        transform: none !important;
    }
}

/* Cart badge styling */
.cart-count-badge {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border: 2px solid white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    animation: cart-pulse 2s ease-in-out infinite;
}

.cart-count-text {
    color: white;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 0 2px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Cart badge transitions */
.cart-badge-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.cart-badge-leave-active {
    transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.cart-badge-enter-from {
    opacity: 0;
    transform: scale(0.3) rotate(180deg);
}

.cart-badge-leave-to {
    opacity: 0;
    transform: scale(0.3) rotate(-180deg);
}

/* Subtle pulsing animation */
@keyframes cart-pulse {

    0%,
    100% {
        transform: scale(1);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    50% {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
}

/* Responsive adjustments for cart badge */
@media (max-width: 640px) {
    .cart-count-badge {
        min-width: 18px;
        height: 18px;
        border-width: 1.5px;
    }

    .cart-count-text {
        font-size: 10px;
    }
}

/* Mobile cart badge adjustments */
.mobile-badge {
    min-width: 16px;
    height: 16px;
    border-width: 1px;
}

.mobile-badge .cart-count-text {
    font-size: 9px;
}

/* Reduced motion support for cart badge */
@media (prefers-reduced-motion: reduce) {
    .cart-count-badge {
        animation: none !important;
    }

    .cart-badge-enter-active,
    .cart-badge-leave-active {
        transition: opacity 0.2s ease !important;
    }

    .cart-badge-enter-from,
    .cart-badge-leave-to {
        transform: none !important;
    }
}
</style>
