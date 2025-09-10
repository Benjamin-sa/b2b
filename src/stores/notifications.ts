import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    handler: () => void
  }
  timestamp: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  // Generate unique ID for notifications
  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      id: generateId(),
      timestamp: Date.now(),
      duration: notification.duration ?? (notification.type === 'error' ? 8000 : 5000),
      persistent: notification.persistent ?? false,
      ...notification
    }

    notifications.value.push(newNotification)

    // Auto remove after duration if not persistent
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, newNotification.duration)
    }

    return newNotification.id
  }

  // Remove notification by ID
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  // Clear all notifications
  const clearAll = () => {
    notifications.value = []
  }

  // Helper methods for different types
  const success = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'success', title, message, ...options })
  }

  const info = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'info', title, message, ...options })
  }

  const warning = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'warning', title, message, ...options })
  }

  const error = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({ type: 'error', title, message, ...options })
  }

  // Computed
  const hasNotifications = computed(() => notifications.value.length > 0)
  const latestNotification = computed(() => notifications.value[notifications.value.length - 1])

  return {
    notifications,
    hasNotifications,
    latestNotification,
    addNotification,
    removeNotification,
    clearAll,
    success,
    info,
    warning,
    error
  }
})
