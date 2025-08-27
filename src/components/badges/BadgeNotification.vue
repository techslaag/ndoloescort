<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBadgeStore } from '../../stores/badge'
import BadgeDisplay from './BadgeDisplay.vue'
import type { UserBadge } from '../../types/badges'

interface Props {
  autoClose?: boolean
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
}

const props = withDefaults(defineProps<Props>(), {
  autoClose: true,
  duration: 5000,
  position: 'top-right'
})

const badgeStore = useBadgeStore()

const showNotification = ref(false)
const currentBadgeIndex = ref(0)
const timeoutId = ref<number | null>(null)

const newlyEarnedBadges = computed(() => badgeStore.newlyEarnedBadges)
const currentBadge = computed(() => {
  const badges = newlyEarnedBadges.value
  if (badges.length > 0 && badges[currentBadgeIndex.value]) {
    const userBadge = badges[currentBadgeIndex.value]
    const badgeDefinition = badgeStore.getBadgeDefinition(userBadge.badgeId)
    return {
      userBadge,
      badge: badgeDefinition
    }
  }
  return null
})

const hasMoreBadges = computed(() => {
  return currentBadgeIndex.value < newlyEarnedBadges.value.length - 1
})

const notificationClasses = computed(() => [
  'badge-notification',
  `position-${props.position}`,
  {
    'show': showNotification.value,
    'multiple': newlyEarnedBadges.value.length > 1
  }
])

const showNext = () => {
  if (hasMoreBadges.value) {
    currentBadgeIndex.value++
    resetTimer()
  } else {
    closeNotification()
  }
}

const showPrevious = () => {
  if (currentBadgeIndex.value > 0) {
    currentBadgeIndex.value--
    resetTimer()
  }
}

const closeNotification = () => {
  showNotification.value = false
  clearTimer()
  
  // Clear badges after animation
  setTimeout(() => {
    badgeStore.clearNewlyEarnedBadges()
    currentBadgeIndex.value = 0
  }, 300)
}

const resetTimer = () => {
  if (props.autoClose) {
    clearTimer()
    timeoutId.value = window.setTimeout(() => {
      if (hasMoreBadges.value) {
        showNext()
      } else {
        closeNotification()
      }
    }, props.duration)
  }
}

const clearTimer = () => {
  if (timeoutId.value) {
    clearTimeout(timeoutId.value)
    timeoutId.value = null
  }
}

const pauseTimer = () => {
  clearTimer()
}

const resumeTimer = () => {
  if (props.autoClose && showNotification.value) {
    resetTimer()
  }
}

// Watch for new badges
const unwatchBadges = badgeStore.$subscribe((mutation, state) => {
  if (state.newlyEarnedBadges.length > 0 && !showNotification.value) {
    currentBadgeIndex.value = 0
    showNotification.value = true
    resetTimer()
  }
})

onMounted(() => {
  // Check if there are already new badges when component mounts
  if (newlyEarnedBadges.value.length > 0) {
    showNotification.value = true
    resetTimer()
  }
})

