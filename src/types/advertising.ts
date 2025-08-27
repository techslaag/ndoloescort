export interface AdvertisingPlan {
  id: string
  type: 'premium' | 'exclusive'
  name: string
  duration: number // days
  price: number
  description: string
  features: string[]
  isPopular?: boolean
}

export interface AdvertisingPurchase {
  id: string
  profileId: string
  planId: string
  planType: 'premium' | 'exclusive'
  planName: string
  duration: number
  price: number
  city: string
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'pending'
  purchasedAt: string
  paymentId?: string
}

export interface CityAdvertisingStats {
  city: string
  exclusiveSlots: {
    total: number
    used: number
    available: number
  }
  activeExclusiveAds: AdvertisingPurchase[]
}

export interface AdvertisingStats {
  profileId: string
  totalSpent: number
  activeCampaigns: number
  totalImpressions: number
  clickThroughRate: number
  conversions: number
  averageDailyViews: number
  historicalData: {
    date: string
    views: number
    clicks: number
    bookings: number
  }[]
}

export interface AdvertisingDashboard {
  stats: AdvertisingStats
  activeCampaigns: AdvertisingPurchase[]
  availablePlans: AdvertisingPlan[]
  cityStats: CityAdvertisingStats[]
}