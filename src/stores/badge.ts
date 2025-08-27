import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { badgeService } from '../services/badgeService'
import { PROFILE_BADGES, BADGE_CATEGORIES, BADGE_RARITIES } from '../constants/badges'
import type { UserBadge, BadgeProgress, BadgeStats, ProfileBadge } from '../types/badges'

export const useBadgeStore = defineStore('badge', () => {
  // State
  const userBadges = ref<UserBadge[]>([])
  const badgeProgress = ref<BadgeProgress[]>([])
  const badgeStats = ref<BadgeStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const newlyEarnedBadges = ref<UserBadge[]>([])

  // Getters
  const earnedBadgeIds = computed(() => userBadges.value.map(b => b.badgeId))
  
  const earnedBadges = computed(() => {
    return userBadges.value.map(userBadge => {
      const badgeDefinition = PROFILE_BADGES.find(b => b.id === userBadge.badgeId)
      return {
        ...userBadge,
        badge: badgeDefinition
      }
    }).filter(b => b.badge)
  })

  const badgesByCategory = computed(() => {
    const categories: Record<string, any[]> = {}
    
    Object.keys(BADGE_CATEGORIES).forEach(category => {
      categories[category] = earnedBadges.value.filter(b => b.badge?.category === category)
    })
    
    return categories
  })

  const badgesByRarity = computed(() => {
    const rarities: Record<string, any[]> = {}
    
    Object.keys(BADGE_RARITIES).forEach(rarity => {
      rarities[rarity] = earnedBadges.value.filter(b => b.badge?.rarity === rarity)
    })
    
    return rarities
  })

  const nextBadgeToEarn = computed(() => {
    const sortedProgress = [...badgeProgress.value].sort((a, b) => b.percentage - a.percentage)
    return sortedProgress.find(p => p.percentage < 100 && p.percentage > 0)
  })

  const completionRate = computed(() => {
    return badgeStats.value?.completionRate || 0
  })

  // Actions
  const loadUserBadges = async (userId: string, profileId: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      const [badges, progress, stats] = await Promise.all([
        badgeService.getUserBadges(userId, profileId),
        badgeService.getBadgeProgress(userId, profileId),
        badgeService.getBadgeStats(userId, profileId)
      ])
      
      userBadges.value = badges
      badgeProgress.value = progress
      badgeStats.value = stats
    } catch (err) {
      console.error('Error loading user badges:', err)
      error.value = 'Failed to load badges'
    } finally {
      isLoading.value = false
    }
  }

  const checkAndAwardBadges = async (userId: string, profileId: string) => {
    try {
      const newBadges = await badgeService.checkAndAwardBadges(userId, profileId)
      
      if (newBadges.length > 0) {
        // Add new badges to the store
        userBadges.value.push(...newBadges)
        newlyEarnedBadges.value.push(...newBadges)
        
        // Refresh progress and stats
        const [progress, stats] = await Promise.all([
          badgeService.getBadgeProgress(userId, profileId),
          badgeService.getBadgeStats(userId, profileId)
        ])
        
        badgeProgress.value = progress
        badgeStats.value = stats
        
        return newBadges
      }
      
      return []
    } catch (err) {
      console.error('Error checking and awarding badges:', err)
      error.value = 'Failed to check for new badges'
      return []
    }
  }

  const toggleBadgeVisibility = async (userBadgeId: string, isVisible: boolean) => {
    try {
      const success = await badgeService.toggleBadgeVisibility(userBadgeId, isVisible)
      
      if (success) {
        const badge = userBadges.value.find(b => b.id === userBadgeId)
        if (badge) {
          badge.isVisible = isVisible
        }
      }
      
      return success
    } catch (err) {
      console.error('Error toggling badge visibility:', err)
      error.value = 'Failed to update badge visibility'
      return false
    }
  }

  const clearNewlyEarnedBadges = () => {
    newlyEarnedBadges.value = []
  }

  const getBadgeDefinition = (badgeId: string): ProfileBadge | undefined => {
    return PROFILE_BADGES.find(b => b.id === badgeId)
  }

  const hasBadge = (badgeId: string): boolean => {
    return earnedBadgeIds.value.includes(badgeId)
  }

  const getBadgeProgress = (badgeId: string): BadgeProgress | undefined => {
    return badgeProgress.value.find(p => p.badgeId === badgeId)
  }

  const getVisibleBadges = () => {
    return earnedBadges.value.filter(b => b.isVisible)
  }

  const getBadgesByCategory = (category: string) => {
    return earnedBadges.value.filter(b => b.badge?.category === category)
  }

  const getBadgesByRarity = (rarity: string) => {
    return earnedBadges.value.filter(b => b.badge?.rarity === rarity)
  }

  const clearError = () => {
    error.value = null
  }

  const resetStore = () => {
    userBadges.value = []
    badgeProgress.value = []
    badgeStats.value = null
    newlyEarnedBadges.value = []
    error.value = null
    isLoading.value = false
  }

  return {
    // State
    userBadges,
    badgeProgress,
    badgeStats,
    isLoading,
    error,
    newlyEarnedBadges,
    
    // Getters
    earnedBadgeIds,
    earnedBadges,
    badgesByCategory,
    badgesByRarity,
    nextBadgeToEarn,
    completionRate,
    
    // Actions
    loadUserBadges,
    checkAndAwardBadges,
    toggleBadgeVisibility,
    clearNewlyEarnedBadges,
    getBadgeDefinition,
    hasBadge,
    getBadgeProgress,
    getVisibleBadges,
    getBadgesByCategory,
    getBadgesByRarity,
    clearError,
    resetStore,
    
    // Constants for easy access
    allBadges: PROFILE_BADGES,
    categories: BADGE_CATEGORIES,
    rarities: BADGE_RARITIES
  }
})