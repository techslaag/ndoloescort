<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { paymentService, type PaymentMethod } from '../../services/paymentService'
import { useAuthStore } from '../../stores/auth'

interface Props {
  amount: number
  currency?: string
  bookingId: string
  escortId: string
  onSuccess?: (transactionId: string) => void
  onError?: (error: Error) => void
}

const props = withDefaults(defineProps<Props>(), {
  currency: 'USD'
})

const emit = defineEmits<{
  success: [transactionId: string]
  error: [error: Error]
  cancel: []
}>()

const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isProcessing = ref(false)
const paymentMethods = ref<PaymentMethod[]>([])
const selectedPaymentMethod = ref<string>('')
const showAddCard = ref(false)
const error = ref<string | null>(null)

// New card form
const cardForm = ref({
  number: '',
  expiry: '',
  cvc: '',
  name: ''
})

// Computed
const formattedAmount = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency
  }).format(props.amount / 100)
})

const platformFee = computed(() => {
  return paymentService.calculatePlatformFee(props.amount)
})

const escortPayout = computed(() => {
  return paymentService.calculateEscortPayout(props.amount)
})

const formattedPlatformFee = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency
  }).format(platformFee.value / 100)
})

const formattedEscortPayout = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency
  }).format(escortPayout.value / 100)
})

const isCardFormValid = computed(() => {
  return (
    cardForm.value.number.length >= 15 &&
    cardForm.value.expiry.length === 5 &&
    cardForm.value.cvc.length >= 3 &&
    cardForm.value.name.length > 0
  )
})

// Methods
const loadPaymentMethods = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    if (!authStore.user) return
    
    paymentMethods.value = await paymentService.getPaymentMethods(authStore.user.$id)
    
    // Select default payment method
    const defaultMethod = paymentMethods.value.find(m => m.isDefault)
    if (defaultMethod) {
      selectedPaymentMethod.value = defaultMethod.id
    }
  } catch (err) {
    console.error('Error loading payment methods:', err)
    error.value = 'Failed to load payment methods'
  } finally {
    isLoading.value = false
  }
}

const processPayment = async () => {
  if (!selectedPaymentMethod.value && !showAddCard.value) {
    error.value = 'Please select a payment method'
    return
  }

  try {
    isProcessing.value = true
    error.value = null
    
    if (!authStore.user) {
      throw new Error('User not authenticated')
    }

    // Create payment intent
    const paymentIntentId = await paymentService.createPaymentIntent({
      amount: props.amount,
      currency: props.currency,
      escortId: props.escortId,
      clientId: authStore.user.$id,
      bookingId: props.bookingId,
      description: `Booking payment for ${props.bookingId}`
    })

    // Process payment
    const transaction = await paymentService.processPayment(
      paymentIntentId,
      selectedPaymentMethod.value || 'new_card'
    )

    // Success
    emit('success', transaction.id)
    if (props.onSuccess) {
      props.onSuccess(transaction.id)
    }
  } catch (err) {
    console.error('Payment processing error:', err)
    error.value = err instanceof Error ? err.message : 'Payment failed'
    emit('error', err as Error)
    if (props.onError) {
      props.onError(err as Error)
    }
  } finally {
    isProcessing.value = false
  }
}

const addPaymentMethod = async () => {
  try {
    isProcessing.value = true
    error.value = null
    
    if (!authStore.user) {
      throw new Error('User not authenticated')
    }

    // In production, this would tokenize the card with your payment processor
    const newMethod = await paymentService.addPaymentMethod(authStore.user.$id, {
      type: 'card',
      last4: cardForm.value.number.slice(-4),
      brand: detectCardBrand(cardForm.value.number),
      // Additional card data would be sent securely to payment processor
    })

    paymentMethods.value.push(newMethod)
    selectedPaymentMethod.value = newMethod.id
    showAddCard.value = false
    
    // Clear form
    cardForm.value = { number: '', expiry: '', cvc: '', name: '' }
  } catch (err) {
    console.error('Error adding payment method:', err)
    error.value = 'Failed to add payment method'
  } finally {
    isProcessing.value = false
  }
}

const formatCardNumber = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
  const matches = value.match(/\d{4,16}/g)
  const match = (matches && matches[0]) || ''
  const parts = []

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4))
  }

  if (parts.length) {
    cardForm.value.number = parts.join(' ')
  } else {
    cardForm.value.number = value
  }
}

const formatExpiry = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
  
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4)
  }
  
  cardForm.value.expiry = value
}

const detectCardBrand = (number: string): string => {
  const cleaned = number.replace(/\s+/g, '')
  
  if (/^4/.test(cleaned)) return 'Visa'
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard'
  if (/^3[47]/.test(cleaned)) return 'Amex'
  if (/^6/.test(cleaned)) return 'Discover'
  
  return 'Unknown'
}

// Lifecycle
onMounted(() => {
  loadPaymentMethods()
})
</script>

