<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isLoaded = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  // Check if Flutterwave is loaded
  const checkLoaded = () => {
    isLoaded.value = typeof window !== 'undefined' && !!(window as any).FlutterwaveCheckout
    console.log('Flutterwave loaded:', isLoaded.value)
  }
  
  checkLoaded()
  
  // Check periodically
  const interval = setInterval(() => {
    checkLoaded()
    if (isLoaded.value) {
      clearInterval(interval)
    }
  }, 500)
  
  setTimeout(() => clearInterval(interval), 10000)
})

const testMinimalPayment = () => {
  if (!isLoaded.value) {
    error.value = 'Flutterwave not loaded'
    return
  }

  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY
  console.log('Public key from env:', publicKey)
  console.log('Public key length:', publicKey?.length)
  console.log('Public key starts with:', publicKey?.substring(0, 15))
  
  if (!publicKey || publicKey === 'your_flutterwave_public_key_here') {
    error.value = 'Public key not configured'
    return
  }

  // Try with the exact format from Flutterwave docs
  const config = {
    public_key: publicKey.trim(), // Ensure no whitespace
    tx_ref: `test-${Date.now()}`,
    amount: 10,
    currency: 'USD',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: 'test@example.com',
      phone_number: '+2348000000000', // Add phone number
      name: 'Test User'
    },
    customizations: {
      title: 'Test Payment',
      description: 'Testing Flutterwave integration',
      logo: '' // Empty string if no logo
    },
    meta: {
      consumer_id: 23,
      consumer_mac: "92a3-912ba-1192a"
    },
    callback: function(response: any) {
      console.log('Payment response:', response)
      if (response.status === 'successful') {
        success.value = true
        error.value = ''
      } else {
        error.value = `Payment ${response.status}`
      }
    },
    onclose: function() {
      console.log('Payment closed')
    }
  }

  console.log('Minimal config:', config)

  try {
    ;(window as any).FlutterwaveCheckout(config)
  } catch (err: any) {
    error.value = `Error: ${err.message}`
    console.error('Payment error:', err)
  }
}
</script>

<template>
  <div class="flutterwave-test">
    <h1>Flutterwave Test</h1>
    
    <div class="status">
      <p>Script Loaded: {{ isLoaded ? 'Yes' : 'No' }}</p>
      <p>Public Key: {{ import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ? 'Set' : 'Not Set' }}</p>
      <p>Key Preview: {{ import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY?.substring(0, 20) }}...</p>
      <p>Key Type: {{ import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY?.includes('TEST') ? 'Test Key' : 'Live Key' }}</p>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="success" class="success">
      Payment successful!
    </div>

    <button 
      @click="testMinimalPayment" 
      :disabled="!isLoaded"
      class="btn btn-primary"
    >
      Test Minimal Payment ($10)
    </button>

    <div class="instructions">
      <h3>Test Card Details:</h3>
      <ul>
        <li>Card: 4084084084084081</li>
        <li>CVV: 123</li>
        <li>Expiry: Any future date</li>
        <li>PIN: 0000</li>
        <li>OTP: 123456</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.flutterwave-test {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.status {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.success {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.btn {
  padding: 1rem 2rem;
  font-size: 1rem;
  margin-bottom: 2rem;
}

.instructions {
  background: #fff3cd;
  padding: 1rem;
  border-radius: 8px;
  
  ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
}
</style>