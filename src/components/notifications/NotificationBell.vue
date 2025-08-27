<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../../stores/notification'
import NotificationDropdown from './NotificationDropdown.vue'

const router = useRouter()
const notificationStore = useNotificationStore()

// State
const showDropdown = ref(false)
const bellRef = ref<HTMLDivElement>()
const audioRef = ref<HTMLAudioElement>()

// Computed
const hasUnread = computed(() => notificationStore.unreadCount > 0)
const displayCount = computed(() => {
  const count = notificationStore.unreadCount
  return count > 99 ? '99+' : count.toString()
})

// Methods
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value && hasUnread.value) {
    playNotificationSound()
  }
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

const playNotificationSound = () => {
  if (audioRef.value) {
    audioRef.value.volume = 0.3
    audioRef.value.play().catch(() => {
      // Ignore audio play errors (e.g., user hasn't interacted with page yet)
    })
  }
}

// Vibration feedback for mobile devices
const triggerVibration = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 30, 50])
  }
}

// Watch for new notifications
let previousCount = notificationStore.unreadCount
watch(
  () => notificationStore.unreadCount,
  (newCount) => {
    if (newCount > previousCount) {
      playNotificationSound()
      triggerVibration()
    }
    previousCount = newCount
  }
)

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
  width: 42px;
  height: 42px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    
    .bell-icon {
      transform: rotate(-5deg);
    }
  }
  
  &:active {
    transform: translateY(0);
    background: rgba(255, 255, 255, 0.2);
  }
  
  &.has-unread {
    animation: subtle-glow 2s ease-in-out infinite;
    
    .bell-icon {
      animation: ring 4s ease-in-out infinite;
    }
  }
  
  // Context styling within header
  .site-header & {
    background: rgba(255, 255, 255, 0.1);
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

.bell-icon {
  width: 20px;
  height: 20px;
  color: white;
  transition: all 0.3s ease;
  
  .site-header & {
    color: white;
  }
  
  .bell-button:hover & {
    color: var(--color-accent);
  }
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2.5px solid;
  border-color: var(--color-background-dark);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: badge-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  .site-header & {
    border-color: rgba(18, 0, 36, 0.9);
  }
}

.pulse-ring {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ef4444;
  opacity: 0.5;
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

// Animations
@keyframes ring {
  0%, 100% {
    transform: rotate(0deg);
  }
  5% {
    transform: rotate(-15deg);
  }
  10% {
    transform: rotate(15deg);
  }
  15% {
    transform: rotate(-10deg);
  }
  20% {
    transform: rotate(10deg);
  }
  25% {
    transform: rotate(0deg);
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.8);
    opacity: 0.2;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes badge-pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes subtle-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.2);
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