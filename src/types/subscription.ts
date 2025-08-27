export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'agency'
export type BillingPeriod = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing'

export interface SubscriptionFeatures {
  profilesPerMonth: number
  premiumBoosts: {
    type: 'premium1' | 'premium2' | null
    quantity: number
  }
  messaging: boolean
  audioCall: boolean
  videoCall: boolean
  liveStreaming: boolean
  privateRoom: boolean
  receiveGifts: boolean
  callRevenue: boolean
  blissescortReward: boolean
  supportLevel: 'standard' | 'priority'
  proFlag: boolean
}

export interface SubscriptionPlan {
  id: string
  tier: SubscriptionTier
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  yearlyDiscount: number
  features: SubscriptionFeatures
  highlights: string[]
  isPopular?: boolean
  isRecommended?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  tier: SubscriptionTier
  billingPeriod: BillingPeriod
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  cancelledAt?: string
  cancellationReason?: string
  trialEndsAt?: string
  paymentMethodId?: string
  lastPaymentId?: string
  lastPaymentAmount: number
  lastPaymentDate?: string
  nextPaymentDate?: string
  nextPaymentAmount: number
  profilesCreatedThisMonth: number
  premiumBoostsUsedThisMonth: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface SubscriptionUsage {
  userId: string
  subscriptionId: string
  period: string // YYYY-MM format
  profilesCreated: number
  profilesRemaining: number
  premiumBoostsUsed: number
  premiumBoostsRemaining: number
  messagesCount: number
  audioCallMinutes: number
  videoCallMinutes: number
  liveStreamingMinutes: number
  privateRoomSessions: number
  giftsReceived: number
  callRevenue: number
  rewardsEarned: number
  supportTickets: number
  lastUpdated: string
}

export interface SubscriptionInvoice {
  id: string
  subscriptionId: string
  userId: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded'
  dueDate: string
  paidAt?: string
  paymentMethodId?: string
  paymentIntentId?: string
  lineItems: {
    description: string
    amount: number
    quantity: number
  }[]
  taxAmount: number
  totalAmount: number
  invoiceUrl?: string
  receiptUrl?: string
  createdAt: string
}

export interface SubscriptionChange {
  currentTier: SubscriptionTier
  newTier: SubscriptionTier
  currentBillingPeriod: BillingPeriod
  newBillingPeriod: BillingPeriod
  changeType: 'upgrade' | 'downgrade' | 'billing_period_change'
  effectiveDate: string
  proratedAmount?: number
  creditAmount?: number
  chargeAmount?: number
  isImmediate: boolean
}

export interface SubscriptionNotification {
  type: 'payment_due' | 'payment_failed' | 'subscription_expired' | 'trial_ending' | 'usage_limit_reached'
  userId: string
  subscriptionId: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  scheduledFor: string
  sentAt?: string
}

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Free',
    description: 'Perfect for trying out our platform',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    features: {
      profilesPerMonth: 1,
      premiumBoosts: {
        type: null,
        quantity: 0
      },
      messaging: true,
      audioCall: true,
      videoCall: false,
      liveStreaming: false,
      privateRoom: false,
      receiveGifts: true,
      callRevenue: false,
      blissescortReward: false,
      supportLevel: 'standard',
      proFlag: false
    },
    highlights: [
      '1 profile per month',
      'Messaging & audio calls',
      'Receive gifts',
      'Standard support'
    ]
  },
  {
    id: 'starter',
    tier: 'starter',
    name: 'Starter',
    description: 'Great for independent escorts',
    monthlyPrice: 25,
    yearlyPrice: 250,
    yearlyDiscount: 50,
    features: {
      profilesPerMonth: 1,
      premiumBoosts: {
        type: 'premium1',
        quantity: 2
      },
      messaging: true,
      audioCall: true,
      videoCall: true,
      liveStreaming: false,
      privateRoom: true,
      receiveGifts: true,
      callRevenue: true,
      blissescortReward: false,
      supportLevel: 'standard',
      proFlag: false
    },
    highlights: [
      '1 profile per month',
      '2 Premium boosts included',
      'Video calls enabled',
      'Private room access',
      'Keep call revenue'
    ],
    isPopular: true
  },
  {
    id: 'pro',
    tier: 'pro',
    name: 'Pro',
    description: 'For professional escorts who want more',
    monthlyPrice: 60,
    yearlyPrice: 600,
    yearlyDiscount: 120,
    features: {
      profilesPerMonth: 2,
      premiumBoosts: {
        type: 'premium2',
        quantity: 2
      },
      messaging: true,
      audioCall: true,
      videoCall: true,
      liveStreaming: true,
      privateRoom: true,
      receiveGifts: true,
      callRevenue: true,
      blissescortReward: true,
      supportLevel: 'priority',
      proFlag: true
    },
    highlights: [
      '2 profiles per month',
      '2 Premium+ boosts included',
      'Pro badge on profile',
      'Live streaming enabled',
      'BlissEscort rewards program',
      'Priority support'
    ],
    isRecommended: true
  },
  {
    id: 'agency',
    tier: 'agency',
    name: 'Agency',
    description: 'Perfect for agencies managing multiple escorts',
    monthlyPrice: 100,
    yearlyPrice: 1000,
    yearlyDiscount: 200,
    features: {
      profilesPerMonth: 15,
      premiumBoosts: {
        type: 'premium2',
        quantity: 2
      },
      messaging: true,
      audioCall: true,
      videoCall: true,
      liveStreaming: true,
      privateRoom: true,
      receiveGifts: true,
      callRevenue: true,
      blissescortReward: true,
      supportLevel: 'priority',
      proFlag: true
    },
    highlights: [
      '15 profiles per month',
      '2 Premium+ boosts included',
      'Pro badge for all profiles',
      'Full feature access',
      'BlissEscort rewards program',
      'Priority support',
      'Agency dashboard'
    ]
  }
]

export const getSubscriptionPlan = (tier: SubscriptionTier): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.tier === tier)
}

export const canCreateProfile = (subscription: UserSubscription, usage: SubscriptionUsage): boolean => {
  const plan = getSubscriptionPlan(subscription.tier)
  if (!plan) return false
  
  return usage.profilesRemaining > 0
}

export const canUseFeature = (subscription: UserSubscription, feature: keyof SubscriptionFeatures): boolean => {
  const plan = getSubscriptionPlan(subscription.tier)
  if (!plan) return false
  
  const featureValue = plan.features[feature]
  
  // For boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue
  }
  
  // For other features that aren't simple booleans
  return true
}

export const calculateProratedAmount = (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  billingPeriod: BillingPeriod,
  daysRemaining: number,
  totalDaysInPeriod: number
): number => {
  const currentPrice = billingPeriod === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice
  const newPrice = billingPeriod === 'monthly' ? newPlan.monthlyPrice : newPlan.yearlyPrice
  
  const currentDailyRate = currentPrice / totalDaysInPeriod
  const newDailyRate = newPrice / totalDaysInPeriod
  
  const unusedCredit = currentDailyRate * daysRemaining
  const newCharge = newDailyRate * daysRemaining
  
  return newCharge - unusedCredit
}