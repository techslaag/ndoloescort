import type { ProfileBadge } from '../types/badges'

export const PROFILE_BADGES: ProfileBadge[] = [
  // Existing verification badge
  {
    id: 'verified_profile',
    name: 'Verified Professional',
    description: 'Identity verified through government ID and photo verification',
    icon: '✅',
    color: '#10b981',
    rarity: 'rare',
    category: 'verification',
    requirements: [
      {
        type: 'verification_status',
        value: true,
        description: 'Complete profile verification'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  // NEW BADGES - 10 Additional Badges

  {
    id: 'five_star_elite',
    name: 'Five Star Elite',
    description: 'Maintains a perfect 5.0 rating with 20+ reviews',
    icon: '⭐',
    color: '#ffd700',
    rarity: 'legendary',
    category: 'quality',
    requirements: [
      {
        type: 'rating_average',
        value: 5.0,
        operator: '>=',
        description: 'Average rating of 5.0 stars'
      },
      {
        type: 'review_count',
        value: 20,
        operator: '>=',
        description: 'Minimum 20 reviews'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'rising_star',
    name: 'Rising Star',
    description: 'New talent showing exceptional promise with high ratings',
    icon: '🌟',
    color: '#ff6b6b',
    rarity: 'rare',
    category: 'achievement',
    requirements: [
      {
        type: 'time_on_platform',
        value: 90,
        operator: '<=',
        description: 'Account less than 90 days old'
      },
      {
        type: 'rating_average',
        value: 4.5,
        operator: '>=',
        description: 'Average rating of 4.5+ stars'
      },
      {
        type: 'review_count',
        value: 5,
        operator: '>=',
        description: 'Minimum 5 reviews'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Popular companion with exceptional social engagement',
    icon: '🦋',
    color: '#9333ea',
    rarity: 'epic',
    category: 'social',
    requirements: [
      {
        type: 'profile_views',
        value: 1000,
        operator: '>=',
        description: 'Profile viewed 1000+ times'
      },
      {
        type: 'favorites_count',
        value: 50,
        operator: '>=',
        description: 'Added to favorites 50+ times'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'lightning_responder',
    name: 'Lightning Responder',
    description: 'Consistently responds to messages within 30 minutes',
    icon: '⚡',
    color: '#3b82f6',
    rarity: 'rare',
    category: 'experience',
    requirements: [
      {
        type: 'response_time',
        value: 30,
        operator: '<=',
        description: 'Average response time under 30 minutes'
      },
      {
        type: 'booking_count',
        value: 10,
        operator: '>=',
        description: 'Completed at least 10 bookings'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'media_maven',
    name: 'Media Maven',
    description: 'Showcases professional portfolio with diverse, high-quality content',
    icon: '📸',
    color: '#ec4899',
    rarity: 'common',
    category: 'quality',
    requirements: [
      {
        type: 'media_count',
        value: 15,
        operator: '>=',
        description: 'Upload 15+ photos/videos'
      },
      {
        type: 'profile_completion',
        value: 90,
        operator: '>=',
        description: 'Profile 90% complete'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'veteran_companion',
    name: 'Veteran Companion',
    description: 'Experienced professional with over 1 year on the platform',
    icon: '🏆',
    color: '#059669',
    rarity: 'epic',
    category: 'experience',
    requirements: [
      {
        type: 'time_on_platform',
        value: 365,
        operator: '>=',
        description: 'Active for 365+ days'
      },
      {
        type: 'booking_count',
        value: 50,
        operator: '>=',
        description: 'Completed 50+ bookings'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'premium_elite',
    name: 'Premium Elite',
    description: 'Top-tier companion commanding premium rates',
    icon: '💎',
    color: '#7c3aed',
    rarity: 'legendary',
    category: 'premium',
    requirements: [
      {
        type: 'earnings_milestone',
        value: 10000,
        operator: '>=',
        description: 'Earned $10,000+ on platform'
      },
      {
        type: 'rating_average',
        value: 4.8,
        operator: '>=',
        description: 'Average rating of 4.8+ stars'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'consistency_champion',
    name: 'Consistency Champion',
    description: 'Maintains active presence with regular bookings',
    icon: '📅',
    color: '#f59e0b',
    rarity: 'rare',
    category: 'achievement',
    requirements: [
      {
        type: 'streak_days',
        value: 30,
        operator: '>=',
        description: 'Active for 30 consecutive days'
      },
      {
        type: 'booking_count',
        value: 15,
        operator: '>=',
        description: 'Minimum 15 bookings'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'review_magnet',
    name: 'Review Magnet',
    description: 'Exceptional service that inspires clients to leave reviews',
    icon: '💬',
    color: '#06b6d4',
    rarity: 'epic',
    category: 'social',
    requirements: [
      {
        type: 'review_count',
        value: 50,
        operator: '>=',
        description: 'Received 50+ reviews'
      },
      {
        type: 'rating_average',
        value: 4.3,
        operator: '>=',
        description: 'Average rating of 4.3+ stars'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  },

  {
    id: 'complete_professional',
    name: 'Complete Professional',
    description: 'Comprehensive profile showcasing all aspects of their service',
    icon: '📋',
    color: '#8b5cf6',
    rarity: 'common',
    category: 'quality',
    requirements: [
      {
        type: 'profile_completion',
        value: 100,
        operator: '>=',
        description: 'Profile 100% complete'
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  }
]

export const BADGE_CATEGORIES = {
  verification: {
    name: 'Verification',
    description: 'Identity and safety verification badges',
    icon: '🛡️',
    color: '#10b981'
  },
  experience: {
    name: 'Experience',
    description: 'Platform experience and tenure badges',
    icon: '🎖️',
    color: '#059669'
  },
  quality: {
    name: 'Quality',
    description: 'Service quality and professionalism badges',
    icon: '⭐',
    color: '#ffd700'
  },
  social: {
    name: 'Social',
    description: 'Community engagement and popularity badges',
    icon: '👥',
    color: '#9333ea'
  },
  achievement: {
    name: 'Achievement',
    description: 'Special milestones and accomplishments',
    icon: '🏅',
    color: '#f59e0b'
  },
  premium: {
    name: 'Premium',
    description: 'Elite status and premium service badges',
    icon: '💎',
    color: '#7c3aed'
  }
}

export const BADGE_RARITIES = {
  common: {
    name: 'Common',
    color: '#6b7280',
    glow: 'rgba(107, 114, 128, 0.3)'
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)'
  },
  epic: {
    name: 'Epic',
    color: '#9333ea',
    glow: 'rgba(147, 51, 234, 0.3)'
  },
  legendary: {
    name: 'Legendary',
    color: '#ffd700',
    glow: 'rgba(255, 215, 0, 0.3)'
  }
}