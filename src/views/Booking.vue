<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import { paymentService } from '../services/paymentService'
import PaymentForm from '../components/payment/PaymentForm.vue'
import ErrorAlert from '../components/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const profileId = route.params.id as string
const isLoading = ref(false)
const profile = ref<any>(null)
const selectedService = ref('')
const selectedDate = ref('')
const selectedTime = ref('')
const duration = ref(2)
const location = ref('')
const specialRequests = ref('')
const showPayment = ref(false)
const bookingConfirmed = ref(false)
const error = ref('')

const availableTimes = ref([
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
])

const services = computed(() => {
  if (!profile.value?.services) return []
  try {
    return JSON.parse(profile.value.services)
  } catch {
    return []
  }
})

const pricing = computed(() => {
  if (!profile.value?.pricing) return []
  try {
    return JSON.parse(profile.value.pricing)
  } catch {
    return []
  }
})

const selectedServiceDetails = computed(() => {
  return services.value.find(s => s.id === selectedService.value)
})

const selectedPricing = computed(() => {
  return pricing.value.find(p => p.type === 'hourly')
})

const totalCost = computed(() => {
  const hourlyRate = selectedPricing.value?.amount || 0
  return hourlyRate * duration.value
})

const minDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
})

onMounted(async () => {
  await loadProfile()
})

const loadProfile = async () => {
  try {
    isLoading.value = true
    await profileStore.fetchProfiles()
    profile.value = profileStore.profiles.find(p => (p.id || p.$id) === profileId)
    
    if (!profile.value) {
      error.value = 'Profile not found'
      return
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load profile'
  } finally {
    isLoading.value = false
  }
}

const validateBooking = () => {
  if (!selectedService.value) {
    error.value = 'Please select a service'
    return false
  }
  if (!selectedDate.value) {
    error.value = 'Please select a date'
    return false
  }
  if (!selectedTime.value) {
    error.value = 'Please select a time'
    return false
  }
  if (!location.value.trim()) {
    error.value = 'Please provide a location'
    return false
  }
  if (duration.value < 1 || duration.value > 24) {
    error.value = 'Duration must be between 1 and 24 hours'
    return false
  }
  return true
}

const proceedToPayment = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (validateBooking()) {
    error.value = ''
    showPayment.value = true
  }
}

