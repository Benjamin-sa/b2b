<template>
    <!-- Mobile Navigation Overlay -->
    <Transition name="mobile-menu">
        <div v-if="isOpen" class="md:hidden fixed inset-0 z-50 mobile-menu-overlay">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="$emit('close')"></div>

            <!-- Menu Content -->
            <div class="relative bg-white h-full max-w-sm ml-auto shadow-2xl">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-secondary-300 rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <div class="font-medium text-secondary-900 text-sm truncate">{{ userEmail }}</div>
                            <div class="text-xs text-gray-500">{{ $t('navigation.accountSettings') }}</div>
                        </div>
                    </div>
                    <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Scrollable Content -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Navigation Links -->
                    <div class="py-4">
                        <div class="px-4 mb-2">
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {{ $t('navigation.menu') || 'Menu' }}
                            </h3>
                        </div>
                        <nav class="space-y-1">
                            <router-link to="/" @click="handleLinkClick" class="mobile-nav-link group">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>{{ $t('navigation.home') }}</span>
                            </router-link>
                            <router-link to="/products" @click="handleLinkClick" class="mobile-nav-link group">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <span>{{ $t('navigation.products') }}</span>
                            </router-link>
                            <router-link to="/categories" @click="handleLinkClick" class="mobile-nav-link group">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span>{{ $t('navigation.categories') }}</span>
                            </router-link>
                            <router-link to="/orders" @click="handleLinkClick" class="mobile-nav-link group">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>{{ $t('navigation.orders') }}</span>
                            </router-link>
                        </nav>
                    </div>

                    <!-- Account Section -->
                    <div class="py-4 border-t">
                        <div class="px-4 mb-2">
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {{ $t('navigation.account') || 'Account' }}
                            </h3>
                        </div>
                        <nav class="space-y-1">
                            <router-link to="/profile" @click="handleLinkClick" class="mobile-nav-link group">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{{ $t('navigation.profile') }}</span>
                            </router-link>
                            <button v-if="isAdmin" @click="handleAdminToggle"
                                class="mobile-nav-link group w-full text-left">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{{ showAdminPanel ? $t('navigation.backToDashboard') : $t('navigation.adminPanel')
                                    }}</span>
                            </button>
                        </nav>
                    </div>

                    <!-- Language & Settings -->
                    <div class="py-4 border-t">
                        <div class="px-4 mb-3">
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {{ $t('navigation.settings') || 'Settings' }}
                            </h3>
                        </div>
                        <div class="px-4">
                            <!-- Language Selector Button -->
                            <button @click="openLanguageModal" class="mobile-nav-link group w-full">
                                <svg class="mobile-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                <span class="flex-1 text-left">{{ currentLanguageName }}</span>
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="border-t p-4 bg-gray-50">
                    <button @click="handleLogout"
                        class="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>{{ $t('navigation.signOut') }}</span>
                    </button>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Language Selection Modal -->
    <Transition name="language-modal">
        <div v-if="showLanguageModal" class="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" @click="closeLanguageModal"></div>
            
            <!-- Modal Content -->
            <div class="relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl md:rounded-t-2xl">
                    <h3 class="text-lg font-semibold text-gray-900">{{ $t('navigation.selectLanguage') || 'Select Language' }}</h3>
                    <button @click="closeLanguageModal" class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Scrollable Language List -->
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="space-y-2">
                        <button v-for="lang in languages" :key="lang.code" @click="selectLanguage(lang.code)"
                            :class="[
                                'w-full flex items-center justify-between px-4 py-3.5 rounded-lg transition-all duration-200',
                                currentLocale === lang.code 
                                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-300 shadow-sm' 
                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                            ]">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">{{ lang.flag }}</span>
                                <div class="text-left">
                                    <div class="font-medium">{{ lang.name }}</div>
                                    <div class="text-xs text-gray-500">{{ lang.nativeName }}</div>
                                </div>
                            </div>
                            <svg v-if="currentLocale === lang.code" class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// Props
