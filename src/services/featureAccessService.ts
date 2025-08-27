import { useSubscriptionStore } from '../stores/subscription'
import { useAuthStore } from '../stores/auth'
import type { SubscriptionTier } from '../types/subscription'

export interface FeatureAccess {
  canAccessFeature: boolean
  reason?: string
  upgradeRequired?: SubscriptionTier
}

export interface CallRevenueSplit {
  escortPercentage: number
  platformPercentage: number
  escortAmount: number
  platformAmount: number
}

export class FeatureAccessService {
  // Feature access checks
  static async canAccessVideoCall(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Video calls are available for all tiers
    return {
      canAccessFeature: true
    }
  }

  static async canAccessAudioCall(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Audio calls are available for all tiers
    return {
      canAccessFeature: true
    }
  }

  static async canAccessLiveStreaming(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Check if current tier supports live streaming
    const canAccess = await subscriptionStore.checkFeatureAccess('liveStreaming')
    
    if (!canAccess) {
      return {
        canAccessFeature: false,
        reason: 'Live streaming requires Pro or Agency subscription',
        upgradeRequired: 'pro'
      }
    }

    return {
      canAccessFeature: true
    }
  }

  static async canAccessPrivateRoom(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Check if current tier supports private rooms
    const canAccess = await subscriptionStore.checkFeatureAccess('privateRoom')
    
    if (!canAccess) {
      return {
        canAccessFeature: false,
        reason: 'Private room requires Pro or Agency subscription',
        upgradeRequired: 'pro'
      }
    }

    return {
      canAccessFeature: true
    }
  }

  static async canReceiveGifts(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Gift receiving is available for all tiers
    return {
      canAccessFeature: true
    }
  }

  static async canEarnCallRevenue(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Check if current tier supports call revenue
    const canAccess = await subscriptionStore.checkFeatureAccess('callRevenue')
    
    if (!canAccess) {
      return {
        canAccessFeature: false,
        reason: 'Call revenue requires Starter, Pro, or Agency subscription',
        upgradeRequired: 'starter'
      }
    }

    return {
      canAccessFeature: true
    }
  }

  static async canAccessBlissEscortRewards(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Check if current tier supports BlissEscort rewards
    const canAccess = await subscriptionStore.checkFeatureAccess('blissescortReward')
    
    if (!canAccess) {
      return {
        canAccessFeature: false,
        reason: 'BlissEscort rewards require Pro or Agency subscription',
        upgradeRequired: 'pro'
      }
    }

    return {
      canAccessFeature: true
    }
  }

  static async canAccessPrioritySupport(): Promise<FeatureAccess> {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return {
        canAccessFeature: false,
        reason: 'Authentication required'
      }
    }

    // Check if current tier has priority support
    const canAccess = subscriptionStore.isPro || subscriptionStore.isAgency
    
    if (!canAccess) {
      return {
        canAccessFeature: false,
        reason: 'Priority support requires Pro or Agency subscription',
        upgradeRequired: 'pro'
      }
    }

    return {
      canAccessFeature: true
    }
  }

  // Calculate call revenue split based on subscription
  static calculateCallRevenueSplit(callAmount: number): CallRevenueSplit {
    const subscriptionStore = useSubscriptionStore()
    
    // Default split: 80% escort, 20% platform
    let escortPercentage = 80
    let platformPercentage = 20

    // Pro and Agency tiers get better revenue split
    if (subscriptionStore.isPro || subscriptionStore.isAgency) {
      escortPercentage = 85
      platformPercentage = 15
    }

    const escortAmount = (callAmount * escortPercentage) / 100
    const platformAmount = (callAmount * platformPercentage) / 100

    return {
      escortPercentage,
      platformPercentage,
      escortAmount,
      platformAmount
    }
  }

  // Check if feature should show upgrade prompt
  static shouldShowUpgradePrompt(feature: string): boolean {
    const subscriptionStore = useSubscriptionStore()
    
    // Features that require upgrade from free tier
    const paidFeatures = [
      'liveStreaming',
      'privateRoom',
      'callRevenue',
      'blissescortReward',
      'prioritySupport'
    ]

    // Features that require Pro or Agency
    const proFeatures = [
      'liveStreaming',
      'privateRoom',
      'blissescortReward',
      'prioritySupport'
    ]

    if (subscriptionStore.isFreeTier && paidFeatures.includes(feature)) {
      return true
    }

    if (!subscriptionStore.isPro && !subscriptionStore.isAgency && proFeatures.includes(feature)) {
      return true
    }

    return false
  }

  // Get feature limitations for current subscription
  static getFeatureLimitations(): Record<string, any> {
    const subscriptionStore = useSubscriptionStore()
    const currentPlan = subscriptionStore.currentPlan

    if (!currentPlan) {
      return {
        profilesPerMonth: 0,
        premiumBoosts: 0,
        canAccessVideoCall: false,
        canAccessAudioCall: false,
        canAccessLiveStreaming: false,
        canAccessPrivateRoom: false,
        canReceiveGifts: false,
        canEarnCallRevenue: false,
        canAccessBlissEscortRewards: false,
        hasPrioritySupport: false
      }
    }

    return {
      profilesPerMonth: currentPlan.profilesPerMonth,
      premiumBoosts: currentPlan.features.premiumBoosts || 0,
      canAccessVideoCall: currentPlan.features.videoCall,
      canAccessAudioCall: currentPlan.features.audioCall,
      canAccessLiveStreaming: currentPlan.features.liveStreaming,
      canAccessPrivateRoom: currentPlan.features.privateRoom,
      canReceiveGifts: currentPlan.features.receiveGift,
      canEarnCallRevenue: currentPlan.features.callRevenue,
      canAccessBlissEscortRewards: currentPlan.features.blissescortReward,
      hasPrioritySupport: currentPlan.features.support === 'priority'
    }
  }

  // Helper to check multiple features at once
  static async checkMultipleFeatures(features: string[]): Promise<Record<string, FeatureAccess>> {
    const results: Record<string, FeatureAccess> = {}

    for (const feature of features) {
      switch (feature) {
        case 'videoCall':
          results[feature] = await this.canAccessVideoCall()
          break
        case 'audioCall':
          results[feature] = await this.canAccessAudioCall()
          break
        case 'liveStreaming':
          results[feature] = await this.canAccessLiveStreaming()
          break
        case 'privateRoom':
          results[feature] = await this.canAccessPrivateRoom()
          break
        case 'receiveGift':
          results[feature] = await this.canReceiveGifts()
          break
        case 'callRevenue':
          results[feature] = await this.canEarnCallRevenue()
          break
        case 'blissescortReward':
          results[feature] = await this.canAccessBlissEscortRewards()
          break
        case 'prioritySupport':
          results[feature] = await this.canAccessPrioritySupport()
          break
        default:
          results[feature] = {
            canAccessFeature: false,
            reason: 'Unknown feature'
          }
      }
    }

    return results
  }
}

// Export singleton instance
export const featureAccessService = FeatureAccessService