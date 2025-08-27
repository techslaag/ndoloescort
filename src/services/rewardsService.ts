import { databases, DATABASE_ID, ID, Query, REWARDS_COLLECTION_ID, REWARD_POINTS_COLLECTION_ID, REWARD_REDEMPTIONS_COLLECTION_ID } from '../lib/appwrite'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import { featureAccessService } from './featureAccessService'

export interface RewardTier {
  id: string
  name: string
  pointsRequired: number
  icon: string
  benefits: string[]
}

export interface PointTransaction {
  $id?: string
  userId: string
  points: number
  type: 'earned' | 'spent'
  reason: string
  referenceId?: string // ID of the action that generated points
  referenceType?: 'profile_completion' | 'verification' | 'call' | 'gift' | 'streak' | 'referral'
  $createdAt?: string
}

export interface UserPoints {
  $id?: string
  userId: string
  totalPoints: number
  availablePoints: number
  lifetimePoints: number
  currentTier: RewardTier['id']
  $createdAt?: string
  $updatedAt?: string
}

export interface Reward {
  $id?: string
  name: string
  description: string
  pointsCost: number
  type: 'boost' | 'badge' | 'discount' | 'feature' | 'cash'
  value: any // Depends on type
  availability: 'unlimited' | 'limited'
  stock?: number
  expiresAt?: string
  $createdAt?: string
}

export interface Redemption {
  $id?: string
  userId: string
  rewardId: string
  rewardName: string
  pointsSpent: number
  status: 'pending' | 'completed' | 'failed'
  redeemedAt: string
  expiresAt?: string
  $createdAt?: string
}

// Predefined reward tiers
export const REWARD_TIERS: RewardTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    pointsRequired: 0,
    icon: '🥉',
    benefits: ['Basic rewards access', '5% bonus points on activities']
  },
  {
    id: 'silver',
    name: 'Silver',
    pointsRequired: 1000,
    icon: '🥈',
    benefits: ['10% bonus points', 'Exclusive badges', 'Priority in search']
  },
  {
    id: 'gold',
    name: 'Gold',
    pointsRequired: 5000,
    icon: '🥇',
    benefits: ['15% bonus points', 'Free monthly boost', 'VIP support']
  },
  {
    id: 'platinum',
    name: 'Platinum',
    pointsRequired: 10000,
    icon: '💎',
    benefits: ['20% bonus points', 'Weekly free boosts', 'Exclusive features', 'Personal account manager']
  }
]

// Point earning rates
const POINT_RATES = {
  profileCompletion: 100,
  photoVerification: 200,
  idVerification: 500,
  callPerMinute: 5,
  giftReceived: 10, // per $10 of gift value
  dailyStreak: 50,
  weeklyStreak: 200,
  referral: 500
}

export class RewardsService {
  // Check if user has access to rewards
  static async hasRewardsAccess(): Promise<boolean> {
    const access = await featureAccessService.canAccessBlissEscortRewards()
    return access.canAccessFeature
  }

