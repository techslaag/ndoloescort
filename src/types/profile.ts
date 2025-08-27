export interface Service {
  id: string
  name: string
  description: string
  category: 'companionship' | 'event' | 'travel' | 'intimate' | 'other'
  duration?: {
    min: number
    max: number
    unit: 'hours' | 'days'
  }
}

export interface PricingOption {
  id: string
  type: 'hourly' | 'daily' | 'event' | 'custom'
  amount: number
  currency: string
  description?: string
  minimumDuration?: number
  maximumDuration?: number
}

export interface CalendarEvent {
  id: string
  profileId: string
  date: string
  startTime: string
  endTime: string
  type: 'available' | 'booked' | 'blocked'
  bookingId?: string
  notes?: string
}

export interface MediaFile {
  id: string
  url: string
  thumbnailUrl?: string
  type: 'photo' | 'video'
  isBlurred: boolean
  originalUrl?: string
  caption?: string
  order: number
  uploadedAt: string
}

// Legacy nested structure (kept for backward compatibility)
export interface EscortProfile {
  id: string
  userId: string
  name: string
  age: number
  location: {
    city: string
    state?: string
    country: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  description: string
  bio?: string
  services: Service[]
  pricing: PricingOption[]
  media: MediaFile[]
  availability: {
    schedule: CalendarEvent[]
    workingHours: {
      [day: string]: {
        enabled: boolean
        start?: string
        end?: string
      }
    }
    advanceBookingDays: number
  }
  stats: {
    views: number
    bookings: number
    rating: number
    reviewCount: number
  }
  preferences: {
    autoApproveBookings: boolean
    requireDeposit: boolean
    depositPercentage?: number
    cancellationPolicy: string
    minimumNotice: number // hours
  }
  verification: {
    isVerified: boolean
    idVerified: boolean
    photoVerified: boolean
    verifiedAt?: string
  }
  status: 'draft' | 'active' | 'paused' | 'inactive'
  createdAt: string
  updatedAt: string
}

// Flattened structure matching database schema
export interface FlatEscortProfile {
  id: string
  userId: string
  name: string
  age: number
  locationCity: string
  locationState?: string
  locationCountry: string
  locationCoordinatesLat?: number
  locationCoordinatesLng?: number
  description: string
  bio?: string
  statsViews: number
  statsBookings: number
  statsRating: number
  statsReviewCount: number
  workingHours: string // JSON string
  availabilityAdvanceBookingDays: number
  preferencesAutoApproveBookings: boolean
  preferencesRequireDeposit: boolean
  preferencesDepositPercentage?: number
  preferencesCancellationPolicy: string
  preferencesMinimumNotice: number
  verificationIsVerified: boolean
  verificationIdVerified: boolean
  verificationPhotoVerified: boolean
  verificationVerifiedAt?: string
  status: 'draft' | 'active' | 'paused' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface ProfileFormData {
  name: string
  age: string
  location: {
    city: string
    state?: string
    country: string
  }
  description: string
  bio?: string
  services: Array<{
    name: string
    description: string
    category: string
  }>
  pricing: Array<{
    type: string
    amount: string
    description?: string
  }>
  workingHours: {
    [day: string]: {
      enabled: boolean
      start: string
      end: string
    }
  }
  preferences: {
    autoApproveBookings: boolean
    requireDeposit: boolean
    depositPercentage?: string
    cancellationPolicy: string
    minimumNotice: string
  }
}