import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { databases, DATABASE_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID, CALLS_COLLECTION_ID, SUPPORT_USER_ID } from '../lib/appwrite'
import { useAuthStore } from './auth'
import { EncryptedStorage } from '../lib/encryption'
import { MessagingService } from '../services/messagingService'
import CryptoJS from 'crypto-js'
import { Query, ID } from 'appwrite'
import type { Models } from 'appwrite'
import { presenceService, type UserPresence } from '../services/presenceService'
import { notificationService } from '../services/notificationService'

// Message auto-deletion periods (in minutes)
export const AUTO_DELETE_PERIODS = {
  IMMEDIATE: 0,
  FIVE_MINUTES: 5,
  ONE_HOUR: 60,
  ONE_DAY: 1440,
  ONE_WEEK: 10080,
  NEVER: -1
} as const

export type AutoDeletePeriod = typeof AUTO_DELETE_PERIODS[keyof typeof AUTO_DELETE_PERIODS]

export interface Message {
  $id?: string
  conversationId: string
  senderId: string
  receiverId: string
  content: string
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'call_request' | 'system'
  isEncrypted: boolean
  autoDeleteAt?: string
  autoDeletePeriod: AutoDeletePeriod
  isRead: boolean
  deliveredAt?: string
  readAt?: string
  attachmentUrl?: string
  attachmentType?: string
  attachmentSize?: number
  $createdAt?: string
  $updatedAt?: string
  // Message states for UI
  sendingState?: 'sending' | 'sent' | 'failed'
  isTemp?: boolean // For temporary messages before server confirmation
  tempId?: string // Temporary ID for local messages
  error?: string // Error message if sending failed
  reactions?: Record<string, number> // Emoji reactions count for display
  reactionsRaw?: string | Record<string, string[]> // Raw reactions data with user IDs
  replyTo?: string // ID of message being replied to
}

export interface Conversation {
  $id?: string
  participants: string[]
  participantRoles: Record<string, 'client' | 'escort' | 'support'>
  initiatedBy: string // Who started the conversation
  conversationType: 'client_escort' | 'client_support' | 'escort_support'
  lastMessage?: Message
  lastActivity: string
  isArchived: boolean
  encryptionKey: string
  autoDeletePeriod: AutoDeletePeriod
  $createdAt?: string
  $updatedAt?: string
}

export interface CallSession {
  $id?: string
  conversationId: string
  callerId: string
  receiverId: string
  type: 'voice' | 'video'
  status: 'pending' | 'active' | 'ended' | 'rejected'
  startedAt?: string
  endedAt?: string
  $createdAt?: string
}

// Note: The collection IDs are imported from appwrite.ts

