<template>
    <Teleport to="body">
        <!-- Desktop Notifications - Top Right -->
        <div class="notification-container-desktop fixed top-4 right-4 z-[9999] flex flex-col space-y-3 max-w-sm w-full pointer-events-none hidden sm:flex"
            aria-live="polite" aria-label="Notifications">
            <TransitionGroup name="notification-desktop" tag="div" class="space-y-3">
                <div v-for="notification in notificationStore.notifications" :key="notification.id"
                    class="notification-card pointer-events-auto" :class="getNotificationClasses(notification.type)"
                    role="alert" :aria-describedby="`notification-${notification.id}`">

                    <!-- Notification Content -->
                    <div class="relative overflow-hidden rounded-xl bg-white border backdrop-blur-md shadow-2xl"
                        :class="getBorderClasses(notification.type)">

                        <!-- Top accent bar -->
                        <div class="h-1 w-full" :class="getAccentClasses(notification.type)"></div>

                        <div class="p-4">
                            <div class="flex items-start gap-3">
                                <!-- Icon -->
                                <div class="flex-shrink-0 rounded-lg p-2"
                                    :class="getIconWrapperClasses(notification.type)">
                                    <component :is="getIcon(notification.type)" class="h-5 w-5"
                                        :class="getIconClasses(notification.type)" />
                                </div>

                                <!-- Content -->
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-gray-900 text-sm leading-tight">
                                        {{ notification.title }}
                                    </h4>
                                    <p v-if="notification.message" :id="`notification-${notification.id}`"
                                        class="mt-1 text-sm text-gray-600 leading-relaxed">
                                        {{ notification.message }}
                                    </p>
                                </div>

                                <!-- Action Button -->
                                <div v-if="notification.action" class="flex-shrink-0">
                                    <button @click="notification.action.handler"
                                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                                        :class="getActionClasses(notification.type)">
                                        {{ notification.action.label }}
                                    </button>
                                </div>

                                <!-- Close Button -->
                                <div class="flex-shrink-0">
                                    <button @click="removeNotification(notification.id)"
                                        class="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                                        :class="getCloseButtonClasses(notification.type)"
                                        aria-label="Close notification">
                                        <XMarkIcon class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Progress bar for timed notifications -->
                        <div v-if="!notification.persistent && notification.duration"
                            class="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 animate-shrink"
                            :class="getAccentClasses(notification.type)"
                            :style="`animation-duration: ${notification.duration}ms`">
                        </div>
                    </div>
                </div>
            </TransitionGroup>
        </div>

        <!-- Mobile Notifications - Full Width at Top -->
        <div class="notification-container-mobile fixed top-0 left-0 right-0 z-[9999] p-4 pointer-events-none sm:hidden"
            aria-live="polite" aria-label="Notifications">
            <TransitionGroup name="notification-mobile" tag="div" class="space-y-3">
                <div v-for="notification in notificationStore.notifications" :key="notification.id"
                    class="notification-card-mobile pointer-events-auto"
                    :class="getNotificationClasses(notification.type)" role="alert">

                    <div class="relative overflow-hidden rounded-lg bg-white border backdrop-blur-md shadow-xl"
                        :class="getBorderClasses(notification.type)">

                        <!-- Top accent bar -->
                        <div class="h-1 w-full" :class="getAccentClasses(notification.type)"></div>

                        <div class="p-4">
                            <div class="flex items-start gap-3">
                                <!-- Icon -->
                                <div class="flex-shrink-0 rounded-lg p-1.5"
                                    :class="getIconWrapperClasses(notification.type)">
                                    <component :is="getIcon(notification.type)" class="h-4 w-4"
                                        :class="getIconClasses(notification.type)" />
                                </div>

                                <!-- Content -->
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-gray-900 text-sm">
                                        {{ notification.title }}
                                    </h4>
                                    <p v-if="notification.message" class="mt-1 text-xs text-gray-600 line-clamp-2">
                                        {{ notification.message }}
                                    </p>
                                </div>

                                <!-- Close Button -->
                                <div class="flex-shrink-0">
                                    <button @click="removeNotification(notification.id)"
                                        class="flex items-center justify-center w-7 h-7 rounded-lg transition-colors focus:outline-none"
                                        :class="getCloseButtonClasses(notification.type)"
                                        aria-label="Close notification">
                                        <XMarkIcon class="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Progress bar -->
                        <div v-if="!notification.persistent && notification.duration"
                            class="absolute bottom-0 left-0 h-0.5 bg-current opacity-40 animate-shrink"
                            :class="getAccentClasses(notification.type)"
                            :style="`animation-duration: ${notification.duration}ms`">
                        </div>
                    </div>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore, type NotificationType } from '../stores/notifications'
import {
    CheckCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

const notificationStore = useNotificationStore()

// Helper function to get appropriate icon
const getIcon = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return CheckCircleIcon
        case 'info':
            return InformationCircleIcon
        case 'warning':
            return ExclamationTriangleIcon
        case 'error':
            return XCircleIcon
        default:
            return InformationCircleIcon
    }
}

