<script setup lang="ts">
import { onMounted, ref } from 'vue'

const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY
const isReady = ref(false)
const result = ref('')

onMounted(() => {
  // Wait a bit for script to load
  setTimeout(() => {
    isReady.value = true
  }, 1000)
})

function makePayment() {
  if (typeof (window as any).FlutterwaveCheckout !== 'function') {
    result.value = 'Error: FlutterwaveCheckout is not a function'
    console.error('FlutterwaveCheckout not found')
    return
  }

  console.log('Making payment with key:', publicKey?.substring(0, 20) + '...')
  
  try {
    (window as any).FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: "hooli-tx-1920bbtytty",
      amount: 54600,
      currency: "NGN",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: "user@gmail.com",
        phone_number: "08102909304",
        name: "yemi desola",
      },
      customizations: {
        title: "My store",
        description: "Payment for items in cart",
        logo: "https://via.placeholder.com/150",
      },
      callback: function (data: any) {
        console.log('Payment data:', data)
        result.value = `Payment ${data.status}! Transaction ref: ${data.tx_ref}`
      },
      onclose: function() {
        console.log('Payment window closed')
        result.value = 'Payment window closed'
      },
    })
  } catch (error: any) {
    console.error('Payment error:', error)
    result.value = `Error: ${error.message}`
  }
}

// Alternative direct method
function makePaymentDirect() {
  const script = document.createElement('script')
  script.src = `https://checkout.flutterwave.com/v3.js`
  script.onload = () => {
    console.log('Script loaded, attempting payment...')
    setTimeout(makePayment, 500)
  }
  document.head.appendChild(script)
}
</script>

<template>
  <div class="container">
    <h1>Flutterwave Inline Test</h1>
    
    <div class="info">
      <p><strong>Public Key Status:</strong> {{ publicKey ? 'Set' : 'Not Set' }}</p>
      <p><strong>Key Preview:</strong> {{ publicKey?.substring(0, 30) }}...</p>
      <p><strong>Script Ready:</strong> {{ isReady ? 'Yes' : 'Loading...' }}</p>
      <p><strong>FlutterwaveCheckout available:</strong> {{ typeof (window as any).FlutterwaveCheckout === 'function' ? 'Yes' : 'No' }}</p>
    </div>

    <div v-if="result" class="result" :class="{ success: result.includes('successful'), error: result.includes('Error') }">
      {{ result }}
    </div>

    <div class="actions">
      <button @click="makePayment" :disabled="!isReady" class="btn btn-primary">
        Pay with Flutterwave (Standard)
      </button>
      
      <button @click="makePaymentDirect" class="btn btn-secondary">
        Pay with Flutterwave (Reload Script)
      </button>
    </div>

    <div class="code-sample">
      <h3>Exact Code Being Used:</h3>
      <pre>
FlutterwaveCheckout({
  public_key: "{{ publicKey?.substring(0, 20) }}...",
  tx_ref: "hooli-tx-1920bbtytty",
  amount: 54600,
  currency: "NGN",
  payment_options: "card,mobilemoney,ussd",
  customer: {
    email: "user@gmail.com",
    phone_number: "08102909304",
    name: "yemi desola",
  },
  customizations: {
    title: "My store",
    description: "Payment for items in cart",
    logo: "https://via.placeholder.com/150",
  },
  callback: function (data) {
    console.log(data);
  },
  onclose: function() {
    // close modal
  },
});
      </pre>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
}

.info {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.info p {
  margin: 0.5rem 0;
}

.result {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.result.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result.error {
  background: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn {
  padding: 1rem 2rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.code-sample {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.875rem;
}
</style>