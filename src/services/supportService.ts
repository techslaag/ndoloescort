import { databases, DATABASE_ID, ID, Query, SUPPORT_TICKETS_COLLECTION_ID, SUPPORT_MESSAGES_COLLECTION_ID } from '../lib/appwrite'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import { featureAccessService } from './featureAccessService'

export interface SupportTicket {
  $id?: string
  userId: string
  userEmail: string
  userName: string
  userType: 'client' | 'escort'
  subscriptionTier?: string
  isPriority: boolean
  subject: string
  category: 'account' | 'payment' | 'technical' | 'safety' | 'other'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string
  firstResponseAt?: string
  resolvedAt?: string
  closedAt?: string
  satisfactionRating?: number
  $createdAt?: string
  $updatedAt?: string
}

export interface SupportMessage {
  $id?: string
  ticketId: string
  senderId: string
  senderName: string
  senderType: 'user' | 'support' | 'system'
  message: string
  attachments?: string[]
  isInternal?: boolean // Internal notes between support staff
  $createdAt?: string
}

export interface SupportStats {
  openTickets: number
  avgResponseTime: number // in minutes
  avgResolutionTime: number // in hours
  satisfactionScore: number // 1-5
  ticketsThisMonth: number
  ticketsLastMonth: number
}

export class SupportService {
  // Create a new support ticket
  static async createTicket(
    subject: string,
    message: string,
    category: SupportTicket['category']
  ): Promise<SupportTicket | null> {
    try {
      const authStore = useAuthStore()
      const subscriptionStore = useSubscriptionStore()
      
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      // Check if user has priority support
      const priorityAccess = await featureAccessService.canAccessPrioritySupport()
      const isPriority = priorityAccess.canAccessFeature

      // Determine ticket priority based on subscription and category
      let priority: SupportTicket['priority'] = 'medium'
      if (isPriority) {
        priority = 'high'
      }
      if (category === 'payment') {
        priority = 'high'
      }
      if (category === 'safety') {
        priority = 'urgent'
      }

      const ticketData: Partial<SupportTicket> = {
        userId: authStore.user.$id,
        userEmail: authStore.user.email,
        userName: authStore.user.name || 'User',
        userType: authStore.user.prefs?.userType || 'client',
        subscriptionTier: subscriptionStore.currentSubscription?.tier || 'free',
        isPriority,
        subject,
        category,
        status: 'open',
        priority
      }

      const ticket = await databases.createDocument(
        DATABASE_ID,
        SUPPORT_TICKETS_COLLECTION_ID,
        ID.unique(),
        ticketData
      )

      // Create initial message
      if (message) {
        await this.addMessage(ticket.$id, message, 'user')
      }

      // Send notification to support team
      await this.notifySupportTeam(ticket as SupportTicket)

      return ticket as SupportTicket
    } catch (error) {
      console.error('Failed to create support ticket:', error)
      return null
    }
  }

  // Add message to ticket
  static async addMessage(
    ticketId: string,
    message: string,
    senderType: SupportMessage['senderType'],
    attachments?: string[],
    isInternal?: boolean
  ): Promise<SupportMessage | null> {
    try {
      const authStore = useAuthStore()
      if (!authStore.user && senderType === 'user') {
        throw new Error('User not authenticated')
      }

      const messageData: Partial<SupportMessage> = {
        ticketId,
        senderId: senderType === 'user' ? authStore.user!.$id : 'support',
        senderName: senderType === 'user' ? authStore.user!.name || 'User' : 'Support Team',
        senderType,
        message,
        attachments,
        isInternal
      }

      const created = await databases.createDocument(
        DATABASE_ID,
        SUPPORT_MESSAGES_COLLECTION_ID,
        ID.unique(),
        messageData
      )

      // Update ticket status if support is responding
      if (senderType === 'support') {
        const ticket = await databases.getDocument(
          DATABASE_ID,
          SUPPORT_TICKETS_COLLECTION_ID,
          ticketId
        )

        const updates: any = {
          status: 'in_progress'
        }

        // Set first response time if not set
        if (!ticket.firstResponseAt) {
          updates.firstResponseAt = new Date().toISOString()
        }

        await databases.updateDocument(
          DATABASE_ID,
          SUPPORT_TICKETS_COLLECTION_ID,
          ticketId,
          updates
        )
      }

      return created as SupportMessage
    } catch (error) {
      console.error('Failed to add support message:', error)
      return null
    }
  }

  // Get user's tickets
  static async getUserTickets(
    userId: string,
    status?: SupportTicket['status']
  ): Promise<SupportTicket[]> {
    try {
      const queries = [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt')
      ]

      if (status) {
        queries.push(Query.equal('status', status))
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        SUPPORT_TICKETS_COLLECTION_ID,
        queries
      )

      return response.documents as SupportTicket[]
    } catch (error) {
      console.error('Failed to get user tickets:', error)
      return []
    }
  }

