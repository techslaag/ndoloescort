import { databases, DATABASE_ID, functions, PAYMENTS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'

export interface PaymentMethod {
  id: string
  userId: string
  type: 'card' | 'bank' | 'crypto'
  last4?: string
  brand?: string
  isDefault: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  bookingId?: string
  advertisingId?: string
  escortId?: string
  clientId: string
  profileId?: string
  amount: number
  currency: string
  type: 'booking' | 'advertising' | 'subscription' | 'refund'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  paymentMethod: string
  processorTransactionId?: string
  processorResponse?: any
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface PaymentIntent {
  amount: number
  currency: string
  escortId?: string
  clientId: string
  bookingId?: string
  advertisingId?: string
  profileId?: string
  description?: string
  metadata?: Record<string, any>
}

export class PaymentService {
  // Initialize payment processor (Stripe, PayPal, etc.)
  private async initializeProcessor() {
    // This would initialize your chosen payment processor
    // For demo purposes, we'll simulate payment processing
    return true
  }

  // Create a payment intent
  async createPaymentIntent(intent: PaymentIntent): Promise<string> {
    try {
      // In production, this would create a payment intent with your processor
      // For now, we'll create a transaction record
      const transaction = await databases.createDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        ID.unique(),
        {
          bookingId: intent.bookingId,
          advertisingId: intent.advertisingId,
          escortId: intent.escortId,
          clientId: intent.clientId,
          profileId: intent.profileId,
          amount: intent.amount,
          currency: intent.currency,
          type: intent.advertisingId ? 'advertising' : (intent.bookingId ? 'booking' : 'subscription'),
          status: 'pending',
          paymentMethod: '',
          description: intent.description,
          metadata: JSON.stringify(intent.metadata || {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return transaction.$id
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to create payment intent')
    }
  }

  // Process payment
  async processPayment(
    transactionId: string,
    paymentMethodId: string
  ): Promise<Transaction> {
    try {
      // Get the transaction
      const transaction = await databases.getDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId
      )

      // Update status to processing
      await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'processing',
          paymentMethod: paymentMethodId,
          updatedAt: new Date().toISOString()
        }
      )

      // In production, process the payment with your processor
      // For demo, we'll simulate a successful payment after a delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update status to completed
      const updatedTransaction = await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'completed',
          processorTransactionId: `sim_${ID.unique()}`,
          processorResponse: JSON.stringify({ 
            success: true, 
            timestamp: new Date().toISOString() 
          }),
          updatedAt: new Date().toISOString()
        }
      )

      // Trigger a function to handle post-payment actions
      try {
        await functions.createExecution(
          'handlePaymentComplete',
          JSON.stringify({ transactionId })
        )
      } catch (funcError) {
        console.error('Error triggering post-payment function:', funcError)
      }

      return updatedTransaction as unknown as Transaction
    } catch (error) {
      // Update status to failed
      await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'failed',
          processorResponse: JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }),
          updatedAt: new Date().toISOString()
        }
      )
      
      throw error
    }
  }

  // Get user's payment methods
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      // In production, this would fetch from your payment processor
      // For demo, we'll return mock data
      return [
        {
          id: 'pm_demo_1',
          userId,
          type: 'card',
          last4: '4242',
          brand: 'Visa',
          isDefault: true,
          createdAt: new Date().toISOString()
        }
      ]
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      return []
    }
  }

  // Add a payment method
  async addPaymentMethod(
    userId: string,
    paymentMethodData: any
  ): Promise<PaymentMethod> {
    try {
      // In production, this would tokenize and save with your processor
      // For demo, we'll return mock data
      return {
        id: `pm_${ID.unique()}`,
        userId,
        type: paymentMethodData.type || 'card',
        last4: paymentMethodData.last4 || '4242',
        brand: paymentMethodData.brand || 'Visa',
        isDefault: false,
        createdAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error adding payment method:', error)
      throw new Error('Failed to add payment method')
    }
  }

  // Get transaction by ID
  async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const transaction = await databases.getDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId
      )
      return transaction as unknown as Transaction
    } catch (error) {
      console.error('Error fetching transaction:', error)
      throw new Error('Transaction not found')
    }
  }

  // Get transactions for a user
  async getUserTransactions(
    userId: string,
    role: 'client' | 'escort'
  ): Promise<Transaction[]> {
    try {
      const field = role === 'client' ? 'clientId' : 'escortId'
      const transactions = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal(field, userId),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      )
      return transactions.documents as unknown as Transaction[]
    } catch (error) {
      console.error('Error fetching user transactions:', error)
      return []
    }
  }

  // Calculate platform fee (e.g., 20%)
  calculatePlatformFee(amount: number): number {
    const feePercentage = 0.20 // 20%
    return Math.round(amount * feePercentage)
  }

  // Calculate escort payout
  calculateEscortPayout(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount)
    return amount - platformFee
  }

  // Process refund
  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<Transaction> {
    try {
      const transaction = await this.getTransaction(transactionId)
      
      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions')
      }

      const refundAmount = amount || transaction.amount

      // In production, process refund with your processor
      // For demo, we'll simulate a refund
      const updatedTransaction = await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'refunded',
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            refundAmount,
            refundReason: reason,
            refundedAt: new Date().toISOString()
          }),
          updatedAt: new Date().toISOString()
        }
      )

      return updatedTransaction as unknown as Transaction
    } catch (error) {
      console.error('Error processing refund:', error)
      throw error
    }
  }

  // Create payout for escort
  async createPayout(escortId: string, amount: number): Promise<string> {
    try {
      // In production, this would initiate a payout to the escort's bank account
      // For demo, we'll create a payout record
      const payout = await databases.createDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        ID.unique(),
        {
          escortId,
          amount,
          currency: 'USD',
          status: 'pending',
          type: 'payout',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return payout.$id
    } catch (error) {
      console.error('Error creating payout:', error)
      throw new Error('Failed to create payout')
    }
  }

  // Get earnings summary for escort
  async getEarningsSummary(escortId: string): Promise<{
    totalEarnings: number
    pendingPayouts: number
    completedPayouts: number
    platformFees: number
  }> {
    try {
      const transactions = await this.getUserTransactions(escortId, 'escort')
      
      const completedTransactions = transactions.filter(t => t.status === 'completed')
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0)
      const platformFees = completedTransactions.reduce(
        (sum, t) => sum + this.calculatePlatformFee(t.amount), 
        0
      )
      const totalEarnings = totalRevenue - platformFees

      // Get payouts
      const payouts = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.equal('type', 'payout')
        ]
      )

      const pendingPayouts = payouts.documents
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)

      const completedPayouts = payouts.documents
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

      return {
        totalEarnings,
        pendingPayouts,
        completedPayouts,
        platformFees
      }
    } catch (error) {
      console.error('Error calculating earnings summary:', error)
      return {
        totalEarnings: 0,
        pendingPayouts: 0,
        completedPayouts: 0,
        platformFees: 0
      }
    }
  }

  // Create advertising payment intent
  async createAdvertisingPayment(
    profileId: string,
    escortId: string,
    planId: string,
    amount: number,
    description: string
  ): Promise<string> {
    try {
      const intent: PaymentIntent = {
        amount,
        currency: 'USD',
        clientId: escortId, // For advertising, the escort is the client
        profileId,
        advertisingId: planId,
        description,
        metadata: {
          type: 'advertising',
          planId,
          profileId
        }
      }

      return await this.createPaymentIntent(intent)
    } catch (error) {
      console.error('Error creating advertising payment:', error)
      throw new Error('Failed to create advertising payment')
    }
  }

  // Get advertising transactions
  async getAdvertisingTransactions(profileId: string): Promise<Transaction[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal('profileId', profileId),
          Query.equal('type', 'advertising'),
          Query.orderDesc('createdAt')
        ]
      )

      return response.documents.map(doc => ({
        id: doc.$id,
        bookingId: doc.bookingId,
        advertisingId: doc.advertisingId,
        escortId: doc.escortId,
        clientId: doc.clientId,
        profileId: doc.profileId,
        amount: doc.amount,
        currency: doc.currency,
        type: doc.type,
        status: doc.status,
        paymentMethod: doc.paymentMethod,
        processorTransactionId: doc.processorTransactionId,
        processorResponse: doc.processorResponse,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }))
    } catch (error) {
      console.error('Error fetching advertising transactions:', error)
      return []
    }
  }
}

export const paymentService = new PaymentService()