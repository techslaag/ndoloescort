<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Notification } from '../../types/notification'

interface Props {
  notification: Notification
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false
})

const emit = defineEmits<{
  click: [notificationId: string]
  delete: [notificationId: string]
}>()

const router = useRouter()

// Computed
const icon = computed(() => {
  const icons: Record<string, string> = {
    message: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    booking_request: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    booking_confirmed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    booking_cancelled: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    payment_received: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    payment_sent: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    review_received: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    profile_view: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    badge_earned: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    system_alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    promotion: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
    reminder: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  }
  return icons[props.notification.type] || icons.system_alert
})

const iconColor = computed(() => {
  const colors: Record<string, string> = {
    message: '#6366f1',
    booking_request: '#f59e0b',
    booking_confirmed: '#10b981',
    booking_cancelled: '#ef4444',
    payment_received: '#10b981',
    payment_sent: '#6366f1',
    review_received: '#f59e0b',
    profile_view: '#8b5cf6',
    badge_earned: '#ec4899',
    system_alert: '#f59e0b',
    promotion: '#3b82f6',
    reminder: '#6b7280'
  }
  return colors[props.notification.type] || '#6b7280'
})

const timeAgo = computed(() => {
  const now = new Date()
  const created = new Date(props.notification.createdAt)
  const seconds = Math.floor((now.getTime() - created.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  
  return created.toLocaleDateString()
})

// Methods
const handleClick = () => {
  emit('click', props.notification.id)
  
  // Navigate based on notification data
  if (props.notification.data?.link) {
    router.push(props.notification.data.link)
  } else {
    // Default navigation based on type
    const routes: Record<string, string> = {
      message: `/messages/${props.notification.data?.conversationId || ''}`,
      booking_request: `/bookings/${props.notification.data?.bookingId || ''}`,
      booking_confirmed: `/bookings/${props.notification.data?.bookingId || ''}`,
      booking_cancelled: `/bookings/${props.notification.data?.bookingId || ''}`,
      payment_received: '/payments',
      payment_sent: '/payments',
      review_received: '/profile/reviews',
      profile_view: '/profile/analytics',
      badge_earned: `/badges/${props.notification.data?.badgeId || ''}`,
      system_alert: '/notifications',
      promotion: '/promotions',
      reminder: '/dashboard'
    }
    
    const route = routes[props.notification.type]
    if (route) {
      router.push(route)
    }
  }
}

const handleDelete = () => {
  emit('delete', props.notification.id)
}
</script>

<template>
  <div
    @click="handleClick"
    class="notification-item"
    :class="{
      unread: !notification.isRead,
      'high-priority': notification.priority === 'high'
    }"
  >
    <!-- Icon -->
    <div class="notification-icon" :style="{ backgroundColor: iconColor + '20' }">
      <svg
        class="icon"
        :style="{ color: iconColor }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          :d="icon"
        />
      </svg>
    </div>

    <!-- Content -->
    <div class="notification-content">
      <h4 class="notification-title">{{ notification.title }}</h4>
      <p class="notification-message">{{ notification.message }}</p>
      
      <!-- Actions -->
      <div v-if="notification.data?.actions" class="notification-actions">
        <button
          v-for="action in notification.data.actions"
          :key="action.action"
          @click.stop="$emit('action', action.action)"
          :class="['action-button', `action-${action.style || 'secondary'}`]"
        >
          {{ action.label }}
        </button>
      </div>
      
      <span class="notification-time">{{ timeAgo }}</span>
    </div>

    <!-- Delete button -->
    <button
      v-if="showActions"
      @click.stop="handleDelete"
      class="delete-button"
      aria-label="Delete notification"
    >
      <svg class="delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Unread indicator -->
    <span v-if="!notification.isRead" class="unread-indicator"></span>
  </div>
</template>

<style scoped lang="scss">
.notification-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f9fafb;
  }
  
  &.unread {
    background: #f0f1ff;
    
    &:hover {
      background: #e8e9ff;
    }
  }
  
  &.high-priority {
    border-left: 3px solid #ef4444;
    padding-left: calc(1.25rem - 3px);
  }
}

.notification-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .icon {
    width: 20px;
    height: 20px;
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
  
  .notification-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.25rem 0;
    line-height: 1.25;
  }
  
  .notification-message {
    font-size: 0.8125rem;
    color: #6b7280;
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
    
    // Truncate long messages
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .notification-actions {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
    
    .action-button {
      padding: 0.25rem 0.75rem;
      border: none;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &.action-primary {
        background: #6366f1;
        color: white;
        
        &:hover {
          background: #5558e3;
        }
      }
      
      &.action-secondary {
        background: #f3f4f6;
        color: #374151;
        
        &:hover {
          background: #e5e7eb;
        }
      }
      
      &.action-danger {
        background: #fef2f2;
        color: #dc2626;
        
        &:hover {
          background: #fee2e2;
        }
      }
    }
  }
  
  .notification-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }
}

.delete-button {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  .notification-item:hover & {
    opacity: 1;
  }
  
  &:hover {
    .delete-icon {
      color: #ef4444;
    }
  }
  
  .delete-icon {
    width: 16px;
    height: 16px;
    color: #9ca3af;
    transition: color 0.2s ease;
  }
}

.unread-indicator {
  position: absolute;
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: #6366f1;
  border-radius: 50%;
}
</style>