export const useMessagingStore = defineStore('messaging', () => {
  const conversations = ref<Conversation[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const activeConversation = ref<string | null>(null)
  const activeCalls = ref<CallSession[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const userPresence = ref<Record<string, UserPresence>>({})
  let cleanupInterval: NodeJS.Timeout | null = null
  let presenceUnsubscribe: (() => void) | null = null

  const authStore = useAuthStore()
  const encryptedStorage = new EncryptedStorage()

  // Generate encryption key for a conversation
  const generateConversationKey = (participantIds: string[]): string => {
    // Use a deterministic key based on participant IDs only
    // This ensures both participants generate the same key
    const sortedIds = participantIds.sort().join('-')
    // Add a static salt for additional security
    const salt = 'EliteCompanions-E2E-Encryption-2024'
    return CryptoJS.SHA256(sortedIds + salt).toString()
  }

  // Encrypt message content
  const encryptMessage = (content: string, conversationKey: string): string => {
    try {
      return CryptoJS.AES.encrypt(content, conversationKey).toString()
    } catch (error) {
      console.error('Message encryption failed:', error)
      return content
    }
  }

  // Decrypt message content
  const decryptMessage = (encryptedContent: string, conversationKey: string): string => {
    try {
      if (!encryptedContent || !conversationKey) {
        console.warn('Missing content or key for decryption')
        return '[Encrypted Message]'
      }
      
      const bytes = CryptoJS.AES.decrypt(encryptedContent, conversationKey)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      
      // Check if decryption actually worked
      if (!decrypted || decrypted.trim() === '') {
        console.warn('Decryption resulted in empty content')
        return '[Encrypted Message]'
      }
      
      return decrypted
    } catch (error) {
      console.error('Message decryption failed:', error)
      return '[Encrypted Message]'
    }
  }

  // Calculate auto-delete timestamp
  const calculateAutoDeleteAt = (period: AutoDeletePeriod): string | undefined => {
    if (period === AUTO_DELETE_PERIODS.NEVER) return undefined
    if (period === AUTO_DELETE_PERIODS.IMMEDIATE) return new Date().toISOString()
    
    const deleteTime = new Date()
    deleteTime.setMinutes(deleteTime.getMinutes() + period)
    return deleteTime.toISOString()
  }

  // Get user role from preferences or profile
  const getUserRole = (user: any): 'client' | 'escort' | 'support' => {
    // Check user preferences for role
    if (user?.prefs?.userType) {
      return user.prefs.userType
    }
    
    // Check if user has escort profiles (indicating escort role)
    if (user?.prefs?.hasEscortProfile) {
      return 'escort'
    }
    
    // Check if user is support (special support user ID or email domain)
    if (user?.email?.endsWith('@support.elitecompanions.com') || user?.$id === SUPPORT_USER_ID) {
      return 'support'
    }
    
    // Default to client
    return 'client'
  }

  // Get other participant info from a conversation
  const getOtherParticipant = (conversation: Conversation) => {
    const currentUserId = authStore.user?.$id
    const otherUserId = conversation.participants.find(id => id !== currentUserId)
    
    // Check if it's a support conversation
    if (otherUserId === SUPPORT_USER_ID || conversation.conversationType?.includes('support')) {
      return {
        id: SUPPORT_USER_ID,
        name: 'Support Team',
        role: 'support' as const
      }
    }
    
    // Get role from conversation participant roles
    const otherUserRole = conversation.participantRoles?.[otherUserId || ''] || 'client'
    
    // Return participant info
    return {
      id: otherUserId || '',
      name: `${otherUserRole.charAt(0).toUpperCase() + otherUserRole.slice(1)} ${otherUserId?.slice(-4) || 'Unknown'}`,
      role: otherUserRole
    }
  }

  // Check if conversation is allowed based on roles
  const canInitiateConversation = (initiatorRole: string, targetRole: string): boolean => {
    // Support can talk to anyone
    if (initiatorRole === 'support' || targetRole === 'support') {
      return true
    }
    
    // Clients can initiate conversations with escorts
    if (initiatorRole === 'client' && targetRole === 'escort') {
      return true
    }
    
    // Escorts cannot initiate conversations with clients
    if (initiatorRole === 'escort' && targetRole === 'client') {
      return false
    }
    
    // No same-role conversations (except support)
    return false
  }

  // Check if user can reply to existing conversation
  const canReplyToConversation = (conversation: Conversation, userId: string): boolean => {
    // Must be a participant
    if (!conversation.participants.includes(userId)) {
      return false
    }
    
    const userRole = conversation.participantRoles[userId]
    
    // Support can always reply
    if (userRole === 'support') {
      return true
    }
    
    // Clients can always reply to their conversations
    if (userRole === 'client') {
      return true
    }
    
    // Escorts can only reply, not initiate (but if conversation exists, they can reply)
    if (userRole === 'escort') {
      return true
    }
    
    return false
  }

  // Get or create conversation with permission checks
  const getOrCreateConversation = async (participantId: string, targetRole?: string): Promise<Conversation | null> => {
    try {
      if (!authStore.user) return null

      const currentUserId = authStore.user.$id
      const currentUserRole = getUserRole(authStore.user)
      const participantIds = [currentUserId, participantId].sort()

      // Try to find existing conversation
      let existingConversation = conversations.value.find(conv => 
        conv.participants.length === 2 &&
        conv.participants.includes(currentUserId) &&
        conv.participants.includes(participantId)
      )

      if (existingConversation) {
        // Check if user can reply to existing conversation
        if (!canReplyToConversation(existingConversation, currentUserId)) {
          error.value = 'You do not have permission to reply to this conversation'
          return null
        }
        return existingConversation
      }

      // For new conversations, check if initiation is allowed
      const resolvedTargetRole = targetRole || 'client' // Default assumption
      if (!canInitiateConversation(currentUserRole, resolvedTargetRole)) {
        if (currentUserRole === 'escort' && resolvedTargetRole === 'client') {
          error.value = 'Escorts can only reply to messages from clients, not initiate conversations'
        } else {
          error.value = 'You do not have permission to start this conversation'
        }
        return null
      }

      // Determine conversation type
      let conversationType: 'client_escort' | 'client_support' | 'escort_support'
      if ((currentUserRole === 'client' && resolvedTargetRole === 'escort') || 
          (currentUserRole === 'escort' && resolvedTargetRole === 'client')) {
        conversationType = 'client_escort'
      } else if ((currentUserRole === 'client' && resolvedTargetRole === 'support') || 
                 (currentUserRole === 'support' && resolvedTargetRole === 'client')) {
        conversationType = 'client_support'
      } else {
        conversationType = 'escort_support'
      }

      // Create new conversation
      const conversationKey = generateConversationKey(participantIds)
      const participantRoles: Record<string, 'client' | 'escort' | 'support'> = {
        [currentUserId]: currentUserRole,
        [participantId]: resolvedTargetRole
      }

      const newConversation = {
        participants: participantIds,
        participantRoles: JSON.stringify(participantRoles),
        initiatedBy: currentUserId,
        conversationType,
        lastActivity: new Date().toISOString(),
        isArchived: false,
        encryptionKey: conversationKey,
        autoDeletePeriod: AUTO_DELETE_PERIODS.NEVER
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        ID.unique(),
        newConversation
      )

      // Parse the response to convert participantRoles back to object
      const conversation: Conversation = {
        ...response,
        participantRoles: JSON.parse(response.participantRoles as string)
      }
      conversations.value.push(conversation)
      return conversation

    } catch (err: any) {
      error.value = err.message || 'Failed to create conversation'
      return null
    }
  }

  // Send message with permission checks
  const sendMessage = async (
    receiverId: string,
    content: string,
    type: Message['type'] = 'text',
    autoDeletePeriod: AutoDeletePeriod = AUTO_DELETE_PERIODS.NEVER,
    targetRole?: string,
    attachmentData?: {
      url: string
      mimeType: string
      size: number
    },
    replyTo?: string
  ): Promise<boolean> => {
    try {
      if (!authStore.user) return false

      isLoading.value = true
      error.value = null

      const conversation = await getOrCreateConversation(receiverId, targetRole)
      if (!conversation) return false

      // Additional permission check for sending messages
      if (!canReplyToConversation(conversation, authStore.user.$id)) {
        error.value = 'You do not have permission to send messages in this conversation'
        return false
      }

      // Create temporary message for immediate UI feedback
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tempMessage: Message = {
        tempId,
        conversationId: conversation.$id!,
        senderId: authStore.user.$id,
        receiverId,
        content,
        type,
        isEncrypted: false, // Display as unencrypted for temp message
        autoDeletePeriod,
        isRead: false,
        sendingState: 'sending',
        isTemp: true,
        replyTo,
        $createdAt: new Date().toISOString(),
        ...(attachmentData ? {
          attachmentUrl: attachmentData.url,
          attachmentType: attachmentData.mimeType,
          attachmentSize: attachmentData.size
        } : {})
      }

      // Add temporary message to UI immediately
      if (!messages.value[conversation.$id!]) {
        messages.value[conversation.$id!] = []
      }
      messages.value[conversation.$id!].push(tempMessage)

      // Encrypt message content for server
      const encryptedContent = encryptMessage(content, conversation.encryptionKey)
      const autoDeleteAt = calculateAutoDeleteAt(autoDeletePeriod)

      // Build message data with all required fields
      const messageData: any = {
        conversationId: conversation.$id!,
        senderId: authStore.user.$id,
        receiverId,
        content: encryptedContent,
        type,
        isEncrypted: true,
        autoDeleteAt: autoDeleteAt || null,
        autoDeletePeriod,
        isRead: false,
        deliveredAt: new Date().toISOString(),
        replyTo: replyTo || null,
        // Initialize attachment fields only if provided
        ...(attachmentData ? {
          attachmentUrl: attachmentData.url,
          attachmentType: attachmentData.mimeType,
          attachmentSize: attachmentData.size
        } : {})
      }

      // Log the data being sent to Appwrite
      console.log('Sending message data to Appwrite:', {
        conversationId: messageData.conversationId,
        type: messageData.type,
        attachmentUrl: messageData.attachmentUrl,
        attachmentType: messageData.attachmentType,
        attachmentSize: messageData.attachmentSize,
        hasAttachmentData: !!attachmentData,
        fullMessageData: messageData
      })

      let response
      try {
        response = await databases.createDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          ID.unique(),
          messageData
        )
        
        console.log('Message created in Appwrite:', {
          id: response.$id,
          type: response.type,
          attachmentUrl: response.attachmentUrl,
          attachmentType: response.attachmentType,
          attachmentSize: response.attachmentSize,
          hasAttachmentUrl: !!response.attachmentUrl
        })

        // Remove temporary message and add real message
        const tempIndex = messages.value[conversation.$id!].findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          messages.value[conversation.$id!].splice(tempIndex, 1)
        }

        const message = response as unknown as Message
        
        // Decrypt for local storage
        message.content = decryptMessage(message.content, conversation.encryptionKey)
        message.sendingState = 'sent'
        
        // Add real message to local messages
        if (!messages.value[conversation.$id!]) {
          messages.value[conversation.$id!] = []
        }
        messages.value[conversation.$id!].push(message)
        
        // Send notification to receiver
        try {
          const senderName = authStore.user?.name || 'Someone'
          const messagePreview = type === 'text' ? content.substring(0, 100) : `Sent a ${type}`
          await notificationService.notifyNewMessage(
            receiverId,
            senderName,
            conversation.$id!,
            messagePreview
          )
        } catch (notifError) {
          console.error('Failed to send notification:', notifError)
          // Don't fail the message send if notification fails
        }

      } catch (dbError: any) {
        console.error('Failed to create message document:', dbError)
        console.error('Message data that failed:', messageData)
        
        // Update temporary message to failed state
        const tempIndex = messages.value[conversation.$id!].findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          messages.value[conversation.$id!][tempIndex].sendingState = 'failed'
          messages.value[conversation.$id!][tempIndex].error = dbError.message || 'Failed to send message'
        }
        
        throw dbError
      }

      const message = messages.value[conversation.$id!][messages.value[conversation.$id!].length - 1]

      // Update conversation's last message and unread count
      conversation.lastMessage = message
      conversation.lastActivity = message.$createdAt!
      
      // Update unread count for receiver
      const unreadCount = conversation.unreadCount || {}
      if (!message.isRead && message.receiverId !== authStore.user.$id) {
        unreadCount[message.receiverId] = (unreadCount[message.receiverId] || 0) + 1
      }
      
      // Update conversation in database
      try {
        await databases.updateDocument(
          DATABASE_ID,
          CONVERSATIONS_COLLECTION_ID,
          conversation.$id!,
          {
            lastMessageId: message.$id,
            lastActivity: message.$createdAt!,
            unreadCount: JSON.stringify(unreadCount)
          }
        )
      } catch (updateErr) {
        console.error('Failed to update conversation:', updateErr)
      }

      return true

    } catch (err: any) {
      error.value = err.message || 'Failed to send message'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Load conversations from Appwrite
  const loadConversations = async (): Promise<void> => {
    try {
      if (!authStore.user) return

      isLoading.value = true
      error.value = null

      const userId = authStore.user.$id
      
      // Query conversations where user is a participant
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.search('participants', userId),
          Query.orderDesc('lastActivity'),
          Query.limit(50)
        ]
      )

      // Parse participant roles from JSON string
      const conversationsWithParsedRoles = response.documents.map((conv: any) => {
        const parsedConv = {
          ...conv,
          participantRoles: typeof conv.participantRoles === 'string' 
            ? JSON.parse(conv.participantRoles) 
            : conv.participantRoles,
          unreadCount: typeof conv.unreadCount === 'string'
            ? JSON.parse(conv.unreadCount)
            : conv.unreadCount || {}
        }
        
        // Regenerate encryption key if it's missing or invalid
        if (!parsedConv.encryptionKey || parsedConv.encryptionKey.length < 10) {
          parsedConv.encryptionKey = generateConversationKey(parsedConv.participants)
          console.log('Regenerated encryption key for conversation:', parsedConv.$id)
        }
        
        return parsedConv
      })

      conversations.value = conversationsWithParsedRoles as Conversation[]

      // Load last message for each conversation
      await Promise.all(
        conversations.value.map(async (conv) => {
          if (conv.lastMessageId) {
            try {
              const message = await databases.getDocument(
                DATABASE_ID,
                MESSAGES_COLLECTION_ID,
                conv.lastMessageId
              )
              
              // Decrypt if needed
              if (message.isEncrypted && conv.encryptionKey) {
                try {
                  const decryptedContent = decryptMessage(message.content, conv.encryptionKey)
                  // Only update if decryption was successful
                  if (decryptedContent && decryptedContent !== '[Encrypted Message]' && decryptedContent.trim() !== '') {
                    message.content = decryptedContent
                    message.isEncrypted = false // Mark as decrypted to avoid re-decryption
                  } else {
                    console.warn('Decryption returned empty or invalid content, keeping encrypted content for retry', {
                      conversationId: conv.$id,
                      originalContent: message.content.substring(0, 50)
                    })
                    // Keep the encrypted content so ConversationList can retry
                  }
                } catch (decryptError) {
                  console.error('Failed to decrypt last message for conversation:', conv.$id, decryptError)
                  // Keep the encrypted content so ConversationList can retry
                  // Don't replace with '[Encrypted Message]' placeholder
                }
              }
              
              // Ensure all message fields are preserved
              conv.lastMessage = {
                ...message,
                content: message.content
              } as unknown as Message
              
              console.log('Loaded last message for conversation:', conv.$id, {
                type: conv.lastMessage.type,
                hasAttachmentUrl: !!conv.lastMessage.attachmentUrl,
                attachmentUrl: conv.lastMessage.attachmentUrl
              })
            } catch (error) {
              console.error('Failed to load last message for conversation:', conv.$id, error)
            }
          } else if (conv.$id) {
            // Fallback: try to get the most recent message for this conversation
            try {
              const messagesResponse = await databases.listDocuments(
                DATABASE_ID,
                MESSAGES_COLLECTION_ID,
                [
                  Query.equal('conversationId', conv.$id),
                  Query.orderDesc('$createdAt'),
                  Query.limit(1)
                ]
              )
              
              if (messagesResponse.documents.length > 0) {
                const message = messagesResponse.documents[0] as any
                
                // Decrypt if needed
                if (message.isEncrypted && conv.encryptionKey) {
                  try {
                    const decryptedContent = decryptMessage(message.content, conv.encryptionKey)
                    // Only update if decryption was successful
                    if (decryptedContent && decryptedContent !== '[Encrypted Message]' && decryptedContent.trim() !== '') {
                      message.content = decryptedContent
                      message.isEncrypted = false // Mark as decrypted to avoid re-decryption
                    } else {
                      console.warn('Decryption returned empty or invalid content in fallback, keeping encrypted content for retry', {
                        conversationId: conv.$id,
                        originalContent: message.content.substring(0, 50)
                      })
                      // Keep the encrypted content so ConversationList can retry
                    }
                  } catch (decryptError) {
                    console.error('Failed to decrypt fallback message for conversation:', conv.$id, decryptError)
                    // Keep the encrypted content so ConversationList can retry
                    // Don't replace with '[Encrypted Message]' placeholder
                  }
                }
                
                // Ensure all message fields are preserved
              conv.lastMessage = {
                ...message,
                content: message.content
              } as unknown as Message
              
              console.log('Loaded last message for conversation:', conv.$id, {
                type: conv.lastMessage.type,
                hasAttachmentUrl: !!conv.lastMessage.attachmentUrl,
                attachmentUrl: conv.lastMessage.attachmentUrl
              })
              }
            } catch (error) {
              console.error('Failed to load fallback message for conversation:', conv.$id, error)
            }
          }
        })
      )

    } catch (err: any) {
      error.value = err.message || 'Failed to load conversations'
      console.error('Load conversations error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Load messages for a conversation from Appwrite
  const loadMessages = async (conversationId: string, limit: number = 50, offset: number = 0): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const conversation = conversations.value.find(c => c.$id === conversationId)
      if (!conversation) {
        error.value = 'Conversation not found'
        return
      }

      // Query messages for this conversation
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.equal('conversationId', conversationId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset)
        ]
      )

      // Decrypt messages and process reactions
      const decryptedMessages = response.documents.map((msg: any) => {
        let content = msg.content
        
        if (msg.isEncrypted && conversation.encryptionKey) {
          try {
            content = decryptMessage(content, conversation.encryptionKey)
          } catch (error) {
            console.error('Failed to decrypt message:', error)
            content = '[Encrypted Message]'
          }
        }
        
        // Process reactions - convert from stored format to display format
        let reactions: Record<string, number> | undefined
        let reactionsRaw: Record<string, string[]> | undefined
        if (msg.reactions) {
          try {
            const parsedReactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions
            
            // Convert from { emoji: [userIds] } to { emoji: count }
            if (parsedReactions && typeof parsedReactions === 'object') {
              reactions = {}
              reactionsRaw = {}
              for (const [emoji, value] of Object.entries(parsedReactions)) {
                if (Array.isArray(value)) {
                  // Filter out "unknown" values
                  const validUserIds = value.filter(id => typeof id === 'string' && id !== 'unknown')
                  if (validUserIds.length > 0) {
                    reactions[emoji] = validUserIds.length
                    reactionsRaw[emoji] = validUserIds
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to parse reactions:', error)
          }
        }
        
        return {
          ...msg,
          content,
          reactions,
          reactionsRaw: reactionsRaw || msg.reactions // Use filtered reactions or original
        } as Message
      })

      // Reverse to show oldest first
      decryptedMessages.reverse()

      if (offset === 0) {
        messages.value[conversationId] = decryptedMessages
      } else {
        // Prepend older messages for pagination
        messages.value[conversationId] = [...decryptedMessages, ...(messages.value[conversationId] || [])]
      }

      // Mark messages as read if they're for current user
      if (authStore.user) {
        const unreadMessages = decryptedMessages.filter(
          msg => msg.receiverId === authStore.user!.$id && !msg.isRead
        )
        
        // Batch mark as read
        if (unreadMessages.length > 0) {
          await Promise.all(
            unreadMessages.map(msg => markMessageAsRead(msg.$id!))
          )
        }
      }

    } catch (err: any) {
      error.value = err.message || 'Failed to load messages'
      console.error('Load messages error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Auto-delete expired messages
  const cleanupExpiredMessages = async (): Promise<void> => {
    try {
      const now = new Date()
      
      for (const conversationId in messages.value) {
        const conversationMessages = messages.value[conversationId]
        const validMessages = conversationMessages.filter(msg => {
          if (!msg.autoDeleteAt) return true
          return new Date(msg.autoDeleteAt) > now
        })

        if (validMessages.length !== conversationMessages.length) {
          messages.value[conversationId] = validMessages
          // In a real implementation, you'd also delete from the database
        }
      }

    } catch (err: any) {
      console.error('Failed to cleanup expired messages:', err)
    }
  }

  // Mark message as read in Appwrite
  const markMessageAsRead = async (messageId: string): Promise<void> => {
    try {
      // Only mark as read if user is the receiver
      let isReceiver = false
      let targetMessage: Message | null = null
      
      // Find the message to check if current user is receiver
      for (const conversationId in messages.value) {
        const message = messages.value[conversationId].find(m => m.$id === messageId)
        if (message) {
          targetMessage = message
          isReceiver = message.receiverId === authStore.user?.$id
          break
        }
      }
      
      if (!targetMessage || !isReceiver) {
        console.log('Cannot mark message as read: user is not the receiver')
        return
      }
      
      const readAt = new Date().toISOString()
      
      // Update in database using the service
      const success = await MessagingService.markMessageAsRead(messageId)
      
      if (success) {
        // Update locally only if database update succeeded
        for (const conversationId in messages.value) {
          const messageIndex = messages.value[conversationId].findIndex(m => m.$id === messageId)
          if (messageIndex !== -1) {
            messages.value[conversationId][messageIndex].isRead = true
            messages.value[conversationId][messageIndex].readAt = readAt
            
            // Update unread count for conversation
            const conversation = conversations.value.find(c => c.$id === conversationId)
            if (conversation && authStore.user) {
              const unreadCount = conversation.unreadCount || {}
              if (unreadCount[authStore.user.$id]) {
                unreadCount[authStore.user.$id] = Math.max(0, (unreadCount[authStore.user.$id] || 0) - 1)
                
                // Update conversation in database
                await databases.updateDocument(
                  DATABASE_ID,
                  CONVERSATIONS_COLLECTION_ID,
                  conversationId,
                  {
                    unreadCount: JSON.stringify(unreadCount)
                  }
                )
              }
            }
            
            break
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to mark message as read:', err)
    }
  }

  // Resend failed message
  const resendMessage = async (message: Message): Promise<boolean> => {
    if (!message.isTemp || message.sendingState !== 'failed') {
      console.error('Cannot resend message: not a failed temp message')
      return false
    }

    // Update message state to sending
    const conversationMessages = messages.value[message.conversationId]
    const messageIndex = conversationMessages.findIndex(m => m.tempId === message.tempId)
    
    if (messageIndex !== -1) {
      conversationMessages[messageIndex].sendingState = 'sending'
      conversationMessages[messageIndex].error = undefined
    }

    // Extract attachment data if exists
    const attachmentData = message.attachmentUrl ? {
      url: message.attachmentUrl,
      mimeType: message.attachmentType || '',
      size: message.attachmentSize || 0
    } : undefined

    // Resend the message
    return await sendMessage(
      message.receiverId,
      message.content,
      message.type,
      message.autoDeletePeriod,
      undefined, // targetRole - will be determined by existing conversation
      attachmentData
    )
  }

  // Delete message
  const deleteMessage = async (messageId: string, conversationId: string): Promise<boolean> => {
    try {
      isLoading.value = true

      // Find the message
      const conversationMessages = messages.value[conversationId] || []
      const messageIndex = conversationMessages.findIndex(m => m.$id === messageId || m.tempId === messageId)
      
      if (messageIndex === -1) {
        console.error('Message not found for deletion')
        return false
      }

      const message = conversationMessages[messageIndex]

      // Check if user can delete this message (only sender or system admin)
      if (message.senderId !== authStore.user?.$id) {
        error.value = 'You can only delete your own messages'
        return false
      }

      // If it's a temp message, just remove from local state
      if (message.isTemp) {
        conversationMessages.splice(messageIndex, 1)
        return true
      }

      // Delete from server
      if (message.$id) {
        await databases.deleteDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          message.$id
        )
      }

      // Remove from local state
      conversationMessages.splice(messageIndex, 1)

      // Update conversation's last message if this was the last message
      const conversation = conversations.value.find(c => c.$id === conversationId)
      if (conversation && conversation.lastMessage?.$id === messageId) {
        // Find new last message
        if (conversationMessages.length > 0) {
          conversation.lastMessage = conversationMessages[conversationMessages.length - 1]
        } else {
          conversation.lastMessage = undefined
        }
      }

      return true

    } catch (err: any) {
      console.error('Failed to delete message:', err)
      error.value = err.message || 'Failed to delete message'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Add or toggle reaction on a message (each user can only have one reaction)
  const toggleMessageReaction = async (messageId: string, conversationId: string, emoji: string): Promise<boolean> => {
    try {
      console.log('toggleMessageReaction called:', { messageId, conversationId, emoji })
      isLoading.value = true
      
      // Find the message
      const conversationMessages = messages.value[conversationId] || []
      const message = conversationMessages.find(m => m.$id === messageId || m.tempId === messageId)
      
      if (!message || message.isTemp) {
        console.error('Cannot react to temporary or non-existent message')
        return false
      }

      console.log('📋 Found message for reaction:', {
        messageId: message.$id,
        reactions: message.reactions,
        reactionsRaw: message.reactionsRaw
      })
      
      const currentUserId = authStore.user?.$id
      if (!currentUserId) {
        console.error('User not authenticated')
        return false
      }
      
      // Get current reactions from reactionsRaw (which has the raw user ID arrays)
      let reactions: Record<string, string[]> = {}
      
      // Use reactionsRaw if available (this contains the actual user IDs)
      if (message.reactionsRaw) {
        if (typeof message.reactionsRaw === 'string') {
          try {
            const parsed = JSON.parse(message.reactionsRaw)
            if (parsed && typeof parsed === 'object') {
              // Filter out any invalid data
              for (const [emoji, value] of Object.entries(parsed)) {
                if (Array.isArray(value)) {
                  // Only keep valid user IDs (not "unknown")
                  reactions[emoji] = value.filter(id => typeof id === 'string' && id !== 'unknown')
                  if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse reactionsRaw:', e)
            reactions = {}
          }
        } else if (typeof message.reactionsRaw === 'object') {
          // If it's already an object, filter out any invalid data
          for (const [emoji, value] of Object.entries(message.reactionsRaw)) {
            if (Array.isArray(value)) {
              reactions[emoji] = value.filter(id => typeof id === 'string' && id !== 'unknown')
              if (reactions[emoji].length === 0) {
                delete reactions[emoji]
              }
            }
          }
        }
      }
      
      // If no reactionsRaw, we need to fetch from database to get the raw format
      if (Object.keys(reactions).length === 0 && message.reactions && Object.keys(message.reactions).length > 0) {
        console.log('⚠️ No reactionsRaw found, fetching from database to get raw reactions')
        try {
          const dbMessage = await databases.getDocument(
            DATABASE_ID,
            MESSAGES_COLLECTION_ID,
            messageId
          )
          
          if (dbMessage.reactions) {
            const parsed = typeof dbMessage.reactions === 'string' 
              ? JSON.parse(dbMessage.reactions) 
              : dbMessage.reactions
              
            if (parsed && typeof parsed === 'object') {
              for (const [emoji, value] of Object.entries(parsed)) {
                if (Array.isArray(value)) {
                  reactions[emoji] = value.filter(id => typeof id === 'string' && id !== 'unknown')
                  if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch reactions from database:', error)
        }
      }
      
      // Remove user's previous reaction (they can only have one)
      let removedReaction = false
      console.log('Current reactions before processing:', reactions)
      for (const [existingEmoji, userIds] of Object.entries(reactions)) {
        const userIndex = userIds.indexOf(currentUserId)
        if (userIndex > -1) {
          console.log(`Removing user ${currentUserId} from emoji ${existingEmoji}`)
          userIds.splice(userIndex, 1)
          if (userIds.length === 0) {
            delete reactions[existingEmoji]
            console.log(`Deleted empty emoji ${existingEmoji}`)
          }
          // If the user is clicking the same emoji, just remove it
          if (existingEmoji === emoji) {
            removedReaction = true
            console.log(`User is removing their reaction to ${emoji}`)
          }
          break // User can only have one reaction, so we can stop after finding it
        }
      }
      
      // Add new reaction if not just removing the same one
      if (!removedReaction) {
        console.log(`Adding new reaction ${emoji} for user ${currentUserId}`)
        if (!reactions[emoji]) {
          reactions[emoji] = []
        }
        reactions[emoji].push(currentUserId)
      }
      
      console.log('Final reactions:', reactions)
      
      // Update in database
      const updatedReactions = Object.keys(reactions).length > 0 ? JSON.stringify(reactions) : null
      
      await databases.updateDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        message.$id!,
        {
          reactions: updatedReactions
        }
      )
      
      // Update local state - convert back to display format { emoji: count }
      const displayReactions: Record<string, number> = {}
      for (const [emoji, userIds] of Object.entries(reactions)) {
        displayReactions[emoji] = userIds.length
      }
      message.reactions = displayReactions
      message.reactionsRaw = reactions // Store raw reactions for hasUserReacted checks
      
      console.log('Updated message.reactions:', message.reactions)
      console.log('Updated message.reactionsRaw:', message.reactionsRaw)
      
      return true
      
    } catch (err: any) {
      console.error('Failed to toggle reaction:', err)
      error.value = err.message || 'Failed to toggle reaction'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Delete conversation in Appwrite
  const deleteConversation = async (conversationId: string): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null

      // Delete all messages in the conversation first
      const messagesToDelete = messages.value[conversationId] || []
      
      if (messagesToDelete.length > 0) {
        await Promise.all(
          messagesToDelete.map(msg => 
            databases.deleteDocument(
              DATABASE_ID,
              MESSAGES_COLLECTION_ID,
              msg.$id!
            ).catch(console.error)
          )
        )
      }

      // Delete the conversation
      await databases.deleteDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        conversationId
      )

      // Remove from local state
      conversations.value = conversations.value.filter(c => c.$id !== conversationId)
      delete messages.value[conversationId]

      return true

    } catch (err: any) {
      error.value = err.message || 'Failed to delete conversation'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Start call
  const startCall = async (receiverId: string, type: 'voice' | 'video'): Promise<CallSession | null> => {
    try {
      if (!authStore.user) return null

      // Check feature access for calls
      const { featureAccessService } = await import('../services/featureAccessService')
      
      if (type === 'video') {
        const videoAccess = await featureAccessService.canAccessVideoCall()
        if (!videoAccess.canAccessFeature) {
          error.value = videoAccess.reason || 'Video calls not available'
          return null
        }
      } else {
        const audioAccess = await featureAccessService.canAccessAudioCall()
        if (!audioAccess.canAccessFeature) {
          error.value = audioAccess.reason || 'Audio calls not available'
          return null
        }
      }

      const conversation = await getOrCreateConversation(receiverId)
      if (!conversation) return null

      const callData: Partial<CallSession> = {
        conversationId: conversation.$id!,
        callerId: authStore.user.$id,
        receiverId,
        type,
        status: 'pending'
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        CALLS_COLLECTION_ID,
        ID.unique(),
        callData
      )

      const callSession = response as unknown as CallSession
      activeCalls.value.push(callSession)

      // Send system message about call
      const callMessage = type === 'video' ? 'video call started' : 'voice call started'
      await sendMessage(receiverId, callMessage, 'call_request')

      return callSession

    } catch (err: any) {
      error.value = err.message || 'Failed to start call'
      return null
    }
  }

  // End call in Appwrite
  const acceptCall = async (callId: string): Promise<CallSession | null> => {
    try {
      const callIndex = activeCalls.value.findIndex(c => c.$id === callId)
      if (callIndex === -1) return null
      
      const startedAt = new Date().toISOString()
      
      // Update in database
      const response = await databases.updateDocument(
        DATABASE_ID,
        CALLS_COLLECTION_ID,
        callId,
        {
          status: 'active',
          startedAt
        }
      )
      
      // Update local state
      activeCalls.value[callIndex] = response as CallSession
      
      // Send system message about call acceptance
      const call = activeCalls.value[callIndex]
      if (call) {
        const callType = call.type === 'video' ? 'Video' : 'Voice'
        const acceptMessage = `${callType} call answered`
        
        const otherParticipant = call.callerId === authStore.user?.$id ? call.receiverId : call.callerId
        await sendMessage(otherParticipant, acceptMessage, 'system')
      }
      
      return response as CallSession
    } catch (err: any) {
      error.value = err.message || 'Failed to accept call'
      return null
    }
  }

  const endCall = async (callId: string): Promise<void> => {
    try {
      const callIndex = activeCalls.value.findIndex(c => c.$id === callId)
      if (callIndex === -1) return
      
      const endedAt = new Date().toISOString()
      const call = activeCalls.value[callIndex]
      
      // Calculate duration if call was active
      let duration = 0
      if (call.startedAt && call.status === 'active') {
        duration = Math.floor((new Date(endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      }
      
      // Update in database
      await databases.updateDocument(
        DATABASE_ID,
        CALLS_COLLECTION_ID,
        callId,
        {
          status: 'ended',
          endedAt,
          duration
        }
      )
      
      // Update local state
      activeCalls.value[callIndex].status = 'ended'
      activeCalls.value[callIndex].endedAt = endedAt
      activeCalls.value[callIndex].duration = duration
      
      // Send system message about call end with duration (only if not already ended)
      if (call.status !== 'ended') {
        if (call.status === 'active' && duration > 0) {
          const minutes = Math.floor(duration / 60)
          const seconds = duration % 60
          const durationText = minutes > 0 
            ? `${minutes}m ${seconds}s` 
            : `${seconds}s`
          
          const callType = call.type === 'video' ? 'Video' : 'Voice'
          const endMessage = `${callType} call ended (${durationText})`
          
          // Send to both participants
          const otherParticipant = call.callerId === authStore.user?.$id ? call.receiverId : call.callerId
          await sendMessage(otherParticipant, endMessage, 'system')
        } else if (call.status === 'pending') {
          // Call was declined or missed
          const callType = call.type === 'video' ? 'Video' : 'Voice'
          const missedMessage = `${callType} call missed`
          
          const otherParticipant = call.callerId === authStore.user?.$id ? call.receiverId : call.callerId
          await sendMessage(otherParticipant, missedMessage, 'system')
        }
      }
      
      // Remove from active calls after a delay
      setTimeout(() => {
        activeCalls.value = activeCalls.value.filter(c => c.$id !== callId)
      }, 1000)
    } catch (err: any) {
      console.error('Failed to end call:', err)
    }
  }

  // Computed properties
  const getConversationMessages = computed(() => (conversationId: string) => {
    return messages.value[conversationId] || []
  })

  const unreadCount = computed(() => {
    if (!authStore.user) return 0
    
    let count = 0
    for (const conversationId in messages.value) {
      count += messages.value[conversationId].filter(
        msg => !msg.isRead && msg.receiverId === authStore.user!.$id
      ).length
    }
    return count
  })

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Initialize cleanup interval
  const initCleanupInterval = () => {
    // Clean up expired messages every minute
    if (!cleanupInterval) {
      cleanupInterval = setInterval(cleanupExpiredMessages, 60000)
    }
  }
  
  // Search messages in a conversation
  const searchMessages = async (conversationId: string, searchTerm: string): Promise<Message[]> => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.equal('conversationId', conversationId),
          Query.search('content', searchTerm),
          Query.orderDesc('$createdAt'),
          Query.limit(50)
        ]
      )
      
      const conversation = conversations.value.find(c => c.$id === conversationId)
      if (!conversation) return []
      
      // Decrypt messages
      const decryptedMessages = response.documents.map((msg: any) => {
        let content = msg.content
        
        if (msg.isEncrypted && conversation.encryptionKey) {
          try {
            content = decryptMessage(content, conversation.encryptionKey)
          } catch (error) {
            console.error('Failed to decrypt message:', error)
            content = '[Encrypted Message]'
          }
        }
        
        return {
          ...msg,
          content
        } as Message
      })
      
      return decryptedMessages
    } catch (err: any) {
      console.error('Failed to search messages:', err)
      return []
    }
  }
  
  // Get conversation by participants
  const getConversationByParticipants = async (participantIds: string[]): Promise<Conversation | null> => {
    try {
      const sortedIds = participantIds.sort()
      
      // Search for existing conversation
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.equal('participants', sortedIds),
          Query.limit(1)
        ]
      )
      
      if (response.documents.length > 0) {
        const conv = response.documents[0] as any
        return {
          ...conv,
          participantRoles: typeof conv.participantRoles === 'string' 
            ? JSON.parse(conv.participantRoles) 
            : conv.participantRoles,
          unreadCount: typeof conv.unreadCount === 'string'
            ? JSON.parse(conv.unreadCount)
            : conv.unreadCount || {}
        } as Conversation
      }
      
      return null
    } catch (err: any) {
      console.error('Failed to get conversation by participants:', err)
      return null
    }
  }


  // Check if current user can message another user
  const canMessageUser = (targetUserId: string, targetRole: string): boolean => {
    if (!authStore.user) return false
    
    const currentUserRole = getUserRole(authStore.user)
    return canInitiateConversation(currentUserRole, targetRole)
  }

  // Get conversation restrictions for display
  const getConversationRestrictions = () => {
    if (!authStore.user) return { canInitiate: [], canReplyTo: [] }
    
    const userRole = getUserRole(authStore.user)
    
    const restrictions = {
      client: {
        canInitiate: ['escort', 'support'],
        canReplyTo: ['escort', 'support'],
        description: 'Clients can message escorts and support'
      },
      escort: {
        canInitiate: ['support'],
        canReplyTo: ['client', 'support'],
        description: 'Escorts can only reply to client messages, but can initiate contact with support'
      },
      support: {
        canInitiate: ['client', 'escort'],
        canReplyTo: ['client', 'escort'],
        description: 'Support can message anyone'
      }
    }
    
    return restrictions[userRole as keyof typeof restrictions] || restrictions.client
  }

  // Fix encryption keys for existing conversations
  const fixConversationEncryptionKeys = async (): Promise<void> => {
    try {
      console.log('Starting encryption key fix for all conversations...')
      
      for (const conversation of conversations.value) {
        const correctKey = generateConversationKey(conversation.participants)
        
        if (conversation.encryptionKey !== correctKey) {
          console.log(`Fixing encryption key for conversation ${conversation.$id}`)
          
          // Update in database
          try {
            await databases.updateDocument(
              DATABASE_ID,
              CONVERSATIONS_COLLECTION_ID,
              conversation.$id!,
              {
                encryptionKey: correctKey
              }
            )
            
            // Update local state
            conversation.encryptionKey = correctKey
            
            console.log(`Successfully updated encryption key for conversation ${conversation.$id}`)
          } catch (updateErr) {
            console.error(`Failed to update encryption key for conversation ${conversation.$id}:`, updateErr)
          }
        }
      }
      
      console.log('Encryption key fix completed')
      
      // Reload conversations to ensure everything is in sync
      await loadConversations()
    } catch (err: any) {
      console.error('Failed to fix conversation encryption keys:', err)
      error.value = 'Failed to fix encryption keys'
    }
  }

  // Reset store to initial state
  const $reset = () => {
    conversations.value = []
    messages.value = {}
    activeConversation.value = null
    activeCalls.value = []
    isLoading.value = false
    error.value = null
    
    // Clear any intervals
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  // Initialize presence tracking
  const initializePresence = async (): Promise<void> => {
    await presenceService.initializePresence()
    
    // Subscribe to presence changes
    presenceUnsubscribe = presenceService.onPresenceChange((updatedPresence) => {
      updatedPresence.forEach((presence) => {
        userPresence.value[presence.userId] = presence
      })
    })
    
    // Load presence for conversation participants
    await loadConversationParticipantsPresence()
  }

  // Load presence for all conversation participants
  const loadConversationParticipantsPresence = async (): Promise<void> => {
    try {
      const allParticipants = new Set<string>()
      
      // Collect all participant IDs from conversations
      conversations.value.forEach(conv => {
        conv.participants.forEach(participantId => {
          if (participantId !== authStore.user?.$id) {
            allParticipants.add(participantId)
          }
        })
      })
      
      if (allParticipants.size > 0) {
        const presenceList = await presenceService.getUsersPresence(Array.from(allParticipants))
        presenceList.forEach(presence => {
          userPresence.value[presence.userId] = presence
        })
      }
    } catch (error) {
      console.error('Failed to load participants presence:', error)
    }
  }

  // Get user presence
  const getUserPresence = (userId: string): UserPresence | null => {
    return userPresence.value[userId] || null
  }

  // Check if user is online
  const isUserOnline = (userId: string): boolean => {
    const presence = getUserPresence(userId)
    return presence?.isOnline && presence?.status === 'online'
  }

  // Get formatted last seen text
  const getLastSeenText = (userId: string): string => {
    const presence = getUserPresence(userId)
    if (!presence) return 'last seen recently'
    
    if (presence.isOnline) {
      switch (presence.status) {
        case 'online':
          return 'online'
        case 'busy':
          return 'busy'
        case 'away':
          return 'away'
        default:
          return 'online'
      }
    }
    
    return presenceService.getLastSeenText(presence.lastSeen)
  }

  // Cleanup presence tracking
  const cleanupPresence = (): void => {
    if (presenceUnsubscribe) {
      presenceUnsubscribe()
      presenceUnsubscribe = null
    }
    presenceService.cleanup()
  }

  // Clean up reactions with "unknown" values (one-time cleanup)
  const cleanupReactions = async (): Promise<void> => {
    try {
      console.log('Starting reactions cleanup...')
      
      // Get all messages from all conversations
      for (const conversationId of Object.keys(messages.value)) {
        const conversationMessages = messages.value[conversationId]
        
        for (const message of conversationMessages) {
          if (message.reactions && message.$id) {
            let needsUpdate = false
            let cleanedReactions: Record<string, string[]> = {}
            
            // Parse reactions
            let parsedReactions: any
            try {
              if (typeof message.reactions === 'string') {
                parsedReactions = JSON.parse(message.reactions)
              } else {
                parsedReactions = message.reactions
              }
            } catch (e) {
              continue
            }
            
            // Check if cleanup is needed
            if (parsedReactions && typeof parsedReactions === 'object') {
              for (const [emoji, value] of Object.entries(parsedReactions)) {
                if (Array.isArray(value)) {
                  const validUserIds = value.filter(id => typeof id === 'string' && id !== 'unknown')
                  if (validUserIds.length !== value.length) {
                    needsUpdate = true
                  }
                  if (validUserIds.length > 0) {
                    cleanedReactions[emoji] = validUserIds
                  }
                }
              }
              
              // Update if needed
              if (needsUpdate) {
                const updatedReactions = Object.keys(cleanedReactions).length > 0 
                  ? JSON.stringify(cleanedReactions) 
                  : null
                
                try {
                  await databases.updateDocument(
                    DATABASE_ID,
                    MESSAGES_COLLECTION_ID,
                    message.$id,
                    {
                      reactions: updatedReactions
                    }
                  )
                  console.log(`Cleaned reactions for message ${message.$id}`)
                  
                  // Update local state
                  const displayReactions: Record<string, number> = {}
                  for (const [emoji, userIds] of Object.entries(cleanedReactions)) {
                    displayReactions[emoji] = userIds.length
                  }
                  message.reactions = displayReactions
                  message.reactionsRaw = cleanedReactions
                } catch (err) {
                  console.error(`Failed to clean reactions for message ${message.$id}:`, err)
                }
              }
            }
          }
        }
      }
      
      console.log('Reactions cleanup completed')
    } catch (error) {
      console.error('Error during reactions cleanup:', error)
    }
  }

  return {
    conversations,
    messages,
    activeConversation,
    activeCalls,
    isLoading,
    error,
    unreadCount,
    getConversationMessages,
    sendMessage,
    resendMessage,
    deleteMessage,
    toggleMessageReaction,
    loadConversations,
    loadMessages,
    markMessageAsRead,
    deleteConversation,
    startCall,
    acceptCall,
    endCall,
    getOrCreateConversation,
    getConversationByParticipants,
    canMessageUser,
    getUserRole,
    getOtherParticipant,
    getConversationRestrictions,
    searchMessages,
    decryptMessage,
    clearError,
    initCleanupInterval,
    fixConversationEncryptionKeys,
    initializePresence,
    loadConversationParticipantsPresence,
    getUserPresence,
    isUserOnline,
    getLastSeenText,
    cleanupPresence,
    cleanupReactions,
    userPresence,
    AUTO_DELETE_PERIODS,
    $reset
  }
}, {
  persist: {
    key: 'messaging-store',
    storage: {
      getItem: (key: string) => {
        const encryptedStorage = new EncryptedStorage()
        return encryptedStorage.getItem(key)
      },
      setItem: (key: string, value: any) => {
        const encryptedStorage = new EncryptedStorage()
        encryptedStorage.setItem(key, value)
      },
      removeItem: (key: string) => {
        const encryptedStorage = new EncryptedStorage()
        encryptedStorage.removeItem(key)
      }
    }
  }
})