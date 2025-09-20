import { databases, DATABASE_ID, PAYMENTS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import type { Transaction, PaymentIntent } from './paymentService'

// Flutterwave configuration
export interface FlutterwaveConfig {
  public_key: string
  currency: string
  payment_options: string
  redirect_url: string
  customizations: {
    title: string
    description: string
    logo: string
  }
  meta?: Record<string, any>
  customer: {
    email: string
    phone_number?: string
    name: string
  }
  tx_ref: string
  amount: number
  callback?: (response: FlutterwaveResponse) => void
  onClose?: () => void
}

export interface FlutterwaveResponse {
  status: 'successful' | 'cancelled' | 'failed'
  transaction_id?: number
  tx_ref: string
  flw_ref?: string
  currency?: string
  amount?: number
  charged_amount?: number
  charge_response_code?: string
  charge_response_message?: string
  created_at?: string
  customer?: {
    id: number
    email: string
    name: string
  }
}

export interface FlutterwavePaymentData {
  amount: number
  currency?: string
  email: string
  name: string
  phone?: string
  description: string
  metadata?: Record<string, any>
  paymentType: 'booking' | 'subscription' | 'advertising' | 'gift'
  relatedId?: string // bookingId, subscriptionId, etc.
}

class FlutterwaveService {
  private publicKey: string
  private secretKey: string
  private baseUrl: string = 'https://api.flutterwave.com/v3'
  
  constructor() {
    this.publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || ''
    this.secretKey = import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY || ''
    
    if (!this.publicKey || !this.secretKey || this.publicKey === 'your_flutterwave_public_key_here') {
      console.error('❌ Flutterwave keys not configured!')
      console.error('Please follow these steps:')
      console.error('1. Create a .env file in the project root')
      console.error('2. Copy .env.example to .env')
      console.error('3. Add your Flutterwave keys to the .env file')
      console.error('4. Restart the development server')
      console.error('See PAYMENT_SETUP.md for detailed instructions')
    }
  }

  // Generate transaction reference
  generateTxRef(): string {
    return `FLW-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // Initialize payment with Flutterwave (fallback for CDN loading)
  initializePayment(config: FlutterwaveConfig): void {
    // This would dynamically load and initialize Flutterwave if not available
    if (typeof window !== 'undefined') {
      // Load Flutterwave script if not already loaded
      if (!document.querySelector('script[src*="flutterwave"]')) {
        const script = document.createElement('script')
        script.src = 'https://checkout.flutterwave.com/v3.js'
        script.onload = () => {
          if ((window as any).FlutterwaveCheckout) {
            (window as any).FlutterwaveCheckout(config)
          }
        }
        document.head.appendChild(script)
      } else if ((window as any).FlutterwaveCheckout) {
        (window as any).FlutterwaveCheckout(config)
      }
    }
  }

  // Create payment configuration for Flutterwave modal
  createPaymentConfig(data: FlutterwavePaymentData): FlutterwaveConfig {
    if (!this.publicKey || this.publicKey === 'your_flutterwave_public_key_here') {
      throw new Error('Flutterwave is not configured. Please set up your API keys.')
    }
    
    const txRef = this.generateTxRef()
    
    return {
      public_key: this.publicKey,
      tx_ref: txRef,
      amount: data.amount,
      currency: data.currency || 'USD',
      payment_options: 'card,account,ussd,qr,mpesa,mobilemoneyghana,mobilemoneyfranco,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia,mobilemoneytanzania,barter,bank-transfer,credit',
      redirect_url: '',
      customizations: {
        title: 'NdoloEscorts',
        description: data.description,
        logo: window.location.origin + '/logo.png'
      },
      customer: {
        email: data.email,
        phone_number: data.phone || '',
        name: data.name
      },
      meta: {
        ...data.metadata,
        paymentType: data.paymentType,
        relatedId: data.relatedId,
        source: 'web'
      }
    }
  }

  // Verify transaction with Flutterwave
  async verifyTransaction(transactionId: string): Promise<FlutterwaveResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to verify transaction')
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Error verifying transaction:', error)
      return null
    }
  }

  // Create payment record in database
  async createPaymentRecord(
    config: FlutterwaveConfig,
    userId: string,
    paymentIntent: PaymentIntent
  ): Promise<string> {
    try {
      // Calculate net amount (after platform fees)
      const platformFeeRate = 0.20 // 20% platform fee
      const platformFee = Math.round(config.amount * platformFeeRate)
      const netAmount = config.amount - platformFee
      
      const transaction = await databases.createDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        ID.unique(),
        {
          transactionId: config.tx_ref,
          bookingId: paymentIntent.bookingId,
          advertisingId: paymentIntent.advertisingId,
          escortId: paymentIntent.escortId,
          clientId: paymentIntent.clientId || userId,
          profileId: paymentIntent.profileId,
          amount: config.amount,
          netAmount: netAmount,
          currency: config.currency,
          type: config.meta?.paymentType || 'booking',
          status: 'pending',
          paymentProvider: 'flutterwave',
          description: config.customizations.description,
          metadata: JSON.stringify(config.meta || {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return transaction.$id
    } catch (error) {
      console.error('Error creating payment record:', error)
      throw new Error('Failed to create payment record')
    }
  }

  // Update payment record after Flutterwave response
  async updatePaymentRecord(
    transactionId: string,
    response: FlutterwaveResponse
  ): Promise<Transaction> {
    try {
      const updateData: any = {
        status: response.status === 'successful' ? 'completed' : 'failed',
        processorTransactionId: response.transaction_id?.toString(),
        processorResponse: JSON.stringify(response),
        updatedAt: new Date().toISOString()
      }

      // Note: flw_ref is already stored in processorResponse
      // No need for a separate flutterwaveRef field

      const updated = await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        updateData
      )

      return updated as unknown as Transaction
    } catch (error) {
      console.error('Error updating payment record:', error)
      throw error
    }
  }

  // Get transaction by reference
  async getTransactionByRef(txRef: string): Promise<Transaction | null> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [Query.equal('transactionId', txRef)]
      )

      if (response.documents.length === 0) {
        return null
      }

      return response.documents[0] as unknown as Transaction
    } catch (error) {
      console.error('Error fetching transaction by ref:', error)
      return null
    }
  }

  // Process refund
  async processRefund(transactionId: string, amount?: number): Promise<any> {
    try {
      // Get the original transaction
      const transaction = await databases.getDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId
      )

      if (!transaction.processorTransactionId) {
        throw new Error('No processor transaction ID found')
      }

      // Call Flutterwave refund API
      const response = await fetch(`${this.baseUrl}/transactions/${transaction.processorTransactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount || transaction.amount
        })
      })

      if (!response.ok) {
        throw new Error('Refund request failed')
      }

      const data = await response.json()

      // Update transaction status
      await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'refunded',
          refundData: JSON.stringify(data.data),
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return data.data
    } catch (error) {
      console.error('Error processing refund:', error)
      throw error
    }
  }

  // Create subscription payment
  async createSubscriptionPayment(
    userId: string,
    userEmail: string,
    userName: string,
    planId: string,
    amount: number
  ): Promise<FlutterwaveConfig> {
    const paymentData: FlutterwavePaymentData = {
      amount,
      email: userEmail,
      name: userName,
      description: `Subscription Plan - ${planId}`,
      paymentType: 'subscription',
      relatedId: planId,
      metadata: {
        userId,
        planId,
        subscriptionType: planId
      }
    }

    return this.createPaymentConfig(paymentData)
  }

  // Create booking payment
  async createBookingPayment(
    booking: {
      id: string
      clientId: string
      escortId: string
      amount: number
      serviceName: string
    },
    customer: {
      email: string
      name: string
      phone?: string
    }
  ): Promise<FlutterwaveConfig> {
    const paymentData: FlutterwavePaymentData = {
      amount: booking.amount,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      description: `Booking - ${booking.serviceName}`,
      paymentType: 'booking',
      relatedId: booking.id,
      metadata: {
        bookingId: booking.id,
        clientId: booking.clientId,
        escortId: booking.escortId,
        service: booking.serviceName
      }
    }

    return this.createPaymentConfig(paymentData)
  }

  // Create gift payment
  async createGiftPayment(
    gift: {
      type: string
      price: number
      recipientId: string
      recipientName: string
    },
    sender: {
      id: string
      email: string
      name: string
    }
  ): Promise<FlutterwaveConfig> {
    const paymentData: FlutterwavePaymentData = {
      amount: gift.price,
      email: sender.email,
      name: sender.name,
      description: `Gift ${gift.type} for ${gift.recipientName}`,
      paymentType: 'gift',
      metadata: {
        giftType: gift.type,
        senderId: sender.id,
        recipientId: gift.recipientId,
        recipientName: gift.recipientName
      }
    }

    return this.createPaymentConfig(paymentData)
  }

  // Create advertising payment
  async createAdvertisingPayment(
    advertising: {
      profileId: string
      planId: string
      planName: string
      amount: number
    },
    escort: {
      id: string
      email: string
      name: string
    }
  ): Promise<FlutterwaveConfig> {
    const paymentData: FlutterwavePaymentData = {
      amount: advertising.amount,
      email: escort.email,
      name: escort.name,
      description: `Advertising - ${advertising.planName}`,
      paymentType: 'advertising',
      relatedId: advertising.planId,
      metadata: {
        profileId: advertising.profileId,
        planId: advertising.planId,
        planName: advertising.planName,
        escortId: escort.id
      }
    }

    return this.createPaymentConfig(paymentData)
  }

  // Get payment history
  async getPaymentHistory(userId: string, role: 'client' | 'escort'): Promise<Transaction[]> {
    try {
      const field = role === 'client' ? 'clientId' : 'escortId'
      const response = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal(field, userId),
          Query.equal('paymentProvider', 'flutterwave'),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      )

      return response.documents as unknown as Transaction[]
    } catch (error) {
      console.error('Error fetching payment history:', error)
      return []
    }
  }

  // Calculate earnings for escort
  async calculateEscortEarnings(escortId: string): Promise<{
    totalEarnings: number
    pendingPayments: number
    availableBalance: number
    platformFees: number
  }> {
    try {
      const transactions = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.equal('status', 'completed'),
          Query.equal('type', 'booking')
        ]
      )

      const totalRevenue = transactions.documents.reduce((sum, t) => sum + t.amount, 0)
      const platformFeeRate = 0.20 // 20% platform fee
      const platformFees = Math.round(totalRevenue * platformFeeRate)
      const totalEarnings = totalRevenue - platformFees

      // Get pending payments
      const pendingTransactions = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.equal('status', 'pending'),
          Query.equal('type', 'booking')
        ]
      )

      const pendingPayments = pendingTransactions.documents.reduce((sum, t) => sum + t.amount, 0)

      // Calculate available balance (earnings not yet withdrawn)
      const withdrawals = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.equal('type', 'withdrawal'),
          Query.equal('status', 'completed')
        ]
      )

      const totalWithdrawn = withdrawals.documents.reduce((sum, w) => sum + w.amount, 0)
      const availableBalance = totalEarnings - totalWithdrawn

      return {
        totalEarnings,
        pendingPayments,
        availableBalance,
        platformFees
      }
    } catch (error) {
      console.error('Error calculating earnings:', error)
      return {
        totalEarnings: 0,
        pendingPayments: 0,
        availableBalance: 0,
        platformFees: 0
      }
    }
  }

  // Request withdrawal
  async requestWithdrawal(
    escortId: string,
    amount: number,
    bankDetails: {
      accountNumber: string
      bankCode: string
      accountName: string
    }
  ): Promise<string> {
    try {
      // Check available balance
      const earnings = await this.calculateEscortEarnings(escortId)
      if (amount > earnings.availableBalance) {
        throw new Error('Insufficient balance')
      }

      // Generate transaction ID for withdrawal
      const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      
      // Create withdrawal record
      const withdrawal = await databases.createDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        ID.unique(),
        {
          transactionId,
          escortId,
          amount,
          netAmount: amount, // For withdrawals, net amount equals full amount
          currency: 'USD',
          type: 'withdrawal',
          status: 'pending',
          paymentProvider: 'bank_transfer',
          bankDetails: JSON.stringify(bankDetails),
          metadata: JSON.stringify({
            requestedAt: new Date().toISOString(),
            availableBalance: earnings.availableBalance
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      // In production, this would trigger a backend function to process the withdrawal
      // through Flutterwave's transfer API

      return withdrawal.$id
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      throw error
    }
  }
}

export const flutterwaveService = new FlutterwaveService()