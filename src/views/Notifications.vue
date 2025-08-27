<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notification'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import NotificationItem from '../components/notifications/NotificationItem.vue'
import type { NotificationType } from '../types/notification'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// State
const selectedType = ref<NotificationType | 'all'>('all')
const isLoadingMore = ref(false)
const hasMore = ref(true)

// Notification type filters
const notificationTypes: Array<{ value: NotificationType | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'message', label: 'Messages', icon: '💬' },
  { value: 'booking_request', label: 'Bookings', icon: '📅' },
  { value: 'payment_received', label: 'Payments', icon: '💰' },
  { value: 'review_received', label: 'Reviews', icon: '⭐' }
]

// Computed
const filteredNotifications = computed(() => {
  if (selectedType.value === 'all') {
    return notificationStore.sortedNotifications
  }
  return notificationStore.sortedNotifications.filter(n => n.type === selectedType.value)
})

const groupedByDate = computed(() => {
  const groups: Record<string, typeof filteredNotifications.value> = {}
  
  filteredNotifications.value.forEach(notification => {
    const date = new Date(notification.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let groupKey: string
    
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Week'
    } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Month'
    } else {
      groupKey = 'Older'
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
  })
  
  return groups
})

// Methods
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  try {
    isLoadingMore.value = true
    const currentCount = notificationStore.notifications.length
    
    await notificationStore.loadNotifications({
      offset: currentCount,
      limit: 20,
      types: selectedType.value === 'all' ? undefined : [selectedType.value as NotificationType]
    })
    
    // Check if we got less than requested
    if (notificationStore.notifications.length - currentCount < 20) {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Error loading more notifications:', error)
  } finally {
    isLoadingMore.value = false
  }
}

const handleNotificationClick = async (notificationId: string) => {
  await notificationStore.markAsRead(notificationId)
}

const handleNotificationDelete = async (notificationId: string) => {
  await notificationStore.deleteNotification(notificationId)
}

const markAllAsRead = async () => {
  await notificationStore.markAllAsRead()
}

const clearAll = async () => {
  if (confirm('Are you sure you want to clear all notifications?')) {
    await notificationStore.clearAll()
  }
}

// Check authentication
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  }
})
</script>

<template>
  <div class="notifications-page">
    <!-- Header Section -->
    <div class="notifications-header">
      <div class="header-content">
        <div class="header-title">
          <h1>Notifications</h1>
          <p>Stay updated with your latest activities</p>
        </div>
        
        <div class="header-actions">
          <button
            v-if="notificationStore.unreadCount > 0"
            @click="markAllAsRead"
            class="btn btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.736 3.97a.733.733 0 011.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 01-1.065.02L3.217 8.384a.757.757 0 010-1.06.733.733 0 011.047 0l3.052 3.093 5.4-6.425a.247.247 0 01.02-.022z"/>
            </svg>
            Mark all as read
          </button>
          <button
            v-if="notificationStore.notifications.length > 0"
            @click="clearAll"
            class="btn btn-outline"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            Clear all
          </button>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- Filter tabs -->
      <div class="filter-section">
        <div class="filter-tabs">
          <button
            v-for="type in notificationTypes"
            :key="type.value"
            @click="selectedType = type.value"
            :class="['filter-tab', { active: selectedType === type.value }]"
          >
            <span class="tab-icon">{{ type.icon }}</span>
            <span>{{ type.label }}</span>
            <span v-if="selectedType === type.value && filteredNotifications.length > 0" class="tab-count">
              {{ filteredNotifications.length }}
            </span>
          </button>
        </div>
      </div>

      <!-- Notifications list -->
      <div v-if="filteredNotifications.length > 0" class="notifications-content">
        <div v-for="(notifications, date) in groupedByDate" :key="date" class="notification-group">
          <h3 class="group-header">{{ date }}</h3>
          <div class="group-items">
            <NotificationItem
              v-for="notification in notifications"
              :key="notification.id"
              :notification="notification"
              :show-actions="true"
              @click="handleNotificationClick"
              @delete="handleNotificationDelete"
              class="notification-item-wrapper"
            />
          </div>
        </div>

        <!-- Load more -->
        <div v-if="hasMore" class="load-more-section">
          <button
            @click="loadMore"
            :disabled="isLoadingMore"
            class="btn btn-primary"
          >
            <svg v-if="isLoadingMore" class="loading-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
              <path d="M15 8a7 7 0 01-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ isLoadingMore ? 'Loading...' : 'Load More' }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          🔔
        </div>
        <h2>No notifications yet</h2>
        <p>When you receive notifications, they'll appear here</p>
      </div>

      <!-- Preferences section -->
      <div class="preferences-card">
        <div class="card-content">
          <div class="card-icon">⚙️</div>
          <div class="card-text">
            <h3>Notification Preferences</h3>
            <p>Control which notifications you receive and how</p>
          </div>
          <router-link to="/settings/notifications" class="btn btn-accent">
            Manage Settings
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notifications-page {
  min-height: 100vh;
  background: var(--color-background);
  padding-top: 70px;
}

