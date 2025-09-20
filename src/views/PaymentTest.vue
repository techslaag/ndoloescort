<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { flutterwaveService } from '../services/flutterwaveService'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const isProcessing = ref(false)
const error = ref('')
const success = ref(false)

// Check if Flutterwave is configured
const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY
const hasConfig = ref(false)

onMounted(() => {
  hasConfig.value = !!publicKey && publicKey !== 'your_flutterwave_public_key_here'
})

const debugInfo = computed(() => ({
  publicKeyConfigured: hasConfig.value,
  userEmail: authStore.user?.email || 'Not logged in',
  flutterwaveScriptLoaded: typeof window !== 'undefined' && !!(window as any).FlutterwaveCheckout,
  environmentMode: import.meta.env.MODE,
  publicKeyPrefix: publicKey ? publicKey.substring(0, 20) + '...' : 'Not set'
}))

const testPayment = () => {
  if (!hasConfig.value) {
    error.value = 'Flutterwave is not configured. Please set VITE_FLUTTERWAVE_PUBLIC_KEY in your .env file'
    return
  }

  if (!authStore.user) {
    error.value = 'Please login to test payment'
    return
  }

  isProcessing.value = true
  error.value = ''

  try {
    // Create payment configuration
    const config = flutterwaveService.createPaymentConfig({
      amount: 10,
      currency: 'USD',
      email: authStore.user.email || 'test@example.com',
      name: authStore.user.name || 'Test User',
      description: 'Test Payment',
      paymentType: 'subscription'
    })

    console.log('Created config:', config)

    // Add callbacks with correct property names
    const paymentConfig = {
      ...config,
      callback: (response: any) => {
        console.log('Payment response:', response)
        if (response.status === 'successful') {
          success.value = true
          error.value = ''
        } else {
          error.value = `Payment failed: ${response.status}`
        }
        isProcessing.value = false
      },
      onclose: () => {
        console.log('Payment modal closed')
        isProcessing.value = false
      }
    }

    console.log('Final payment config:', paymentConfig)

    // Check if FlutterwaveCheckout is available
    if (typeof window !== 'undefined' && (window as any).FlutterwaveCheckout) {
      console.log('Using FlutterwaveCheckout');
      (window as any).FlutterwaveCheckout(paymentConfig)
    } else {
      console.log('FlutterwaveCheckout not found, using fallback')
      flutterwaveService.initializePayment(paymentConfig)
    }
  } catch (err: any) {
    error.value = err.message || 'Payment initialization failed'
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="payment-test container">
    <h1>Payment Test Page</h1>
    
    <div class="status-section">
      <h2>Configuration Status</h2>
      <div class="status-item">
        <span>Flutterwave Public Key:</span>
        <span :class="hasConfig ? 'status-ok' : 'status-error'">
          {{ hasConfig ? 'Configured' : 'Not Configured' }}
        </span>
      </div>
      <div class="status-item">
        <span>User Authenticated:</span>
        <span :class="authStore.isAuthenticated ? 'status-ok' : 'status-error'">
          {{ authStore.isAuthenticated ? 'Yes' : 'No' }}
        </span>
      </div>
      <div class="status-item">
        <span>Flutterwave Script:</span>
        <span :class="typeof window !== 'undefined' && (window as any).FlutterwaveCheckout ? 'status-ok' : 'status-error'">
          {{ typeof window !== 'undefined' && (window as any).FlutterwaveCheckout ? 'Loaded' : 'Not Loaded' }}
        </span>
      </div>
    </div>

    <div v-if="!hasConfig" class="config-instructions">
      <h3>Setup Instructions:</h3>
      <ol>
        <li>Create a <code>.env</code> file in the project root</li>
        <li>Copy contents from <code>.env.example</code></li>
        <li>Get your Flutterwave keys from <a href="https://dashboard.flutterwave.com" target="_blank">Flutterwave Dashboard</a></li>
        <li>Set <code>VITE_FLUTTERWAVE_PUBLIC_KEY</code> in your .env file</li>
        <li>Restart your development server</li>
      </ol>
    </div>

    <div class="test-section">
      <h2>Test Payment ($10 USD)</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-if="success" class="success-message">
        Payment successful! Check console for details.
      </div>

      <button 
        @click="testPayment"
        :disabled="isProcessing || !authStore.isAuthenticated"
        class="btn btn-primary"
      >
        {{ isProcessing ? 'Processing...' : 'Test Payment' }}
      </button>

      <p v-if="!authStore.isAuthenticated" class="auth-notice">
        Please <router-link to="/login">login</router-link> to test payments
      </p>
    </div>

    <div class="debug-section">
      <h3>Debug Information</h3>
      <pre>{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-test {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;

  h1 {
    margin-bottom: 2rem;
  }

  .status-section {
    background: #f5f5f5;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;

    h2 {
      margin-top: 0;
      margin-bottom: 1rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;

      &:last-child {
        border-bottom: none;
      }

      .status-ok {
        color: #4caf50;
        font-weight: 600;
      }

      .status-error {
        color: #f44336;
        font-weight: 600;
      }
    }
  }

  .config-instructions {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;

    h3 {
      margin-top: 0;
      color: #856404;
    }

    ol {
      margin-bottom: 0;
      
      li {
        margin-bottom: 0.5rem;
      }
    }

    code {
      background: #f8f9fa;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: monospace;
    }

    a {
      color: #0066cc;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .test-section {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;

    h2 {
      margin-top: 0;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .success-message {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .btn {
      padding: 0.75rem 2rem;
      font-size: 1rem;
    }

    .auth-notice {
      margin-top: 1rem;
      color: #666;
    }
  }

  .debug-section {
    background: #f5f5f5;
    padding: 1.5rem;
    border-radius: 8px;

    h3 {
      margin-top: 0;
    }

    pre {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.875rem;
    }
  }
}
</style>