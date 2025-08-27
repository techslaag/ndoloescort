import { databases, DATABASE_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID, SUPPORT_USER_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import type { Models } from 'appwrite'

export class WelcomeMessageService {
  // Create a support conversation for new user
  static async createWelcomeConversation(userId: string, userType: 'client' | 'escort'): Promise<Models.Document | null> {
    try {
      // Check if conversation already exists
      const existingConversations = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.equal('participants', [userId, SUPPORT_USER_ID]),
          Query.limit(1)
        ]
      )

      if (existingConversations.documents.length > 0) {
        return existingConversations.documents[0]
      }

      // Create new conversation
      const conversation = await databases.createDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        ID.unique(),
        {
          participants: [userId, SUPPORT_USER_ID],
          participantRoles: JSON.stringify({
            [userId]: userType,
            [SUPPORT_USER_ID]: 'support'
          }),
          initiatedBy: SUPPORT_USER_ID,
          conversationType: userType === 'client' ? 'client_support' : 'escort_support',
          lastActivity: new Date().toISOString(),
          isArchived: false,
          encryptionKey: '', // No encryption for support messages
          autoDeletePeriod: -1 // Never auto-delete
        }
      )

      // Send welcome message
      await this.sendWelcomeMessage(conversation.$id, userId, userType)

      return conversation
    } catch (error) {
      console.error('Error creating welcome conversation:', error)
      return null
    }
  }

  // Send welcome message
  static async sendWelcomeMessage(conversationId: string, userId: string, userType: 'client' | 'escort'): Promise<void> {
    try {
      const welcomeContent = userType === 'client' 
        ? `Welcome to NdoloEscorts! 🎉

We're thrilled to have you join our exclusive community. Here's what you can do:

• Browse our verified escorts and their services
• Book appointments securely through our platform  
• Message escorts directly (once they accept your request)
• Access 24/7 support for any questions or concerns

Your privacy and safety are our top priorities. All communications are encrypted and your information is kept strictly confidential.

If you need any assistance, don't hesitate to reach out. We're here to help!

Best regards,
The NdoloEscorts Support Team`
        : `Welcome to NdoloEscorts! 🎉

Congratulations on joining our exclusive network of elite companions. Here's how to get started:

• Complete your profile to attract more clients
• Upload high-quality photos (you can blur them for privacy)
• Set your services, rates, and availability
• Respond promptly to client inquiries
• Maintain professionalism in all interactions

Tips for success:
• Keep your profile updated
• Be clear about your boundaries and services
• Build trust through verified reviews
• Use our secure messaging system for all communications

We're here to support your success. If you have any questions about using the platform, feel free to ask!

Best regards,
The NdoloEscorts Support Team`

      await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          conversationId,
          senderId: SUPPORT_USER_ID,
          receiverId: userId,
          content: welcomeContent,
          type: 'text',
          isEncrypted: false,
          autoDeletePeriod: -1,
          isRead: false
        }
      )
    } catch (error) {
      console.error('Error sending welcome message:', error)
    }
  }

  // Check if user has received welcome message
  static async hasReceivedWelcomeMessage(userId: string): Promise<boolean> {
    try {
      const conversations = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.equal('participants', userId),
          Query.equal('participants', SUPPORT_USER_ID),
          Query.limit(1)
        ]
      )

      return conversations.documents.length > 0
    } catch (error) {
      console.error('Error checking welcome message:', error)
      return false
    }
  }
}