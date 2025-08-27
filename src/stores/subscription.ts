import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { subscriptionService } from '../services/subscriptionService'
import { useAuthStore } from './auth'
import type { 
  UserSubscription, 
  SubscriptionUsage, 
  SubscriptionPlan,
  SubscriptionInvoice,
  BillingPeriod,
  SubscriptionTier
} from '../types/subscription'
import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from '../types/subscription'

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const currentSubscription = ref<UserSubscription | null>(null)
  const currentUsage = ref<SubscriptionUsage | null>(null)
  const invoices = ref<SubscriptionInvoice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const currentPlan = computed<SubscriptionPlan | null>(() => {
    if (!currentSubscription.value) {
      return getSubscriptionPlan('free') || null
    }
    return getSubscriptionPlan(currentSubscription.value.tier) || null
  })

  const isFreeTier = computed(() => {
    return !currentSubscription.value || currentSubscription.value.tier === 'free'
  })

  const isPro = computed(() => {
    return currentSubscription.value?.tier === 'pro' || currentSubscription.value?.tier === 'agency'
  })

  const isAgency = computed(() => {
    return currentSubscription.value?.tier === 'agency'
  })

  const canCreateProfile = computed(() => {
    if (!currentUsage.value) return false
    return currentUsage.value.profilesRemaining > 0
  })

  const profilesRemaining = computed(() => {
    return currentUsage.value?.profilesRemaining || 0
  })

  const premiumBoostsRemaining = computed(() => {
    return currentUsage.value?.premiumBoostsRemaining || 0
  })

  const daysUntilRenewal = computed(() => {
    if (!currentSubscription.value) return 0
    const endDate = new Date(currentSubscription.value.currentPeriodEnd)
    const now = new Date()
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  })

  const subscriptionStatus = computed(() => {
    if (!currentSubscription.value) return 'inactive'
    if (currentSubscription.value.cancelAtPeriodEnd) return 'cancelling'
    return currentSubscription.value.status
  })

  // Actions
  const loadUserSubscription = async () => {
    try {
      isLoading.value = true
      error.value = null

      const authStore = useAuthStore()
      if (!authStore.user) {
        currentSubscription.value = null
        currentUsage.value = null
        return
      }

      // Load subscription
      const subscription = await subscriptionService.getUserSubscription(authStore.user.$id)
      currentSubscription.value = subscription

      // Load usage if subscription exists
      if (subscription) {
        const usage = await subscriptionService.getSubscriptionUsage(
          authStore.user.$id,
          subscription.id
        )
        currentUsage.value = usage
      }
    } catch (err: any) {
      console.error('Error loading subscription:', err)
      error.value = err.message || 'Failed to load subscription'
    } finally {
      isLoading.value = false
    }
  }

  const createSubscription = async (
    planId: string,
    billingPeriod: BillingPeriod,
    paymentMethodId?: string
  ) => {
    try {
      isLoading.value = true
      error.value = null

      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      const subscription = await subscriptionService.createSubscription(
        authStore.user.$id,
        planId,
        billingPeriod,
        paymentMethodId
      )

      currentSubscription.value = subscription
      
      // Load initial usage
      const usage = await subscriptionService.getSubscriptionUsage(
        authStore.user.$id,
        subscription.id
      )
      currentUsage.value = usage

      return subscription
    } catch (err: any) {
      console.error('Error creating subscription:', err)
      error.value = err.message || 'Failed to create subscription'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateSubscription = async (
    newPlanId: string,
    newBillingPeriod?: BillingPeriod
  ) => {
    try {
      isLoading.value = true
      error.value = null

      if (!currentSubscription.value) {
        throw new Error('No active subscription')
      }

      const change = await subscriptionService.updateSubscription(
        currentSubscription.value.id,
        newPlanId,
        newBillingPeriod
      )

      // Reload subscription
      await loadUserSubscription()

      return change
    } catch (err: any) {
      console.error('Error updating subscription:', err)
      error.value = err.message || 'Failed to update subscription'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const cancelSubscription = async (reason?: string, immediate = false) => {
    try {
      isLoading.value = true
      error.value = null

      if (!currentSubscription.value) {
        throw new Error('No active subscription')
      }

      const updated = await subscriptionService.cancelSubscription(
        currentSubscription.value.id,
        reason,
        immediate
      )

      currentSubscription.value = updated
      return updated
    } catch (err: any) {
      console.error('Error cancelling subscription:', err)
      error.value = err.message || 'Failed to cancel subscription'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) return false

      return await subscriptionService.canUseFeature(authStore.user.$id, feature)
    } catch (err) {
      console.error('Error checking feature access:', err)
      return false
    }
  }

  const incrementProfileUsage = async (): Promise<boolean> => {
    try {
      const authStore = useAuthStore()
      if (!authStore.user || !currentSubscription.value) {
        throw new Error('No active subscription')
      }

      await subscriptionService.incrementProfileUsage(
        authStore.user.$id,
        currentSubscription.value.id
      )

      // Reload usage
      const usage = await subscriptionService.getSubscriptionUsage(
        authStore.user.$id,
        currentSubscription.value.id
      )
      currentUsage.value = usage

      return true
    } catch (err: any) {
      console.error('Error incrementing profile usage:', err)
      error.value = err.message || 'Failed to update usage'
      throw err
    }
  }

  const loadInvoices = async () => {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) return

      const userInvoices = await subscriptionService.getSubscriptionInvoices(authStore.user.$id)
      invoices.value = userInvoices
    } catch (err: any) {
      console.error('Error loading invoices:', err)
      error.value = err.message || 'Failed to load invoices'
    }
  }

  const getAvailablePlans = (): SubscriptionPlan[] => {
    return SUBSCRIPTION_PLANS
  }

  const getUpgradePlans = (): SubscriptionPlan[] => {
    if (!currentSubscription.value) {
      return SUBSCRIPTION_PLANS.filter(p => p.tier !== 'free')
    }

    const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'agency']
    const currentIndex = tierOrder.indexOf(currentSubscription.value.tier)
    
    return SUBSCRIPTION_PLANS.filter(plan => {
      const planIndex = tierOrder.indexOf(plan.tier)
      return planIndex > currentIndex
    })
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    currentSubscription.value = null
    currentUsage.value = null
    invoices.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    currentSubscription,
    currentUsage,
    invoices,
    isLoading,
    error,
    // Computed
    currentPlan,
    isFreeTier,
    isPro,
    isAgency,
    canCreateProfile,
    profilesRemaining,
    premiumBoostsRemaining,
    daysUntilRenewal,
    subscriptionStatus,
    // Actions
    loadUserSubscription,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    checkFeatureAccess,
    incrementProfileUsage,
    loadInvoices,
    getAvailablePlans,
    getUpgradePlans,
    clearError,
    reset
  }
}, {
  persist: {
    key: 'subscription-store',
    pick: ['currentSubscription', 'currentUsage']
  }
})