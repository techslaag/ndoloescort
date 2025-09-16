<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSubscriptionStore } from '../../stores/subscription'
import { featureAccessService } from '../../services/featureAccessService'
import { flutterwaveService } from '../../services/flutterwaveService'
import FlutterwavePayment from '../payment/FlutterwavePayment.vue'

interface Gift {
  id: string
  name: string
  icon: string
  price: number
  animation?: string
}

interface Props {
  recipientId: string
  recipientName: string
  context?: 'chat' | 'stream' | 'profile'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'gift-sent': [gift: Gift]
  'close': []
}>()

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// State
const selectedGift = ref<Gift | null>(null)
const isSending = ref(false)
const hasAccess = ref(true)
const accessError = ref<string | null>(null)
const showPaymentModal = ref(false)
const paymentRef = ref<InstanceType<typeof FlutterwavePayment>>()

// Available gifts
const gifts: Gift[] = [
  { id: 'rose', name: 'Rose', icon: '🌹', price: 5 },
  { id: 'heart', name: 'Heart', icon: '❤️', price: 10 },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 25 },
  { id: 'crown', name: 'Crown', icon: '👑', price: 50 },
  { id: 'star', name: 'Star', icon: '⭐', price: 100 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', price: 200 },
  { id: 'unicorn', name: 'Unicorn', icon: '🦄', price: 500 },
  { id: 'treasure', name: 'Treasure', icon: '💰', price: 1000 }
]

// User balance (in real app, this would come from a wallet service)
const userBalance = ref(2500)

// Check if user can afford the gift
const canAfford = computed(() => {
  if (!selectedGift.value) return true
  return userBalance.value >= selectedGift.value.price
})

// Check gift access
const checkAccess = async () => {
  const access = await featureAccessService.canReceiveGifts()
  hasAccess.value = access.canAccessFeature
  accessError.value = access.reason || null
}

// Select a gift
const selectGift = (gift: Gift) => {
  selectedGift.value = gift
}

// Send the selected gift
const sendGift = async () => {
  if (!selectedGift.value || isSending.value) return
  
  // Show payment modal for real money payment
  showPaymentModal.value = true
}

// Handle payment success
const handlePaymentSuccess = async (response: any) => {
  try {
    isSending.value = true
    showPaymentModal.value = false
    
    // Emit success event
    emit('gift-sent', selectedGift.value!)
    
    // Close modal after short delay
    setTimeout(() => {
      emit('close')
    }, 1500)
    
  } catch (error) {
    console.error('Failed to send gift:', error)
  } finally {
    isSending.value = false
  }
}

// Handle payment error
const handlePaymentError = (error: Error) => {
  console.error('Payment failed:', error)
  showPaymentModal.value = false
  // You might want to show an error message to the user
}

// Handle payment modal close
const handlePaymentClose = () => {
  showPaymentModal.value = false
}

// Add funds - removed as we use direct payment now
const addFunds = () => {
  // Direct payment through Flutterwave
  console.log('Direct payment through Flutterwave')
}

onMounted(() => {
  checkAccess()
})
</script>

