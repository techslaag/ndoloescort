<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Props {
  error?: string | null
  autoClear?: boolean
  autoClearDelay?: number
  dismissible?: boolean
  variant?: 'error' | 'warning' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  autoClear: false,
  autoClearDelay: 5000,
  dismissible: true,
  variant: 'error'
})

const emit = defineEmits<{
  'clear': []
  'dismiss': []
}>()

const isVisible = ref(false)
const autoClearTimer = ref<NodeJS.Timeout | null>(null)

const clearError = () => {
  emit('clear')
  emit('dismiss')
}

const dismissAlert = () => {
  emit('dismiss')
}

const startAutoClear = () => {
  if (props.autoClear && props.error) {
    // Clear any existing timer
    if (autoClearTimer.value) {
      clearTimeout(autoClearTimer.value)
    }
    
    // Start new timer
    autoClearTimer.value = setTimeout(() => {
      clearError()
    }, props.autoClearDelay)
  }
}

const stopAutoClear = () => {
  if (autoClearTimer.value) {
    clearTimeout(autoClearTimer.value)
    autoClearTimer.value = null
  }
}

// Watch for error changes
watch(() => props.error, (newError) => {
  if (newError) {
    isVisible.value = true
    startAutoClear()
  } else {
    isVisible.value = false
    stopAutoClear()
  }
}, { immediate: true })

// Cleanup on unmount
onMounted(() => {
  return () => {
    stopAutoClear()
  }
})

// Get variant styles
const getVariantStyles = () => {
  switch (props.variant) {
    case 'warning':
      return {
        background: '#fff3cd',
        border: '#ffeaa7',
        color: '#856404',
        icon: '⚠️'
      }
    case 'info':
      return {
        background: '#d1ecf1',
        border: '#bee5eb',
        color: '#0c5460',
        icon: 'ℹ️'
      }
    default: // error
      return {
        background: '#f8d7da',
        border: '#f5c6cb',
        color: '#721c24',
        icon: '❌'
      }
  }
}

const variantStyles = getVariantStyles()
</script>

<template>
  <Transition name="error-alert">
    <div 
      v-if="isVisible && error" 
      class="error-alert"
      :class="[`error-alert--${variant}`, { 'error-alert--dismissible': dismissible }]"
      :style="{
        backgroundColor: variantStyles.background,
        borderColor: variantStyles.border,
        color: variantStyles.color
      }"
    >
      <div class="error-alert__content">
        <span class="error-alert__icon">{{ variantStyles.icon }}</span>
        <span class="error-alert__message">{{ error }}</span>
      </div>
      
      <button 
        v-if="dismissible"
        @click="dismissAlert"
        class="error-alert__close"
        aria-label="Close alert"
        type="button"
      >
        <span class="error-alert__close-icon">&times;</span>
      </button>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.error-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border: 1px solid;
  margin-bottom: var(--spacing-md);
  font-size: 0.9rem;
  line-height: 1.4;
  position: relative;
  overflow: hidden;
  
  &--dismissible {
    padding-right: calc(var(--spacing-md) + 24px);
  }
}

.error-alert__content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.error-alert__icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.error-alert__message {
  flex: 1;
}

.error-alert__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  
  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
}

.error-alert__close-icon {
  font-size: 1.2rem;
  font-weight: bold;
  line-height: 1;
}

// Transition animations
.error-alert-enter-active,
.error-alert-leave-active {
  transition: all 0.3s ease;
}

.error-alert-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.error-alert-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Responsive design
@media (max-width: 480px) {
  .error-alert {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.85rem;
    
    &--dismissible {
      padding-right: calc(var(--spacing-md) + 20px);
    }
  }
  
  .error-alert__close {
    right: var(--spacing-xs);
  }
}
</style> 