  // Get ticket messages
  static async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUPPORT_MESSAGES_COLLECTION_ID,
        [
          Query.equal('ticketId', ticketId),
          Query.orderAsc('$createdAt')
        ]
      )

      // Filter out internal messages for non-support users
      const authStore = useAuthStore()
      const isSupport = authStore.user?.prefs?.isSupport || false

      if (!isSupport) {
        return response.documents.filter((msg: any) => !msg.isInternal) as SupportMessage[]
      }

      return response.documents as SupportMessage[]
    } catch (error) {
      console.error('Failed to get ticket messages:', error)
      return []
    }
  }

  // Update ticket status
  static async updateTicketStatus(
    ticketId: string,
    status: SupportTicket['status'],
    satisfactionRating?: number
  ): Promise<boolean> {
    try {
      const updates: any = { status }

      if (status === 'resolved') {
        updates.resolvedAt = new Date().toISOString()
      } else if (status === 'closed') {
        updates.closedAt = new Date().toISOString()
        if (satisfactionRating) {
          updates.satisfactionRating = satisfactionRating
        }
      }

      await databases.updateDocument(
        DATABASE_ID,
        SUPPORT_TICKETS_COLLECTION_ID,
        ticketId,
        updates
      )

      return true
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      return false
    }
  }

  // Get support stats
  static async getSupportStats(userId?: string): Promise<SupportStats> {
    try {
      const queries = userId ? [Query.equal('userId', userId)] : []
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUPPORT_TICKETS_COLLECTION_ID,
        [...queries, Query.limit(1000)]
      )

      const tickets = response.documents as SupportTicket[]
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

      let openTickets = 0
      let totalResponseTime = 0
      let responseCount = 0
      let totalResolutionTime = 0
      let resolutionCount = 0
      let totalSatisfaction = 0
      let satisfactionCount = 0
      let ticketsThisMonth = 0
      let ticketsLastMonth = 0

      tickets.forEach(ticket => {
        if (ticket.status === 'open' || ticket.status === 'in_progress') {
          openTickets++
        }

        const createdDate = new Date(ticket.$createdAt!)
        if (createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear) {
          ticketsThisMonth++
        } else if (createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear) {
          ticketsLastMonth++
        }

        if (ticket.firstResponseAt) {
          const responseTime = new Date(ticket.firstResponseAt).getTime() - new Date(ticket.$createdAt!).getTime()
          totalResponseTime += responseTime
          responseCount++
        }

        if (ticket.resolvedAt) {
          const resolutionTime = new Date(ticket.resolvedAt).getTime() - new Date(ticket.$createdAt!).getTime()
          totalResolutionTime += resolutionTime
          resolutionCount++
        }

        if (ticket.satisfactionRating) {
          totalSatisfaction += ticket.satisfactionRating
          satisfactionCount++
        }
      })

      const avgResponseTime = responseCount > 0 
        ? Math.round(totalResponseTime / responseCount / 1000 / 60) // minutes
        : 0

      const avgResolutionTime = resolutionCount > 0
        ? Math.round(totalResolutionTime / resolutionCount / 1000 / 60 / 60) // hours
        : 0

      const satisfactionScore = satisfactionCount > 0
        ? Math.round((totalSatisfaction / satisfactionCount) * 10) / 10
        : 0

      return {
        openTickets,
        avgResponseTime,
        avgResolutionTime,
        satisfactionScore,
        ticketsThisMonth,
        ticketsLastMonth
      }
    } catch (error) {
      console.error('Failed to get support stats:', error)
      return {
        openTickets: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        satisfactionScore: 0,
        ticketsThisMonth: 0,
        ticketsLastMonth: 0
      }
    }
  }

  // Notify support team of new ticket
  private static async notifySupportTeam(ticket: SupportTicket): Promise<void> {
    try {
      // In production, this would:
      // 1. Send email to support team
      // 2. Send push notification to support app
      // 3. Update support dashboard
      // 4. Assign to available agent based on priority

      if (ticket.isPriority || ticket.priority === 'urgent') {
        // Priority handling
        console.log('PRIORITY TICKET:', ticket.subject)
        // Send immediate alert to senior support staff
      }

      // Log for now
      console.log('New support ticket created:', {
        id: ticket.$id,
        subject: ticket.subject,
        priority: ticket.priority,
        isPriority: ticket.isPriority
      })
    } catch (error) {
      console.error('Failed to notify support team:', error)
    }
  }

  // Get estimated response time based on priority
  static getEstimatedResponseTime(isPriority: boolean, category: SupportTicket['category']): string {
    if (category === 'safety') {
      return 'Within 1 hour'
    }
    
    if (isPriority) {
      return 'Within 2 hours'
    }

    switch (category) {
      case 'payment':
        return 'Within 4 hours'
      case 'technical':
        return 'Within 8 hours'
      case 'account':
      case 'other':
      default:
        return 'Within 24 hours'
    }
  }

  // Check if user has access to priority support
  static async hasPrioritySupport(): Promise<boolean> {
    const access = await featureAccessService.canAccessPrioritySupport()
    return access.canAccessFeature
  }
}

// Export singleton instance
export const supportService = SupportService