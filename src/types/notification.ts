export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
  isRead: boolean
  isSeen: boolean
  priority: 'high' | 'medium' | 'low'
  createdAt: string
  readAt?: string
  expiresAt?: string
}

export type NotificationType = 
  | 'message'
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_sent'
  | 'review_received'
  | 'profile_view'
  | 'badge_earned'
  | 'system_alert'
  | 'promotion'
  | 'reminder'

export interface NotificationData {
  conversationId?: string
  bookingId?: string
  profileId?: string
  badgeId?: string
  amount?: number
  currency?: string
  link?: string
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: string
  style?: 'primary' | 'secondary' | 'danger'
}

export interface NotificationPreferences {
  email: {
    enabled: boolean
    messages: boolean
    bookings: boolean
    payments: boolean
    reviews: boolean
    marketing: boolean
  }
  push: {
    enabled: boolean
    messages: boolean
    bookings: boolean
    payments: boolean
    reviews: boolean
    sound: boolean
    vibration: boolean
  }
  inApp: {
    enabled: boolean
    showBadge: boolean
    playSound: boolean
    groupByType: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string
    timezone: string
  }
}

export interface NotificationGroup {
  type: NotificationType
  count: number
  latest: Notification
  notifications: Notification[]
}