<template>
  <div class="payment-form">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading payment methods...</p>
    </div>

    <!-- Payment Form -->
    <div v-else class="payment-content">
      <!-- Amount Summary -->
      <div class="amount-summary">
        <h3>Payment Summary</h3>
        <div class="summary-row">
          <span>Service Amount:</span>
          <span class="amount">{{ formattedAmount }}</span>
        </div>
        <div class="summary-row text-muted">
          <span>Platform Fee (20%):</span>
          <span>{{ formattedPlatformFee }}</span>
        </div>
        <div class="summary-row text-muted">
          <span>Escort Receives:</span>
          <span>{{ formattedEscortPayout }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row total">
          <span>Total to Pay:</span>
          <span class="amount">{{ formattedAmount }}</span>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="payment-methods">
        <h3>Payment Method</h3>
        
        <!-- Existing Payment Methods -->
        <div v-if="paymentMethods.length > 0" class="method-list">
          <label 
            v-for="method in paymentMethods" 
            :key="method.id"
            class="method-option"
          >
            <input
              type="radio"
              v-model="selectedPaymentMethod"
              :value="method.id"
              name="payment-method"
            />
            <div class="method-details">
              <span class="method-brand">{{ method.brand }}</span>
              <span class="method-last4">•••• {{ method.last4 }}</span>
              <span v-if="method.isDefault" class="default-badge">Default</span>
            </div>
          </label>
        </div>

        <!-- Add New Card Option -->
        <button
          v-if="!showAddCard"
          @click="showAddCard = true"
          class="add-card-button"
          type="button"
        >
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Card
        </button>

        <!-- New Card Form -->
        <div v-if="showAddCard" class="new-card-form">
          <div class="form-group">
            <label for="card-number">Card Number</label>
            <input
              id="card-number"
              type="text"
              v-model="cardForm.number"
              @input="formatCardNumber"
              placeholder="1234 5678 9012 3456"
              maxlength="19"
              class="form-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="card-expiry">Expiry</label>
              <input
                id="card-expiry"
                type="text"
                v-model="cardForm.expiry"
                @input="formatExpiry"
                placeholder="MM/YY"
                maxlength="5"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="card-cvc">CVC</label>
              <input
                id="card-cvc"
                type="text"
                v-model="cardForm.cvc"
                placeholder="123"
                maxlength="4"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="card-name">Cardholder Name</label>
            <input
              id="card-name"
              type="text"
              v-model="cardForm.name"
              placeholder="John Doe"
              class="form-input"
            />
          </div>

          <div class="form-actions">
            <button
              @click="showAddCard = false"
              type="button"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              @click="addPaymentMethod"
              :disabled="!isCardFormValid || isProcessing"
              type="button"
              class="btn btn-primary"
            >
              Add Card
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <svg class="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="form-footer">
        <button
          @click="$emit('cancel')"
          type="button"
          class="btn btn-secondary"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        <button
          @click="processPayment"
          type="button"
          class="btn btn-primary"
          :disabled="isProcessing || (!selectedPaymentMethod && !showAddCard)"
        >
          <span v-if="isProcessing" class="spinner-small"></span>
          <span v-else>Pay {{ formattedAmount }}</span>
        </button>
      </div>

      <!-- Security Notice -->
      <div class="security-notice">
        <svg class="lock-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Your payment information is encrypted and secure</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-form {
  max-width: 500px;
  margin: 0 auto;
}

.loading-container {
  text-align: center;
  padding: 3rem;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-radius: 50%;
    border-top-color: #6366f1;
    animation: spin 1s ease-in-out infinite;
    margin: 0 auto 1rem;
  }
  
  p {
    color: #6b7280;
  }
}

.payment-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.amount-summary {
  margin-bottom: 2rem;
  
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #111827;
  }
  
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    font-size: 0.875rem;
    
    &.text-muted {
      color: #6b7280;
    }
    
    &.total {
      font-weight: 600;
      font-size: 1rem;
      color: #111827;
    }
    
    .amount {
      font-weight: 600;
      color: #6366f1;
    }
  }
  
  .summary-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.75rem 0;
  }
}

.payment-methods {
  margin-bottom: 2rem;
  
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #111827;
  }
  
  .method-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .method-option {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }
    
    input[type="radio"] {
      margin-right: 1rem;
    }
    
    input[type="radio"]:checked + .method-details {
      font-weight: 500;
    }
    
    &:has(input[type="radio"]:checked) {
      border-color: #6366f1;
      background: #f0f1ff;
    }
  }
  
  .method-details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    
    .method-brand {
      font-weight: 500;
      color: #374151;
    }
    
    .method-last4 {
      color: #6b7280;
    }
    
    .default-badge {
      margin-left: auto;
      padding: 0.25rem 0.5rem;
      background: #e0e7ff;
      color: #6366f1;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 4px;
    }
  }
}

.add-card-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  color: #6366f1;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  
  &:hover {
    border-color: #6366f1;
    background: #f0f1ff;
  }
  
  .icon {
    width: 20px;
    height: 20px;
  }
}

.new-card-form {
  margin-top: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  
  .form-group {
    margin-bottom: 1rem;
    
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }
    
    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: border-color 0.2s ease;
      
      &:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
    }
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  
  .error-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.form-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  
  .btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    
    &.btn-secondary {
      background: #f3f4f6;
      color: #374151;
      
      &:hover:not(:disabled) {
        background: #e5e7eb;
      }
    }
    
    &.btn-primary {
      background: #6366f1;
      color: white;
      
      &:hover:not(:disabled) {
        background: #5558e3;
      }
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.security-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 0.75rem;
  
  .lock-icon {
    width: 16px;
    height: 16px;
  }
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>