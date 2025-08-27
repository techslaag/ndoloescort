import { databases, DATABASE_ID, ID, Query, REVENUE_COLLECTION_ID, PAYOUTS_COLLECTION_ID } from '../lib/appwrite'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import { featureAccessService } from './featureAccessService'

export interface CallRevenue {
  $id?: string
  escortId: string
  callId: string
  callType: 'voice' | 'video'
  duration: number // in seconds
  ratePerMinute: number
  totalAmount: number
  escortAmount: number
  platformAmount: number
  escortPercentage: number
  platformPercentage: number
  status: 'pending' | 'confirmed' | 'paid'
  $createdAt?: string
}

export interface GiftRevenue {
  $id?: string
  escortId: string
  giftId: string
  giftName: string
  giftPrice: number
  escortAmount: number
  platformAmount: number
  escortPercentage: number
  platformPercentage: number
  status: 'pending' | 'confirmed' | 'paid'
  $createdAt?: string
}

export interface PayoutRequest {
  $id?: string
  escortId: string
  amount: number
  method: 'bank_transfer' | 'paypal' | 'crypto'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processedAt?: string
  failureReason?: string
  $createdAt?: string
  $updatedAt?: string
}

export interface RevenueStats {
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  callEarnings: number
  giftEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  averageCallDuration: number
  totalCalls: number
  totalGifts: number
}

export class RevenueService {
  // Record call revenue
  static async recordCallRevenue(
    callId: string,
    escortId: string,
    duration: number,
    ratePerMinute: number,
    callType: 'voice' | 'video'
  ): Promise<CallRevenue | null> {
    try {
      // Check if escort can earn call revenue
      const canEarn = await featureAccessService.canEarnCallRevenue()
      if (!canEarn.canAccessFeature) {
        console.error('Call revenue not available:', canEarn.reason)
        return null
      }

      // Calculate revenue split
      const totalMinutes = Math.ceil(duration / 60)
      const totalAmount = totalMinutes * ratePerMinute
      const revenueSplit = featureAccessService.calculateCallRevenueSplit(totalAmount)

      const revenueData: Partial<CallRevenue> = {
        escortId,
        callId,
        callType,
        duration,
        ratePerMinute,
        totalAmount,
        escortAmount: revenueSplit.escortAmount,
        platformAmount: revenueSplit.platformAmount,
        escortPercentage: revenueSplit.escortPercentage,
        platformPercentage: revenueSplit.platformPercentage,
        status: 'pending'
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        REVENUE_COLLECTION_ID,
        ID.unique(),
        revenueData
      )

      return response as CallRevenue
    } catch (error) {
      console.error('Failed to record call revenue:', error)
      return null
    }
  }

  // Record gift revenue
  static async recordGiftRevenue(
    giftId: string,
    giftName: string,
    giftPrice: number,
    escortId: string
  ): Promise<GiftRevenue | null> {
    try {
      // Check if escort can receive gifts
      const canReceive = await featureAccessService.canReceiveGifts()
      if (!canReceive.canAccessFeature) {
        console.error('Gift receiving not available:', canReceive.reason)
        return null
      }

      // Calculate revenue split (default 80/20 for gifts)
      const escortPercentage = 80
      const platformPercentage = 20
      const escortAmount = (giftPrice * escortPercentage) / 100
      const platformAmount = (giftPrice * platformPercentage) / 100

      const revenueData: Partial<GiftRevenue> = {
        escortId,
        giftId,
        giftName,
        giftPrice,
        escortAmount,
        platformAmount,
        escortPercentage,
        platformPercentage,
        status: 'pending'
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        REVENUE_COLLECTION_ID,
        ID.unique(),
        revenueData
      )

      return response as GiftRevenue
    } catch (error) {
      console.error('Failed to record gift revenue:', error)
      return null
    }
  }

