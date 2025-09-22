<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../../stores/profile'
import { useSubscriptionStore } from '../../stores/subscription'
import { useToast } from '../../composables/useToast'

// Props for customization
interface Props {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline' | 'text'
  block?: boolean
  icon?: boolean
  text?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  block: false,
  icon: true,
  text: '',
  disabled: false
})

const router = useRouter()
const profileStore = useProfileStore()
const subscriptionStore = useSubscriptionStore()
const { error: showError } = useToast()

// Check if user can create a new profile
const canCreateNewProfile = computed(() => {
  // No subscription means no profile creation
  if (!subscriptionStore.currentSubscription) {
    return false
  }
  
  // Get current plan limits
  const currentPlan = subscriptionStore.currentPlan
  if (!currentPlan) {
    return false
  }
  
  // Check if user has reached profile limit for their plan
  const currentProfileCount = profileStore.profiles.length
  const planLimit = currentPlan.features.profilesPerMonth
  
  if (currentProfileCount >= planLimit) {
    return false
  }
  
  // Also check subscription store limits (which considers monthly usage)
  return subscriptionStore.canCreateProfile
})

// Dynamic button text based on context
const buttonText = computed(() => {
  if (props.text) {
    return props.text
  }
  
  if (!canCreateNewProfile.value) {
    const currentPlan = subscriptionStore.currentPlan
    if (currentPlan) {
      const currentProfileCount = profileStore.profiles.length
      const planLimit = currentPlan.features.profilesPerMonth
      
      if (currentProfileCount >= planLimit) {
        if (subscriptionStore.isFreeTier) {
          return `Upgrade to Create More (${currentProfileCount}/${planLimit})`
        }
        return `${currentPlan.name} Limit Reached (${currentProfileCount}/${planLimit})`
      }
    }
    return 'Profile Limit Reached'
  }
  
  return profileStore.profiles.length === 0 ? 'Create Your First Profile' : 'Create New Profile'
})

// Button title for tooltip
const buttonTitle = computed(() => {
  if (!canCreateNewProfile.value) {
    return 'Upgrade to create more profiles'
  }
  return profileStore.profiles.length === 0 ? 'Create your first escort profile' : 'Create a new escort profile'
})

// Handle create profile action
const createNewProfile = async () => {
  try {
    // If user cannot create profile, go to subscription page
    if (!canCreateNewProfile.value) {
      const currentPlan = subscriptionStore.currentPlan
      if (currentPlan) {
        const currentProfileCount = profileStore.profiles.length
        const planLimit = currentPlan.features.profilesPerMonth
        
        if (currentProfileCount >= planLimit) {
          showError(`${currentPlan.name} plan allows only ${planLimit} profile${planLimit > 1 ? 's' : ''} per month. You currently have ${currentProfileCount}. Please upgrade to create more profiles.`)
        } else {
          showError('You cannot create more profiles with your current plan.')
        }
      } else {
        showError('Unable to determine your subscription plan.')
      }
      router.push('/subscription')
      return
    }
    
    // Load subscription data first to ensure we have latest info
    await subscriptionStore.loadUserSubscription()
    
    // Final check after reloading subscription data
    if (!subscriptionStore.canCreateProfile) {
      const remainingProfiles = subscriptionStore.profilesRemaining
      showError(`You have reached your profile limit for this month. ${remainingProfiles} profiles remaining.`)
      router.push('/subscription')
      return
    }
    
    router.push('/escort/profiles/create')
  } catch (error) {
    console.error('Error checking profile limits:', error)
    showError('Unable to verify profile limits. Please try again.')
  }
}

// CSS classes based on props
const buttonClasses = computed(() => {
  return [
    'create-profile-btn',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
      'btn-block': props.block,
      'btn-disabled': props.disabled || !canCreateNewProfile.value
    }
  ]
})

// Export computed properties and functions for use in parent components
defineExpose({
  canCreateNewProfile,
  buttonText,
  createNewProfile
})
</script>

<template>
  <button 
    @click="createNewProfile"
    :class="buttonClasses"
    :title="buttonTitle"
    :disabled="props.disabled"
  >
    <svg 
      v-if="icon" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="currentColor"
      class="btn-icon"
    >
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
    <span>{{ buttonText }}</span>
  </button>
</template>

<style scoped lang="scss">
.create-profile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;

  .btn-icon {
    flex-shrink: 0;
  }
  
  // Variants
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
      transform: translateY(-1px);
    }
  }
  
  &.btn-outline {
    background: transparent;
    border: 1px solid var(--color-text-lighter);
    color: var(--color-text-dark);
    
    &:hover:not(:disabled) {
      background: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
  
  &.btn-text {
    background: transparent;
    border: none;
    color: var(--color-accent);
    
    &:hover:not(:disabled) {
      background: var(--color-accent-light);
    }
  }
  
  // Sizes
  &.btn-sm {
    padding: 8px 16px;
    font-size: 0.875rem;
    min-height: 36px;
    
    .btn-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  &.btn-md {
    padding: 12px 24px;
    font-size: 1rem;
    min-height: 48px;
    
    .btn-icon {
      width: 20px;
      height: 20px;
    }
  }
  
  &.btn-lg {
    padding: 16px 32px;
    font-size: 1.125rem;
    min-height: 56px;
    
    .btn-icon {
      width: 24px;
      height: 24px;
    }
  }
  
  // Block (full width)
  &.btn-block {
    width: 100%;
  }
  
}

// Mobile responsiveness
@media (max-width: 768px) {
  .create-profile-btn {
    &.btn-md {
      padding: 10px 20px;
      font-size: 0.95rem;
      min-height: 44px;
    }
    
    &.btn-lg {
      padding: 14px 28px;
      font-size: 1rem;
      min-height: 52px;
    }
  }
}
</style>