import { databases, ID, DATABASE_ID } from '../lib/appwrite'
import { Query } from 'appwrite'
import { paymentService } from './paymentService'
import { 
  AdvertisingPlan, 
  AdvertisingPurchase, 
  CityAdvertisingStats, 
  AdvertisingStats,
  AdvertisingDashboard 
} from '../types/advertising'

const ADVERTISING_COLLECTION = 'advertising'
const CITY_STATS_COLLECTION = 'city_advertising_stats'

const premiumPlans: AdvertisingPlan[] = [
  {
    id: 'premium_3_days',
    type: 'premium',
    name: 'Premium 3 Days',
    duration: 3,
    price: 6,
    description: 'Boost your profile for 3 days with premium placement',
    features: [
      'Higher ranking in search results',
      'Featured in category listings',
      'Priority display in recommendations',
      'Enhanced profile visibility'
    ]
  },
  {
    id: 'premium_7_days',
    type: 'premium',
    name: 'Premium 7 Days',
    duration: 7,
    price: 10,
    description: 'Boost your profile for a full week with premium placement',
    features: [
      'Higher ranking in search results',
      'Featured in category listings',
      'Priority display in recommendations',
      'Enhanced profile visibility',
      'Weekly performance analytics'
    ],
    isPopular: true
  },
  {
    id: 'premium_15_days',
    type: 'premium',
    name: 'Premium 15 Days',
    duration: 15,
    price: 14,
    description: 'Extended premium boost for 15 days',
    features: [
      'Higher ranking in search results',
      'Featured in category listings',
      'Priority display in recommendations',
      'Enhanced profile visibility',
      'Detailed analytics dashboard',
      'Performance insights'
    ]
  },
  {
    id: 'premium_30_days',
    type: 'premium',
    name: 'Premium 30 Days',
    duration: 30,
    price: 22,
    description: 'Full month of premium profile boosting',
    features: [
      'Higher ranking in search results',
      'Featured in category listings',
      'Priority display in recommendations',
      'Enhanced profile visibility',
      'Comprehensive analytics',
      'Monthly performance reports',
      'Priority customer support'
    ]
  },
  {
    id: 'premium_90_days',
    type: 'premium',
    name: 'Premium 90 Days',
    duration: 90,
    price: 60,
    description: 'Quarter-year premium boost with maximum savings',
    features: [
      'Higher ranking in search results',
      'Featured in category listings',
      'Priority display in recommendations',
      'Enhanced profile visibility',
      'Advanced analytics suite',
      'Quarterly business insights',
      'Dedicated account manager',
      'Custom promotional opportunities'
    ]
  }
]

const exclusivePlans: AdvertisingPlan[] = [
  {
    id: 'exclusive_1_day',
    type: 'exclusive',
    name: 'Exclusive 1 Day',
    duration: 1,
    price: 15,
    description: 'Top exclusive placement for 24 hours (Limited to 10 per city)',
    features: [
      'Exclusive top placement',
      'Featured prominently on homepage',
      'Priority in all search results',
      'Highlighted profile badge',
      'Premium customer support'
    ]
  },
  {
    id: 'exclusive_3_days',
    type: 'exclusive',
    name: 'Exclusive 3 Days',
    duration: 3,
    price: 35,
    description: 'Elite exclusive placement for 3 days (Limited to 10 per city)',
    features: [
      'Exclusive top placement',
      'Featured prominently on homepage',
      'Priority in all search results',
      'Highlighted profile badge',
      'Enhanced visibility metrics',
      'Premium customer support'
    ]
  },
  {
    id: 'exclusive_7_days',
    type: 'exclusive',
    name: 'Exclusive 7 Days',
    duration: 7,
    price: 65,
    description: 'Ultimate exclusive placement for a full week (Limited to 10 per city)',
    features: [
      'Exclusive top placement',
      'Featured prominently on homepage',
      'Priority in all search results',
      'Highlighted profile badge',
      'VIP customer treatment',
      'Advanced analytics',
      'Personal account manager',
      'Custom marketing consultation'
    ],
    isPopular: true
  }
]

