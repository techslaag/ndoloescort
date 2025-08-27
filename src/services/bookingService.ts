import { databases, DATABASE_ID, ID, Query, BOOKINGS_COLLECTION_ID, PROFILES_COLLECTION_ID } from '../lib/appwrite'
import { useAuthStore } from '../stores/auth'
import { notificationService } from './notificationService'
import { paymentService } from './paymentService'
import { revenueService } from './revenueService'

export interface Booking {
  $id?: string
  bookingNumber: string
  clientId: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  clientPhoto?: string
  escortId: string
  escortName?: string
  profileId: string
  serviceId?: string
  serviceDetails?: any
  packageType?: string
  service?: string // Display name for service
  startDateTime: string
  endDateTime: string
  duration: number // in minutes
  timezone: string
  location: string
  locationType: 'incall' | 'outcall' | 'travel'
  locationDetails?: any
  specialRequests?: string
  clientNotes?: string
  escortNotes?: string
  adminNotes?: string
  totalAmount: number
  baseAmount?: number
  additionalFees?: number
  discountAmount?: number
  taxAmount?: number
  currency: string
  status: 'pending' | 'confirmed' | 'paid' | 'active' | 'completed' | 'cancelled' | 'no_show' | 'disputed'
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'disputed'
  paymentId?: string
  depositRequired?: boolean
  depositAmount?: number
  depositPaid?: boolean
  cancellationPolicy?: string
  cancellationReason?: string
  cancelledBy?: string
  cancelledAt?: string
  confirmedAt?: string
  completedAt?: string
  reviewRequestSent?: boolean
  clientReviewId?: string
  escortReviewId?: string
  remindersSent?: string[]
  automatedMessages?: any[]
  metadata?: any
  $createdAt?: string
  $updatedAt?: string
}

export interface BookingFilters {
  status?: string
  dateRange?: 'all' | 'today' | 'tomorrow' | 'week' | 'month'
  clientSearch?: string
  escortId?: string
  clientId?: string
  startDate?: string
  endDate?: string
}

export interface BookingStats {
  pending: number
  confirmed: number
  today: number
  monthlyEarnings: number
  totalBookings: number
  completionRate: number
}

