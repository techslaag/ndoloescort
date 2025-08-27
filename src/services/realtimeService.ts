import { client, databases, DATABASE_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID, CALLS_COLLECTION_ID } from '../lib/appwrite'
import { RealtimeResponseEvent } from 'appwrite'
import { useMessagingStore } from '../stores/messaging'
import { useAuthStore } from '../stores/auth'
import type { Message, Conversation, CallSession } from '../stores/messaging'

// Subscription types
type RealtimeCallback = (payload: RealtimeResponseEvent<any>) => void
type UnsubscribeFunction = () => void

class RealtimeService {
  private subscriptions: Map<string, UnsubscribeFunction> = new Map()
  private messagingStore: any = null
  private authStore: any = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isConnected: boolean = false

  // Initialize stores (call this from main.ts after pinia is initialized)
  initStores() {
    this.messagingStore = useMessagingStore()
    this.authStore = useAuthStore()
  }

  // Subscribe to conversation updates
  subscribeToConversations(): UnsubscribeFunction {
    if (!this.authStore?.user) {
      console.warn('Cannot subscribe to conversations: User not authenticated')
      return () => {}
    }

    const userId = this.authStore.user.$id
    const channel = `databases.${DATABASE_ID}.collections.${CONVERSATIONS_COLLECTION_ID}.documents`

    // Subscribe to conversation changes where user is a participant
    const unsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<Conversation>) => {
      if (!response.payload) return

      const conversation = response.payload
      
      // Check if current user is a participant
      if (!conversation.participants?.includes(userId)) return

      // Handle different event types
      switch (response.events[0]) {
        case 'databases.*.collections.*.documents.*.create':
          this.handleNewConversation(conversation)
          break
        case 'databases.*.collections.*.documents.*.update':
          this.handleConversationUpdate(conversation)
          break
        case 'databases.*.collections.*.documents.*.delete':
          this.handleConversationDelete(conversation.$id!)
          break
      }
    })

    this.subscriptions.set('conversations', unsubscribe)
    return unsubscribe
  }

  // Subscribe to messages in a specific conversation
  subscribeToMessages(conversationId: string): UnsubscribeFunction {
    if (!this.authStore?.user) {
      console.warn('Cannot subscribe to messages: User not authenticated')
      return () => {}
    }

    const channel = `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`

    const unsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<Message>) => {
      if (!response.payload) return

      const message = response.payload
      
      // Only handle messages for this conversation
      if (message.conversationId !== conversationId) return

      // Handle different event types
      switch (response.events[0]) {
        case 'databases.*.collections.*.documents.*.create':
          this.handleNewMessage(message)
          break
        case 'databases.*.collections.*.documents.*.update':
          this.handleMessageUpdate(message)
          break
        case 'databases.*.collections.*.documents.*.delete':
          this.handleMessageDelete(message.$id!, conversationId)
          break
      }
    })

    const subscriptionKey = `messages-${conversationId}`
    
    // Unsubscribe from previous messages subscription if exists
    const existingSubscription = this.subscriptions.get(subscriptionKey)
    if (existingSubscription) {
      existingSubscription()
    }

    this.subscriptions.set(subscriptionKey, unsubscribe)
    return unsubscribe
  }

  // Subscribe to call events
  subscribeToCalls(conversationId?: string): UnsubscribeFunction {
    if (!this.authStore?.user) {
      console.warn('Cannot subscribe to calls: User not authenticated')
      return () => {}
    }

    const userId = this.authStore.user.$id
    const channel = `databases.${DATABASE_ID}.collections.${CALLS_COLLECTION_ID}.documents`

    const unsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<CallSession>) => {
      if (!response.payload) return

      const call = response.payload
      
      // Filter by conversation if provided
      if (conversationId && call.conversationId !== conversationId) return
      
      // Only handle calls where user is involved
      if (call.callerId !== userId && call.receiverId !== userId) return

      // Handle different event types
      switch (response.events[0]) {
        case 'databases.*.collections.*.documents.*.create':
          this.handleNewCall(call)
          break
        case 'databases.*.collections.*.documents.*.update':
          this.handleCallUpdate(call)
          break
        case 'databases.*.collections.*.documents.*.delete':
          this.handleCallEnd(call.$id!)
          break
      }
    })

    const subscriptionKey = conversationId ? `calls-${conversationId}` : 'calls'
    
    // Unsubscribe from previous calls subscription if exists
    const existingSubscription = this.subscriptions.get(subscriptionKey)
    if (existingSubscription) {
      existingSubscription()
    }

    this.subscriptions.set(subscriptionKey, unsubscribe)
    return unsubscribe
  }

  // Handle new conversation
  private handleNewConversation(conversation: Conversation) {
    if (!this.messagingStore) return

    // Add to store if not already present
    const exists = this.messagingStore.conversations.find(
      (c: Conversation) => c.$id === conversation.$id
    )
    
    if (!exists) {
      this.messagingStore.conversations.push(conversation)
      
      // Show notification
      this.showNotification('New Conversation', 'You have a new conversation')
    }
  }

  // Handle conversation update
  private handleConversationUpdate(conversation: Conversation) {
    if (!this.messagingStore) return

    const index = this.messagingStore.conversations.findIndex(
      (c: Conversation) => c.$id === conversation.$id
    )
    
    if (index !== -1) {
      this.messagingStore.conversations[index] = conversation
    }
  }

  // Handle conversation deletion
  private handleConversationDelete(conversationId: string) {
    if (!this.messagingStore) return

    this.messagingStore.conversations = this.messagingStore.conversations.filter(
      (c: Conversation) => c.$id !== conversationId
    )
    
    // Clean up messages for this conversation
    delete this.messagingStore.messages[conversationId]
  }

  // Handle new message
  private async handleNewMessage(message: Message) {
    if (!this.messagingStore || !this.authStore?.user) return

    const conversationId = message.conversationId
    const currentUserId = this.authStore.user.$id
    
    // Find conversation
    const conversation = this.messagingStore.conversations.find(
      (c: Conversation) => c.$id === conversationId
    )
    
    if (!conversation) return

    // Decrypt message if encrypted
    if (message.isEncrypted && conversation.encryptionKey) {
      try {
        const decryptedContent = this.messagingStore.decryptMessage(
          message.content,
          conversation.encryptionKey
        )
        message.content = decryptedContent
      } catch (error) {
        console.error('Failed to decrypt realtime message:', error)
      }
    }

    // Add to messages
    if (!this.messagingStore.messages[conversationId]) {
      this.messagingStore.messages[conversationId] = []
    }
    
    // Check if message already exists (prevent duplicates)
    const exists = this.messagingStore.messages[conversationId].find(
      (m: Message) => m.$id === message.$id
    )
    
    if (!exists) {
      this.messagingStore.messages[conversationId].push(message)
      
      // Update conversation's last message and activity
      conversation.lastMessage = message
      conversation.lastActivity = message.$createdAt || new Date().toISOString()
      
      // Show notification if message is from other user
      if (message.senderId !== currentUserId) {
        const senderName = conversation.participantRoles?.[message.senderId] || 'User'
        this.showNotification(
          `New message from ${senderName}`,
          message.type === 'text' ? message.content : `Sent a ${message.type}`
        )
        
        // Play notification sound
        this.playNotificationSound()
      }
      
      // Auto-mark as read if conversation is active
      if (this.messagingStore.activeConversation === conversationId && 
          message.receiverId === currentUserId && 
          !message.isRead) {
        await this.messagingStore.markMessageAsRead(message.$id!)
      }
    }
  }

  // Handle message update (e.g., read status, reactions)
  private handleMessageUpdate(message: Message) {
    if (!this.messagingStore) return

    const conversationId = message.conversationId
    
    if (!this.messagingStore.messages[conversationId]) return
    
    const index = this.messagingStore.messages[conversationId].findIndex(
      (m: Message) => m.$id === message.$id
    )
    
    if (index !== -1) {
      // Process reactions if present
      let reactions: Record<string, number> | undefined
      let reactionsRaw = message.reactions // This comes as raw data from server
      let filteredReactionsRaw: Record<string, string[]> | undefined
      
      if (reactionsRaw) {
        try {
          const parsedReactions = typeof reactionsRaw === 'string' ? JSON.parse(reactionsRaw) : reactionsRaw
          
          // Convert from { emoji: [userIds] } to { emoji: count }
          if (parsedReactions && typeof parsedReactions === 'object') {
            reactions = {}
            filteredReactionsRaw = {}
            for (const [emoji, value] of Object.entries(parsedReactions)) {
              if (Array.isArray(value)) {
                // Filter out "unknown" values
                const validUserIds = value.filter(id => typeof id === 'string' && id !== 'unknown')
                if (validUserIds.length > 0) {
                  reactions[emoji] = validUserIds.length
                  filteredReactionsRaw[emoji] = validUserIds
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse reactions:', error)
        }
      }
      
      // Update the message with processed reactions
      console.log('Real-time reaction update:', { messageId: message.$id, reactions, filteredReactionsRaw })
      this.messagingStore.messages[conversationId][index] = {
        ...message,
        reactions,
        reactionsRaw: filteredReactionsRaw || reactionsRaw
      }
    }
  }

  // Handle message deletion
  private handleMessageDelete(messageId: string, conversationId: string) {
    if (!this.messagingStore) return

    if (!this.messagingStore.messages[conversationId]) return
    
    this.messagingStore.messages[conversationId] = this.messagingStore.messages[conversationId].filter(
      (m: Message) => m.$id !== messageId
    )
  }

  // Handle new call
  private handleNewCall(call: CallSession) {
    if (!this.messagingStore || !this.authStore?.user) return

    const currentUserId = this.authStore.user.$id
    
    // Add to active calls
    this.messagingStore.activeCalls.push(call)
    
    // Show notification for incoming call
    if (call.receiverId === currentUserId && call.status === 'pending') {
      this.showCallNotification(call)
      this.playRingtone()
    }
  }

  // Handle call update
  private handleCallUpdate(call: CallSession) {
    if (!this.messagingStore) return

    const index = this.messagingStore.activeCalls.findIndex(
      (c: CallSession) => c.$id === call.$id
    )
    
    if (index !== -1) {
      this.messagingStore.activeCalls[index] = call
      
      // Stop ringtone if call is no longer pending
      if (call.status !== 'pending') {
        this.stopRingtone()
      }
    }
  }

  // Handle call end
  private handleCallEnd(callId: string) {
    if (!this.messagingStore) return

    this.messagingStore.activeCalls = this.messagingStore.activeCalls.filter(
      (c: CallSession) => c.$id !== callId
    )
    
    this.stopRingtone()
  }

  // Show notification
  private showNotification(title: string, body: string) {
    // Check if notifications are supported and permitted
    if (!('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'elitecompanions-message',
        renotify: true
      })
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showNotification(title, body)
        }
      })
    }
  }

  // Show call notification
  private showCallNotification(call: CallSession) {
    const title = call.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'
    const body = 'Click to answer'
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `call-${call.$id}`,
        requireInteraction: true,
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' }
        ]
      })
      
      notification.onclick = () => {
        // Handle answer
        window.focus()
        // Navigate to call screen or handle call acceptance
      }
    }
  }

  // Play notification sound
  private playNotificationSound() {
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(console.error)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  // Play ringtone
  private playRingtone() {
    try {
      const audio = new Audio('/sounds/ringtone.mp3')
      audio.volume = 0.7
      audio.loop = true
      audio.play().catch(console.error)
      
      // Store audio instance to stop later
      (window as any).__ringtoneAudio = audio
    } catch (error) {
      console.error('Failed to play ringtone:', error)
    }
  }

  // Stop ringtone
  private stopRingtone() {
    const audio = (window as any).__ringtoneAudio
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      delete (window as any).__ringtoneAudio
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions.clear()
    this.isConnected = false
  }

  // Unsubscribe from specific subscription
  unsubscribe(key: string) {
    const unsubscribe = this.subscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  // Handle connection state
  private handleConnectionChange(connected: boolean) {
    this.isConnected = connected
    
    if (!connected) {
      // Schedule reconnection
      this.scheduleReconnect()
    } else {
      // Clear reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.reconnect()
    }, 5000) // Retry after 5 seconds
  }

  // Reconnect subscriptions
  private reconnect() {
    if (!this.authStore?.user) return
    
    // Re-subscribe to conversations
    this.subscribeToConversations()
    
    // Re-subscribe to active conversation messages if any
    if (this.messagingStore?.activeConversation) {
      this.subscribeToMessages(this.messagingStore.activeConversation)
    }
    
    // Re-subscribe to calls
    this.subscribeToCalls()
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected
  }
}

export const realtimeService = new RealtimeService()