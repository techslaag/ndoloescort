<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useMessagingStore } from '../../stores/messaging'

interface Props {
  receiverId: string
  receiverName: string
  receiverRole: 'client' | 'escort' | 'support'
  variant?: 'primary' | 'secondary' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  showEncryptionBadge?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  showEncryptionBadge: true,
  disabled: false,
  receiverRole: 'client'
})

const router = useRouter()
const authStore = useAuthStore()
const messagingStore = useMessagingStore()

const canMessage = computed(() => {
  if (!authStore.user || props.disabled) return false
  return messagingStore.canMessageUser(props.receiverId, props.receiverRole)
})

const buttonText = computed(() => {
  if (!authStore.user) return 'Login to Message'
  
  const currentUserRole = messagingStore.getUserRole(authStore.user)
  
  if (props.receiverRole === 'support') {
    return 'Contact Support'
  }
  
  if (currentUserRole === 'escort' && props.receiverRole === 'client') {
    return 'Reply Only'
  }
  
  return 'Message'
})

const messageIcon = computed(() => {
  if (props.receiverRole === 'support') return '🎧'
  if (props.receiverRole === 'escort') return '👑'
  return '💬'
})

const handleStartMessage = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!canMessage.value) {
    const restrictions = messagingStore.getConversationRestrictions()
    alert(`You cannot initiate conversations with ${props.receiverRole}s. ${restrictions.description}`)
    return
  }
  
  // Navigate to messages with receiver info
  router.push({
    name: 'Messages',
    query: {
      receiver: props.receiverId,
      receiverName: props.receiverName,
      receiverRole: props.receiverRole
    }
  })
}
</script>

<template>
  <button 
    @click="handleStartMessage"
    class="message-btn"
    :class="[
      `message-btn--${variant}`,
      `message-btn--${size}`,
      `message-btn--${receiverRole}`,
      { 
        'message-btn--with-badge': showEncryptionBadge,
        'message-btn--disabled': !canMessage || disabled
      }
    ]"
    :disabled="!canMessage || disabled"
    :title="!canMessage ? 'You cannot initiate conversations with this user type' : `Send encrypted message to ${receiverName}`"
  >
    <span class="message-icon">{{ messageIcon }}</span>
    <span v-if="variant !== 'icon'" class="message-text">{{ buttonText }}</span>
    <span v-if="showEncryptionBadge && variant === 'icon'" class="encryption-badge">🔒</span>
  </button>
</template>

<style scoped lang="scss">
.message-btn {
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  position: relative;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  &:hover:not(&--disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:active:not(&--disabled) {
    transform: translateY(0);
  }
  
  // Disabled state
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  // Variants
  &--primary {
    background: linear-gradient(135deg, #5865f2, #7289da);
    color: white;
    box-shadow: 0 2px 8px rgba(88, 101, 242, 0.3);
    
    &:hover:not(.message-btn--disabled) {
      box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
    }
  }
  
  &--secondary {
    background: #40444b;
    color: #dcddde;
    border: 1px solid #40444b;
    
    &:hover:not(.message-btn--disabled) {
      background: #36393f;
      border-color: #36393f;
    }
  }
  
  &--icon {
    background: #40444b;
    color: #dcddde;
    border: 1px solid #40444b;
    aspect-ratio: 1;
    
    &:hover:not(.message-btn--disabled) {
      background: #36393f;
      color: white;
    }
  }
  
  // Role-based styling
  &--support {
    &.message-btn--primary {
      background: linear-gradient(135deg, #43b581, #57f287);
      box-shadow: 0 2px 8px rgba(67, 181, 129, 0.3);
      
      &:hover:not(.message-btn--disabled) {
        box-shadow: 0 4px 12px rgba(67, 181, 129, 0.4);
      }
    }
  }
  
  &--escort {
    &.message-btn--primary {
      background: linear-gradient(135deg, #faa61a, #f1c40f);
      box-shadow: 0 2px 8px rgba(250, 166, 26, 0.3);
      
      &:hover:not(.message-btn--disabled) {
        box-shadow: 0 4px 12px rgba(250, 166, 26, 0.4);
      }
    }
  }
  
  // Sizes
  &--sm {
    padding: 6px 12px;
    font-size: 0.8rem;
    
    &.message-btn--icon {
      width: 32px;
      height: 32px;
      padding: 0;
    }
  }
  
  &--md {
    padding: 8px 16px;
    font-size: 0.9rem;
    
    &.message-btn--icon {
      width: 40px;
      height: 40px;
      padding: 0;
    }
  }
  
  &--lg {
    padding: 12px 24px;
    font-size: 1rem;
    
    &.message-btn--icon {
      width: 48px;
      height: 48px;
      padding: 0;
    }
  }
  
  // Encryption badge for icon variant
  &--with-badge.message-btn--icon {
    .encryption-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      font-size: 0.6rem;
      background: #28a745;
      border-radius: 50%;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.message-icon {
  font-size: 1em;
}

.message-text {
  font-size: inherit;
}

@media (max-width: 768px) {
  .message-btn {
    &--sm {
      padding: 4px 8px;
      font-size: 0.75rem;
    }
    
    &--md {
      padding: 6px 12px;
      font-size: 0.85rem;
    }
    
    &--lg {
      padding: 10px 20px;
      font-size: 0.95rem;
    }
  }
}
</style>