import { databases, DATABASE_ID, PAYMENTS_COLLECTION_ID, functions } from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import type { PaymentIntent } from './paymentService'

// Flutterwave API configuration
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3'
const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || ''
const FLUTTERWAVE_SECRET_KEY = import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY || ''

export interface FlutterwavePaymentData {
  amount: number
  currency?: string
  email: string
  name: string
  phone?: string
  description: string
  metadata?: Record<string, any>
  paymentType: 'booking' | 'subscription' | 'advertising' | 'gift'
  relatedId?: string
}

export interface FlutterwavePaymentResponse {
  status: string
  message: string
  data: {
    link: string
    tx_ref: string
  }
}

export interface FlutterwaveVerificationResponse {
  status: string
  message: string
  data: {
    id: number
    tx_ref: string
    flw_ref: string
    device_fingerprint: string
    amount: number
    currency: string
    charged_amount: number
    app_fee: number
    merchant_fee: number
    processor_response: string
    auth_model: string
    ip: string
    narration: string
    status: string
    payment_type: string
    created_at: string
    account_id: number
    customer: {
      id: number
      name: string
      phone_number: string
      email: string
      created_at: string
    }
    meta?: any
  }
}

class FlutterwaveApiService {
  // Function ID for the Flutterwave payment function
  private functionId = 'flutterwave-payment' // Update this with your actual function ID

  // Generate unique transaction reference
  generateTxRef(): string {
    return `FLW-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  }

  // Initialize payment and get payment link
  async initializePayment(data: FlutterwavePaymentData): Promise<FlutterwavePaymentResponse> {
    const tx_ref = this.generateTxRef()
    
    const payload = {
      action: 'initialize',
      data: {
        tx_ref: tx_ref,
        amount: data.amount,
        currency: data.currency || 'USD',
        redirect_url: `${window.location.origin}/payment/callback`,
        customer: {
          email: data.email,
          phone: data.phone || '',
          name: data.name
        },
        customizations: {
          title: 'Escorts Prime Payment',
          description: data.description,
          logo: `${window.location.origin}/logo.png`
        },
        meta: {
          ...data.metadata,
          payment_type: data.paymentType,
          related_id: data.relatedId,
          source: 'web'
        }
      }
    }

    try {
      // Call Appwrite function instead of direct API
      const response = await functions.createExecution(
        this.functionId,
        JSON.stringify(payload),
        false // async = false for synchronous execution
      )

      const result = JSON.parse(response.responseBody)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Store payment record in database
      await this.createPaymentRecord(tx_ref, data, result.data)
      
      return {
        status: result.status,
        message: 'Payment initialized',
        data: result.data
      }
    } catch (error: any) {
      console.error('Error initializing payment:', error)
      throw error
    }
  }

  // Create payment record in database
  async createPaymentRecord(
    tx_ref: string,
    paymentData: FlutterwavePaymentData,
    responseData: any
  ): Promise<string> {
    try {
      // Calculate net amount (after platform fees)
      const platformFeeRate = 0.20 // 20% platform fee
      const platformFee = Math.round(paymentData.amount * platformFeeRate)
      const netAmount = paymentData.amount - platformFee

      const paymentIntent: PaymentIntent = {
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        clientId: '', // Will be set by caller
        description: paymentData.description,
        metadata: paymentData.metadata
      }

      const transaction = await databases.createDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        ID.unique(),
        {
          transactionId: tx_ref,
          amount: paymentData.amount,
          netAmount: netAmount,
          currency: paymentData.currency || 'USD',
          type: paymentData.paymentType,
          status: 'pending',
          paymentProvider: 'flutterwave',
          paymentLink: responseData.link,
          description: paymentData.description,
          metadata: JSON.stringify(paymentData.metadata || {}),
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

  // Verify payment status
  async verifyPayment(tx_ref: string): Promise<FlutterwaveVerificationResponse> {
    try {
      const payload = {
        action: 'verify',
        data: {
          tx_ref: tx_ref
        }
      }

      // Call Appwrite function
      const response = await functions.createExecution(
        this.functionId,
        JSON.stringify(payload),
        false
      )

      const result = JSON.parse(response.responseBody)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Update payment record in database
      await this.updatePaymentStatus(tx_ref, result.data)
      
      return {
        status: result.status,
        message: 'Payment verified',
        data: result.data
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error)
      throw error
    }
  }

  // Update payment status in database
  async updatePaymentStatus(tx_ref: string, verificationData: any): Promise<void> {
    try {
      // Find the payment record
      const payments = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [Query.equal('transactionId', tx_ref)]
      )

      if (payments.documents.length === 0) {
        throw new Error('Payment record not found')
      }

      const payment = payments.documents[0]

      // Update payment status
      await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        payment.$id,
        {
          status: verificationData.status === 'successful' ? 'completed' : 'failed',
          processorTransactionId: verificationData.id.toString(),
          processorResponse: JSON.stringify(verificationData),
          updatedAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Error updating payment status:', error)
      throw error
    }
  }

  // Get transaction by reference
  async getTransactionByRef(tx_ref: string): Promise<any> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        [Query.equal('transactionId', tx_ref)]
      )

      if (response.documents.length === 0) {
        return null
      }

      return response.documents[0]
    } catch (error) {
      console.error('Error fetching transaction:', error)
      return null
    }
  }

  // Create subscription payment
  async createSubscriptionPayment(
    userId: string,
    userEmail: string,
    userName: string,
    planId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<FlutterwavePaymentResponse> {
    const paymentData: FlutterwavePaymentData = {
      amount,
      currency,
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

    return this.initializePayment(paymentData)
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
    },
    currency: string = 'USD'
  ): Promise<FlutterwavePaymentResponse> {
    const paymentData: FlutterwavePaymentData = {
      amount: booking.amount,
      currency,
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

    return this.initializePayment(paymentData)
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

      const payload = {
        action: 'refund',
        data: {
          transaction_id: transaction.processorTransactionId,
          amount: amount || transaction.amount
        }
      }

      // Call Appwrite function
      const response = await functions.createExecution(
        this.functionId,
        JSON.stringify(payload),
        false
      )

      const result = JSON.parse(response.responseBody)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Update transaction status
      await databases.updateDocument(
        DATABASE_ID,
        PAYMENTS_COLLECTION_ID,
        transactionId,
        {
          status: 'refunded',
          refundData: JSON.stringify(result.data),
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return result.data
    } catch (error) {
      console.error('Error processing refund:', error)
      throw error
    }
  }

  // Get banks list for transfers (removed - not needed for basic payment flow)
}

export const flutterwaveApiService = new FlutterwaveApiService()