onUnmounted(() => {
  clearTimer()
  unwatchBadges()
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="currentBadge" 
      :class="notificationClasses"
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <div class="notification-content">
        <!-- Header -->
        <div class="notification-header">
          <div class="celebration-icons">
            <span class="celebration-icon">🎉</span>
            <span class="celebration-icon">✨</span>
            <span class="celebration-icon">🏆</span>
          </div>
          <h3 class="notification-title">Badge Earned!</h3>
          <button class="close-btn" @click="closeNotification" title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        <!-- Badge Display -->
        <div class="notification-body">
          <BadgeDisplay 
            v-if="currentBadge.badge"
            :badge="currentBadge.badge"
            :earned="true"
            size="large"
            :show-name="true"
            :show-description="true"
            :glow="true"
          />
          
          <div class="earned-message">
            <p>Congratulations! You've earned this badge for your excellent service and professionalism.</p>
          </div>
        </div>

        <!-- Navigation (for multiple badges) -->
        <div v-if="newlyEarnedBadges.length > 1" class="notification-navigation">
          <button 
            :disabled="currentBadgeIndex === 0"
            @click="showPrevious"
            class="nav-btn"
          >
            ← Previous
          </button>
          
          <div class="badge-counter">
            {{ currentBadgeIndex + 1 }} of {{ newlyEarnedBadges.length }}
          </div>
          
          <button 
            :disabled="!hasMoreBadges"
            @click="showNext"
            class="nav-btn"
          >
            Next →
          </button>
        </div>

        <!-- Progress dots -->
        <div v-if="newlyEarnedBadges.length > 1" class="progress-dots">
          <div 
            v-for="(_, index) in newlyEarnedBadges" 
            :key="index"
            class="progress-dot"
            :class="{ active: index === currentBadgeIndex }"
          ></div>
        </div>

        <!-- Auto-close timer -->
        <div v-if="autoClose" class="auto-close-timer">
          <div class="timer-bar"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.badge-notification {
  position: fixed;
  z-index: 9999;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  pointer-events: none;
  
  &.show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  
  // Position variants
  &.position-top-right {
    top: var(--spacing-lg);
    right: var(--spacing-lg);
  }
  
  &.position-top-left {
    top: var(--spacing-lg);
    left: var(--spacing-lg);
  }
  
  &.position-bottom-right {
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
  }
  
  &.position-bottom-left {
    bottom: var(--spacing-lg);
    left: var(--spacing-lg);
  }
  
  &.position-center {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    
    &.show {
      transform: translate(-50%, -50%);
    }
  }
}

.notification-content {
  background: white;
  border-radius: var(--border-radius-xl);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 100vw;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 2px solid transparent;
  background-clip: padding-box;
  
  // Animated border for legendary badges
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ffd700, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7);
    background-size: 400% 400%;
    border-radius: var(--border-radius-xl);
    z-index: -1;
    animation: gradientBorder 3s ease infinite;
    opacity: 0.7;
  }
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  
  .celebration-icons {
    display: flex;
    gap: var(--spacing-xs);
    
    .celebration-icon {
      font-size: 1.5rem;
      animation: bounce 0.6s ease infinite alternate;
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
  
  .notification-title {
    flex: 1;
    text-align: center;
    color: var(--color-text-dark);
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: var(--border-radius-sm);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
      color: var(--color-text-dark);
    }
  }
}

.notification-body {
  padding: var(--spacing-xl);
  text-align: center;
  
  .earned-message {
    margin-top: var(--spacing-lg);
    
    p {
      color: var(--color-text-light);
      line-height: 1.5;
    }
  }
}

.notification-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  
  .nav-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .badge-counter {
    color: var(--color-text-light);
    font-size: 0.9rem;
    font-weight: 500;
  }
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: 0 var(--spacing-lg) var(--spacing-md);
  
  .progress-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-lighter);
    transition: all 0.2s ease;
    
    &.active {
      background: var(--color-primary);
      transform: scale(1.2);
    }
  }
}

.auto-close-timer {
  position: relative;
  height: 2px;
  background: var(--color-background-alt);
  overflow: hidden;
  
  .timer-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    width: 100%;
    transform-origin: left;
    animation: timerProgress v-bind('`${duration}ms`') linear;
  }
}

// Animations
@keyframes bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-5px); }
}

@keyframes gradientBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes timerProgress {
  0% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}

// Responsive
@media (max-width: 768px) {
  .badge-notification {
    &.position-top-right,
    &.position-top-left {
      top: var(--spacing-sm);
      left: var(--spacing-sm);
      right: var(--spacing-sm);
    }
    
    &.position-bottom-right,
    &.position-bottom-left {
      bottom: var(--spacing-sm);
      left: var(--spacing-sm);
      right: var(--spacing-sm);
    }
  }
  
  .notification-content {
    max-width: none;
  }
  
  .notification-navigation {
    flex-direction: column;
    gap: var(--spacing-sm);
    
    .nav-btn {
      width: 100%;
    }
  }
}
</style>