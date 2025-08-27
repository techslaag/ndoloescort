import { databases, ID, DATABASE_ID } from '../lib/appwrite'
import { Query } from 'appwrite'
import { paymentService } from './paymentService'
import { 
  SubscriptionTier, 
  BillingPeriod, 
  SubscriptionStatus,
  UserSubscription,
  SubscriptionUsage,
  SubscriptionPlan,
  SubscriptionInvoice,
  SubscriptionChange,
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan
} from '../types/subscription'

const SUBSCRIPTIONS_COLLECTION = 'subscriptions_20250114'
const SUBSCRIPTION_USAGE_COLLECTION = 'subscription_usage_20250114'
const SUBSCRIPTION_INVOICES_COLLECTION = 'subscription_invoices_20250114'

class SubscriptionService {
  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        [
          Query.equal('userId', userId),
          Query.equal('status', ['active', 'trialing', 'past_due'])
        ]
      )

      if (response.documents.length === 0) {
        return null
      }

      const doc = response.documents[0]
      return this.mapDocumentToSubscription(doc)
    } catch (error) {
      console.error('Error fetching user subscription:', error)
      return null
    }
  }

  // Create a new subscription
  async createSubscription(
    userId: string,
    planId: string,
    billingPeriod: BillingPeriod,
    paymentMethodId?: string
  ): Promise<UserSubscription> {
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
      if (!plan) {
        throw new Error('Invalid plan selected')
      }

      // Calculate subscription dates
      const startDate = new Date()
      const endDate = new Date()
      if (billingPeriod === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      // For free tier, no payment needed
      if (plan.tier === 'free') {
        const subscription: Partial<UserSubscription> = {
          id: ID.unique(),
          userId,
          planId: plan.id,
          tier: plan.tier,
          billingPeriod,
          status: 'active',
          currentPeriodStart: startDate.toISOString(),
          currentPeriodEnd: endDate.toISOString(),
          cancelAtPeriodEnd: false,
          lastPaymentAmount: 0,
          nextPaymentAmount: 0,
          profilesCreatedThisMonth: 0,
          premiumBoostsUsedThisMonth: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const created = await databases.createDocument(
          DATABASE_ID,
          SUBSCRIPTIONS_COLLECTION,
          subscription.id!,
          subscription
        )

        // Initialize usage tracking
        await this.initializeUsageTracking(userId, subscription.id!)

        return this.mapDocumentToSubscription(created)
      }

      // For paid plans, create payment intent
      const amount = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
      const paymentIntentId = await paymentService.createPaymentIntent({
        amount,
        currency: 'USD',
        clientId: userId,
        description: `${plan.name} subscription - ${billingPeriod}`,
        metadata: {
          type: 'subscription',
          planId: plan.id,
          billingPeriod
        }
      })

      // Create subscription with pending status
      const subscription: Partial<UserSubscription> = {
        id: ID.unique(),
        userId,
        planId: plan.id,
        tier: plan.tier,
        billingPeriod,
        status: 'active', // Will be updated after payment
        currentPeriodStart: startDate.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        cancelAtPeriodEnd: false,
        paymentMethodId,
        lastPaymentId: paymentIntentId,
        lastPaymentAmount: amount,
        nextPaymentDate: endDate.toISOString(),
        nextPaymentAmount: amount,
        profilesCreatedThisMonth: 0,
        premiumBoostsUsedThisMonth: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const created = await databases.createDocument(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        subscription.id!,
        subscription
      )

      // Initialize usage tracking
      await this.initializeUsageTracking(userId, subscription.id!)

      return this.mapDocumentToSubscription(created)
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  // Update subscription plan
  async updateSubscription(
    subscriptionId: string,
    newPlanId: string,
    newBillingPeriod?: BillingPeriod
  ): Promise<SubscriptionChange> {
    try {
      const subscription = await databases.getDocument(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        subscriptionId
      )

      const currentPlan = getSubscriptionPlan(subscription.tier)
      const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === newPlanId)

      if (!currentPlan || !newPlan) {
        throw new Error('Invalid plan configuration')
      }

      const billingPeriod = newBillingPeriod || subscription.billingPeriod
      const now = new Date()
      const periodEnd = new Date(subscription.currentPeriodEnd)
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const totalDaysInPeriod = billingPeriod === 'monthly' ? 30 : 365

      // Calculate proration
      const currentPrice = billingPeriod === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice
      const newPrice = billingPeriod === 'monthly' ? newPlan.monthlyPrice : newPlan.yearlyPrice
      
      const currentDailyRate = currentPrice / totalDaysInPeriod
      const newDailyRate = newPrice / totalDaysInPeriod
      
      const unusedCredit = currentDailyRate * daysRemaining
      const newCharge = newDailyRate * daysRemaining

      const change: SubscriptionChange = {
        currentTier: currentPlan.tier,
        newTier: newPlan.tier,
        currentBillingPeriod: subscription.billingPeriod,
        newBillingPeriod: billingPeriod,
        changeType: this.determineChangeType(currentPlan, newPlan),
        effectiveDate: now.toISOString(),
        creditAmount: unusedCredit,
        chargeAmount: newCharge,
        proratedAmount: newCharge - unusedCredit,
        isImmediate: true
      }

      // Update subscription
      await databases.updateDocument(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        subscriptionId,
        {
          planId: newPlan.id,
          tier: newPlan.tier,
          billingPeriod,
          updatedAt: new Date().toISOString()
        }
      )

      // Process payment for upgrades
      if (change.changeType === 'upgrade' && change.proratedAmount! > 0) {
        await paymentService.createPaymentIntent({
          amount: change.proratedAmount!,
          currency: 'USD',
          clientId: subscription.userId,
          description: `Subscription upgrade to ${newPlan.name}`,
          metadata: {
            type: 'subscription_upgrade',
            subscriptionId,
            changeType: change.changeType
          }
        })
      }

      return change
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
    immediate = false
  ): Promise<UserSubscription> {
    try {
      const updates: any = {
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
        updatedAt: new Date().toISOString()
      }

      if (immediate) {
        updates.status = 'cancelled'
      } else {
        updates.cancelAtPeriodEnd = true
      }

      const updated = await databases.updateDocument(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        subscriptionId,
        updates
      )

      return this.mapDocumentToSubscription(updated)
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }
  }

  // Get subscription usage for current period
  async getSubscriptionUsage(userId: string, subscriptionId: string): Promise<SubscriptionUsage> {
    try {
      const period = this.getCurrentPeriod()
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBSCRIPTION_USAGE_COLLECTION,
        [
          Query.equal('userId', userId),
          Query.equal('subscriptionId', subscriptionId),
          Query.equal('period', period)
        ]
      )

      if (response.documents.length === 0) {
        // Initialize usage for current period
        return await this.initializeUsageTracking(userId, subscriptionId)
      }

      return this.mapDocumentToUsage(response.documents[0])
    } catch (error) {
      console.error('Error fetching subscription usage:', error)
      throw error
    }
  }

  // Update usage when profile is created
  async incrementProfileUsage(userId: string, subscriptionId: string): Promise<boolean> {
    try {
      const usage = await this.getSubscriptionUsage(userId, subscriptionId)
      const subscription = await this.getUserSubscription(userId)
      
      if (!subscription) {
        throw new Error('No active subscription found')
      }

      const plan = getSubscriptionPlan(subscription.tier)
      if (!plan) {
        throw new Error('Invalid subscription plan')
      }

      if (usage.profilesCreated >= plan.features.profilesPerMonth) {
        throw new Error('Monthly profile limit reached')
      }

      await databases.updateDocument(
        DATABASE_ID,
        SUBSCRIPTION_USAGE_COLLECTION,
        usage.subscriptionId,
        {
          profilesCreated: usage.profilesCreated + 1,
          profilesRemaining: plan.features.profilesPerMonth - (usage.profilesCreated + 1),
          lastUpdated: new Date().toISOString()
        }
      )

      // Update subscription counter
      await databases.updateDocument(
        DATABASE_ID,
        SUBSCRIPTIONS_COLLECTION,
        subscriptionId,
        {
          profilesCreatedThisMonth: usage.profilesCreated + 1,
          updatedAt: new Date().toISOString()
        }
      )

      return true
    } catch (error) {
      console.error('Error incrementing profile usage:', error)
      throw error
    }
  }

  // Check if user can use a specific feature
  async canUseFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId)
      
      // Free tier access for basic features
      if (!subscription) {
        const freePlan = getSubscriptionPlan('free')
        if (!freePlan) return false
        
        const featureValue = freePlan.features[feature as keyof typeof freePlan.features]
        return typeof featureValue === 'boolean' ? featureValue : true
      }

      const plan = getSubscriptionPlan(subscription.tier)
      if (!plan) return false

      const featureValue = plan.features[feature as keyof typeof plan.features]
      return typeof featureValue === 'boolean' ? featureValue : true
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  // Get subscription invoices
  async getSubscriptionInvoices(userId: string): Promise<SubscriptionInvoice[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBSCRIPTION_INVOICES_COLLECTION,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt')
        ]
      )

      return response.documents.map(doc => this.mapDocumentToInvoice(doc))
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
  }

  // Initialize usage tracking for new period
  private async initializeUsageTracking(userId: string, subscriptionId: string): Promise<SubscriptionUsage> {
    const subscription = await databases.getDocument(
      DATABASE_ID,
      SUBSCRIPTIONS_COLLECTION,
      subscriptionId
    )

    const plan = getSubscriptionPlan(subscription.tier)
    if (!plan) {
      throw new Error('Invalid subscription plan')
    }

    const usage: SubscriptionUsage = {
      userId,
      subscriptionId,
      period: this.getCurrentPeriod(),
      profilesCreated: 0,
      profilesRemaining: plan.features.profilesPerMonth,
      premiumBoostsUsed: 0,
      premiumBoostsRemaining: plan.features.premiumBoosts.quantity,
      messagesCount: 0,
      audioCallMinutes: 0,
      videoCallMinutes: 0,
      liveStreamingMinutes: 0,
      privateRoomSessions: 0,
      giftsReceived: 0,
      callRevenue: 0,
      rewardsEarned: 0,
      supportTickets: 0,
      lastUpdated: new Date().toISOString()
    }

    const created = await databases.createDocument(
      DATABASE_ID,
      SUBSCRIPTION_USAGE_COLLECTION,
      ID.unique(),
      usage
    )

    return this.mapDocumentToUsage(created)
  }

  // Helper methods
  private getCurrentPeriod(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  private determineChangeType(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): 'upgrade' | 'downgrade' | 'billing_period_change' {
    const tierOrder = ['free', 'starter', 'pro', 'agency']
    const currentIndex = tierOrder.indexOf(currentPlan.tier)
    const newIndex = tierOrder.indexOf(newPlan.tier)

    if (newIndex > currentIndex) return 'upgrade'
    if (newIndex < currentIndex) return 'downgrade'
    return 'billing_period_change'
  }

  private mapDocumentToSubscription(doc: any): UserSubscription {
    return {
      id: doc.$id,
      userId: doc.userId,
      planId: doc.planId,
      tier: doc.tier,
      billingPeriod: doc.billingPeriod,
      status: doc.status,
      currentPeriodStart: doc.currentPeriodStart,
      currentPeriodEnd: doc.currentPeriodEnd,
      cancelAtPeriodEnd: doc.cancelAtPeriodEnd || false,
      cancelledAt: doc.cancelledAt,
      cancellationReason: doc.cancellationReason,
      trialEndsAt: doc.trialEndsAt,
      paymentMethodId: doc.paymentMethodId,
      lastPaymentId: doc.lastPaymentId,
      lastPaymentAmount: doc.lastPaymentAmount,
      lastPaymentDate: doc.lastPaymentDate,
      nextPaymentDate: doc.nextPaymentDate,
      nextPaymentAmount: doc.nextPaymentAmount,
      profilesCreatedThisMonth: doc.profilesCreatedThisMonth || 0,
      premiumBoostsUsedThisMonth: doc.premiumBoostsUsedThisMonth || 0,
      metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  }

  private mapDocumentToUsage(doc: any): SubscriptionUsage {
    return {
      userId: doc.userId,
      subscriptionId: doc.subscriptionId,
      period: doc.period,
      profilesCreated: doc.profilesCreated,
      profilesRemaining: doc.profilesRemaining,
      premiumBoostsUsed: doc.premiumBoostsUsed,
      premiumBoostsRemaining: doc.premiumBoostsRemaining,
      messagesCount: doc.messagesCount,
      audioCallMinutes: doc.audioCallMinutes,
      videoCallMinutes: doc.videoCallMinutes,
      liveStreamingMinutes: doc.liveStreamingMinutes,
      privateRoomSessions: doc.privateRoomSessions,
      giftsReceived: doc.giftsReceived,
      callRevenue: doc.callRevenue,
      rewardsEarned: doc.rewardsEarned,
      supportTickets: doc.supportTickets,
      lastUpdated: doc.lastUpdated
    }
  }

  private mapDocumentToInvoice(doc: any): SubscriptionInvoice {
    return {
      id: doc.$id,
      subscriptionId: doc.subscriptionId,
      userId: doc.userId,
      invoiceNumber: doc.invoiceNumber,
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      dueDate: doc.dueDate,
      paidAt: doc.paidAt,
      paymentMethodId: doc.paymentMethodId,
      paymentIntentId: doc.paymentIntentId,
      lineItems: doc.lineItems ? JSON.parse(doc.lineItems) : [],
      taxAmount: doc.taxAmount,
      totalAmount: doc.totalAmount,
      invoiceUrl: doc.invoiceUrl,
      receiptUrl: doc.receiptUrl,
      createdAt: doc.createdAt
    }
  }
}

export const subscriptionService = new SubscriptionService()