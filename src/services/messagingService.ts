import { functions, databases, DATABASE_ID, MESSAGES_COLLECTION_ID } from '../lib/appwrite'
import type { Models } from 'appwrite'

export class MessagingService {
  // Mark message as read using Appwrite Function (when deployed)
  static async markMessageAsReadViaFunction(messageId: string): Promise<boolean> {
    try {
      const response = await functions.createExecution(
        'mark-message-as-read', // Function ID
        JSON.stringify({ messageId }),
        false // async = false for immediate response
      )
      
      const result = JSON.parse(response.responseBody)
      return result.success
    } catch (error) {
      console.error('Error calling markMessageAsRead function:', error)
      return false
    }
  }

  // Direct database update (fallback - requires proper permissions)
  static async markMessageAsReadDirect(messageId: string): Promise<boolean> {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId,
        {
          isRead: true,
          readAt: new Date().toISOString()
        }
      )
      return true
    } catch (error: any) {
      // If permission error, log it but don't throw
      if (error.code === 401 || error.code === 403) {
        console.warn('Permission denied to update message. This is expected if you are not the receiver.')
        return false
      }
      throw error
    }
  }

  // Smart mark as read - tries function first, then direct
  static async markMessageAsRead(messageId: string): Promise<boolean> {
    // Try direct update first (simpler for development)
    try {
      return await this.markMessageAsReadDirect(messageId)
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      // In production, you would try the function approach here
      // return await this.markMessageAsReadViaFunction(messageId)
      return false
    }
  }
}