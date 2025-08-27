import { 
  databases, 
  Query, 
  DATABASE_ID,
  USER_BADGES_COLLECTION_ID,
  PROFILES_COLLECTION_ID 
} from '../lib/appwrite'
import { PROFILE_BADGES } from '../constants/badges'
import type { ProfileBadge, UserBadge, BadgeProgress, BadgeStats, BadgeRequirement } from '../types/badges'

export class BadgeService {
  private readonly databaseId = DATABASE_ID
  private readonly userBadgesCollection = USER_BADGES_COLLECTION_ID
  private readonly profilesCollection = PROFILES_COLLECTION_ID
  private readonly bookingsCollection = 'bookings'
  private readonly reviewsCollection = 'reviews'

  /**
   * Check and award badges to a user based on their current profile data
   */
  async checkAndAwardBadges(userId: string, profileId: string): Promise<UserBadge[]> {
    try {
      const profileData = await this.getUserProfileData(userId, profileId)
      const currentBadges = await this.getUserBadges(userId, profileId)
      const currentBadgeIds = currentBadges.map(b => b.badgeId)
      
      const newBadges: UserBadge[] = []

      for (const badge of PROFILE_BADGES) {
        if (!currentBadgeIds.includes(badge.id) && await this.checkBadgeEligibility(badge, profileData)) {
          const userBadge = await this.awardBadge(userId, profileId, badge.id)
          if (userBadge) {
            newBadges.push(userBadge)
          }
        }
      }

      return newBadges
    } catch (error) {
      console.error('Error checking and awarding badges:', error)
      return []
    }
  }