// Style helper functions - Simplified for reliability
const getNotificationClasses = (_type: NotificationType) => {
    return 'notification-item' // Base class for targeting
}

const getBorderClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'border-green-200'
        case 'info':
            return 'border-blue-200'
        case 'warning':
            return 'border-yellow-200'
        case 'error':
            return 'border-red-200'
        default:
            return 'border-gray-200'
    }
}

const getAccentClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-gradient-to-r from-green-400 to-green-500'
        case 'info':
            return 'bg-gradient-to-r from-blue-400 to-blue-500'
        case 'warning':
            return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
        case 'error':
            return 'bg-gradient-to-r from-red-400 to-red-500'
        default:
            return 'bg-gradient-to-r from-gray-400 to-gray-500'
    }
}

const getIconWrapperClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-green-100 text-green-700'
        case 'info':
            return 'bg-blue-100 text-blue-700'
        case 'warning':
            return 'bg-yellow-100 text-yellow-700'
        case 'error':
            return 'bg-red-100 text-red-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

const getIconClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'text-green-600'
        case 'info':
            return 'text-blue-600'
        case 'warning':
            return 'text-yellow-600'
        case 'error':
            return 'text-red-600'
        default:
            return 'text-gray-600'
    }
}

const getActionClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
        case 'info':
            return 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500'
        case 'warning':
            return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500'
        case 'error':
            return 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
        default:
            return 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500'
    }
}

const getCloseButtonClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'text-green-500 hover:text-green-700 hover:bg-green-100 focus:ring-green-500'
        case 'info':
            return 'text-blue-500 hover:text-blue-700 hover:bg-blue-100 focus:ring-blue-500'
        case 'warning':
            return 'text-yellow-500 hover:text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500'
        case 'error':
            return 'text-red-500 hover:text-red-700 hover:bg-red-100 focus:ring-red-500'
        default:
            return 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
    }
}

const removeNotification = (id: string) => {
    notificationStore.removeNotification(id)
}
</script>

<style scoped>
/* Notification Container Styles */
.notification-container-desktop,
.notification-container-mobile {
    /* Ensure highest z-index */
    z-index: 9999;
}

.notification-card,
.notification-card-mobile {
    /* Remove background - it's now on the inner content div */
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: top right;
}

.notification-card:hover {
    transform: translateY(-2px) scale(1.02);
}

.notification-card-mobile:hover {
    transform: translateY(-1px);
}

/* Desktop Notification Animations */
.notification-desktop-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-desktop-leave-active {
    transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.notification-desktop-enter-from {
    opacity: 0;
    transform: translateX(100%) scale(0.8) rotate(5deg);
}

.notification-desktop-leave-to {
    opacity: 0;
    transform: translateX(100%) scale(0.9) rotate(-5deg);
}

.notification-desktop-move {
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Mobile Notification Animations */
.notification-mobile-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-mobile-leave-active {
    transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.notification-mobile-enter-from {
    opacity: 0;
    transform: translateY(-100%) scale(0.95);
}

.notification-mobile-leave-to {
    opacity: 0;
    transform: translateY(-100%) scale(0.95);
}

.notification-mobile-move {
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Progress bar animation */
@keyframes shrink {
    from {
        width: 100%;
        opacity: 0.6;
    }

    to {
        width: 0%;
        opacity: 0.2;
    }
}

.animate-shrink {
    animation: shrink linear;
    animation-fill-mode: forwards;
    width: 100%;
}

/* Text truncation utility */
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Enhanced focus styles for accessibility */
button:focus {
    outline: 2px solid;
    outline-offset: 2px;
}

/* Prevent layout shifts */
.notification-container-desktop {
    contain: layout;
}

.notification-container-mobile {
    contain: layout;
}

/* Performance optimization */
.notification-card,
.notification-card-mobile {
    will-change: transform, opacity;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .notification-container-mobile {
        padding: 16px 16px 0 16px;
    }
}

/* Safe area adjustments for mobile devices */
@supports (padding: max(0px)) {
    .notification-container-mobile {
        padding-top: max(16px, env(safe-area-inset-top));
        padding-left: max(16px, env(safe-area-inset-left));
        padding-right: max(16px, env(safe-area-inset-right));
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

    .notification-desktop-enter-active,
    .notification-desktop-leave-active,
    .notification-mobile-enter-active,
    .notification-mobile-leave-active,
    .notification-desktop-move,
    .notification-mobile-move,
    .notification-card,
    .notification-card-mobile {
        transition: opacity 0.2s ease !important;
    }

    .notification-desktop-enter-from,
    .notification-desktop-leave-to,
    .notification-mobile-enter-from,
    .notification-mobile-leave-to {
        transform: none !important;
    }

    .notification-card:hover,
    .notification-card-mobile:hover {
        transform: none !important;
    }
}

/* High contrast mode support */
@media (prefers-contrast: high) {

    .notification-card,
    .notification-card-mobile {
        border-width: 2px;
        backdrop-filter: none;
    }
}

/* Print media - hide notifications */
@media print {

    .notification-container-desktop,
    .notification-container-mobile {
        display: none !important;
    }
}
</style>
