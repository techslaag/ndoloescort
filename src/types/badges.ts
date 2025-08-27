export interface ProfileBadge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'verification' | 'experience' | 'quality' | 'social' | 'achievement' | 'premium'
  requirements: BadgeRequirement[]
  createdAt: string
  isActive: boolean
}

export interface BadgeRequirement {
  type: 'profile_completion' | 'verification_status' | 'rating_average' | 'booking_count' | 
        'review_count' | 'response_time' | 'profile_views' | 'favorites_count' | 
        'media_count' | 'time_on_platform' | 'earnings_milestone' | 'streak_days'
  value: number | string | boolean
  operator?: '>=' | '>' | '<=' | '<' | '==' | 'includes'
  description: string
}

export interface UserBadge {
  id: string
  userId: string
  profileId: string
  badgeId: string
  earnedAt: string
  isVisible: boolean
  progress?: {
    current: number
    required: number
    percentage: number
  }
}

export interface BadgeProgress {
  badgeId: string
  current: number
  required: number
  percentage: number
  isEligible: boolean
  nextMilestone?: number
}

export interface BadgeStats {
  totalBadges: number
  earnedBadges: number
  commonBadges: number
  rareBadges: number
  epicBadges: number
  legendaryBadges: number
  completionRate: number
}