  // Get revenue stats for an escort
  static async getRevenueStats(escortId: string): Promise<RevenueStats> {
    try {
      // Get all revenue records
      const response = await databases.listDocuments(
        DATABASE_ID,
        REVENUE_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.orderDesc('$createdAt'),
          Query.limit(1000)
        ]
      )

      const records = response.documents

      // Calculate stats
      let totalEarnings = 0
      let pendingEarnings = 0
      let paidEarnings = 0
      let callEarnings = 0
      let giftEarnings = 0
      let thisMonthEarnings = 0
      let lastMonthEarnings = 0
      let totalCallDuration = 0
      let totalCalls = 0
      let totalGifts = 0

      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

      records.forEach((record: any) => {
        const amount = record.escortAmount || 0
        totalEarnings += amount

        if (record.status === 'pending') {
          pendingEarnings += amount
        } else if (record.status === 'paid') {
          paidEarnings += amount
        }

        const createdDate = new Date(record.$createdAt)
        const recordMonth = createdDate.getMonth()
        const recordYear = createdDate.getFullYear()

        if (recordMonth === thisMonth && recordYear === thisYear) {
          thisMonthEarnings += amount
        } else if (recordMonth === lastMonth && recordYear === lastMonthYear) {
          lastMonthEarnings += amount
        }

        if (record.callId) {
          // It's a call revenue
          callEarnings += amount
          totalCallDuration += record.duration || 0
          totalCalls++
        } else if (record.giftId) {
          // It's a gift revenue
          giftEarnings += amount
          totalGifts++
        }
      })

      const averageCallDuration = totalCalls > 0 ? Math.round(totalCallDuration / totalCalls) : 0

      return {
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        callEarnings,
        giftEarnings,
        thisMonthEarnings,
        lastMonthEarnings,
        averageCallDuration,
        totalCalls,
        totalGifts
      }
    } catch (error) {
      console.error('Failed to get revenue stats:', error)
      return {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        callEarnings: 0,
        giftEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        averageCallDuration: 0,
        totalCalls: 0,
        totalGifts: 0
      }
    }
  }

  // Get revenue history
  static async getRevenueHistory(
    escortId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<CallRevenue | GiftRevenue>> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REVENUE_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset)
        ]
      )

      return response.documents as Array<CallRevenue | GiftRevenue>
    } catch (error) {
      console.error('Failed to get revenue history:', error)
      return []
    }
  }

  // Request payout
  static async requestPayout(
    amount: number,
    method: PayoutRequest['method']
  ): Promise<PayoutRequest | null> {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Check minimum payout amount (e.g., $50)
      const MIN_PAYOUT = 50
      if (amount < MIN_PAYOUT) {
        throw new Error(`Minimum payout amount is $${MIN_PAYOUT}`)
      }

      // Check available balance
      const stats = await this.getRevenueStats(authStore.user.$id)
      if (stats.pendingEarnings < amount) {
        throw new Error('Insufficient balance for payout')
      }

      const payoutData: Partial<PayoutRequest> = {
        escortId: authStore.user.$id,
        amount,
        method,
        status: 'pending'
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        PAYOUTS_COLLECTION_ID,
        ID.unique(),
        payoutData
      )

      return response as PayoutRequest
    } catch (error: any) {
      console.error('Failed to request payout:', error)
      throw error
    }
  }

  // Get payout history
  static async getPayoutHistory(escortId: string): Promise<PayoutRequest[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PAYOUTS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      )

      return response.documents as PayoutRequest[]
    } catch (error) {
      console.error('Failed to get payout history:', error)
      return []
    }
  }

  // Mark revenue as paid (admin function)
  static async markRevenueAsPaid(revenueIds: string[]): Promise<boolean> {
    try {
      await Promise.all(
        revenueIds.map(id =>
          databases.updateDocument(
            DATABASE_ID,
            REVENUE_COLLECTION_ID,
            id,
            { status: 'paid' }
          )
        )
      )
      return true
    } catch (error) {
      console.error('Failed to mark revenue as paid:', error)
      return false
    }
  }

  // Get platform revenue stats (admin function)
  static async getPlatformRevenueStats(): Promise<{
    totalRevenue: number
    thisMonthRevenue: number
    totalCalls: number
    totalGifts: number
  }> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REVENUE_COLLECTION_ID,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(10000)
        ]
      )

      let totalRevenue = 0
      let thisMonthRevenue = 0
      let totalCalls = 0
      let totalGifts = 0

      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      response.documents.forEach((record: any) => {
        const platformAmount = record.platformAmount || 0
        totalRevenue += platformAmount

        const createdDate = new Date(record.$createdAt)
        if (createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear) {
          thisMonthRevenue += platformAmount
        }

        if (record.callId) {
          totalCalls++
        } else if (record.giftId) {
          totalGifts++
        }
      })

      return {
        totalRevenue,
        thisMonthRevenue,
        totalCalls,
        totalGifts
      }
    } catch (error) {
      console.error('Failed to get platform revenue stats:', error)
      return {
        totalRevenue: 0,
        thisMonthRevenue: 0,
        totalCalls: 0,
        totalGifts: 0
      }
    }
  }
}

// Export singleton instance
export const revenueService = RevenueService