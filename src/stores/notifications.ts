import { ref, computed, nextTick } from 'vue'
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
  timeoutId?: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const maxNotifications = 5 // Limit simultaneous notifications

  // Generate unique ID for notifications
  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add notification with improved logic
  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    // Ensure DOM is ready
    await nextTick()

    // Prevent duplicate notifications (same type + title within 1 second)
    const isDuplicate = notifications.value.some(n => 
      n.type === notification.type && 
      n.title === notification.title && 
      (Date.now() - n.timestamp) < 1000
    )

    if (isDuplicate) {
      console.warn('Duplicate notification prevented:', notification.title)
      return null
    }

    const newNotification: Notification = {
      id: generateId(),
      timestamp: Date.now(),
      duration: notification.duration ?? (notification.type === 'error' ? 8000 : 5000),
      persistent: notification.persistent ?? false,
      ...notification
    }

    // Remove oldest notification if we exceed max
    if (notifications.value.length >= maxNotifications) {
      const oldestIndex = 0
      const oldest = notifications.value[oldestIndex]
      if (oldest.timeoutId) {
        clearTimeout(oldest.timeoutId)
      }
      notifications.value.splice(oldestIndex, 1)
    }

    // Add new notification
    notifications.value.push(newNotification)

    // Auto remove after duration if not persistent
    if (!newNotification.persistent && newNotification.duration) {
      const timeoutId = setTimeout(() => {
        removeNotification(newNotification.id)
      }, newNotification.duration)
      
      // Store timeout ID for cleanup
      newNotification.timeoutId = timeoutId
    }

    console.log('Notification added:', { 
      id: newNotification.id, 
      type: newNotification.type, 
      title: newNotification.title,
      total: notifications.value.length
    })

    return newNotification.id
  }

  // Remove notification by ID with cleanup
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      const notification = notifications.value[index]
      
      // Clear timeout if exists
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId)
      }
      
      notifications.value.splice(index, 1)
      console.log('Notification removed:', { id, remaining: notifications.value.length })
    }
  }

  // Clear all notifications with cleanup
  const clearAll = () => {
    // Clear all timeouts
    notifications.value.forEach(notification => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId)
      }
    })
    
    notifications.value = []
    console.log('All notifications cleared')
  }

  // Helper methods for different types with error handling
  const success = async (title: string, message?: string, options?: Partial<Notification>) => {
    try {
      return await addNotification({ type: 'success', title, message, ...options })
    } catch (error) {
      console.error('Failed to show success notification:', error)
      return null
    }
  }

  const info = async (title: string, message?: string, options?: Partial<Notification>) => {
    try {
      return await addNotification({ type: 'info', title, message, ...options })
    } catch (error) {
      console.error('Failed to show info notification:', error)
      return null
    }
  }

  const warning = async (title: string, message?: string, options?: Partial<Notification>) => {
    try {
      return await addNotification({ type: 'warning', title, message, ...options })
    } catch (error) {
      console.error('Failed to show warning notification:', error)
      return null
    }
  }

  const error = async (title: string, message?: string, options?: Partial<Notification>) => {
    try {
      return await addNotification({ type: 'error', title, message, ...options })
    } catch (error) {
      console.error('Failed to show error notification:', error)
      return null
    }
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