  // Get or create user points
  static async getUserPoints(userId: string): Promise<UserPoints | null> {
    try {
      // Check access
      if (!await this.hasRewardsAccess()) {
        return null
      }

      // Try to get existing points
      const response = await databases.listDocuments(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.limit(1)
        ]
      )

      if (response.documents.length > 0) {
        return response.documents[0] as UserPoints
      }

      // Create new points record
      const newPoints: Partial<UserPoints> = {
        userId,
        totalPoints: 0,
        availablePoints: 0,
        lifetimePoints: 0,
        currentTier: 'bronze'
      }

      const created = await databases.createDocument(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        ID.unique(),
        newPoints
      )

      return created as UserPoints
    } catch (error) {
      console.error('Failed to get user points:', error)
      return null
    }
  }

  // Award points to user
  static async awardPoints(
    userId: string,
    points: number,
    reason: string,
    referenceType?: PointTransaction['referenceType'],
    referenceId?: string
  ): Promise<boolean> {
    try {
      // Check access
      if (!await this.hasRewardsAccess()) {
        return false
      }

      const userPoints = await this.getUserPoints(userId)
      if (!userPoints) return false

      // Calculate tier bonus
      const tierBonus = this.getTierBonus(userPoints.currentTier)
      const bonusPoints = Math.floor(points * tierBonus)
      const totalPoints = points + bonusPoints

      // Record transaction
      const transaction: Partial<PointTransaction> = {
        userId,
        points: totalPoints,
        type: 'earned',
        reason: bonusPoints > 0 ? `${reason} (+${bonusPoints} bonus)` : reason,
        referenceType,
        referenceId
      }

      await databases.createDocument(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        ID.unique(),
        transaction
      )

      // Update user points
      const newTotal = userPoints.totalPoints + totalPoints
      const newAvailable = userPoints.availablePoints + totalPoints
      const newLifetime = userPoints.lifetimePoints + totalPoints
      const newTier = this.calculateTier(newLifetime)

      await databases.updateDocument(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        userPoints.$id!,
        {
          totalPoints: newTotal,
          availablePoints: newAvailable,
          lifetimePoints: newLifetime,
          currentTier: newTier.id
        }
      )

      return true
    } catch (error) {
      console.error('Failed to award points:', error)
      return false
    }
  }

  // Award points for specific actions
  static async awardProfileCompletionPoints(userId: string): Promise<boolean> {
    return this.awardPoints(
      userId,
      POINT_RATES.profileCompletion,
      'Profile completion',
      'profile_completion'
    )
  }

  static async awardVerificationPoints(userId: string, verificationType: 'photo' | 'id'): Promise<boolean> {
    const points = verificationType === 'photo' 
      ? POINT_RATES.photoVerification 
      : POINT_RATES.idVerification
    
    return this.awardPoints(
      userId,
      points,
      `${verificationType === 'photo' ? 'Photo' : 'ID'} verification completed`,
      'verification'
    )
  }

  static async awardCallPoints(userId: string, durationMinutes: number, callId: string): Promise<boolean> {
    const points = Math.floor(durationMinutes * POINT_RATES.callPerMinute)
    return this.awardPoints(
      userId,
      points,
      `Call completed (${durationMinutes} minutes)`,
      'call',
      callId
    )
  }

  static async awardGiftPoints(userId: string, giftValue: number, giftId: string): Promise<boolean> {
    const points = Math.floor((giftValue / 10) * POINT_RATES.giftReceived)
    return this.awardPoints(
      userId,
      points,
      `Gift received ($${giftValue})`,
      'gift',
      giftId
    )
  }

  static async awardStreakPoints(userId: string, streakType: 'daily' | 'weekly'): Promise<boolean> {
    const points = streakType === 'daily' 
      ? POINT_RATES.dailyStreak 
      : POINT_RATES.weeklyStreak
    
    return this.awardPoints(
      userId,
      points,
      `${streakType === 'daily' ? 'Daily' : 'Weekly'} streak bonus`,
      'streak'
    )
  }

  static async awardReferralPoints(userId: string, referredUserId: string): Promise<boolean> {
    return this.awardPoints(
      userId,
      POINT_RATES.referral,
      'Successful referral',
      'referral',
      referredUserId
    )
  }

  // Get available rewards
  static async getAvailableRewards(): Promise<Reward[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REWARDS_COLLECTION_ID,
        [
          Query.orderAsc('pointsCost'),
          Query.limit(100)
        ]
      )

      // Filter out expired or out of stock rewards
      const now = new Date()
      return response.documents.filter((reward: any) => {
        if (reward.expiresAt && new Date(reward.expiresAt) < now) {
          return false
        }
        if (reward.availability === 'limited' && reward.stock <= 0) {
          return false
        }
        return true
      }) as Reward[]
    } catch (error) {
      console.error('Failed to get available rewards:', error)
      return []
    }
  }

  // Redeem a reward
  static async redeemReward(userId: string, rewardId: string): Promise<Redemption | null> {
    try {
      // Check access
      if (!await this.hasRewardsAccess()) {
        throw new Error('Rewards access not available')
      }

      // Get user points
      const userPoints = await this.getUserPoints(userId)
      if (!userPoints) {
        throw new Error('User points not found')
      }

      // Get reward
      const reward = await databases.getDocument(
        DATABASE_ID,
        REWARDS_COLLECTION_ID,
        rewardId
      ) as Reward

      // Check if user has enough points
      if (userPoints.availablePoints < reward.pointsCost) {
        throw new Error('Insufficient points')
      }

      // Check availability
      if (reward.availability === 'limited' && (!reward.stock || reward.stock <= 0)) {
        throw new Error('Reward out of stock')
      }

      // Create redemption
      const redemption: Partial<Redemption> = {
        userId,
        rewardId,
        rewardName: reward.name,
        pointsSpent: reward.pointsCost,
        status: 'pending',
        redeemedAt: new Date().toISOString()
      }

      if (reward.type === 'boost' || reward.type === 'feature') {
        // Set expiration for time-limited rewards
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + (reward.value.days || 30))
        redemption.expiresAt = expirationDate.toISOString()
      }

      const created = await databases.createDocument(
        DATABASE_ID,
        REWARD_REDEMPTIONS_COLLECTION_ID,
        ID.unique(),
        redemption
      )

      // Deduct points
      const transaction: Partial<PointTransaction> = {
        userId,
        points: -reward.pointsCost,
        type: 'spent',
        reason: `Redeemed: ${reward.name}`,
        referenceId: created.$id
      }

      await databases.createDocument(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        ID.unique(),
        transaction
      )

      // Update user points
      await databases.updateDocument(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        userPoints.$id!,
        {
          availablePoints: userPoints.availablePoints - reward.pointsCost
        }
      )

      // Update reward stock if limited
      if (reward.availability === 'limited' && reward.stock) {
        await databases.updateDocument(
          DATABASE_ID,
          REWARDS_COLLECTION_ID,
          rewardId,
          {
            stock: reward.stock - 1
          }
        )
      }

      // Process reward based on type
      await this.processRedemption(created as Redemption, reward)

      return created as Redemption
    } catch (error: any) {
      console.error('Failed to redeem reward:', error)
      throw error
    }
  }

  // Process redemption based on reward type
  private static async processRedemption(redemption: Redemption, reward: Reward): Promise<void> {
    try {
      switch (reward.type) {
        case 'boost':
          // Apply profile boost
          // This would integrate with your advertising service
          break
        
        case 'badge':
          // Award badge to user
          // This would integrate with your badge system
          break
        
        case 'discount':
          // Apply discount code
          // This would create a discount code for future purchases
          break
        
        case 'feature':
          // Unlock feature temporarily
          // This would grant temporary access to premium features
          break
        
        case 'cash':
          // Add to user's cash balance
          // This would integrate with your payment system
          break
      }

      // Mark redemption as completed
      await databases.updateDocument(
        DATABASE_ID,
        REWARD_REDEMPTIONS_COLLECTION_ID,
        redemption.$id!,
        { status: 'completed' }
      )
    } catch (error) {
      console.error('Failed to process redemption:', error)
      
      // Mark redemption as failed
      await databases.updateDocument(
        DATABASE_ID,
        REWARD_REDEMPTIONS_COLLECTION_ID,
        redemption.$id!,
        { status: 'failed' }
      )
    }
  }

  // Get user's redemption history
  static async getRedemptionHistory(userId: string): Promise<Redemption[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REWARD_REDEMPTIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      )

      return response.documents as Redemption[]
    } catch (error) {
      console.error('Failed to get redemption history:', error)
      return []
    }
  }

  // Get points history
  static async getPointsHistory(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REWARD_POINTS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      )

      return response.documents as PointTransaction[]
    } catch (error) {
      console.error('Failed to get points history:', error)
      return []
    }
  }

  // Helper functions
  private static getTierBonus(tierId: string): number {
    switch (tierId) {
      case 'bronze': return 0.05 // 5% bonus
      case 'silver': return 0.10 // 10% bonus
      case 'gold': return 0.15 // 15% bonus
      case 'platinum': return 0.20 // 20% bonus
      default: return 0
    }
  }

  private static calculateTier(lifetimePoints: number): RewardTier {
    for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
      if (lifetimePoints >= REWARD_TIERS[i].pointsRequired) {
        return REWARD_TIERS[i]
      }
    }
    return REWARD_TIERS[0] // Bronze by default
  }

  // Create default rewards (admin function)
  static async createDefaultRewards(): Promise<void> {
    const defaultRewards: Partial<Reward>[] = [
      {
        name: '1-Day Profile Boost',
        description: 'Boost your profile visibility for 24 hours',
        pointsCost: 500,
        type: 'boost',
        value: { type: 'premium', days: 1 },
        availability: 'unlimited'
      },
      {
        name: '7-Day Profile Boost',
        description: 'Boost your profile visibility for 7 days',
        pointsCost: 2500,
        type: 'boost',
        value: { type: 'premium', days: 7 },
        availability: 'unlimited'
      },
      {
        name: 'Verified Badge',
        description: 'Display a special verified badge on your profile',
        pointsCost: 5000,
        type: 'badge',
        value: { badgeId: 'verified_pro' },
        availability: 'unlimited'
      },
      {
        name: '20% Discount on Next Subscription',
        description: 'Get 20% off your next subscription renewal',
        pointsCost: 3000,
        type: 'discount',
        value: { percentage: 20, applicable: 'subscription' },
        availability: 'unlimited'
      },
      {
        name: '1-Week Premium Features',
        description: 'Access all premium features for 1 week',
        pointsCost: 4000,
        type: 'feature',
        value: { features: ['all'], days: 7 },
        availability: 'limited',
        stock: 100
      },
      {
        name: '$50 Cash Reward',
        description: 'Convert points to $50 cash',
        pointsCost: 10000,
        type: 'cash',
        value: { amount: 50 },
        availability: 'limited',
        stock: 50
      }
    ]

    try {
      for (const reward of defaultRewards) {
        await databases.createDocument(
          DATABASE_ID,
          REWARDS_COLLECTION_ID,
          ID.unique(),
          reward
        )
      }
    } catch (error) {
      console.error('Failed to create default rewards:', error)
    }
  }
}

// Export singleton instance
export const rewardsService = RewardsService