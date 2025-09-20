<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { flutterwaveService } from '../../services/flutterwaveService'
import { useAuthStore } from '../../stores/auth'
import type { PaymentIntent } from '../../services/paymentService'

interface Props {
  amount: number
  currency?: string
  description: string
  paymentType: 'booking' | 'subscription' | 'advertising' | 'gift'
  relatedId?: string
  metadata?: Record<string, any>
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'USD'
})

const emit = defineEmits<{
  'success': [response: any]
  'error': [error: Error]
  'closed': []
}>()

const authStore = useAuthStore()

// State
const isProcessing = ref(false)
const paymentConfig = ref<any>(null)
const transactionId = ref<string>('')
const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || ''

// Computed
const user = computed(() => authStore.user)
const userEmail = computed(() => user.value?.email || '')
const userName = computed(() => user.value?.name || 'User')

// Check if Flutterwave is configured
const isConfigured = computed(() => 
  !!publicKey && publicKey !== 'your_flutterwave_public_key_here'
)

// Check if script is loaded
const isScriptLoaded = ref(false)

// Check script loading status
const checkScriptLoaded = () => {
  if (typeof window !== 'undefined') {
    isScriptLoaded.value = !!(window as any).FlutterwaveCheckout
    console.log('Flutterwave script status:', {
      windowDefined: typeof window !== 'undefined',
      FlutterwaveCheckout: !!(window as any).FlutterwaveCheckout,
      isScriptLoaded: isScriptLoaded.value
    })
  }
  return isScriptLoaded.value
}

// Load Flutterwave script dynamically
const loadFlutterwaveScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (checkScriptLoaded()) {
      resolve()
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="flutterwave"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setTimeout(() => {
          if (checkScriptLoaded()) {
            resolve()
          } else {
            reject(new Error('Script loaded but FlutterwaveCheckout not available'))
          }
        }, 100)
      })
      return
    }

    // Create and load script
    const script = document.createElement('script')
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.async = true
    
    script.onload = () => {
      console.log('Flutterwave script loaded')
      setTimeout(() => {
        if (checkScriptLoaded()) {
          resolve()
        } else {
          reject(new Error('Script loaded but FlutterwaveCheckout not available'))
        }
      }, 100)
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Flutterwave script'))
    }
    
    document.head.appendChild(script)
  })
}

// Initialize payment configuration
const initializePayment = async () => {
  console.log('Initializing payment with props:', {
    amount: props.amount,
    currency: props.currency,
    description: props.description,
    paymentType: props.paymentType,
    isConfigured: isConfigured.value,
    isScriptLoaded: isScriptLoaded.value
  })

  if (!user.value) {
    emit('error', new Error('User not authenticated'))
    return
  }

  if (!isConfigured.value) {
    emit('error', new Error('Flutterwave is not configured. Please set up your API keys.'))
    return
  }

  try {
    isProcessing.value = true

    // Ensure Flutterwave script is loaded
    try {
      await loadFlutterwaveScript()
      console.log('Flutterwave script confirmed loaded')
    } catch (error: any) {
      console.error('Failed to load Flutterwave script:', error)
      throw new Error('Unable to load payment system. Please refresh the page and try again.')
    }

    // Create payment configuration
    const config = flutterwaveService.createPaymentConfig({
      amount: props.amount,
      currency: props.currency || 'USD',
      email: userEmail.value,
      name: userName.value,
      description: props.description,
      paymentType: props.paymentType,
      relatedId: props.relatedId,
      metadata: props.metadata
    })

    // Create payment intent in database
    const paymentIntent: PaymentIntent = {
      amount: props.amount,
      currency: props.currency || 'USD',
      clientId: user.value.$id,
      description: props.description,
      metadata: {
        ...props.metadata,
        paymentType: props.paymentType,
        relatedId: props.relatedId
      }
    }

    // Based on payment type, set appropriate fields
    switch (props.paymentType) {
      case 'booking':
        paymentIntent.bookingId = props.relatedId
        break
      case 'advertising':
        paymentIntent.advertisingId = props.relatedId
        paymentIntent.profileId = props.metadata?.profileId
        break
      case 'gift':
        paymentIntent.escortId = props.metadata?.recipientId
        break
    }

    // Create payment record
    transactionId.value = await flutterwaveService.createPaymentRecord(
      config,
      user.value.$id,
      paymentIntent
    )

    // Store config for Pay Now button
    paymentConfig.value = config
    
    console.log('Payment config created:', paymentConfig.value)
    isProcessing.value = false
  } catch (error: any) {
    console.error('Error initializing payment:', error)
    isProcessing.value = false
    emit('error', error)
  }
}