<template>
  <div class="gift-modal-overlay" @click="$emit('close')">
    <div class="gift-modal" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2>Send a Gift to {{ recipientName }}</h2>
        <button @click="$emit('close')" class="close-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content" v-if="hasAccess">
        <!-- Remove balance section as we use direct payment -->

        <!-- Gift Grid -->
        <div class="gifts-grid">
          <div
            v-for="gift in gifts"
            :key="gift.id"
            class="gift-item"
            :class="{ selected: selectedGift?.id === gift.id }"
            @click="selectGift(gift)"
          >
            <div class="gift-icon">{{ gift.icon }}</div>
            <div class="gift-name">{{ gift.name }}</div>
            <div class="gift-price">${{ gift.price }}</div>
          </div>
        </div>

        <!-- Selected Gift Details -->
        <div v-if="selectedGift" class="selected-gift">
          <div class="gift-preview">
            <span class="icon">{{ selectedGift.icon }}</span>
            <span class="name">{{ selectedGift.name }}</span>
            <span class="price">${{ selectedGift.price }}</span>
          </div>
          <!-- Price info -->
          <div class="price-info">
            You will be charged <strong>${{ selectedGift.price }}</strong> for this gift
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button @click="$emit('close')" class="cancel-btn">
            Cancel
          </button>
          <button 
            @click="sendGift" 
            class="send-btn"
            :disabled="!selectedGift || isSending"
          >
            <span v-if="isSending">Sending...</span>
            <span v-else>Send Gift</span>
          </button>
        </div>
      </div>

      <!-- Access Denied -->
      <div v-else class="access-denied">
        <svg class="icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
        <p>{{ accessError || 'Gift feature not available' }}</p>
      </div>
    </div>
    
    <!-- Flutterwave Payment Modal -->
    <Teleport to="body" v-if="showPaymentModal && selectedGift">
      <div class="payment-modal-overlay" @click="handlePaymentClose">
        <div class="payment-modal-content" @click.stop>
          <FlutterwavePayment
            ref="paymentRef"
            :amount="selectedGift.price"
            :description="`Gift ${selectedGift.name} for ${recipientName}`"
            payment-type="gift"
            :metadata="{
              giftType: selectedGift.id,
              giftName: selectedGift.name,
              recipientId: recipientId,
              recipientName: recipientName
            }"
            @payment-success="handlePaymentSuccess"
            @payment-error="handlePaymentError"
            @payment-closed="handlePaymentClose"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.gift-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.gift-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

// Modal Header
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }
  
  .close-btn {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.3s ease;
    
    &:hover {
      color: #1f2937;
    }
  }
}

// Modal Content
.modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 200px);
}

// Balance Section
.balance-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  
  .balance {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .label {
      color: #6b7280;
    }
    
    .amount {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1f2937;
    }
  }
  
  .add-funds-btn {
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.3s ease;
    
    &:hover {
      background: #4f46e5;
    }
  }
}

// Gifts Grid
.gifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.gift-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f3f4f6;
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: #6366f1;
    background: #eef2ff;
  }
  
  .gift-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  
  .gift-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }
  
  .gift-price {
    color: #6b7280;
    font-size: 0.875rem;
  }
}

// Selected Gift
.selected-gift {
  margin-bottom: 1.5rem;
  
  .gift-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    background: #eef2ff;
    border-radius: 12px;
    margin-bottom: 1rem;
    
    .icon {
      font-size: 2rem;
    }
    
    .name {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
    }
    
    .price {
      font-size: 1.25rem;
      color: #6366f1;
      font-weight: bold;
    }
  }
  
  .insufficient-funds {
    color: #ef4444;
    text-align: center;
    padding: 0.5rem;
    background: #fee2e2;
    border-radius: 8px;
  }
}

// Modal Actions
.modal-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  
  button {
    flex: 1;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .cancel-btn {
    background: #f3f4f6;
    color: #6b7280;
    
    &:hover:not(:disabled) {
      background: #e5e7eb;
    }
  }
  
  .send-btn {
    background: #10b981;
    color: white;
    
    &:hover:not(:disabled) {
      background: #059669;
    }
  }
}

// Access Denied
.access-denied {
  padding: 3rem;
  text-align: center;
  
  .icon {
    color: #f59e0b;
    margin-bottom: 1rem;
  }
  
  p {
    color: #6b7280;
    font-size: 1.1rem;
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// Price info
.price-info {
  text-align: center;
  padding: 1rem;
  background: #e3f2fd;
  border-radius: 8px;
  color: #1976d2;
  font-size: 0.95rem;
  
  strong {
    font-weight: 600;
  }
}

// Payment modal overlay
.payment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.payment-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

// Mobile Responsiveness
@media (max-width: 640px) {
  .gift-modal {
    width: 95%;
    margin: 1rem;
  }
  
  .gifts-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .gift-item {
    padding: 0.75rem;
    
    .gift-icon {
      font-size: 2rem;
    }
  }
}
</style>