const handlePaymentSuccess = async (paymentData: any) => {
  try {
    // Create booking record
    const booking = {
      escortId: profileId,
      clientId: authStore.user?.$id,
      service: selectedServiceDetails.value,
      date: selectedDate.value,
      time: selectedTime.value,
      duration: duration.value,
      location: location.value,
      specialRequests: specialRequests.value,
      totalCost: totalCost.value,
      paymentId: paymentData.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    console.log('Booking created:', booking)
    bookingConfirmed.value = true
    showPayment.value = false
    
  } catch (err: any) {
    error.value = err.message || 'Failed to create booking'
  }
}

const handlePaymentError = (errorMessage: string) => {
  error.value = errorMessage
  showPayment.value = false
}

const goBack = () => {
  if (showPayment.value) {
    showPayment.value = false
  } else {
    router.back()
  }
}

const goToMessages = () => {
  router.push('/messages')
}

const bookAnother = () => {
  // Reset form
  selectedService.value = ''
  selectedDate.value = ''
  selectedTime.value = ''
  duration.value = 2
  location.value = ''
  specialRequests.value = ''
  bookingConfirmed.value = false
  error.value = ''
}
</script>

<template>
  <div class="booking-page">
    <ErrorAlert 
      :error="error"
      :auto-clear="false"
      :dismissible="true"
      @clear="error = ''"
      @dismiss="error = ''"
    />
    
    <div class="container">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>
      
      <!-- Booking Confirmed -->
      <div v-else-if="bookingConfirmed" class="booking-confirmed">
        <div class="confirmation-card">
          <div class="confirmation-icon">✅</div>
          <h1>Booking Confirmed!</h1>
          <p>Your booking request has been submitted successfully.</p>
          
          <div class="booking-summary">
            <h3>Booking Details</h3>
            <div class="summary-item">
              <span class="label">Companion:</span>
              <span class="value">{{ profile?.name }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Service:</span>
              <span class="value">{{ selectedServiceDetails?.category }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Date & Time:</span>
              <span class="value">{{ new Date(selectedDate + 'T' + selectedTime).toLocaleString() }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Duration:</span>
              <span class="value">{{ duration }} hour{{ duration > 1 ? 's' : '' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Location:</span>
              <span class="value">{{ location }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Cost:</span>
              <span class="value">${{ totalCost }}</span>
            </div>
          </div>
          
          <div class="next-steps">
            <h3>What happens next?</h3>
            <ul>
              <li>You'll receive a confirmation email within 15 minutes</li>
              <li>Your companion will contact you within 24 hours to confirm details</li>
              <li>Any special arrangements will be discussed directly</li>
              <li>Payment will be processed 24 hours before your booking</li>
            </ul>
          </div>
          
          <div class="action-buttons">
            <button @click="goToMessages" class="btn btn-primary">
              Go to Messages
            </button>
            <button @click="bookAnother" class="btn btn-outline">
              Book Another
            </button>
          </div>
        </div>
      </div>
      
      <!-- Payment Form -->
      <div v-else-if="showPayment" class="payment-section">
        <div class="payment-header">
          <button @click="goBack" class="btn btn-text">
            ← Back to Booking
          </button>
          <h1>Complete Your Payment</h1>
        </div>
        
        <div class="payment-content">
          <div class="booking-summary-sidebar">
            <div class="summary-card">
              <div class="companion-info">
                <img :src="profile?.profilePhoto" :alt="profile?.name" class="companion-photo">
                <div class="companion-details">
                  <h3>{{ profile?.name }}</h3>
                  <p class="companion-location">{{ profile?.locationCity }}</p>
                </div>
              </div>
              
              <div class="booking-details">
                <div class="detail-item">
                  <span class="label">Service:</span>
                  <span class="value">{{ selectedServiceDetails?.category }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Date:</span>
                  <span class="value">{{ new Date(selectedDate).toLocaleDateString() }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Time:</span>
                  <span class="value">{{ selectedTime }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Duration:</span>
                  <span class="value">{{ duration }} hour{{ duration > 1 ? 's' : '' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Location:</span>
                  <span class="value">{{ location }}</span>
                </div>
              </div>
              
              <div class="cost-breakdown">
                <div class="cost-item">
                  <span class="label">Hourly Rate:</span>
                  <span class="value">${{ selectedPricing?.amount }}</span>
                </div>
                <div class="cost-item">
                  <span class="label">Duration:</span>
                  <span class="value">{{ duration }} hours</span>
                </div>
                <div class="cost-item subtotal">
                  <span class="label">Subtotal:</span>
                  <span class="value">${{ totalCost }}</span>
                </div>
                <div class="cost-item total">
                  <span class="label">Total:</span>
                  <span class="value">${{ totalCost }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="payment-form-section">
            <PaymentForm 
              :amount="totalCost"
              :description="`${selectedServiceDetails?.category} with ${profile?.name}`"
              @payment-success="handlePaymentSuccess"
              @payment-error="handlePaymentError"
            />
          </div>
        </div>
      </div>
      
      <!-- Booking Form -->
      <div v-else class="booking-form-section">
        <div class="booking-header">
          <button @click="goBack" class="btn btn-text">
            ← Back
          </button>
          <h1>Book {{ profile?.name }}</h1>
        </div>
        
        <div class="booking-content">
          <div class="profile-sidebar">
            <div class="profile-card">
              <img :src="profile?.profilePhoto" :alt="profile?.name" class="profile-photo">
              <div class="profile-info">
                <h2>{{ profile?.name }}</h2>
                <p class="profile-location">📍 {{ profile?.locationCity }}</p>
                <p class="profile-age">{{ profile?.age }} years old</p>
                <div class="profile-rating">
                  <span class="rating">{{ (profile?.statsRating || 0).toFixed(1) }}⭐</span>
                  <span class="reviews">({{ profile?.statsReviewCount || 0 }} reviews)</span>
                </div>
              </div>
              
              <div class="pricing-info">
                <h3>Pricing</h3>
                <div v-if="pricing.length > 0" class="pricing-list">
                  <div v-for="price in pricing" :key="price.type" class="pricing-item">
                    <span class="price-type">{{ price.type }}:</span>
                    <span class="price-amount">${{ price.amount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="booking-form">
            <form @submit.prevent="proceedToPayment">
              <!-- Service Selection -->
              <div class="form-section">
                <h3>Select Service</h3>
                <div class="service-options">
                  <label 
                    v-for="service in services" 
                    :key="service.id"
                    class="service-option"
                    :class="{ selected: selectedService === service.id }"
                  >
                    <input 
                      type="radio" 
                      :value="service.id" 
                      v-model="selectedService"
                    >
                    <div class="service-content">
                      <h4>{{ service.category }}</h4>
                      <p>{{ service.description }}</p>
                      <span class="service-duration">{{ service.duration }}</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <!-- Date & Time -->
              <div class="form-section">
                <h3>Date & Time</h3>
                <div class="datetime-grid">
                  <div class="form-group">
                    <label for="date">Date</label>
                    <input 
                      type="date" 
                      id="date" 
                      v-model="selectedDate"
                      :min="minDate"
                      required
                    >
                  </div>
                  
                  <div class="form-group">
                    <label for="time">Time</label>
                    <select id="time" v-model="selectedTime" required>
                      <option value="">Select time</option>
                      <option v-for="time in availableTimes" :key="time" :value="time">
                        {{ time }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="duration">Duration (hours)</label>
                    <input 
                      type="number" 
                      id="duration" 
                      v-model.number="duration"
                      min="1" 
                      max="24"
                      required
                    >
                  </div>
                </div>
              </div>
              
              <!-- Location -->
              <div class="form-section">
                <h3>Meeting Location</h3>
                <div class="form-group">
                  <label for="location">Address or Venue</label>
                  <textarea 
                    id="location" 
                    v-model="location"
                    placeholder="Please provide the address, hotel, restaurant, or venue name"
                    rows="3"
                    required
                  ></textarea>
                  <small class="form-help">
                    For your privacy and safety, please provide a public location or reputable venue.
                  </small>
                </div>
              </div>
              
              <!-- Special Requests -->
              <div class="form-section">
                <h3>Special Requests (Optional)</h3>
                <div class="form-group">
                  <label for="requests">Additional Information</label>
                  <textarea 
                    id="requests" 
                    v-model="specialRequests"
                    placeholder="Any special requests, dress code, or additional information..."
                    rows="4"
                  ></textarea>
                </div>
              </div>
              
              <!-- Cost Summary -->
              <div class="cost-summary">
                <div class="cost-item">
                  <span>Hourly Rate:</span>
                  <span>${{ selectedPricing?.amount || 0 }}</span>
                </div>
                <div class="cost-item">
                  <span>Duration:</span>
                  <span>{{ duration }} hours</span>
                </div>
                <div class="cost-item total">
                  <span>Total Cost:</span>
                  <span>${{ totalCost }}</span>
                </div>
              </div>
              
              <button type="submit" class="btn btn-primary btn-lg" :disabled="!selectedService || !selectedDate || !selectedTime || !location.trim()">
                Proceed to Payment
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.booking-page {
  padding: var(--spacing-lg) 0;
  min-height: 80vh;
}

.loading-state {
  text-align: center;
  padding: var(--spacing-xxl);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-text-lighter);
    border-top: 3px solid var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
  }
  
  p {
    color: var(--color-text-light);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.booking-confirmed {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

.confirmation-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xxl);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 600px;
  width: 100%;
  
  .confirmation-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
  }
  
  h1 {
    color: var(--color-success);
    margin-bottom: var(--spacing-md);
  }
  
  > p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xl);
  }
}

.booking-summary {
  background: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-xl);
  text-align: left;
  
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      color: var(--color-text-light);
    }
    
    .value {
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
}

.next-steps {
  text-align: left;
  margin-bottom: var(--spacing-xl);
  
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  ul {
    padding-left: var(--spacing-lg);
    
    li {
      margin-bottom: var(--spacing-sm);
      color: var(--color-text);
      line-height: 1.5;
    }
  }
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.booking-header, .payment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  
  h1 {
    color: var(--color-text-dark);
    margin: 0;
  }
}

.booking-content, .payment-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: var(--spacing-xl);
}

.profile-sidebar, .booking-summary-sidebar {
  .profile-card, .summary-card {
    background: white;
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: var(--spacing-lg);
  }
}

.profile-photo, .companion-photo {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
}

.companion-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  
  .companion-photo {
    width: 80px;
    height: 80px;
    margin: 0;
  }
  
  .companion-details h3 {
    margin-bottom: var(--spacing-xs);
    color: var(--color-text-dark);
  }
  
  .companion-location {
    color: var(--color-text-light);
    margin: 0;
  }
}

.profile-info {
  margin-bottom: var(--spacing-lg);
  
  h2 {
    margin-bottom: var(--spacing-xs);
    color: var(--color-text-dark);
  }
  
  p {
    margin-bottom: var(--spacing-xs);
    color: var(--color-text-light);
  }
  
  .profile-rating {
    .rating {
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    .reviews {
      color: var(--color-text-light);
      font-size: 0.9rem;
    }
  }
}

.pricing-info {
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  .pricing-item {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
    
    .price-type {
      color: var(--color-text-light);
      text-transform: capitalize;
    }
    
    .price-amount {
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
}

.booking-form {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: var(--spacing-xl);
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--color-background-alt);
  }
}

.service-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.service-option {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover, &.selected {
    border-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.05);
  }
  
  input[type="radio"] {
    margin-top: var(--spacing-xs);
  }
  
  .service-content {
    flex: 1;
    
    h4 {
      margin-bottom: var(--spacing-xs);
      color: var(--color-text-dark);
    }
    
    p {
      color: var(--color-text);
      margin-bottom: var(--spacing-xs);
      line-height: 1.5;
    }
    
    .service-duration {
      font-size: 0.9rem;
      color: var(--color-text-light);
      font-style: italic;
    }
  }
}

.datetime-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-md);
}

.cost-summary, .cost-breakdown {
  background: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-lg);
}

.cost-item, .detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid #ddd;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.total, &.subtotal {
    font-weight: 600;
    font-size: 1.1rem;
    
    &.total {
      border-top: 2px solid #ddd;
      padding-top: var(--spacing-md);
      margin-top: var(--spacing-sm);
    }
  }
  
  .label {
    color: var(--color-text-light);
  }
  
  .value {
    color: var(--color-text-dark);
  }
}

.booking-details {
  margin: var(--spacing-lg) 0;
}

.form-help {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: 0.8rem;
  color: var(--color-text-lighter);
  font-style: italic;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  &.btn-outline {
    background-color: transparent;
    color: var(--color-text-dark);
    border: 1px solid var(--color-text-lighter);
    
    &:hover {
      background-color: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
  
  &.btn-text {
    background: none;
    border: none;
    color: var(--color-accent);
    padding: 0;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  &.btn-lg {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    margin-top: var(--spacing-lg);
  }
}

@media (max-width: 992px) {
  .booking-content, .payment-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .profile-card, .summary-card {
    position: static !important;
  }
}

@media (max-width: 768px) {
  .datetime-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .booking-header, .payment-header {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}
</style>