// Handle successful payment
const handlePaymentSuccess = async (response: any) => {
  try {
    isProcessing.value = true
    console.log('Payment response received:', response)

    // Update payment record
    await flutterwaveService.updatePaymentRecord(transactionId.value, response)

    // Verify transaction with Flutterwave
    if (response.transaction_id) {
      const verification = await flutterwaveService.verifyTransaction(response.transaction_id.toString())
      if (verification?.status !== 'successful') {
        throw new Error('Payment verification failed')
      }
    }

    // Call success callback
    props.onSuccess?.(response)
    emit('success', response)

    isProcessing.value = false
  } catch (error: any) {
    console.error('Error handling payment success:', error)
    isProcessing.value = false
    emit('error', error)
  }
}

// Handle payment closure
const handlePaymentClose = () => {
  props.onClose?.()
  emit('closed')
}

// Make payment using Flutterwave
const makePayment = async () => {
  if (!paymentConfig.value) {
    emit('error', new Error('Payment not initialized. Please check Flutterwave configuration.'))
    return
  }

  try {
    // Double-check script is loaded before proceeding
    if (!checkScriptLoaded()) {
      console.log('Script not loaded, attempting to load...')
      await loadFlutterwaveScript()
    }

    if (!isScriptLoaded.value) {
      throw new Error('Payment system unavailable. Please refresh the page.')
    }

    console.log('Initializing Flutterwave payment with config:', {
      public_key: paymentConfig.value.public_key ? 'Set' : 'Not set',
      amount: paymentConfig.value.amount,
      currency: paymentConfig.value.currency,
      tx_ref: paymentConfig.value.tx_ref,
      customer_email: paymentConfig.value.customer?.email,
      customer_name: paymentConfig.value.customer?.name
    })

    // Use Flutterwave's checkout
    ;(window as any).FlutterwaveCheckout({
      ...paymentConfig.value,
      callback: handlePaymentSuccess,
      onClose: handlePaymentClose
    })
  } catch (error: any) {
    console.error('Error initializing payment:', error)
    emit('error', new Error(`Failed to initialize payment: ${error.message}`))
  }
}

// Initialize on mount
onMounted(async () => {
  // Check if script is already loaded
  checkScriptLoaded()
  
  // Set up periodic check for script loading
  const checkInterval = setInterval(() => {
    if (checkScriptLoaded()) {
      clearInterval(checkInterval)
    }
  }, 500)
  
  // Clear interval after 10 seconds
  setTimeout(() => clearInterval(checkInterval), 10000)
  
  await initializePayment()
})

// Expose method to parent
defineExpose({
  makePayment
})
</script>