export class BookingService {
  // Create a new booking request
  static async createBooking(bookingData: Partial<Booking>): Promise<Booking | null> {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Generate booking number
      const bookingNumber = this.generateBookingNumber()

      // Prepare booking data
      const data: Partial<Booking> = {
        bookingNumber,
        clientId: authStore.user.$id,
        ...bookingData,
        status: 'pending',
        paymentStatus: 'pending',
        currency: bookingData.currency || 'USD',
        remindersSent: [],
        automatedMessages: []
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        ID.unique(),
        data
      )

      const booking = response as Booking

      // Send notification to escort
      await notificationService.createNotification(
        booking.escortId,
        'booking_request',
        'New Booking Request',
        `You have a new booking request for ${booking.startDateTime}`,
        {
          bookingId: booking.$id,
          clientName: authStore.user.name,
          service: booking.service
        }
      )

      return booking
    } catch (error) {
      console.error('Failed to create booking:', error)
      return null
    }
  }

  // Get bookings for escort
  static async getEscortBookings(
    escortId: string,
    filters?: BookingFilters
  ): Promise<Booking[]> {
    try {
      const queries = [
        Query.equal('escortId', escortId),
        Query.orderDesc('startDateTime')
      ]

      // Apply filters
      if (filters?.status) {
        queries.push(Query.equal('status', filters.status))
      }

      if (filters?.dateRange && filters.dateRange !== 'all') {
        const dateQueries = this.getDateRangeQueries(filters.dateRange)
        queries.push(...dateQueries)
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        queries
      )

      // Enrich bookings with client data
      const bookings = await this.enrichBookingsWithUserData(response.documents as Booking[], 'client')

      return bookings
    } catch (error) {
      console.error('Failed to get escort bookings:', error)
      return []
    }
  }

  // Get bookings for client
  static async getClientBookings(
    clientId: string,
    filters?: BookingFilters
  ): Promise<Booking[]> {
    try {
      const queries = [
        Query.equal('clientId', clientId),
        Query.orderDesc('startDateTime')
      ]

      if (filters?.status) {
        queries.push(Query.equal('status', filters.status))
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        queries
      )

      // Enrich bookings with escort data
      const bookings = await this.enrichBookingsWithUserData(response.documents as Booking[], 'escort')

      return bookings
    } catch (error) {
      console.error('Failed to get client bookings:', error)
      return []
    }
  }

  // Get booking by ID
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        bookingId
      )

      return response as Booking
    } catch (error) {
      console.error('Failed to get booking:', error)
      return null
    }
  }

  // Update booking status
  static async updateBookingStatus(
    bookingId: string,
    status: Booking['status'],
    notes?: string
  ): Promise<Booking | null> {
    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      const updates: any = { status }

      // Set timestamps based on status
      if (status === 'confirmed') {
        updates.confirmedAt = new Date().toISOString()
      } else if (status === 'completed') {
        updates.completedAt = new Date().toISOString()
      } else if (status === 'cancelled') {
        updates.cancelledAt = new Date().toISOString()
        updates.cancelledBy = authStore.user.$id
        if (notes) updates.cancellationReason = notes
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        bookingId,
        updates
      )

      const booking = response as Booking

      // Send appropriate notifications
      if (status === 'confirmed') {
        await notificationService.createNotification(
          booking.clientId,
          'booking_confirmed',
          'Booking Confirmed',
          `Your booking for ${booking.startDateTime} has been confirmed`,
          { bookingId: booking.$id }
        )
      } else if (status === 'cancelled') {
        const recipientId = authStore.user.$id === booking.clientId ? booking.escortId : booking.clientId
        await notificationService.createNotification(
          recipientId,
          'booking_cancelled',
          'Booking Cancelled',
          `Booking for ${booking.startDateTime} has been cancelled`,
          { bookingId: booking.$id, reason: notes }
        )
      }

      // Handle revenue for completed bookings
      if (status === 'completed' && booking.paymentStatus === 'paid') {
        const callDuration = booking.duration // in minutes
        const ratePerMinute = booking.totalAmount / booking.duration
        
        await revenueService.recordCallRevenue(
          booking.$id!,
          booking.escortId,
          callDuration * 60, // convert to seconds
          ratePerMinute,
          'video' // Default to video for now
        )
      }

      return booking
    } catch (error) {
      console.error('Failed to update booking status:', error)
      return null
    }
  }

  // Accept booking (escort action)
  static async acceptBooking(bookingId: string): Promise<Booking | null> {
    return this.updateBookingStatus(bookingId, 'confirmed')
  }

  // Decline booking (escort action)
  static async declineBooking(bookingId: string, reason?: string): Promise<Booking | null> {
    return this.updateBookingStatus(bookingId, 'cancelled', reason)
  }

  // Complete booking
  static async completeBooking(bookingId: string): Promise<Booking | null> {
    return this.updateBookingStatus(bookingId, 'completed')
  }

  // Cancel booking
  static async cancelBooking(bookingId: string, reason: string): Promise<Booking | null> {
    return this.updateBookingStatus(bookingId, 'cancelled', reason)
  }

  // Get booking statistics
  static async getBookingStats(userId: string, userType: 'escort' | 'client'): Promise<BookingStats> {
    try {
      const field = userType === 'escort' ? 'escortId' : 'clientId'
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        [
          Query.equal(field, userId),
          Query.limit(1000) // Get more bookings for stats
        ]
      )

      const bookings = response.documents as Booking[]
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      const stats: BookingStats = {
        pending: 0,
        confirmed: 0,
        today: 0,
        monthlyEarnings: 0,
        totalBookings: bookings.length,
        completionRate: 0
      }

      let completedCount = 0

      bookings.forEach(booking => {
        // Count by status
        if (booking.status === 'pending') stats.pending++
        if (booking.status === 'confirmed') stats.confirmed++
        if (booking.status === 'completed') completedCount++

        // Count today's bookings
        const bookingDate = booking.startDateTime.split('T')[0]
        if (bookingDate === today) stats.today++

        // Calculate monthly earnings (for escort)
        if (userType === 'escort') {
          const bookingMonth = new Date(booking.startDateTime).getMonth()
          const bookingYear = new Date(booking.startDateTime).getFullYear()
          
          if (bookingMonth === now.getMonth() && 
              bookingYear === now.getFullYear() &&
              (booking.status === 'completed' || booking.status === 'confirmed')) {
            stats.monthlyEarnings += booking.totalAmount
          }
        }
      })

      // Calculate completion rate
      if (stats.totalBookings > 0) {
        stats.completionRate = Math.round((completedCount / stats.totalBookings) * 100)
      }

      return stats
    } catch (error) {
      console.error('Failed to get booking stats:', error)
      return {
        pending: 0,
        confirmed: 0,
        today: 0,
        monthlyEarnings: 0,
        totalBookings: 0,
        completionRate: 0
      }
    }
  }

  // Private helper methods
  private static generateBookingNumber(): string {
    const prefix = 'BK'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  private static getDateRangeQueries(dateRange: string): any[] {
    const now = new Date()
    const queries = []

    switch (dateRange) {
      case 'today':
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString()
        queries.push(
          Query.greaterThanEqual('startDateTime', todayStart),
          Query.lessThanEqual('startDateTime', todayEnd)
        )
        break
      
      case 'tomorrow':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
        const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()
        queries.push(
          Query.greaterThanEqual('startDateTime', tomorrowStart),
          Query.lessThanEqual('startDateTime', tomorrowEnd)
        )
        break
      
      case 'week':
        const weekEnd = new Date(now)
        weekEnd.setDate(weekEnd.getDate() + 7)
        queries.push(
          Query.greaterThanEqual('startDateTime', now.toISOString()),
          Query.lessThanEqual('startDateTime', weekEnd.toISOString())
        )
        break
      
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
        queries.push(
          Query.greaterThanEqual('startDateTime', monthStart),
          Query.lessThanEqual('startDateTime', monthEnd)
        )
        break
    }

    return queries
  }

  private static async enrichBookingsWithUserData(
    bookings: Booking[],
    userType: 'client' | 'escort'
  ): Promise<Booking[]> {
    try {
      // Get unique user IDs
      const userIds = [...new Set(bookings.map(b => userType === 'client' ? b.clientId : b.escortId))]
      
      if (userIds.length === 0) return bookings

      // Fetch user data
      const userPromises = userIds.map(async (userId) => {
        try {
          // In a real app, you'd fetch from a users collection
          // For now, we'll create mock data
          return {
            $id: userId,
            name: `User ${userId.substring(0, 6)}`,
            email: `user${userId.substring(0, 6)}@example.com`,
            phone: '+1 (555) 000-0000',
            photo: `https://ui-avatars.com/api/?name=User+${userId.substring(0, 6)}&background=random`
          }
        } catch (error) {
          return null
        }
      })

      const users = await Promise.all(userPromises)
      const userMap = new Map(users.filter(u => u).map(u => [u!.$id, u]))

      // Enrich bookings
      return bookings.map(booking => {
        const userId = userType === 'client' ? booking.clientId : booking.escortId
        const user = userMap.get(userId)
        
        if (user) {
          if (userType === 'client') {
            booking.clientName = user.name
            booking.clientEmail = user.email
            booking.clientPhone = user.phone
            booking.clientPhoto = user.photo
          } else {
            booking.escortName = user.name
          }
        }

        // Add service name if not present
        if (!booking.service && booking.serviceDetails?.name) {
          booking.service = booking.serviceDetails.name
        } else if (!booking.service) {
          booking.service = booking.packageType || 'Standard Service'
        }

        return booking
      })
    } catch (error) {
      console.error('Failed to enrich bookings:', error)
      return bookings
    }
  }

  // Send reminder notifications
  static async sendBookingReminders(): Promise<void> {
    try {
      const now = new Date()
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000)

      // Get upcoming bookings
      const response = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        [
          Query.equal('status', 'confirmed'),
          Query.greaterThan('startDateTime', now.toISOString()),
          Query.lessThan('startDateTime', in24Hours.toISOString())
        ]
      )

      const bookings = response.documents as Booking[]

      for (const booking of bookings) {
        const bookingTime = new Date(booking.startDateTime)
        const timeDiff = bookingTime.getTime() - now.getTime()
        
        // 24-hour reminder
        if (timeDiff > 23 * 60 * 60 * 1000 && timeDiff <= 24 * 60 * 60 * 1000) {
          if (!booking.remindersSent?.includes('24h')) {
            await this.sendReminder(booking, '24h')
          }
        }
        
        // 2-hour reminder
        if (timeDiff > 1.5 * 60 * 60 * 1000 && timeDiff <= 2 * 60 * 60 * 1000) {
          if (!booking.remindersSent?.includes('2h')) {
            await this.sendReminder(booking, '2h')
          }
        }
      }
    } catch (error) {
      console.error('Failed to send booking reminders:', error)
    }
  }

  private static async sendReminder(booking: Booking, reminderType: string): Promise<void> {
    try {
      // Send to both client and escort
      const message = reminderType === '24h' 
        ? `Reminder: You have a booking tomorrow at ${booking.startDateTime}`
        : `Reminder: Your booking starts in 2 hours at ${booking.startDateTime}`

      await Promise.all([
        notificationService.createNotification(
          booking.clientId,
          'reminder',
          'Booking Reminder',
          message,
          { bookingId: booking.$id }
        ),
        notificationService.createNotification(
          booking.escortId,
          'reminder',
          'Booking Reminder',
          message,
          { bookingId: booking.$id }
        )
      ])

      // Update reminder sent status
      const remindersSent = booking.remindersSent || []
      remindersSent.push(reminderType)
      
      await databases.updateDocument(
        DATABASE_ID,
        BOOKINGS_COLLECTION_ID,
        booking.$id!,
        { remindersSent }
      )
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }
}

// Export singleton instance
export const bookingService = BookingService