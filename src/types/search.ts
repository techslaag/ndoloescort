export interface SearchFilters {
  // Basic filters
  query?: string
  location?: {
    city?: string
    state?: string
    country?: string
    radius?: number // km
  }
  
  // Profile attributes
  ageRange?: {
    min: number
    max: number
  }
  gender?: 'male' | 'female' | 'other' | 'all'
  ethnicity?: string[]
  bodyType?: string[]
  height?: {
    min: number // cm
    max: number
  }
  
  // Services and pricing
  services?: string[]
  priceRange?: {
    min: number
    max: number
    type: 'hourly' | 'daily' | 'any'
  }
  
  // Availability
  availability?: {
    date?: string
    time?: string
    duration?: number // hours
    incall?: boolean
    outcall?: boolean
  }
  
  // Verification and quality
  verifiedOnly?: boolean
  withReviews?: boolean
  minRating?: number
  badges?: string[]
  
  // Sorting
  sortBy?: 'relevance' | 'rating' | 'price_low' | 'price_high' | 'newest' | 'nearest'
  
  // Pagination
  page?: number
  limit?: number
}

export interface SearchResult {
  profiles: any[]
  total: number
  facets: SearchFacets
  suggestions?: string[]
}

export interface SearchFacets {
  locations: Array<{ value: string; count: number }>
  services: Array<{ value: string; count: number }>
  priceRanges: Array<{ min: number; max: number; count: number }>
  ratings: Array<{ rating: number; count: number }>
}

export interface SavedSearch {
  id: string
  userId: string
  name: string
  filters: SearchFilters
  notifications: boolean
  createdAt: string
  lastUsed?: string
}

export interface SearchHistory {
  id: string
  userId: string
  query: string
  filters: SearchFilters
  timestamp: string
}