<template>
  <div class="flutterwave-payment">
    <!-- Loading State -->
    <div v-if="isProcessing" class="payment-loading">
      <div class="loading-spinner"></div>
      <p>Initializing payment...</p>
    </div>

    <!-- Payment Ready -->
    <div v-else-if="paymentConfig && isConfigured" class="payment-ready">
      <div class="payment-summary">
        <h3>Payment Summary</h3>
        
        <div class="summary-item">
          <span class="label">Amount:</span>
          <span class="value">{{ currency }} {{ amount.toLocaleString() }}</span>
        </div>
        
        <div class="summary-item">
          <span class="label">Description:</span>
          <span class="value">{{ description }}</span>
        </div>
        
        <div class="payment-methods">
          <p class="methods-title">Available Payment Methods:</p>
          <div class="methods-grid">
            <div class="method-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <span>Credit/Debit Card</span>
            </div>
            
            <div class="method-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              <span>Bank Transfer</span>
            </div>
            
            <div class="method-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5-3H7V5h10v12z"/>
              </svg>
              <span>Mobile Money</span>
            </div>
            
            <div class="method-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3h2v5h-2V6zm0 7h2v2h-2v-2z"/>
              </svg>
              <span>QR Code</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="payment-actions">
        <button @click="handlePaymentClose" class="btn btn-secondary">
          Cancel
        </button>
        
        <button 
          @click="makePayment" 
          :disabled="isProcessing || !isScriptLoaded"
          class="btn btn-primary"
        >
          {{ isProcessing ? 'Processing...' : !isScriptLoaded ? 'Loading Payment System...' : 'Pay Now' }}
        </button>
      </div>
    </div>

    <!-- Script Not Loaded State -->
    <div v-else-if="isConfigured && !isScriptLoaded" class="payment-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>Loading payment system...</p>
      <p class="small-text">This usually takes a few seconds</p>
      <div class="script-loading-actions">
        <button @click="loadFlutterwaveScript" class="btn btn-secondary">
          Retry Loading
        </button>
        <button @click="() => window.location.reload()" class="btn btn-outline">
          Refresh Page
        </button>
      </div>
    </div>

    <!-- Configuration Error State -->
    <div v-else-if="!isConfigured" class="payment-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>Flutterwave is not configured</p>
      <div class="error-details">
        <p>Setup required:</p>
        <ul>
          <li>Add VITE_FLUTTERWAVE_PUBLIC_KEY to your .env file</li>
          <li>Add VITE_FLUTTERWAVE_SECRET_KEY to your .env file</li>
          <li>Restart the development server</li>
        </ul>
        <p class="setup-link">
          See <a href="/PAYMENT_SETUP.md" target="_blank">Payment Setup Guide</a> for help
        </p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="payment-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>Failed to initialize payment</p>
      <button @click="initializePayment" class="btn btn-secondary">
        Try Again
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.flutterwave-payment {
  max-width: 500px;
  margin: 0 auto;
}

// Loading state
.payment-loading {
  text-align: center;
  padding: 3rem;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s ease-in-out infinite;
    margin: 0 auto 1rem;
  }
  
  p {
    color: var(--color-text-light);
  }
}

// Payment ready state
.payment-ready {
  .payment-summary {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    
    h3 {
      margin: 0 0 1.5rem 0;
      color: var(--color-text);
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e9ecef;
      
      &:last-of-type {
        border-bottom: none;
      }
      
      .label {
        color: var(--color-text-light);
      }
      
      .value {
        font-weight: 600;
        color: var(--color-text);
      }
    }
  }
  
  .payment-methods {
    margin-top: 2rem;
    
    .methods-title {
      margin: 0 0 1rem 0;
      font-weight: 600;
      color: var(--color-text);
    }
    
    .methods-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .method-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      
      svg {
        color: var(--color-primary);
      }
      
      span {
        font-size: 0.875rem;
        color: var(--color-text);
      }
    }
  }
  
  .payment-actions {
    display: flex;
    gap: 1rem;
    
    .btn {
      flex: 1;
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

// Error state
.payment-error {
  text-align: center;
  padding: 3rem;
  
  svg {
    color: #dc3545;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0 0 1.5rem 0;
    color: var(--color-text-light);
  }

  .small-text {
    font-size: 0.875rem;
    margin: 0.5rem 0;
  }

  .script-loading-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
    
    .btn {
      padding: 0.75rem 1.5rem;
    }
  }

  .error-details {
    text-align: left;
    background: #ffebee;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;

    p {
      margin: 0 0 0.5rem 0;
      font-weight: 600;
    }

    ul {
      margin: 0 0 1rem 1.5rem;
      padding: 0;

      li {
        margin-bottom: 0.25rem;
      }
    }

    .setup-link {
      margin: 0;
      font-size: 0.875rem;

      a {
        color: #1976d2;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

// Animations
@keyframes spin {
  to { transform: rotate(360deg); }
}

// Responsive
@media (max-width: 480px) {
  .payment-ready {
    .payment-summary {
      padding: 1.5rem;
    }
    
    .payment-methods {
      .methods-grid {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>