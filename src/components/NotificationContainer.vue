<template>
    <Teleport to="body">
        <!-- Notification Container -->
        <div class="notification-container fixed top-6 right-6 z-50 flex flex-col space-y-4 max-w-sm sm:max-w-md w-full sm:w-auto pointer-events-none"
            aria-live="polite" aria-label="Notifications">
            <TransitionGroup name="notification" tag="div" class="space-y-4">
                <div v-for="notification in notificationStore.notifications" :key="notification.id" :class="[
                    'notification-card relative overflow-hidden pointer-events-auto backdrop-blur-sm',
                    getNotificationClasses(notification.type)
                ]" role="alert" :aria-describedby="`notification-${notification.id}`">
                    <!-- Gradient Border -->
                    <div :class="[
                        'notification-border absolute inset-0 rounded-[inherit] p-[1px]',
                        getGradientBorderClasses(notification.type)
                    ]">
                        <div class="notification-content h-full w-full rounded-[inherit] backdrop-blur-md"
                            :class="getBackgroundClasses(notification.type)">
                            <!-- Icon Bar -->
                            <div :class="[
                                'notification-icon-bar h-1 w-full',
                                getAccentClasses(notification.type)
                            ]"></div>

                            <!-- Content -->
                            <div class="p-5">
                                <div class="flex items-start">
                                    <!-- Icon -->
                                    <div class="flex-shrink-0 notification-icon-wrapper"
                                        :class="getIconWrapperClasses(notification.type)">
                                        <component :is="getIcon(notification.type)" :class="[
                                            'h-5 w-5 notification-icon',
                                            getIconClasses(notification.type)
                                        ]" aria-hidden="true" />
                                    </div>

                                    <!-- Content -->
                                    <div class="ml-4 flex-1 min-w-0">
                                        <h4 class="notification-title font-semibold text-base leading-tight"
                                            :class="getTextClasses(notification.type)">
                                            {{ notification.title }}
                                        </h4>
                                        <p v-if="notification.message" :id="`notification-${notification.id}`"
                                            class="notification-message mt-1 text-sm leading-relaxed"
                                            :class="getMessageClasses(notification.type)">
                                            {{ notification.message }}
                                        </p>
                                    </div>

                                    <!-- Action Button -->
                                    <div v-if="notification.action" class="ml-3 flex-shrink-0">
                                        <button @click="notification.action.handler" :class="[
                                            'notification-action-btn inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200',
                                            getActionClasses(notification.type)
                                        ]">
                                            {{ notification.action.label }}
                                        </button>
                                    </div>

                                    <!-- Close Button -->
                                    <div class="ml-3 flex-shrink-0">
                                        <button @click="removeNotification(notification.id)" :class="[
                                            'notification-close-btn inline-flex items-center justify-center w-8 h-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 hover:scale-105',
                                            getCloseButtonClasses(notification.type)
                                        ]" aria-label="Close notification">
                                            <XMarkIcon class="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Progress bar for timed notifications -->
                            <div v-if="!notification.persistent && notification.duration" :class="[
                                'notification-progress absolute bottom-0 left-0 h-0.5 animate-shrink rounded-full',
                                getProgressClasses(notification.type)
                            ]" :style="`animation-duration: ${notification.duration}ms`" />
                        </div>
                    </div>
                </div>
            </TransitionGroup>
        </div>

        <!-- Mobile bottom notifications for better UX on small screens -->
        <div v-if="notificationStore.hasNotifications" class="sm:hidden fixed bottom-6 left-4 right-4 z-50">
            <!-- Show only the latest notification on mobile -->
            <div v-if="notificationStore.latestNotification"
                class="notification-mobile-card pointer-events-auto backdrop-blur-sm"
                :class="getNotificationClasses(notificationStore.latestNotification.type)" role="alert">
                <div :class="[
                    'notification-border rounded-xl p-[1px]',
                    getGradientBorderClasses(notificationStore.latestNotification.type)
                ]">
                    <div class="notification-content h-full w-full rounded-[inherit] backdrop-blur-md p-4"
                        :class="getBackgroundClasses(notificationStore.latestNotification.type)">
                        <!-- Icon Bar -->
                        <div :class="[
                            'h-1 w-full mb-3 rounded-full',
                            getAccentClasses(notificationStore.latestNotification.type)
                        ]"></div>

                        <div class="flex items-start">
                            <div class="flex-shrink-0 notification-icon-wrapper mr-3 p-2 rounded-lg"
                                :class="getIconWrapperClasses(notificationStore.latestNotification.type)">
                                <component :is="getIcon(notificationStore.latestNotification.type)" class="h-4 w-4"
                                    :class="getIconClasses(notificationStore.latestNotification.type)" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="notification-title font-semibold text-sm"
                                    :class="getTextClasses(notificationStore.latestNotification.type)">
                                    {{ notificationStore.latestNotification.title }}
                                </p>
                                <p v-if="notificationStore.latestNotification.message"
                                    class="notification-message mt-1 text-xs leading-relaxed line-clamp-2"
                                    :class="getMessageClasses(notificationStore.latestNotification.type)">
                                    {{ notificationStore.latestNotification.message }}
                                </p>
                            </div>
                            <button @click="removeNotification(notificationStore.latestNotification.id)"
                                class="ml-3 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                                :class="getCloseButtonClasses(notificationStore.latestNotification.type)">
                                <XMarkIcon class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
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

