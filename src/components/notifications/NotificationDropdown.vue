<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../../stores/notification'
import NotificationItem from './NotificationItem.vue'

const emit = defineEmits<{
  close: []
  'view-all': []
}>()

const router = useRouter()
const notificationStore = useNotificationStore()

// Computed
const recentNotifications = computed(() => {
  return notificationStore.sortedNotifications.slice(0, 5)
})

const hasNotifications = computed(() => {
  return notificationStore.notifications.length > 0
})

// Methods
const handleNotificationClick = (notificationId: string) => {
  notificationStore.markAsRead(notificationId)
  emit('close')
}

const markAllAsRead = async () => {
  await notificationStore.markAllAsRead()
}

const viewAll = () => {
  emit('view-all')
}
</script>

<template>
  <div class="notification-dropdown">
    <!-- Header -->
    <div class="dropdown-header">
      <h3>Notifications</h3>
      <button
        v-if="notificationStore.unreadCount > 0"
        @click="markAllAsRead"
        class="mark-read-button"
      >
        Mark all as read
      </button>
    </div>

    <!-- Content -->
    <div class="dropdown-content">
      <!-- Notifications list -->
      <div v-if="hasNotifications" class="notifications-list">
        <NotificationItem
          v-for="notification in recentNotifications"
          :key="notification.id"
          :notification="notification"
          @click="handleNotificationClick"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p>No notifications yet</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="dropdown-footer">
      <button @click="viewAll" class="view-all-button">
        View all notifications
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notification-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  z-index: 1000;
  
  @media (max-width: 480px) {
    width: calc(100vw - 32px);
    right: -8px;
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  
  .mark-read-button {
    background: none;
    border: none;
    color: #6366f1;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #f0f1ff;
    }
  }
}

.dropdown-content {
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
    
    &:hover {
      background: #9ca3af;
    }
  }
}

.notifications-list {
  padding: 0.5rem 0;
}

.empty-state {
  padding: 3rem 2rem;
  text-align: center;
  
  .empty-icon {
    width: 48px;
    height: 48px;
    color: #d1d5db;
    margin: 0 auto 1rem;
  }
  
  p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }
}

.dropdown-footer {
  padding: 0.75rem;
  border-top: 1px solid #e5e7eb;
  
  .view-all-button {
    width: 100%;
    padding: 0.75rem;
    background: #f3f4f6;
    border: none;
    border-radius: 8px;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: #e5e7eb;
      color: #111827;
    }
  }
}
</style>