/* Header */
.notifications-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
  
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-lg);
      text-align: center;
    }
  }
  
  .header-title {
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
      
      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }
    
    p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
  }
  
  .header-actions {
    display: flex;
    gap: var(--spacing-md);
    
    @media (max-width: 768px) {
      justify-content: center;
    }
  }
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg) var(--spacing-xl);
}

/* Filter Section */
.filter-section {
  margin-bottom: var(--spacing-xl);
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-sm);
  overflow-x: auto;
  padding-bottom: var(--spacing-sm);
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-background-alt);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-accent-light);
    border-radius: 2px;
  }
  
  .filter-tab {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: white;
    border: 2px solid var(--color-background-alt);
    border-radius: var(--border-radius-lg);
    color: var(--color-text);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    
    &:hover {
      background: var(--color-background-alt);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    
    &.active {
      background: var(--color-accent);
      color: white;
      border-color: var(--color-accent);
      
      .tab-count {
        background: rgba(255, 255, 255, 0.2);
      }
    }
    
    .tab-icon {
      font-size: 1.2rem;
    }
    
    .tab-count {
      padding: 2px 8px;
      background: var(--color-background-alt);
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
  }
}

/* Notifications Content */
.notifications-content {
  margin-bottom: var(--spacing-xl);
}

.notification-group {
  margin-bottom: var(--spacing-xl);
  
  .group-header {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-light);
    margin: 0 0 var(--spacing-md) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .group-items {
    background: white;
    border-radius: var(--border-radius-lg);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    border: 1px solid var(--color-background-alt);
    
    .notification-item-wrapper {
      transition: background 0.2s ease;
      
      &:hover {
        background: var(--color-background-alt);
      }
      
      &:not(:last-child) {
        border-bottom: 1px solid var(--color-background-alt);
      }
    }
  }
}

/* Load More */
.load-more-section {
  text-align: center;
  margin: var(--spacing-xl) 0;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-lg);
  background: white;
  border-radius: var(--border-radius-lg);
  border: 2px dashed var(--color-background-alt);
  margin-bottom: var(--spacing-xl);
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
    filter: grayscale(0.5);
  }
  
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-dark);
    margin: 0 0 var(--spacing-sm) 0;
  }
  
  p {
    color: var(--color-text-light);
    margin: 0;
  }
}

/* Preferences Card */
.preferences-card {
  background: linear-gradient(135deg, var(--color-accent-light) 0%, var(--color-accent) 100%);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  color: white;
  box-shadow: 0 8px 24px rgba(183, 110, 121, 0.2);
  
  .card-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    
    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
    }
  }
  
  .card-icon {
    font-size: 3rem;
    filter: brightness(1.2);
  }
  
  .card-text {
    flex: 1;
    
    h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 0 0 var(--spacing-xs) 0;
    }
    
    p {
      margin: 0;
      opacity: 0.9;
    }
  }
}

/* Buttons */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  font-size: 0.95rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-primary {
    background: var(--color-primary);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--color-primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(106, 13, 173, 0.3);
    }
  }
  
  &.btn-secondary {
    background: rgba(255, 255, 255, 0.9);
    color: var(--color-text-dark);
    backdrop-filter: blur(10px);
    
    &:hover:not(:disabled) {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
  
  &.btn-outline {
    background: transparent;
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.5);
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: white;
    }
  }
  
  &.btn-accent {
    background: white;
    color: var(--color-accent);
    font-weight: 600;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
    }
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
}

/* Loading Spinner */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>