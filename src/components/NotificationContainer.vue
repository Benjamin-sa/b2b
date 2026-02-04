<template>
  <Teleport to="body">
    <!-- Apple-style Notifications - Center Top Dropdown -->
    <div
      class="notification-container-apple fixed top-0 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none w-full max-w-sm px-4"
      aria-live="polite" aria-label="Notifications">
      <TransitionGroup name="notification-apple" tag="div" class="space-y-3 w-full">
        <div v-for="notification in notificationStore.notifications" :key="notification.id"
          class="notification-card-apple pointer-events-auto w-full" :class="getNotificationClasses(notification.type)"
          role="alert" :aria-describedby="`notification-${notification.id}`">
          <!-- Notification Content -->
          <div class="relative overflow-hidden rounded-lg bg-white shadow-lg" style="border: 1px solid #e5e7eb">
            <!-- Top accent bar -->
            <div class="h-1 w-full" :class="getAccentClasses(notification.type)"></div>

            <div class="p-4">
              <div class="flex items-start gap-3">
                <!-- Icon -->
                <div class="flex-shrink-0 rounded-full p-2 bg-gray-100">
                  <component :is="getIcon(notification.type)" class="h-5 w-5 text-gray-600" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-black text-sm">
                    {{ notification.title }}
                  </h4>
                  <p v-if="notification.message" :id="`notification-${notification.id}`"
                    class="mt-1 text-sm text-black">
                    {{ notification.message }}
                  </p>
                </div>

                <!-- Action Button -->
                <div v-if="notification.action" class="flex-shrink-0">
                  <button
                    class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                    @click="notification.action.handler">
                    {{ notification.action.label }}
                  </button>
                </div>

                <!-- Close Button -->
                <div class="flex-shrink-0">
                  <button
                    class="flex items-center justify-center w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer"
                    :aria-label="$t('notification.close')" @click="removeNotification(notification.id)">
                    <XMarkIcon class="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Progress bar for timed notifications -->
            <div v-if="!notification.persistent && notification.duration"
              class="absolute bottom-0 left-0 h-1 opacity-50 animate-shrink"
              :class="getAccentClasses(notification.type)" :style="`animation-duration: ${notification.duration}ms`">
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotificationStore, type NotificationType } from '../stores/notifications';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';

const notificationStore = useNotificationStore();

// Helper function to get appropriate icon
const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return CheckCircleIcon;
    case 'info':
      return InformationCircleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    case 'error':
      return XCircleIcon;
    default:
      return InformationCircleIcon;
  }
};

// Style helper functions - Simplified for reliability
const getNotificationClasses = (_type: NotificationType) => {
  return 'notification-item'; // Base class for targeting
};

const getAccentClasses = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'info':
      return 'bg-blue-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const removeNotification = (id: string) => {
  notificationStore.removeNotification(id);
};
</script>

<style scoped>
/* Apple-style Notification Container */
.notification-container-apple {
  z-index: 9999;
  padding-top: 20px;
}

.notification-card-apple {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-card-apple:hover {
  transform: translateY(-2px);
}

/* Apple-style Notification Animations */
.notification-apple-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-apple-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.notification-apple-enter-from {
  opacity: 0;
  transform: translateY(-100%) scale(0.8);
}

.notification-apple-leave-to {
  opacity: 0;
  transform: translateY(-100%) scale(0.9);
}

.notification-apple-move {
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Progress bar animation */
@keyframes shrink {
  from {
    width: 100%;
  }

  to {
    width: 0%;
  }
}

.animate-shrink {
  animation: shrink linear;
  animation-fill-mode: forwards;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .notification-container-apple {
    max-width: calc(100vw - 32px);
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