// Style helper functions
const getNotificationClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'notification-success'
        case 'info':
            return 'notification-info'
        case 'warning':
            return 'notification-warning'
        case 'error':
            return 'notification-error'
        default:
            return 'notification-info'
    }
}

const getGradientBorderClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600'
        case 'info':
            return 'bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600'
        case 'warning':
            return 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600'
        case 'error':
            return 'bg-gradient-to-r from-red-400 via-rose-500 to-red-600'
        default:
            return 'bg-gradient-to-r from-gray-400 via-slate-500 to-gray-600'
    }
}

const getBackgroundClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-white/95 border border-green-100/50'
        case 'info':
            return 'bg-white/95 border border-blue-100/50'
        case 'warning':
            return 'bg-white/95 border border-yellow-100/50'
        case 'error':
            return 'bg-white/95 border border-red-100/50'
        default:
            return 'bg-white/95 border border-gray-100/50'
    }
}

const getAccentClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-gradient-to-r from-green-400 to-emerald-500'
        case 'info':
            return 'bg-gradient-to-r from-blue-400 to-cyan-500'
        case 'warning':
            return 'bg-gradient-to-r from-yellow-400 to-orange-500'
        case 'error':
            return 'bg-gradient-to-r from-red-400 to-rose-500'
        default:
            return 'bg-gradient-to-r from-gray-400 to-slate-500'
    }
}

const getIconWrapperClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-green-50 ring-2 ring-green-100 text-green-600'
        case 'info':
            return 'bg-blue-50 ring-2 ring-blue-100 text-blue-600'
        case 'warning':
            return 'bg-yellow-50 ring-2 ring-yellow-100 text-yellow-600'
        case 'error':
            return 'bg-red-50 ring-2 ring-red-100 text-red-600'
        default:
            return 'bg-gray-50 ring-2 ring-gray-100 text-gray-600'
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

const getTextClasses = (_type: NotificationType) => {
    return 'text-gray-900'
}

const getMessageClasses = (_type: NotificationType) => {
    return 'text-gray-600'
}

const getActionClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
        case 'info':
            return 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500'
        case 'warning':
            return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500'
        case 'error':
            return 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500'
        default:
            return 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
    }
}

const getCloseButtonClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'text-green-400 hover:text-green-600 hover:bg-green-100 focus:ring-green-500'
        case 'info':
            return 'text-blue-400 hover:text-blue-600 hover:bg-blue-100 focus:ring-blue-500'
        case 'warning':
            return 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100 focus:ring-yellow-500'
        case 'error':
            return 'text-red-400 hover:text-red-600 hover:bg-red-100 focus:ring-red-500'
        default:
            return 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
    }
}

