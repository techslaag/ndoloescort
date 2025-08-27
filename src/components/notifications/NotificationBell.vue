<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../../stores/notification'
import NotificationDropdown from './NotificationDropdown.vue'

const router = useRouter()
const notificationStore = useNotificationStore()

// State
const showDropdown = ref(false)
const bellRef = ref<HTMLDivElement>()

// Computed
const hasUnread = computed(() => notificationStore.unreadCount > 0)
const displayCount = computed(() => {
  const count = notificationStore.unreadCount
  return count > 99 ? '99+' : count.toString()
})

// Methods
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const closeDropdown = () => {
  showDropdown.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (bellRef.value && !bellRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

const goToNotifications = () => {
  router.push('/notifications')
  closeDropdown()
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="bellRef" class="notification-bell">
    <button
      @click="toggleDropdown"
      class="bell-button"
      :class="{ 'has-unread': hasUnread }"
      aria-label="Notifications"
    >
      <svg
        class="bell-icon"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      
      <!-- Badge -->
      <span v-if="hasUnread" class="notification-badge">
        {{ displayCount }}
      </span>
      
      <!-- Pulse animation for high priority -->
      <span
        v-if="notificationStore.hasHighPriorityUnread"
        class="pulse-ring"
      ></span>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <NotificationDropdown
        v-if="showDropdown"
        @close="closeDropdown"
        @view-all="goToNotifications"
      />
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.notification-bell {
  position: relative;
}

.bell-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  &.has-unread {
    .bell-icon {
      animation: ring 1s ease-in-out;
    }
  }
}

.bell-icon {
  width: 24px;
  height: 24px;
  color: #374151;
  transition: color 0.2s ease;
  
  .bell-button:hover & {
    color: #111827;
  }
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.pulse-ring {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ef4444;
  opacity: 0.5;
  animation: pulse-ring 1.5s ease-in-out infinite;
  pointer-events: none;
}

// Animations
@keyframes ring {
  0%, 100% {
    transform: rotate(0deg);
  }
  10%, 30% {
    transform: rotate(-10deg);
  }
  20%, 40% {
    transform: rotate(10deg);
  }
  50% {
    transform: rotate(0deg);
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

// Dropdown transition
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>