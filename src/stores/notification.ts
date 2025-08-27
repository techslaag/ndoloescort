import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationService } from '../services/notificationService'
import type { Notification, NotificationPreferences, NotificationType, NotificationGroup } from '../types/notification'
import { useAuthStore } from './auth'

export const useNotificationStore = defineStore('notification', () => {
  const authStore = useAuthStore()
  
  // State
  const notifications = ref<Notification[]>([])
  const preferences = ref<NotificationPreferences | null>(null)
  const isLoading = ref(false)
  const unreadCount = ref(0)
  const isSubscribed = ref(false)
  const unsubscribe = ref<(() => void) | null>(null)
  
  // Computed
  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })
  
  const unreadNotifications = computed(() => {
    return notifications.value.filter(n => !n.isRead)
  })
  
  const groupedNotifications = computed((): NotificationGroup[] => {
    if (!preferences.value?.inApp?.groupByType) {
      return []
    }
    
    const groups = new Map<NotificationType, NotificationGroup>()
    
    notifications.value.forEach(notification => {
      const existing = groups.get(notification.type)
      if (existing) {
        existing.count++
        existing.notifications.push(notification)
        if (new Date(notification.createdAt) > new Date(existing.latest.createdAt)) {
          existing.latest = notification
        }
      } else {
        groups.set(notification.type, {
          type: notification.type,
          count: 1,
          latest: notification,
          notifications: [notification]
        })
      }
    })
    
    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime()
    )
  })
  
  const hasHighPriorityUnread = computed(() => {
    return unreadNotifications.value.some(n => n.priority === 'high')
  })
  
  // Actions
  const loadNotifications = async (options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    types?: NotificationType[]
  }) => {
    if (!authStore.user) return
    
    try {
      isLoading.value = true
      const response = await notificationService.getUserNotifications(
        authStore.user.$id,
        options
      )
      
      if (options?.offset) {
        // Append for pagination
        notifications.value = [...notifications.value, ...response.notifications]
      } else {
        // Replace for initial load or refresh
        notifications.value = response.notifications
      }
      
      unreadCount.value = response.unread
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  const loadPreferences = async () => {
    if (!authStore.user) return
    
    try {
      preferences.value = await notificationService.getUserPreferences(authStore.user.$id)
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    }
  }
  
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!authStore.user) return
    
    try {
      await notificationService.updateUserPreferences(authStore.user.$id, newPreferences)
      preferences.value = { ...preferences.value!, ...newPreferences }
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }
  
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  const markAllAsRead = async () => {
    if (!authStore.user) return
    
    try {
      await notificationService.markAllAsRead(authStore.user.$id)
      
      notifications.value.forEach(n => {
        if (!n.isRead) {
          n.isRead = true
          n.readAt = new Date().toISOString()
        }
      })
      
      unreadCount.value = 0
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }
  
  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      
      const index = notifications.value.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        const wasUnread = !notifications.value[index].isRead
        notifications.value.splice(index, 1)
        if (wasUnread) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }
  
  const clearAll = async () => {
    if (!authStore.user) return
    
    try {
      await notificationService.clearAllNotifications(authStore.user.$id)
      notifications.value = []
      unreadCount.value = 0
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }
  
  const subscribeToRealtime = () => {
    if (!authStore.user || isSubscribed.value) return
    
    unsubscribe.value = notificationService.subscribeToNotifications(
      authStore.user.$id,
      (notification: Notification) => {
        // Add new notification to the beginning
        notifications.value.unshift(notification)
        
        if (!notification.isRead) {
          unreadCount.value++
        }
        
        // Show in-app notification if enabled
        if (preferences.value?.inApp?.enabled) {
          showInAppNotification(notification)
        }
      }
    )
    
    isSubscribed.value = true
  }
  
  const unsubscribeFromRealtime = () => {
    if (unsubscribe.value) {
      unsubscribe.value()
      unsubscribe.value = null
      isSubscribed.value = false
    }
  }
  
  const showInAppNotification = (notification: Notification) => {
    // This would trigger an in-app notification component
    // For now, we'll just log it
    console.log('New notification:', notification)
    
    // Play sound if enabled
    if (preferences.value?.inApp?.playSound) {
      // Sound will be played by the service
    }
  }
  
  const requestPushPermission = async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestNotificationPermission()
      
      if (granted && preferences.value) {
        preferences.value.push.enabled = true
        await updatePreferences({ push: preferences.value.push })
      }
      
      return granted
    } catch (error) {
      console.error('Error requesting push permission:', error)
      return false
    }
  }
  
  // Initialize
  const initialize = async () => {
    if (!authStore.user) return
    
    await Promise.all([
      loadNotifications(),
      loadPreferences()
    ])
    
    subscribeToRealtime()
  }
  
  // Cleanup
  const cleanup = () => {
    unsubscribeFromRealtime()
    notifications.value = []
    preferences.value = null
    unreadCount.value = 0
  }
  
  return {
    // State
    notifications,
    preferences,
    isLoading,
    unreadCount,
    
    // Computed
    sortedNotifications,
    unreadNotifications,
    groupedNotifications,
    hasHighPriorityUnread,
    
    // Actions
    loadNotifications,
    loadPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    requestPushPermission,
    initialize,
    cleanup
  }
}, {
  persist: {
    key: 'notification-store',
    pick: ['preferences', 'unreadCount']
  }
})