class AdvertisingService {
  getAllPlans(): AdvertisingPlan[] {
    return [...premiumPlans, ...exclusivePlans]
  }

  getPremiumPlans(): AdvertisingPlan[] {
    return premiumPlans
  }

  getExclusivePlans(): AdvertisingPlan[] {
    return exclusivePlans
  }

  getPlanById(planId: string): AdvertisingPlan | undefined {
    return this.getAllPlans().find(plan => plan.id === planId)
  }

  async checkExclusiveAvailability(city: string, planId: string): Promise<boolean> {
    try {
      const plan = this.getPlanById(planId)
      if (!plan || plan.type !== 'exclusive') {
        return true
      }

      const cityStats = await this.getCityStats(city)
      return cityStats.exclusiveSlots.available > 0
    } catch (error) {
      console.error('Error checking exclusive availability:', error)
      return false
    }
  }

  async getCityStats(city: string): Promise<CityAdvertisingStats> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        CITY_STATS_COLLECTION,
        [Query.equal('city', city)]
      )

      if (response.documents.length === 0) {
        const newStats: CityAdvertisingStats = {
          city,
          exclusiveSlots: {
            total: 10,
            used: 0,
            available: 10
          },
          activeExclusiveAds: []
        }

        await databases.createDocument(
          DATABASE_ID,
          CITY_STATS_COLLECTION,
          ID.unique(),
          newStats
        )

        return newStats
      }

      const doc = response.documents[0]
      return {
        city: doc.city,
        exclusiveSlots: doc.exclusiveSlots,
        activeExclusiveAds: doc.activeExclusiveAds || []
      }
    } catch (error) {
      console.error('Error fetching city stats:', error)
      return {
        city,
        exclusiveSlots: { total: 10, used: 0, available: 10 },
        activeExclusiveAds: []
      }
    }
  }

  async purchaseAdvertising(
    profileId: string,
    planId: string,
    city: string,
    escortId: string,
    processPayment = true
  ): Promise<{ purchase: AdvertisingPurchase, paymentId?: string }> {
    try {
      const plan = this.getPlanById(planId)
      if (!plan) {
        throw new Error('Invalid advertising plan')
      }

      if (plan.type === 'exclusive') {
        const isAvailable = await this.checkExclusiveAvailability(city, planId)
        if (!isAvailable) {
          throw new Error('No exclusive slots available in this city')
        }
      }

      let paymentId: string | undefined

      // Create payment intent if payment processing is enabled
      if (processPayment) {
        paymentId = await paymentService.createAdvertisingPayment(
          profileId,
          escortId,
          planId,
          plan.price,
          `${plan.name} for profile advertising`
        )
      }

      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + plan.duration)

      const purchase: AdvertisingPurchase = {
        id: ID.unique(),
        profileId,
        planId: plan.id,
        planType: plan.type,
        planName: plan.name,
        duration: plan.duration,
        price: plan.price,
        city,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: processPayment ? 'pending' : 'active',
        purchasedAt: new Date().toISOString(),
        paymentId
      }

      const createdPurchase = await databases.createDocument(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        purchase.id,
        purchase
      )

      // Only update exclusive slots if the purchase is active (payment not required or already processed)
      if (plan.type === 'exclusive' && !processPayment) {
        await this.updateCityExclusiveSlots(city, 'add', purchase)
      }

      const purchaseResult: AdvertisingPurchase = {
        id: createdPurchase.$id,
        profileId: createdPurchase.profileId,
        planId: createdPurchase.planId,
        planType: createdPurchase.planType,
        planName: createdPurchase.planName,
        duration: createdPurchase.duration,
        price: createdPurchase.price,
        city: createdPurchase.city,
        startDate: createdPurchase.startDate,
        endDate: createdPurchase.endDate,
        status: createdPurchase.status,
        purchasedAt: createdPurchase.purchasedAt,
        paymentId: createdPurchase.paymentId
      }

      return { purchase: purchaseResult, paymentId }
    } catch (error) {
      console.error('Error purchasing advertising:', error)
      throw error
    }
  }

  async getProfileAdvertising(profileId: string): Promise<AdvertisingPurchase[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        [
          Query.equal('profileId', profileId),
          Query.orderDesc('purchasedAt')
        ]
      )

      return response.documents.map(doc => ({
        id: doc.$id,
        profileId: doc.profileId,
        planId: doc.planId,
        planType: doc.planType,
        planName: doc.planName,
        duration: doc.duration,
        price: doc.price,
        city: doc.city,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status,
        purchasedAt: doc.purchasedAt,
        paymentId: doc.paymentId
      }))
    } catch (error) {
      console.error('Error fetching profile advertising:', error)
      return []
    }
  }

  async getActiveAdvertising(profileId: string): Promise<AdvertisingPurchase[]> {
    try {
      const now = new Date().toISOString()
      const response = await databases.listDocuments(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        [
          Query.equal('profileId', profileId),
          Query.equal('status', 'active'),
          Query.greaterThan('endDate', now)
        ]
      )

      return response.documents.map(doc => ({
        id: doc.$id,
        profileId: doc.profileId,
        planId: doc.planId,
        planType: doc.planType,
        planName: doc.planName,
        duration: doc.duration,
        price: doc.price,
        city: doc.city,
        startDate: doc.startDate,
        endDate: doc.endDate,
        status: doc.status,
        purchasedAt: doc.purchasedAt,
        paymentId: doc.paymentId
      }))
    } catch (error) {
      console.error('Error fetching active advertising:', error)
      return []
    }
  }

  async expireAdvertising(): Promise<void> {
    try {
      const now = new Date().toISOString()
      const response = await databases.listDocuments(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        [
          Query.equal('status', 'active'),
          Query.lessThan('endDate', now)
        ]
      )

      for (const doc of response.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          ADVERTISING_COLLECTION,
          doc.$id,
          { status: 'expired' }
        )

        if (doc.planType === 'exclusive') {
          await this.updateCityExclusiveSlots(doc.city, 'remove', {
            id: doc.$id,
            profileId: doc.profileId,
            planId: doc.planId,
            planType: doc.planType,
            planName: doc.planName,
            duration: doc.duration,
            price: doc.price,
            city: doc.city,
            startDate: doc.startDate,
            endDate: doc.endDate,
            status: doc.status,
            purchasedAt: doc.purchasedAt,
            paymentId: doc.paymentId
          })
        }
      }
    } catch (error) {
      console.error('Error expiring advertising:', error)
    }
  }

  private async updateCityExclusiveSlots(
    city: string, 
    action: 'add' | 'remove', 
    purchase: AdvertisingPurchase
  ): Promise<void> {
    try {
      const cityStats = await this.getCityStats(city)
      
      if (action === 'add') {
        cityStats.exclusiveSlots.used += 1
        cityStats.exclusiveSlots.available -= 1
        cityStats.activeExclusiveAds.push(purchase)
      } else {
        cityStats.exclusiveSlots.used -= 1
        cityStats.exclusiveSlots.available += 1
        cityStats.activeExclusiveAds = cityStats.activeExclusiveAds.filter(
          ad => ad.id !== purchase.id
        )
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        CITY_STATS_COLLECTION,
        [Query.equal('city', city)]
      )

      if (response.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          CITY_STATS_COLLECTION,
          response.documents[0].$id,
          cityStats
        )
      }
    } catch (error) {
      console.error('Error updating city exclusive slots:', error)
    }
  }

  async getAdvertisingStats(profileId: string): Promise<AdvertisingStats> {
    try {
      const purchases = await this.getProfileAdvertising(profileId)
      const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.price, 0)
      const activeCampaigns = purchases.filter(p => p.status === 'active').length

      return {
        profileId,
        totalSpent,
        activeCampaigns,
        totalImpressions: Math.floor(Math.random() * 10000) + 1000,
        clickThroughRate: Math.random() * 5 + 1,
        conversions: Math.floor(Math.random() * 50) + 5,
        averageDailyViews: Math.floor(Math.random() * 200) + 50,
        historicalData: this.generateMockHistoricalData()
      }
    } catch (error) {
      console.error('Error fetching advertising stats:', error)
      return {
        profileId,
        totalSpent: 0,
        activeCampaigns: 0,
        totalImpressions: 0,
        clickThroughRate: 0,
        conversions: 0,
        averageDailyViews: 0,
        historicalData: []
      }
    }
  }

  private generateMockHistoricalData() {
    const data = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 300) + 50,
        clicks: Math.floor(Math.random() * 50) + 5,
        bookings: Math.floor(Math.random() * 5)
      })
    }
    
    return data
  }

  async getAdvertisingDashboard(profileId: string): Promise<AdvertisingDashboard> {
    try {
      const [stats, activeCampaigns, availablePlans] = await Promise.all([
        this.getAdvertisingStats(profileId),
        this.getActiveAdvertising(profileId),
        Promise.resolve(this.getAllPlans())
      ])

      const cityStats = await Promise.all(
        [...new Set(activeCampaigns.map(c => c.city))].map(city => 
          this.getCityStats(city)
        )
      )

      return {
        stats,
        activeCampaigns,
        availablePlans,
        cityStats
      }
    } catch (error) {
      console.error('Error fetching advertising dashboard:', error)
      throw error
    }
  }

  async cancelAdvertising(purchaseId: string): Promise<boolean> {
    try {
      const purchase = await databases.getDocument(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        purchaseId
      )

      await databases.updateDocument(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        purchaseId,
        { status: 'cancelled' }
      )

      if (purchase.planType === 'exclusive') {
        await this.updateCityExclusiveSlots(purchase.city, 'remove', {
          id: purchase.$id,
          profileId: purchase.profileId,
          planId: purchase.planId,
          planType: purchase.planType,
          planName: purchase.planName,
          duration: purchase.duration,
          price: purchase.price,
          city: purchase.city,
          startDate: purchase.startDate,
          endDate: purchase.endDate,
          status: purchase.status,
          purchasedAt: purchase.purchasedAt,
          paymentId: purchase.paymentId
        })
      }

      return true
    } catch (error) {
      console.error('Error cancelling advertising:', error)
      return false
    }
  }

  async activateAdvertising(purchaseId: string): Promise<boolean> {
    try {
      const purchase = await databases.getDocument(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        purchaseId
      )

      if (purchase.status !== 'pending') {
        return false
      }

      await databases.updateDocument(
        DATABASE_ID,
        ADVERTISING_COLLECTION,
        purchaseId,
        { status: 'active' }
      )

      // Update exclusive slots if this is an exclusive ad
      if (purchase.planType === 'exclusive') {
        await this.updateCityExclusiveSlots(purchase.city, 'add', {
          id: purchase.$id,
          profileId: purchase.profileId,
          planId: purchase.planId,
          planType: purchase.planType,
          planName: purchase.planName,
          duration: purchase.duration,
          price: purchase.price,
          city: purchase.city,
          startDate: purchase.startDate,
          endDate: purchase.endDate,
          status: 'active',
          purchasedAt: purchase.purchasedAt,
          paymentId: purchase.paymentId
        })
      }

      return true
    } catch (error) {
      console.error('Error activating advertising:', error)
      return false
    }
  }

  async getAdvertisingTransactions(profileId: string) {
    try {
      return await paymentService.getAdvertisingTransactions(profileId)
    } catch (error) {
      console.error('Error fetching advertising transactions:', error)
      return []
    }
  }
}

export const advertisingService = new AdvertisingService()