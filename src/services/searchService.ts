import { databases, DATABASE_ID, PROFILES_COLLECTION_ID, SAVED_SEARCHES_COLLECTION_ID, SEARCH_HISTORY_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import type { SearchFilters, SearchResult, SavedSearch, SearchHistory, SearchFacets } from '../types/search'

export class SearchService {
  // Perform advanced search
  async searchProfiles(filters: SearchFilters): Promise<SearchResult> {
    try {
      const queries: any[] = [
        Query.equal('status', 'active'),
        Query.limit(filters.limit || 20),
        Query.offset(((filters.page || 1) - 1) * (filters.limit || 20))
      ]

      // Text search
      if (filters.query) {
        // In a real implementation, you'd use a full-text search service
        // For now, we'll search in name and description
        queries.push(Query.search('name', filters.query))
      }

      // Location filters
      if (filters.location) {
        if (filters.location.city) {
          queries.push(Query.equal('locationCity', filters.location.city))
        }
        if (filters.location.state) {
          queries.push(Query.equal('locationState', filters.location.state))
        }
        if (filters.location.country) {
          queries.push(Query.equal('locationCountry', filters.location.country))
        }
        // Radius search would require geospatial queries
      }

      // Age range
      if (filters.ageRange) {
        if (filters.ageRange.min) {
          queries.push(Query.greaterThanEqual('age', filters.ageRange.min))
        }
        if (filters.ageRange.max) {
          queries.push(Query.lessThanEqual('age', filters.ageRange.max))
        }
      }

      // Verification filter
      if (filters.verifiedOnly) {
        queries.push(Query.equal('verificationIsVerified', true))
      }

      // Rating filter
      if (filters.minRating) {
        queries.push(Query.greaterThanEqual('statsRating', filters.minRating))
      }

      // Reviews filter
      if (filters.withReviews) {
        queries.push(Query.greaterThan('statsReviewCount', 0))
      }

      // Sorting
      switch (filters.sortBy) {
        case 'rating':
          queries.push(Query.orderDesc('statsRating'))
          break
        case 'newest':
          queries.push(Query.orderDesc('createdAt'))
          break
        case 'price_low':
          // Price sorting would need a computed field
          break
        case 'price_high':
          // Price sorting would need a computed field
          break
        default:
          // Relevance sorting would use a scoring algorithm
          queries.push(Query.orderDesc('statsViews'))
      }

      // Execute search
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        queries
      )

      // Post-process results for additional filters
      let profiles = response.documents
      
      // Filter by services (would be better with a junction table)
      if (filters.services && filters.services.length > 0) {
        profiles = profiles.filter(profile => {
          // This assumes services are stored as JSON
          try {
            const services = JSON.parse(profile.services || '[]')
            return filters.services!.some(service => 
              services.some((s: any) => s.category === service)
            )
          } catch {
            return false
          }
        })
      }

      // Calculate facets
      const facets = this.calculateFacets(response.documents)

      // Get search suggestions
      const suggestions = await this.getSearchSuggestions(filters.query || '')

      // Save to search history
      if (filters.query) {
        await this.saveSearchHistory(filters)
      }

      return {
        profiles,
        total: response.total,
        facets,
        suggestions
      }
    } catch (error) {
      console.error('Search error:', error)
      return {
        profiles: [],
        total: 0,
        facets: {
          locations: [],
          services: [],
          priceRanges: [],
          ratings: []
        }
      }
    }
  }

  // Calculate search facets for filtering
  private calculateFacets(profiles: any[]): SearchFacets {
    const locationCounts = new Map<string, number>()
    const serviceCounts = new Map<string, number>()
    const ratingCounts = new Map<number, number>()

    profiles.forEach(profile => {
      // Count locations
      const location = profile.locationCity
      if (location) {
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
      }

      // Count services
      try {
        const services = JSON.parse(profile.services || '[]')
        services.forEach((service: any) => {
          serviceCounts.set(service.category, (serviceCounts.get(service.category) || 0) + 1)
        })
      } catch {}

      // Count ratings
      const rating = Math.floor(profile.statsRating || 0)
      if (rating > 0) {
        ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1)
      }
    })

    return {
      locations: Array.from(locationCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      services: Array.from(serviceCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      priceRanges: this.calculatePriceRanges(profiles),
      ratings: Array.from(ratingCounts.entries())
        .map(([rating, count]) => ({ rating, count }))
        .sort((a, b) => b.rating - a.rating)
    }
  }

  // Calculate price ranges for facets
  private calculatePriceRanges(profiles: any[]): Array<{ min: number; max: number; count: number }> {
    const ranges = [
      { min: 0, max: 100, count: 0 },
      { min: 100, max: 200, count: 0 },
      { min: 200, max: 500, count: 0 },
      { min: 500, max: 1000, count: 0 },
      { min: 1000, max: Infinity, count: 0 }
    ]

    profiles.forEach(profile => {
      try {
        const pricing = JSON.parse(profile.pricing || '[]')
        const hourlyPrice = pricing.find((p: any) => p.type === 'hourly')?.amount || 0
        
        for (const range of ranges) {
          if (hourlyPrice >= range.min && hourlyPrice < range.max) {
            range.count++
            break
          }
        }
      } catch {}
    })

    return ranges.filter(r => r.count > 0)
  }

  // Get search suggestions
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return []

    try {
      // In a real implementation, this would use a search suggestion service
      // For now, return common searches
      const commonSearches = [
        'blonde escorts',
        'brunette escorts',
        'dinner date',
        'travel companion',
        'vip service',
        'weekend booking',
        'verified escorts',
        'highly rated'
      ]

      return commonSearches
        .filter(search => search.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    } catch (error) {
      console.error('Error getting suggestions:', error)
      return []
    }
  }

  // Save search
  async saveSearch(userId: string, name: string, filters: SearchFilters, notifications = false): Promise<SavedSearch> {
    try {
      const savedSearch = await databases.createDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          name,
          filters: JSON.stringify(filters),
          notifications,
          createdAt: new Date().toISOString()
        }
      )

      return {
        ...savedSearch,
        filters: JSON.parse(savedSearch.filters)
      } as unknown as SavedSearch
    } catch (error) {
      console.error('Error saving search:', error)
      throw error
    }
  }

  // Get saved searches
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt')
        ]
      )

      return response.documents.map(doc => ({
        ...doc,
        filters: JSON.parse(doc.filters)
      })) as unknown as SavedSearch[]
    } catch (error) {
      console.error('Error fetching saved searches:', error)
      return []
    }
  }

  // Delete saved search
  async deleteSavedSearch(searchId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        searchId
      )
    } catch (error) {
      console.error('Error deleting saved search:', error)
      throw error
    }
  }

  // Update saved search
  async updateSavedSearch(
    searchId: string,
    updates: Partial<{ name: string; filters: SearchFilters; notifications: boolean }>
  ): Promise<void> {
    try {
      const data: any = {}
      if (updates.name) data.name = updates.name
      if (updates.filters) data.filters = JSON.stringify(updates.filters)
      if (updates.notifications !== undefined) data.notifications = updates.notifications
      data.lastUsed = new Date().toISOString()

      await databases.updateDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        searchId,
        data
      )
    } catch (error) {
      console.error('Error updating saved search:', error)
      throw error
    }
  }

  // Save search history
  private async saveSearchHistory(filters: SearchFilters): Promise<void> {
    try {
      const userId = await this.getCurrentUserId()
      if (!userId) return

      await databases.createDocument(
        DATABASE_ID,
        SEARCH_HISTORY_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          query: filters.query || '',
          filters: JSON.stringify(filters),
          timestamp: new Date().toISOString()
        }
      )

      // Clean up old history (keep last 50)
      await this.cleanupSearchHistory(userId)
    } catch (error) {
      console.error('Error saving search history:', error)
    }
  }

  // Get search history
  async getSearchHistory(userId: string, limit = 10): Promise<SearchHistory[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SEARCH_HISTORY_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('timestamp'),
          Query.limit(limit)
        ]
      )

      return response.documents.map(doc => ({
        ...doc,
        filters: JSON.parse(doc.filters)
      })) as unknown as SearchHistory[]
    } catch (error) {
      console.error('Error fetching search history:', error)
      return []
    }
  }

  // Clear search history
  async clearSearchHistory(userId: string): Promise<void> {
    try {
      const history = await databases.listDocuments(
        DATABASE_ID,
        SEARCH_HISTORY_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      const deletions = history.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, SEARCH_HISTORY_COLLECTION_ID, doc.$id)
      )

      await Promise.all(deletions)
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }

  // Cleanup old search history
  private async cleanupSearchHistory(userId: string): Promise<void> {
    try {
      const history = await databases.listDocuments(
        DATABASE_ID,
        SEARCH_HISTORY_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('timestamp'),
          Query.offset(50)
        ]
      )

      const deletions = history.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, SEARCH_HISTORY_COLLECTION_ID, doc.$id)
      )

      await Promise.all(deletions)
    } catch (error) {
      console.error('Error cleaning up search history:', error)
    }
  }

  // Get current user ID (would be from auth context)
  private async getCurrentUserId(): Promise<string | null> {
    // This would come from your auth store
    return null
  }

  // Search by proximity (requires geospatial support)
  async searchNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    filters?: Partial<SearchFilters>
  ): Promise<SearchResult> {
    // This would use geospatial queries
    // For now, fallback to regular search
    return this.searchProfiles({
      ...filters,
      location: {
        radius: radiusKm
      }
    })
  }

  // Get trending searches
  async getTrendingSearches(limit = 10): Promise<string[]> {
    try {
      // In a real implementation, this would analyze search history
      // For now, return predefined trending searches
      return [
        'verified escorts',
        'dinner dates',
        'weekend companions',
        'travel escorts',
        'vip services',
        'highly rated',
        'new profiles',
        'available tonight'
      ].slice(0, limit)
    } catch (error) {
      console.error('Error fetching trending searches:', error)
      return []
    }
  }
}

export const searchService = new SearchService()