  /**
   * Check if user meets requirements for a specific badge
   */
  async checkBadgeEligibility(badge: ProfileBadge, profileData: any): Promise<boolean> {
    try {
      for (const requirement of badge.requirements) {
        if (!await this.checkRequirement(requirement, profileData)) {
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Error checking badge eligibility:', error)
      return false
    }
  }

  /**
   * Check individual requirement
   */
  private async checkRequirement(requirement: BadgeRequirement, profileData: any): Promise<boolean> {
    const { type, value, operator = '>=' } = requirement

    let currentValue: any

    switch (type) {
      case 'profile_completion':
        currentValue = this.calculateProfileCompletion(profileData.profile)
        break
      case 'verification_status':
        currentValue = profileData.profile?.verification?.isVerified || false
        break
      case 'rating_average':
        currentValue = profileData.profile?.averageRating || 0
        break
      case 'booking_count':
        currentValue = profileData.bookings?.length || 0
        break
      case 'review_count':
        currentValue = profileData.reviews?.length || 0
        break
      case 'response_time':
        currentValue = profileData.profile?.averageResponseTime || 999999
        break
      case 'profile_views':
        currentValue = profileData.profile?.viewCount || 0
        break
      case 'favorites_count':
        currentValue = profileData.profile?.favoriteCount || 0
        break
      case 'media_count':
        currentValue = profileData.profile?.media?.length || 0
        break
      case 'time_on_platform':
        const createdAt = new Date(profileData.profile?.createdAt || Date.now())
        const now = new Date()
        currentValue = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        break
      case 'earnings_milestone':
        currentValue = profileData.profile?.totalEarnings || 0
        break
      case 'streak_days':
        currentValue = this.calculateActiveStreak(profileData.bookings || [])
        break
      default:
        return false
    }

    return this.compareValues(currentValue, value, operator)
  }

  /**
   * Compare values based on operator
   */
  private compareValues(current: any, required: any, operator: string): boolean {
    switch (operator) {
      case '>=':
        return current >= required
      case '>':
        return current > required
      case '<=':
        return current <= required
      case '<':
        return current < required
      case '==':
        return current === required
      case 'includes':
        return Array.isArray(current) ? current.includes(required) : current?.toString().includes(required)
      default:
        return current >= required
    }
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(profile: any): number {
    if (!profile) return 0

    const fields = [
      'name',
      'age', 
      'description',
      'bio',
      'locationCity',
      'locationCountry'
    ]
    
    const optionalFields = [
      'media',
      'services',
      'pricing',
      'workingHours',
      'verification'
    ]

    let completed = 0
    let total = fields.length + optionalFields.length

    // Check required fields
    for (const field of fields) {
      if (profile[field]) completed++
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (profile[field] && 
          (Array.isArray(profile[field]) ? profile[field].length > 0 : 
           typeof profile[field] === 'object' ? Object.keys(profile[field]).length > 0 :
           profile[field])) {
        completed++
      }
    }

    return Math.round((completed / total) * 100)
  }

  /**
   * Calculate active streak days
   */
  private calculateActiveStreak(bookings: any[]): number {
    if (!bookings.length) return 0

    const sortedBookings = bookings
      .map(b => new Date(b.createdAt))
      .sort((a, b) => b.getTime() - a.getTime())

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const bookingDate of sortedBookings) {
      bookingDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.floor((currentDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
        streak++
        currentDate = new Date(bookingDate)
      } else {
        break
      }
    }

    return streak
  }

  /**
   * Get user's profile data including related collections
   */
  async getUserProfileData(userId: string, profileId: string) {
    try {
      const profile = await databases.getDocument(this.databaseId, this.profilesCollection, profileId)
      
      // For now, we'll mock the bookings and reviews data since those collections don't exist yet
      // In a real implementation, these would be actual database queries
      const mockBookings = this.generateMockBookings(profileId)
      const mockReviews = this.generateMockReviews(profileId)

      return {
        profile,
        bookings: mockBookings,
        reviews: mockReviews
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
      return {
        profile: null,
        bookings: [],
        reviews: []
      }
    }
  }

  /**
   * Generate mock booking data for badge calculations
   */
  private generateMockBookings(profileId: string) {
    // Mock some booking data to demonstrate badge functionality
    const bookingCount = Math.floor(Math.random() * 20)
    const bookings = []
    
    for (let i = 0; i < bookingCount; i++) {
      const daysAgo = Math.floor(Math.random() * 365)
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      
      bookings.push({
        id: `booking_${i}`,
        profileId,
        createdAt: date.toISOString(),
        status: 'completed'
      })
    }
    
    return bookings
  }

  /**
   * Generate mock review data for badge calculations
   */
  private generateMockReviews(profileId: string) {
    // Mock some review data to demonstrate badge functionality
    const reviewCount = Math.floor(Math.random() * 15)
    const reviews = []
    
    for (let i = 0; i < reviewCount; i++) {
      reviews.push({
        id: `review_${i}`,
        profileId,
        rating: Math.random() > 0.3 ? (Math.random() > 0.5 ? 5 : 4) : 3,
        createdAt: new Date().toISOString()
      })
    }
    
    return reviews
  }

  /**
   * Award a badge to user
   */
  async awardBadge(userId: string, profileId: string, badgeId: string): Promise<UserBadge | null> {
    try {
      const userBadge: Omit<UserBadge, 'id'> = {
        userId,
        profileId,
        badgeId,
        earnedAt: new Date().toISOString(),
        isVisible: true
      }

      // For now, we'll simulate badge awarding since the collection doesn't exist yet
      // In a real implementation, this would create a document in the database
      console.log('Badge awarded (simulated):', userBadge)
      
      return {
        id: `badge_${Date.now()}`,
        ...userBadge
      } as UserBadge
    } catch (error) {
      console.error('Error awarding badge:', error)
      return null
    }
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string, profileId: string): Promise<UserBadge[]> {
    try {
      // For now, we'll return some mock badges to demonstrate functionality
      // In a real implementation, this would query the database
      const mockBadges = this.generateMockUserBadges(userId, profileId)
      return mockBadges
    } catch (error) {
      console.error('Error fetching user badges:', error)
      return []
    }
  }

  /**
   * Generate mock user badges for demonstration
   */
  private generateMockUserBadges(userId: string, profileId: string): UserBadge[] {
    const badges: UserBadge[] = []
    
    // Randomly award some badges for demonstration
    const availableBadges = ['complete_professional', 'media_maven', 'verified_profile']
    
    availableBadges.forEach((badgeId, index) => {
      if (Math.random() > 0.5) { // 50% chance of having each badge
        badges.push({
          id: `mock_badge_${index}`,
          userId,
          profileId,
          badgeId,
          earnedAt: new Date().toISOString(),
          isVisible: true
        })
      }
    })
    
    return badges
  }

  /**
   * Get badge progress for all available badges
   */
  async getBadgeProgress(userId: string, profileId: string): Promise<BadgeProgress[]> {
    try {
      const profileData = await this.getUserProfileData(userId, profileId)
      const userBadges = await this.getUserBadges(userId, profileId)
      const earnedBadgeIds = userBadges.map(b => b.badgeId)

      const progress: BadgeProgress[] = []

      for (const badge of PROFILE_BADGES) {
        if (earnedBadgeIds.includes(badge.id)) continue

        const badgeProgress = await this.calculateBadgeProgress(badge, profileData)
        progress.push(badgeProgress)
      }

      return progress.sort((a, b) => b.percentage - a.percentage)
    } catch (error) {
      console.error('Error calculating badge progress:', error)
      return []
    }
  }

  /**
   * Calculate progress for a specific badge
   */
  private async calculateBadgeProgress(badge: ProfileBadge, profileData: any): Promise<BadgeProgress> {
    const progress: BadgeProgress = {
      badgeId: badge.id,
      current: 0,
      required: 0,
      percentage: 0,
      isEligible: false
    }

    // For multi-requirement badges, show progress of the primary requirement
    const primaryRequirement = badge.requirements[0]
    
    if (primaryRequirement) {
      const { current, required } = await this.getRequirementProgress(primaryRequirement, profileData)
      progress.current = current
      progress.required = required
      progress.percentage = required > 0 ? Math.min(100, (current / required) * 100) : 0
      progress.isEligible = await this.checkBadgeEligibility(badge, profileData)
    }

    return progress
  }

  /**
   * Get progress for individual requirement
   */
  private async getRequirementProgress(requirement: BadgeRequirement, profileData: any): Promise<{current: number, required: number}> {
    const { type, value } = requirement
    let current = 0
    const required = typeof value === 'number' ? value : 1

    switch (type) {
      case 'profile_completion':
        current = this.calculateProfileCompletion(profileData.profile)
        break
      case 'rating_average':
        current = profileData.profile?.averageRating || 0
        break
      case 'booking_count':
        current = profileData.bookings?.length || 0
        break
      case 'review_count':
        current = profileData.reviews?.length || 0
        break
      case 'profile_views':
        current = profileData.profile?.viewCount || 0
        break
      case 'favorites_count':
        current = profileData.profile?.favoriteCount || 0
        break
      case 'media_count':
        current = profileData.profile?.media?.length || 0
        break
      case 'time_on_platform':
        const createdAt = new Date(profileData.profile?.createdAt || Date.now())
        const now = new Date()
        current = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        break
      case 'earnings_milestone':
        current = profileData.profile?.totalEarnings || 0
        break
      case 'streak_days':
        current = this.calculateActiveStreak(profileData.bookings || [])
        break
      case 'response_time':
        current = Math.max(0, 60 - (profileData.profile?.averageResponseTime || 60)) // Invert for progress
        break
    }

    return { current, required }
  }

  /**
   * Get badge statistics for user
   */
  async getBadgeStats(userId: string, profileId: string): Promise<BadgeStats> {
    try {
      const userBadges = await this.getUserBadges(userId, profileId)
      const totalBadges = PROFILE_BADGES.length

      const stats: BadgeStats = {
        totalBadges,
        earnedBadges: userBadges.length,
        commonBadges: 0,
        rareBadges: 0,
        epicBadges: 0,
        legendaryBadges: 0,
        completionRate: (userBadges.length / totalBadges) * 100
      }

      // Count by rarity
      for (const userBadge of userBadges) {
        const badge = PROFILE_BADGES.find(b => b.id === userBadge.badgeId)
        if (badge) {
          switch (badge.rarity) {
            case 'common':
              stats.commonBadges++
              break
            case 'rare':
              stats.rareBadges++
              break
            case 'epic':
              stats.epicBadges++
              break
            case 'legendary':
              stats.legendaryBadges++
              break
          }
        }
      }

      return stats
    } catch (error) {
      console.error('Error calculating badge stats:', error)
      return {
        totalBadges: PROFILE_BADGES.length,
        earnedBadges: 0,
        commonBadges: 0,
        rareBadges: 0,
        epicBadges: 0,
        legendaryBadges: 0,
        completionRate: 0
      }
    }
  }

  /**
   * Toggle badge visibility
   */
  async toggleBadgeVisibility(userBadgeId: string, isVisible: boolean): Promise<boolean> {
    try {
      // For now, we'll simulate this operation
      // In a real implementation, this would update the database
      console.log(`Badge visibility toggled (simulated): ${userBadgeId} -> ${isVisible}`)
      return true
    } catch (error) {
      console.error('Error toggling badge visibility:', error)
      return false
    }
  }
}

export const badgeService = new BadgeService()