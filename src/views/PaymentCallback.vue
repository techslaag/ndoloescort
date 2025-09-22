<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { flutterwaveApiService } from '../services/flutterwaveApi'

const route = useRoute()
const router = useRouter()

const isVerifying = ref(true)
const paymentStatus = ref<'success' | 'failed' | 'pending'>('pending')
const errorMessage = ref('')
const transactionDetails = ref<any>(null)
const isSubscriptionPayment = ref(false)

onMounted(async () => {
  // Get transaction reference from query params
  const tx_ref = route.query.tx_ref as string
  const transaction_id = route.query.transaction_id as string
  const status = route.query.status as string

  if (!tx_ref) {
    errorMessage.value = 'No transaction reference found'
    paymentStatus.value = 'failed'
    isVerifying.value = false
    return
  }

  try {
    // Verify payment with Flutterwave
    const verification = await flutterwaveApiService.verifyPayment(tx_ref)
    
    if (verification.status === 'success' && verification.data.status === 'successful') {
      paymentStatus.value = 'success'
      transactionDetails.value = verification.data
      
      // Check if this was a subscription payment
      const paymentRecord = await flutterwaveApiService.getTransactionByRef(tx_ref)
      isSubscriptionPayment.value = paymentRecord?.type === 'subscription'
      
      // Redirect to appropriate page after 3 seconds
      setTimeout(() => {
        if (isSubscriptionPayment.value) {
          router.push('/subscription?upgraded=true')
        } else {
          router.push('/dashboard?payment=success')
        }
      }, 3000)
    } else {
      paymentStatus.value = 'failed'
      errorMessage.value = verification.data?.processor_response || 'Payment verification failed'
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    paymentStatus.value = 'failed'
    errorMessage.value = error.message || 'Failed to verify payment'
  } finally {
    isVerifying.value = false
  }
})

const goToDashboard = () => {
  if (isSubscriptionPayment.value) {
    router.push('/subscription?upgraded=true')
  } else {
    router.push('/dashboard')
  }
}

const retryPayment = () => {
  router.push('/subscription')
}
</script>

<template>
  <div class="payment-callback">
    <div class="callback-container">
      <!-- Verifying State -->
      <div v-if="isVerifying" class="status-section verifying">
        <div class="loading-spinner"></div>
        <h2>Verifying Payment</h2>
        <p>Please wait while we confirm your payment...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="paymentStatus === 'success'" class="status-section success">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h2>Payment Successful!</h2>
        <p v-if="isSubscriptionPayment">Your subscription has been activated successfully!</p>
        <p v-else>Your payment has been processed successfully.</p>
        
        <div v-if="transactionDetails" class="transaction-info">
          <div class="info-item">
            <span>Amount:</span>
            <strong>{{ transactionDetails.currency }} {{ transactionDetails.amount.toLocaleString() }}</strong>
          </div>
          <div class="info-item">
            <span>Reference:</span>
            <strong>{{ transactionDetails.tx_ref }}</strong>
          </div>
          <div class="info-item">
            <span>Date:</span>
            <strong>{{ new Date(transactionDetails.created_at).toLocaleString() }}</strong>
          </div>
        </div>

        <p class="redirect-notice" v-if="isSubscriptionPayment">Redirecting to your subscription page in 3 seconds...</p>
        <p class="redirect-notice" v-else>Redirecting to dashboard in 3 seconds...</p>
        
        <button @click="goToDashboard" class="btn btn-primary">
          Go to Dashboard
        </button>
      </div>

      <!-- Failed State -->
      <div v-else-if="paymentStatus === 'failed'" class="status-section failed">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <h2>Payment Failed</h2>
        <p>{{ errorMessage || 'Your payment could not be processed.' }}</p>
        
        <div class="action-buttons">
          <button @click="retryPayment" class="btn btn-primary">
            Try Again
          </button>
          <button @click="goToDashboard" class="btn btn-secondary">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 2rem;
}

.callback-container {
  max-width: 500px;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.status-section {
  padding: 3rem;
  text-align: center;
  
  svg {
    margin-bottom: 1.5rem;
  }
  
  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.75rem;
    color: var(--color-text);
  }
  
  p {
    margin: 0 0 1.5rem 0;
    color: var(--color-text-light);
  }
  
  &.verifying {
    svg {
      color: var(--color-primary);
    }
  }
  
  &.success {
    svg {
      color: #4caf50;
    }
    
    .transaction-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 2rem 0;
      text-align: left;
      
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        
        &:not(:last-child) {
          border-bottom: 1px solid #e9ecef;
        }
        
        span {
          color: var(--color-text-light);
        }
        
        strong {
          color: var(--color-text);
        }
      }
    }
    
    .redirect-notice {
      font-size: 0.875rem;
      color: var(--color-text-light);
      margin-bottom: 1rem;
    }
  }
  
  &.failed {
    svg {
      color: #f44336;
    }
  }
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 1s ease-in-out infinite;
  margin: 0 auto 2rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  
  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Responsive
@media (max-width: 480px) {
  .status-section {
    padding: 2rem;
    
    h2 {
      font-size: 1.5rem;
    }
  }
  
  .action-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>