defineProps<{
    isOpen: boolean
    userEmail?: string
    isAdmin: boolean
    showAdminPanel: boolean
}>()

// Emits
const emit = defineEmits<{
    close: []
    'admin-toggle': []
    logout: []
}>()

// Language modal state
const showLanguageModal = ref(false)

// Language management - Expandable list with flags and native names
const languages = [
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },

    // Add more languages as needed
]

const currentLocale = computed(() => locale.value)

const currentLanguageName = computed(() => {
    const lang = languages.find(l => l.code === locale.value)
    return lang ? `${lang.flag} ${lang.name}` : 'Language'
})

const openLanguageModal = () => {
    showLanguageModal.value = true
}

const closeLanguageModal = () => {
    showLanguageModal.value = false
}

const selectLanguage = (langCode: string) => {
    locale.value = langCode
    localStorage.setItem('language', langCode)
    closeLanguageModal()
}

// Event handlers
const handleLinkClick = () => {
    emit('close')
}

const handleAdminToggle = () => {
    emit('admin-toggle')
}

const handleLogout = () => {
    emit('logout')
}
</script>

<style scoped>
/* Mobile Menu Overlay */
.mobile-menu-overlay {
    backdrop-filter: blur(4px);
}

/* Mobile menu transitions */
.mobile-menu-enter-active {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-menu-leave-active {
    transition: all 0.25s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.mobile-menu-enter-from {
    opacity: 0;
}

.mobile-menu-enter-from .mobile-menu-overlay>div:last-child {
    transform: translateX(100%);
}

.mobile-menu-leave-to {
    opacity: 0;
}

.mobile-menu-leave-to .mobile-menu-overlay>div:last-child {
    transform: translateX(100%);
}

/* Mobile navigation links */
.mobile-nav-link {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    color: #374151;
    font-weight: 500;
    transition: all 0.2s ease;
    border-radius: 8px;
    margin: 0 12px;
}

.mobile-nav-link:hover,
.mobile-nav-link:focus {
    background-color: #f3f4f6;
    color: #1f2937;
    transform: translateX(4px);
}

.mobile-nav-link.router-link-active {
    background-color: #dbeafe;
    color: #2563eb;
    border-left: 3px solid #2563eb;
}

.mobile-nav-icon {
    width: 20px;
    height: 20px;
    margin-right: 12px;
    flex-shrink: 0;
}

/* Smooth scrolling for mobile menu */
.mobile-menu-overlay .overflow-y-auto {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
}

/* Enhanced mobile responsiveness */
@media (max-width: 380px) {
    .mobile-menu-overlay .max-w-sm {
        max-width: 100%;
    }

    .mobile-nav-link {
        padding: 10px 12px;
        margin: 0 8px;
    }

    .mobile-nav-icon {
        width: 18px;
        height: 18px;
        margin-right: 10px;
    }
}

/* Language Modal Transitions */
.language-modal-enter-active {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.language-modal-leave-active {
    transition: all 0.25s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.language-modal-enter-from,
.language-modal-leave-to {
    opacity: 0;
}

.language-modal-enter-from .bg-white,
.language-modal-leave-to .bg-white {
    transform: translateY(100%);
}

@media (min-width: 768px) {
    .language-modal-enter-from .bg-white,
    .language-modal-leave-to .bg-white {
        transform: translateY(0) scale(0.95);
    }
}

/* Reduced motion support for mobile menu */
@media (prefers-reduced-motion: reduce) {

    .mobile-menu-enter-active,
    .mobile-menu-leave-active,
    .language-modal-enter-active,
    .language-modal-leave-active {
        transition: opacity 0.2s ease !important;
    }

    .mobile-menu-enter-from .mobile-menu-overlay>div:last-child,
    .mobile-menu-leave-to .mobile-menu-overlay>div:last-child,
    .language-modal-enter-from .bg-white,
    .language-modal-leave-to .bg-white {
        transform: none !important;
    }

    .mobile-nav-link:hover,
    .mobile-nav-link:focus {
        transform: none !important;
    }
}
</style>