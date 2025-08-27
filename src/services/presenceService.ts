import { Client, Databases, RealtimeResponseEvent, Query } from 'appwrite'
import { DATABASE_ID, USER_PRESENCE_COLLECTION_ID, client, databases } from '../lib/appwrite'
import { useAuthStore } from '../stores/auth'

export interface UserPresence {
  userId: string
  isOnline: boolean
  lastSeen: string
  status?: 'online' | 'away' | 'busy' | 'offline'
}

class PresenceService {
  private client: Client
  private databases: Databases
  private presenceCollection = USER_PRESENCE_COLLECTION_ID
  private presenceSubscription: (() => void) | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private presenceCallbacks: ((presence: UserPresence[]) => void)[] = []

  constructor() {
    this.client = client
    this.databases = databases
  }

  // Initialize presence tracking for the current user
  async initializePresence(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) return

    try {
      // Set current user as online
      await this.setUserOnline()
      
      // Start heartbeat to maintain online status
      this.startHeartbeat()
      
      // Listen for presence updates
      this.subscribeToPresenceUpdates()
      
      // Handle page visibility changes
      this.handleVisibilityChange()
      
      // Handle before unload to set offline
      this.handleBeforeUnload()
      
    } catch (error) {
      console.error('Failed to initialize presence:', error)
    }
  }

  // Set current user as online
  private async setUserOnline(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) return

    try {
      // Check if user is support - support should always show as busy
      const isSupport = authStore.user.labels?.includes('support') || 
                       authStore.user.name === 'Support' ||
                       authStore.user.email?.includes('support')
      
      const presence: UserPresence = {
        userId: authStore.user.$id,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        status: isSupport ? 'busy' : 'online'
      }

      // Try to update first, create if it doesn't exist
      try {
        await this.databases.updateDocument(
          DATABASE_ID,
          this.presenceCollection,
          authStore.user.$id,
          presence
        )
      } catch (error: any) {
        if (error.code === 404) {
          // Document doesn't exist, create it
          await this.databases.createDocument(
            DATABASE_ID,
            this.presenceCollection,
            authStore.user.$id, // Use userId as document ID
            presence
          )
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to set user online:', error)
    }
  }

  // Set current user as offline
  async setUserOffline(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) return

    try {
      const presence = {
        isOnline: false,
        lastSeen: new Date().toISOString(),
        status: 'offline'
      }

      // Try to update, create if doesn't exist
      try {
        await this.databases.updateDocument(
          DATABASE_ID,
          this.presenceCollection,
          authStore.user.$id,
          presence
        )
      } catch (error: any) {
        if (error.code === 404) {
          // Document doesn't exist, create it with full presence data
          await this.databases.createDocument(
            DATABASE_ID,
            this.presenceCollection,
            authStore.user.$id,
            {
              userId: authStore.user.$id,
              ...presence
            }
          )
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to set user offline:', error)
    }
  }

  // Start heartbeat to maintain online status
  private startHeartbeat(): void {
    // Update online status every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      await this.setUserOnline()
    }, 30000)
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Subscribe to real-time presence updates
  private subscribeToPresenceUpdates(): void {
    this.presenceSubscription = this.client.subscribe(
      `databases.${DATABASE_ID}.collections.${this.presenceCollection}.documents`,
      (response: RealtimeResponseEvent<UserPresence>) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update') ||
            response.events.includes('databases.*.collections.*.documents.*.create')) {
          
          // Notify callbacks about presence changes
          this.notifyPresenceChange([response.payload])
        }
      }
    )
  }

  // Get presence for specific users
  async getUsersPresence(userIds: string[]): Promise<UserPresence[]> {
    if (userIds.length === 0) return []

    try {
      // Use Appwrite Query class for proper query formatting
      const queries = []
      
      if (userIds.length === 1) {
        // Single user - simple equal query
        queries.push(Query.equal('userId', userIds[0]))
      } else {
        // Multiple users - use OR query
        queries.push(Query.or(
          userIds.map(userId => Query.equal('userId', userId))
        ))
      }
      
      const response = await this.databases.listDocuments(
        DATABASE_ID,
        this.presenceCollection,
        queries
      )

      return response.documents as UserPresence[]
    } catch (error) {
      console.error('Failed to get users presence:', error)
      return []
    }
  }

  // Subscribe to presence changes
  onPresenceChange(callback: (presence: UserPresence[]) => void): () => void {
    this.presenceCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.presenceCallbacks.indexOf(callback)
      if (index > -1) {
        this.presenceCallbacks.splice(index, 1)
      }
    }
  }

  // Notify all callbacks about presence changes
  private notifyPresenceChange(presence: UserPresence[]): void {
    this.presenceCallbacks.forEach(callback => {
      try {
        callback(presence)
      } catch (error) {
        console.error('Error in presence callback:', error)
      }
    })
  }

  // Handle page visibility change
  private handleVisibilityChange(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.setUserOnline()
        this.startHeartbeat()
      } else {
        this.stopHeartbeat()
        // Set as away instead of offline when tab becomes hidden
        this.setUserAway()
      }
    })
  }

  // Set user as away
  private async setUserAway(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) return

    try {
      // Check if user is support - support should always show as busy
      const isSupport = authStore.user.labels?.includes('support') || 
                       authStore.user.name === 'Support' ||
                       authStore.user.email?.includes('support')
      
      const presence = {
        isOnline: true,
        lastSeen: new Date().toISOString(),
        status: isSupport ? 'busy' : 'away'
      }

      // Try to update, create if doesn't exist
      try {
        await this.databases.updateDocument(
          DATABASE_ID,
          this.presenceCollection,
          authStore.user.$id,
          presence
        )
      } catch (error: any) {
        if (error.code === 404) {
          // Document doesn't exist, create it with full presence data
          await this.databases.createDocument(
            DATABASE_ID,
            this.presenceCollection,
            authStore.user.$id,
            {
              userId: authStore.user.$id,
              ...presence
            }
          )
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to set user away:', error)
    }
  }

  // Handle before page unload
  private handleBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      // Use sendBeacon for reliable offline status when leaving page
      const authStore = useAuthStore()
      if (authStore.user) {
        navigator.sendBeacon(
          `/api/presence/offline/${authStore.user.$id}`,
          JSON.stringify({ timestamp: new Date().toISOString() })
        )
      }
      this.setUserOffline()
    })
  }

  // Clean up presence tracking
  cleanup(): void {
    if (this.presenceSubscription) {
      this.presenceSubscription()
      this.presenceSubscription = null
    }
    
    this.stopHeartbeat()
    this.setUserOffline()
    this.presenceCallbacks = []
  }

  // Get formatted last seen text
  getLastSeenText(lastSeen: string): string {
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'online'
    if (diffMinutes < 5) return 'last seen just now'
    if (diffMinutes < 60) return `last seen ${diffMinutes} minutes ago`
    if (diffHours < 24) return `last seen ${diffHours} hours ago`
    if (diffDays < 7) return `last seen ${diffDays} days ago`
    
    return `last seen ${lastSeenDate.toLocaleDateString()}`
  }
}

// Export singleton instance
export const presenceService = new PresenceService()