const getProgressClasses = (type: NotificationType) => {
    switch (type) {
        case 'success':
            return 'bg-gradient-to-r from-green-400 to-emerald-500'
        case 'info':
            return 'bg-gradient-to-r from-blue-400 to-cyan-500'
        case 'warning':
            return 'bg-gradient-to-r from-yellow-400 to-orange-500'
        case 'error':
            return 'bg-gradient-to-r from-red-400 to-rose-500'
        default:
            return 'bg-gradient-to-r from-gray-400 to-slate-500'
    }
}

const removeNotification = (id: string) => {
    notificationStore.removeNotification(id)
}
</script>

<style scoped>
/* Notification Container Styles using Design System */
.notification-container {
    filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.1));
}

.notification-card {
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    backdrop-filter: blur(12px);
    transition: var(--transition-all);
    transform-origin: top right;
}

.notification-card:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}

.notification-border {
    border-radius: inherit;
}

.notification-content {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.notification-icon-bar {
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.notification-icon-wrapper {
    border-radius: var(--radius-lg);
    padding: var(--spacing-xs);
    transition: var(--transition-all);
}

.notification-icon {
    transition: var(--transition-all);
}

.notification-title {
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.4;
}

.notification-message {
    color: var(--color-text-secondary);
    line-height: 1.5;
}

.notification-action-btn {
    border-radius: var(--radius-lg);
    font-weight: 500;
    transition: var(--transition-all);
    transform-origin: center;
}

.notification-action-btn:hover {
    transform: scale(1.05);
}

.notification-close-btn {
    border-radius: var(--radius-lg);
    transition: var(--transition-all);
    transform-origin: center;
}

.notification-close-btn:hover {
    transform: scale(1.1);
}

.notification-progress {
    background: linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%);
    border-radius: var(--radius-full);
}

/* Mobile Card Styles */
.notification-mobile-card {
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    backdrop-filter: blur(12px);
    transition: var(--transition-all);
}

/* Success Notification Specific Styles */
.notification-success .notification-content {
    border-left: 4px solid var(--color-success);
}

.notification-success .notification-icon-wrapper {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2));
}

/* Info Notification Specific Styles */
.notification-info .notification-content {
    border-left: 4px solid var(--color-brand-primary);
}

.notification-info .notification-icon-wrapper {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.2));
}

/* Warning Notification Specific Styles */
.notification-warning .notification-content {
    border-left: 4px solid var(--color-warning);
}

.notification-warning .notification-icon-wrapper {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.2));
}

/* Error Notification Specific Styles */
.notification-error .notification-content {
    border-left: 4px solid var(--color-danger);
}

.notification-error .notification-icon-wrapper {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.2));
}

/* Notification animations */
.notification-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-leave-active {
    transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.notification-enter-from {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
}

.notification-leave-to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
}

.notification-move {
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Progress bar animation */
@keyframes shrink {
    from {
        width: 100%;
        opacity: 1;
    }

    to {
        width: 0%;
        opacity: 0.3;
    }
}

.animate-shrink {
    animation: shrink linear;
    animation-fill-mode: forwards;
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 640px) {

    .notification-enter-from,
    .notification-leave-to {
        transform: translateY(100%) scale(0.9);
    }

    .notification-mobile-card {
        margin: 0 var(--spacing-sm);
    }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {

    .notification-enter-active,
    .notification-leave-active,
    .notification-move {
        transition: opacity 0.2s ease;
    }

    .notification-enter-from,
    .notification-leave-to {
        transform: none;
    }

    .notification-card:hover,
    .notification-action-btn:hover,
    .notification-close-btn:hover {
        transform: none;
    }
}

/* Focus styles for better accessibility */
.notification-action-btn:focus,
.notification-close-btn:focus {
    outline: 2px solid var(--color-brand-primary);
    outline-offset: 2px;
}

/* Utility class for text truncation */
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
