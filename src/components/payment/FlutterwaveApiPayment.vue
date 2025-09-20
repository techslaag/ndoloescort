<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { flutterwaveApiService } from '../../services/flutterwaveApi'
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
const paymentLink = ref<string>('')
const transactionRef = ref<string>('')
const showPaymentOptions = ref(true)

// Computed
const user = computed(() => authStore.user)
const userEmail = computed(() => user.value?.email || '')
const userName = computed(() => user.value?.name || 'User')

// Check if Flutterwave is configured
const isConfigured = computed(() => {
  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY
  const secretKey = import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY
  return !!publicKey && !!secretKey && 
         publicKey !== 'your_flutterwave_public_key_here' &&
         secretKey !== 'your_flutterwave_secret_key_here'
})

// Initialize payment
const initializePayment = async () => {
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

    // Initialize payment with Flutterwave API
    const response = await flutterwaveApiService.initializePayment({
      amount: props.amount,
      currency: props.currency,
      email: userEmail.value,
      name: userName.value,
      description: props.description,
      paymentType: props.paymentType,
      relatedId: props.relatedId,
      metadata: {
        ...props.metadata,
        userId: user.value.$id
      }
    })

    if (response.status === 'success' && response.data?.link) {
      paymentLink.value = response.data.link
      transactionRef.value = response.data.tx_ref
      showPaymentOptions.value = false
    } else {
      throw new Error(response.message || 'Failed to initialize payment')
    }

  } catch (error: any) {
    console.error('Error initializing payment:', error)
    emit('error', error)
  } finally {
    isProcessing.value = false
  }
}

// Open payment in new window
const openPaymentWindow = () => {
  if (!paymentLink.value) return

  // Open payment link in new window
  const paymentWindow = window.open(
    paymentLink.value,
    'FlutterwavePayment',
    'width=600,height=700,toolbar=no,location=no,status=no,menubar=no'
  )

  // Check if window was closed
  const checkInterval = setInterval(() => {
    if (paymentWindow?.closed) {
      clearInterval(checkInterval)
      verifyPayment()
    }
  }, 1000)
}

// Open payment in same tab
const openPaymentTab = () => {
  if (!paymentLink.value) return
  
  // Store transaction ref for verification after redirect
  sessionStorage.setItem('pendingPaymentTxRef', transactionRef.value)
  window.location.href = paymentLink.value
}

// Verify payment status
const verifyPayment = async () => {
  if (!transactionRef.value) return

  try {
    isProcessing.value = true
    
    const verification = await flutterwaveApiService.verifyPayment(transactionRef.value)
    
    if (verification.status === 'success' && verification.data.status === 'successful') {
      props.onSuccess?.(verification.data)
      emit('success', verification.data)
    } else {
      throw new Error('Payment verification failed')
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    emit('error', error)
  } finally {
    isProcessing.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  props.onClose?.()
  emit('closed')
}

// Reset to payment options
const resetPayment = () => {
  paymentLink.value = ''
  transactionRef.value = ''
  showPaymentOptions.value = true
}

// Check for pending payment on mount
onMounted(() => {
  const pendingTxRef = sessionStorage.getItem('pendingPaymentTxRef')
  if (pendingTxRef) {
    sessionStorage.removeItem('pendingPaymentTxRef')
    transactionRef.value = pendingTxRef
    verifyPayment()
  }
})
</script>

<template>
  <div class="flutterwave-payment">
    <!-- Loading State -->
    <div v-if="isProcessing" class="payment-loading">
      <div class="loading-spinner"></div>
      <p>Processing payment...</p>
    </div>

    <!-- Payment Options -->
    <div v-else-if="showPaymentOptions && isConfigured" class="payment-ready">
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
      </div>
      
      <div class="payment-actions">
        <button @click="handleCancel" class="btn btn-secondary">
          Cancel
        </button>
        
        <button 
          @click="initializePayment" 
          :disabled="isProcessing"
          class="btn btn-primary"
        >
          Continue to Payment
        </button>
      </div>
    </div>

    <!-- Payment Link Ready -->
    <div v-else-if="paymentLink && !showPaymentOptions" class="payment-link-ready">
      <div class="payment-info">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--color-primary)">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h3>Payment Ready</h3>
        <p>Your secure payment link has been generated.</p>
        <p class="tx-ref">Reference: {{ transactionRef }}</p>
      </div>

      <div class="payment-options">
        <h4>Choose how to proceed:</h4>
        
        <button @click="openPaymentWindow" class="payment-option">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <div>
            <strong>Pay in Popup</strong>
            <span>Opens in a new window</span>
          </div>
        </button>

        <button @click="openPaymentTab" class="payment-option">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
          <div>
            <strong>Pay in Current Tab</strong>
            <span>Redirects to payment page</span>
          </div>
        </button>
      </div>

      <div class="payment-actions">
        <button @click="resetPayment" class="btn btn-outline">
          Back
        </button>
        <button @click="handleCancel" class="btn btn-secondary">
          Cancel Payment
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
  
  .payment-actions {
    display: flex;
    gap: 1rem;
    
    .btn {
      flex: 1;
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
    }
  }
}

// Payment link ready
.payment-link-ready {
  .payment-info {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 2rem;
    
    svg {
      margin-bottom: 1rem;
    }
    
    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text);
    }
    
    p {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-light);
    }
    
    .tx-ref {
      font-family: monospace;
      font-size: 0.875rem;
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: inline-block;
      margin-top: 0.5rem;
    }
  }
  
  .payment-options {
    margin-bottom: 2rem;
    
    h4 {
      margin: 0 0 1rem 0;
      text-align: center;
      color: var(--color-text-light);
    }
    
    .payment-option {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
      padding: 1.5rem;
      margin-bottom: 1rem;
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      svg {
        flex-shrink: 0;
        color: var(--color-primary);
      }
      
      div {
        text-align: left;
        
        strong {
          display: block;
          margin-bottom: 0.25rem;
          color: var(--color-text);
        }
        
        span {
          font-size: 0.875rem;
          color: var(--color-text-light);
        }
      }
    }
  }
  
  .payment-actions {
    display: flex;
    gap: 1rem;
    
    .btn {
      flex: 1;
      padding: 0.75rem;
      font-size: 0.875rem;
    }
    
    .btn-outline {
      background: transparent;
      border: 1px solid #dee2e6;
      color: var(--color-text);
      
      &:hover {
        background: #f8f9fa;
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
  }
}
</style>