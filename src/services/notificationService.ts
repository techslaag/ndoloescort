import { databases, DATABASE_ID, functions, NOTIFICATIONS_COLLECTION_ID, NOTIFICATION_PREFS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query, RealtimeResponseEvent } from 'appwrite'
import type { Notification, NotificationType, NotificationData, NotificationPreferences } from '../types/notification'
import { realtimeService } from './realtimeService'

export class NotificationService {
  private subscribers: Map<string, (notification: Notification) => void> = new Map()
  private audioElement: HTMLAudioElement | null = null
  private permission: NotificationPermission = 'default'

  constructor() {
    this.initializeAudio()
    this.checkNotificationPermission()
  }

  // Initialize notification sound
  private initializeAudio() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio('/notification-sound.mp3')
      this.audioElement.volume = 0.5
    }
  }

  // Check browser notification permission
  private async checkNotificationPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission
      if (this.permission === 'default') {
        // We'll request permission when user enables push notifications
      }
    }
  }

  // Request browser notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // Create a notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<Notification> {
    try {
      const notification = await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          isRead: false,
          isSeen: false,
          priority,
          createdAt: new Date().toISOString(),
          expiresAt: this.calculateExpiration(type)
        }
      )

      // Trigger real-time update
      await this.broadcastNotification(notification as unknown as Notification)

      // Send push notification if enabled
      const prefs = await this.getUserPreferences(userId)
      if (prefs?.push?.enabled && this.shouldSendPush(type, prefs)) {
        await this.sendPushNotification(notification as unknown as Notification, prefs)
      }

      // Send email notification if enabled
      if (prefs?.email?.enabled && this.shouldSendEmail(type, prefs)) {
        await this.queueEmailNotification(notification as unknown as Notification)
      }

      return notification as unknown as Notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Calculate notification expiration based on type
  private calculateExpiration(type: NotificationType): string {
    const now = new Date()
    const expirationDays = {
      message: 30,
      booking_request: 7,
      booking_confirmed: 30,
      booking_cancelled: 30,
      payment_received: 90,
      payment_sent: 90,
      review_received: 0, // Never expires
      profile_view: 7,
      badge_earned: 0, // Never expires
      system_alert: 30,
      promotion: 14,
      reminder: 1
    }

    const days = expirationDays[type] || 30
    if (days === 0) return '' // No expiration

    now.setDate(now.getDate() + days)
    return now.toISOString()
  }

  // Broadcast notification via real-time
  private async broadcastNotification(notification: Notification) {
    const channel = `notifications.${notification.userId}`
    // This would use your real-time service to broadcast
    // For now, we'll call subscribers directly
    const callback = this.subscribers.get(notification.userId)
    if (callback) {
      callback(notification)
    }
  }

  // Check if push should be sent based on preferences
  private shouldSendPush(type: NotificationType, prefs: NotificationPreferences): boolean {
    if (!prefs.push.enabled) return false
    
    // Check quiet hours
    if (prefs.quietHours.enabled && this.isQuietHours(prefs.quietHours)) {
      return false
    }

    // Check specific notification types
    const typeSettings = {
      message: prefs.push.messages,
      booking_request: prefs.push.bookings,
      booking_confirmed: prefs.push.bookings,
      booking_cancelled: prefs.push.bookings,
      payment_received: prefs.push.payments,
      payment_sent: prefs.push.payments,
      review_received: prefs.push.reviews,
      profile_view: true,
      badge_earned: true,
      system_alert: true,
      promotion: prefs.push.marketing ?? false,
      reminder: true
    }

    return typeSettings[type] ?? false
  }

  // Check if email should be sent based on preferences
  private shouldSendEmail(type: NotificationType, prefs: NotificationPreferences): boolean {
    if (!prefs.email.enabled) return false

    const typeSettings = {
      message: prefs.email.messages,
      booking_request: prefs.email.bookings,
      booking_confirmed: prefs.email.bookings,
      booking_cancelled: prefs.email.bookings,
      payment_received: prefs.email.payments,
      payment_sent: prefs.email.payments,
      review_received: prefs.email.reviews,
      profile_view: false, // Don't email for profile views
      badge_earned: true,
      system_alert: true,
      promotion: prefs.email.marketing,
      reminder: true
    }

    return typeSettings[type] ?? false
  }

  // Check if current time is within quiet hours
  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false

    const now = new Date()
    const timezone = quietHours.timezone || 'UTC'
    
    // Convert to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const currentHour = userTime.getHours()
    const currentMinute = userTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number)
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number)
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    } else {
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  // Send browser push notification
  private async sendPushNotification(notification: Notification, prefs: NotificationPreferences) {
    if (this.permission !== 'granted') return

    try {
      const options: NotificationOptions = {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: notification.type,
        requireInteraction: notification.priority === 'high',
        silent: !prefs.push.sound,
        vibrate: prefs.push.vibration ? [200, 100, 200] : undefined,
        data: notification.data
      }

      const pushNotification = new Notification(notification.title, options)

      pushNotification.onclick = () => {
        window.focus()
        this.handleNotificationClick(notification)
        pushNotification.close()
      }

      // Play sound if enabled
      if (prefs.push.sound && this.audioElement) {
        this.audioElement.play().catch(console.error)
      }
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  // Queue email notification
  private async queueEmailNotification(notification: Notification) {
    try {
      // This would queue an email to be sent by a cloud function
      await functions.createExecution(
        'sendEmailNotification',
        JSON.stringify({
          notificationId: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data
        })
      )
    } catch (error) {
      console.error('Error queueing email notification:', error)
    }
  }

  // Handle notification click
  private handleNotificationClick(notification: Notification) {
    if (notification.data?.link) {
      window.location.href = notification.data.link
    } else {
      // Navigate based on notification type
      const routes: Record<NotificationType, string> = {
        message: `/messages${notification.data?.conversationId ? `/${notification.data.conversationId}` : ''}`,
        booking_request: `/bookings/${notification.data?.bookingId}`,
        booking_confirmed: `/bookings/${notification.data?.bookingId}`,
        booking_cancelled: `/bookings/${notification.data?.bookingId}`,
        payment_received: '/payments',
        payment_sent: '/payments',
        review_received: `/profile/reviews`,
        profile_view: '/profile/analytics',
        badge_earned: `/badges/${notification.data?.badgeId}`,
        system_alert: '/notifications',
        promotion: '/promotions',
        reminder: '/dashboard'
      }

      const route = routes[notification.type] || '/notifications'
      window.location.href = route
    }

    // Mark as read
    this.markAsRead(notification.id)
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      types?: NotificationType[]
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    try {
      const queries = [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || 20),
        Query.offset(options.offset || 0)
      ]

      if (options.unreadOnly) {
        queries.push(Query.equal('isRead', false))
      }

      if (options.types && options.types.length > 0) {
        queries.push(Query.equal('type', options.types))
      }

      // Exclude expired notifications
      const now = new Date().toISOString()
      queries.push(Query.greaterThan('expiresAt', now))

      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        queries
      )

      // Parse notification data
      const notifications = response.documents.map(doc => ({
        ...doc,
        data: doc.data ? JSON.parse(doc.data) : undefined
      })) as unknown as Notification[]

      // Get unread count
      const unreadResponse = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isRead', false),
          Query.greaterThan('expiresAt', now)
        ]
      )

      return {
        notifications,
        total: response.total,
        unread: unreadResponse.total
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return { notifications: [], total: 0, unread: 0 }
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        notificationId,
        {
          isRead: true,
          readAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark multiple notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const unread = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isRead', false)
        ]
      )

      const updates = unread.documents.map(doc =>
        this.markAsRead(doc.$id)
      )

      await Promise.all(updates)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        notificationId
      )
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Clear all notifications for user
  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const notifications = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      const deletions = notifications.documents.map(doc =>
        this.deleteNotification(doc.$id)
      )

      await Promise.all(deletions)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  // Get user preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const prefs = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATION_PREFS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      if (prefs.documents.length > 0) {
        const doc = prefs.documents[0]
        return {
          email: JSON.parse(doc.email || '{}'),
          push: JSON.parse(doc.push || '{}'),
          inApp: JSON.parse(doc.inApp || '{}'),
          quietHours: JSON.parse(doc.quietHours || '{}')
        }
      }

      // Return default preferences
      return this.getDefaultPreferences()
    } catch (error) {
      console.error('Error fetching preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  // Get default preferences
  private getDefaultPreferences(): NotificationPreferences {
    return {
      email: {
        enabled: true,
        messages: true,
        bookings: true,
        payments: true,
        reviews: true,
        marketing: false
      },
      push: {
        enabled: false,
        messages: true,
        bookings: true,
        payments: true,
        reviews: true,
        sound: true,
        vibration: true
      },
      inApp: {
        enabled: true,
        showBadge: true,
        playSound: true,
        groupByType: false
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  }

  // Update user preferences
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATION_PREFS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      const data = {
        userId,
        email: JSON.stringify(preferences.email || {}),
        push: JSON.stringify(preferences.push || {}),
        inApp: JSON.stringify(preferences.inApp || {}),
        quietHours: JSON.stringify(preferences.quietHours || {}),
        updatedAt: new Date().toISOString()
      }

      if (existing.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          NOTIFICATION_PREFS_COLLECTION_ID,
          existing.documents[0].$id,
          data
        )
      } else {
        await databases.createDocument(
          DATABASE_ID,
          NOTIFICATION_PREFS_COLLECTION_ID,
          ID.unique(),
          data
        )
      }

      // Request permission if push is enabled
      if (preferences.push?.enabled) {
        await this.requestNotificationPermission()
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    this.subscribers.set(userId, callback)

    // Subscribe to Appwrite real-time
    const unsubscribe = realtimeService.subscribe(
      `databases.${DATABASE_ID}.collections.${NOTIFICATIONS_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<any>) => {
        if (response.payload.userId === userId) {
          const notification = {
            ...response.payload,
            data: response.payload.data ? JSON.parse(response.payload.data) : undefined
          } as Notification
          callback(notification)
        }
      }
    )

    return () => {
      this.subscribers.delete(userId)
      unsubscribe()
    }
  }

  // Create notification helpers
  async notifyNewMessage(
    userId: string,
    senderName: string,
    conversationId: string,
    preview?: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'message',
      `New message from ${senderName}`,
      preview || 'You have a new message',
      { conversationId },
      'medium'
    )
  }

  async notifyBookingRequest(
    escortId: string,
    clientName: string,
    bookingId: string,
    date: string
  ): Promise<void> {
    await this.createNotification(
      escortId,
      'booking_request',
      'New Booking Request',
      `${clientName} has requested a booking for ${date}`,
      { bookingId },
      'high'
    )
  }

  async notifyBookingConfirmed(
    clientId: string,
    escortName: string,
    bookingId: string,
    date: string
  ): Promise<void> {
    await this.createNotification(
      clientId,
      'booking_confirmed',
      'Booking Confirmed',
      `Your booking with ${escortName} for ${date} has been confirmed`,
      { bookingId },
      'high'
    )
  }

  async notifyPaymentReceived(
    userId: string,
    amount: number,
    currency: string,
    bookingId?: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'payment_received',
      'Payment Received',
      `You received ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount / 100)}`,
      { amount, currency, bookingId },
      'high'
    )
  }

  async notifyReviewReceived(
    escortId: string,
    rating: number,
    reviewerName: string
  ): Promise<void> {
    await this.createNotification(
      escortId,
      'review_received',
      'New Review',
      `${reviewerName} left you a ${rating}-star review`,
      {},
      'medium'
    )
  }

  async notifyBadgeEarned(
    userId: string,
    badgeName: string,
    badgeId: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'badge_earned',
      'Badge Earned!',
      `Congratulations! You've earned the ${badgeName} badge`,
      { badgeId },
      'low'
    )
  }
}

export const notificationService = new NotificationService()