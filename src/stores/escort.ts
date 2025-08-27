import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  fetchAllEscorts, 
  fetchFeaturedEscorts, 
  fetchEscortById, 
  searchEscorts, 
  filterEscortsByLocation, 
  filterEscortsByService 
} from '../services/escortService'
import type { EscortProfile } from '../types/profile'

// Legacy Escort interface for backward compatibility
interface Escort {
  id: number
  name: string
  age: number
  location: string
  rating: number
  rate: string
  profileImage: string
  gallery: string[]
  description: string
  services: string[]
  languages: string[]
  availability: string[]
  height: string
  measurements: string
  hairColor: string
  eyeColor: string
  nationality: string
}

// Search and filter interfaces
interface SearchFilters {
  location?: string
  service?: string
  minAge?: number
  maxAge?: number
  minRate?: number
  maxRate?: number
  languages?: string[]
  availability?: string
}

interface SortOptions {
  field: 'name' | 'age' | 'rating' | 'rate'
  direction: 'asc' | 'desc'
}

export const useEscortStore = defineStore('escort', () => {
  // State
  const escorts = ref<Escort[]>([])
  const featuredEscorts = ref<Escort[]>([])
  const currentEscort = ref<Escort | null>(null)
  const searchResults = ref<Escort[]>([])
  const isLoading = ref(false)
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const searchFilters = ref<SearchFilters>({})
  const sortOptions = ref<SortOptions>({ field: 'name', direction: 'asc' })
  const favoriteEscorts = ref<number[]>([])
  const recentlyViewed = ref<number[]>([])

  // Computed
  const sortedEscorts = computed(() => {
    const { field, direction } = sortOptions.value
    const escortList = searchResults.value.length > 0 ? searchResults.value : escorts.value
    
    return [...escortList].sort((a, b) => {
      let aValue: any = a[field]
      let bValue: any = b[field]
      
      // Handle rate comparison (convert "$400/hr" to 400)
      if (field === 'rate') {
        aValue = parseInt(a.rate.replace(/[^0-9]/g, ''))
        bValue = parseInt(b.rate.replace(/[^0-9]/g, ''))
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  })

  const filteredEscorts = computed(() => {
    let filtered = sortedEscorts.value
    const filters = searchFilters.value

    if (filters.location) {
      filtered = filtered.filter(e => 
        e.location.toLowerCase().includes(filters.location!.toLowerCase())
      )
    }

    if (filters.service) {
      filtered = filtered.filter(e => 
        e.services.some(s => s.toLowerCase().includes(filters.service!.toLowerCase()))
      )
    }

    if (filters.minAge !== undefined) {
      filtered = filtered.filter(e => e.age >= filters.minAge!)
    }

    if (filters.maxAge !== undefined) {
      filtered = filtered.filter(e => e.age <= filters.maxAge!)
    }

    if (filters.minRate !== undefined) {
      filtered = filtered.filter(e => {
        const rate = parseInt(e.rate.replace(/[^0-9]/g, ''))
        return rate >= filters.minRate!
      })
    }

    if (filters.maxRate !== undefined) {
      filtered = filtered.filter(e => {
        const rate = parseInt(e.rate.replace(/[^0-9]/g, ''))
        return rate <= filters.maxRate!
      })
    }

    if (filters.languages && filters.languages.length > 0) {
      filtered = filtered.filter(e => 
        filters.languages!.some(lang => 
          e.languages.some(eLang => eLang.toLowerCase().includes(lang.toLowerCase()))
        )
      )
    }

    return filtered
  })

  const escortStats = computed(() => ({
    total: escorts.value.length,
    featured: featuredEscorts.value.length,
    averageRating: escorts.value.reduce((sum, e) => sum + e.rating, 0) / escorts.value.length || 0,
    locations: [...new Set(escorts.value.map(e => e.location))],
    services: [...new Set(escorts.value.flatMap(e => e.services))],
    languages: [...new Set(escorts.value.flatMap(e => e.languages))]
  }))

  const favoriteEscortDetails = computed(() => 
    escorts.value.filter(e => favoriteEscorts.value.includes(e.id))
  )

  const recentlyViewedDetails = computed(() => 
    recentlyViewed.value
      .map(id => escorts.value.find(e => e.id === id))
      .filter(Boolean) as Escort[]
  )

  // Actions
  const setError = (message: string | null) => {
    error.value = message
  }

  const clearError = () => {
    error.value = null
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setSearching = (searching: boolean) => {
    isSearching.value = searching
  }

  // Fetch operations
  const fetchAllEscortsData = async () => {
    try {
      setLoading(true)
      clearError()
      escorts.value = await fetchAllEscorts()
    } catch (err: any) {
      setError(err.message || 'Failed to fetch escorts')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedEscortsData = async () => {
    try {
      clearError()
      featuredEscorts.value = await fetchFeaturedEscorts()
    } catch (err: any) {
      setError(err.message || 'Failed to fetch featured escorts')
      throw err
    }
  }

  const fetchEscortDetails = async (id: number) => {
    try {
      setLoading(true)
      clearError()
      const escort = await fetchEscortById(id)
      if (escort) {
        currentEscort.value = escort
        addToRecentlyViewed(id)
      } else {
        setError('Escort not found')
      }
      return escort
    } catch (err: any) {
      setError(err.message || 'Failed to fetch escort details')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Search operations
  const performSearch = async (query: string) => {
    try {
      setSearching(true)
      clearError()
      searchQuery.value = query
      
      if (query.trim() === '') {
        searchResults.value = []
        return
      }
      
      searchResults.value = await searchEscorts(query)
    } catch (err: any) {
      setError(err.message || 'Search failed')
      throw err
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = []
  }

  // Filter operations
  const applyFilters = (filters: SearchFilters) => {
    searchFilters.value = { ...filters }
  }

  const clearFilters = () => {
    searchFilters.value = {}
  }

  const filterByLocation = async (location: string) => {
    try {
      setSearching(true)
      clearError()
      searchResults.value = await filterEscortsByLocation(location)
      searchFilters.value.location = location
    } catch (err: any) {
      setError(err.message || 'Filter by location failed')
      throw err
    } finally {
      setSearching(false)
    }
  }

  const filterByService = async (service: string) => {
    try {
      setSearching(true)
      clearError()
      searchResults.value = await filterEscortsByService(service)
      searchFilters.value.service = service
    } catch (err: any) {
      setError(err.message || 'Filter by service failed')
      throw err
    } finally {
      setSearching(false)
    }
  }

  // Sort operations
  const setSortOptions = (options: SortOptions) => {
    sortOptions.value = { ...options }
  }

  // Favorites management
  const addToFavorites = (escortId: number) => {
    if (!favoriteEscorts.value.includes(escortId)) {
      favoriteEscorts.value.push(escortId)
    }
  }

  const removeFromFavorites = (escortId: number) => {
    const index = favoriteEscorts.value.indexOf(escortId)
    if (index > -1) {
      favoriteEscorts.value.splice(index, 1)
    }
  }

  const toggleFavorite = (escortId: number) => {
    if (favoriteEscorts.value.includes(escortId)) {
      removeFromFavorites(escortId)
    } else {
      addToFavorites(escortId)
    }
  }

  const isFavorite = (escortId: number) => {
    return favoriteEscorts.value.includes(escortId)
  }

  // Recently viewed management
  const addToRecentlyViewed = (escortId: number) => {
    // Remove if already exists
    const index = recentlyViewed.value.indexOf(escortId)
    if (index > -1) {
      recentlyViewed.value.splice(index, 1)
    }
    
    // Add to beginning
    recentlyViewed.value.unshift(escortId)
    
    // Keep only last 10
    if (recentlyViewed.value.length > 10) {
      recentlyViewed.value = recentlyViewed.value.slice(0, 10)
    }
  }

  const clearRecentlyViewed = () => {
    recentlyViewed.value = []
  }

  // Recommendations
  const getRecommendations = (baseEscortId?: number, limit: number = 5) => {
    let baseEscort: Escort | undefined
    
    if (baseEscortId) {
      baseEscort = escorts.value.find(e => e.id === baseEscortId)
    } else if (recentlyViewed.value.length > 0) {
      baseEscort = escorts.value.find(e => e.id === recentlyViewed.value[0])
    }
    
    if (!baseEscort) {
      // Return random escorts if no base
      return escorts.value.slice(0, limit)
    }
    
    // Simple recommendation algorithm based on location and services
    const recommendations = escorts.value
      .filter(e => e.id !== baseEscort!.id)
      .map(escort => {
        let score = 0
        
        // Same location bonus
        if (escort.location === baseEscort!.location) {
          score += 3
        }
        
        // Shared services bonus
        const sharedServices = escort.services.filter(s => 
          baseEscort!.services.includes(s)
        ).length
        score += sharedServices * 2
        
        // Similar age bonus
        const ageDiff = Math.abs(escort.age - baseEscort!.age)
        if (ageDiff <= 5) score += 2
        else if (ageDiff <= 10) score += 1
        
        // High rating bonus
        if (escort.rating >= 4.5) score += 1
        
        return { escort, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.escort)
    
    return recommendations
  }

  // Integration with new profile system
  const convertToProfile = (escort: Escort): Partial<EscortProfile> => {
    const hourlyRate = parseInt(escort.rate.replace(/[^0-9]/g, ''))
    
    return {
      name: escort.name,
      age: escort.age,
      location: {
        city: escort.location,
        country: 'USA' // Default for legacy data
      },
      description: escort.description,
      services: escort.services.map(service => ({
        id: `service-${Date.now()}-${Math.random()}`,
        name: service,
        description: `Professional ${service.toLowerCase()} service`,
        category: 'companionship' as const
      })),
      pricing: [
        {
          id: `pricing-${Date.now()}`,
          type: 'hourly' as const,
          amount: hourlyRate,
          currency: 'USD',
          description: 'Standard hourly rate'
        }
      ],
      media: escort.gallery.map((url, index) => ({
        id: `media-${Date.now()}-${index}`,
        url,
        type: 'photo' as const,
        isBlurred: false,
        order: index,
        uploadedAt: new Date().toISOString()
      })),
      stats: {
        views: Math.floor(Math.random() * 1000),
        bookings: Math.floor(Math.random() * 50),
        rating: escort.rating,
        reviewCount: Math.floor(Math.random() * 100)
      },
      status: 'active' as const
    }
  }

  // Analytics
  const getPopularLocations = (limit: number = 5) => {
    const locationCounts = escorts.value.reduce((acc, escort) => {
      acc[escort.location] = (acc[escort.location] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([location, count]) => ({ location, count }))
  }

  const getPopularServices = (limit: number = 10) => {
    const serviceCounts = escorts.value.reduce((acc, escort) => {
      escort.services.forEach(service => {
        acc[service] = (acc[service] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([service, count]) => ({ service, count }))
  }

  // Initialize data
  const initialize = async () => {
    try {
      await Promise.all([
        fetchAllEscortsData(),
        fetchFeaturedEscortsData()
      ])
    } catch (err) {
      console.error('Failed to initialize escort store:', err)
    }
  }

  // Reset store
  const reset = () => {
    escorts.value = []
    featuredEscorts.value = []
    currentEscort.value = null
    searchResults.value = []
    isLoading.value = false
    isSearching.value = false
    error.value = null
    searchQuery.value = ''
    searchFilters.value = {}
    sortOptions.value = { field: 'name', direction: 'asc' }
  }

  return {
    // State
    escorts,
    featuredEscorts,
    currentEscort,
    searchResults,
    isLoading,
    isSearching,
    error,
    searchQuery,
    searchFilters,
    sortOptions,
    favoriteEscorts,
    recentlyViewed,
    
    // Computed
    sortedEscorts,
    filteredEscorts,
    escortStats,
    favoriteEscortDetails,
    recentlyViewedDetails,
    
    // Actions
    setError,
    clearError,
    setLoading,
    setSearching,
    fetchAllEscortsData,
    fetchFeaturedEscortsData,
    fetchEscortDetails,
    performSearch,
    clearSearch,
    applyFilters,
    clearFilters,
    filterByLocation,
    filterByService,
    setSortOptions,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    addToRecentlyViewed,
    clearRecentlyViewed,
    getRecommendations,
    convertToProfile,
    getPopularLocations,
    getPopularServices,
    initialize,
    reset
  }
}, {
  persist: {
    key: 'escort-store',
    paths: ['favoriteEscorts', 'recentlyViewed', 'searchFilters', 'sortOptions']
  }
})