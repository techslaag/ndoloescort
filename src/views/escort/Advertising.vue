<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '../../stores/profile'
import { useAuthStore } from '../../stores/auth'
import { advertisingService } from '../../services/advertisingService'
import { paymentService } from '../../services/paymentService'
import { AdvertisingPlan, AdvertisingPurchase, AdvertisingDashboard } from '../../types/advertising'
import PaymentForm from '../../components/payment/PaymentForm.vue'
import ErrorAlert from '../../components/ErrorAlert.vue'

const profileStore = useProfileStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const dashboard = ref<AdvertisingDashboard | null>(null)
const selectedProfile = ref('')
const selectedPlan = ref<AdvertisingPlan | null>(null)
const selectedCity = ref('')
const showPayment = ref(false)
const showPlanDetails = ref(false)
const error = ref('')
const success = ref('')

const profiles = computed(() => profileStore.profiles || [])
const selectedProfileData = computed(() => {
  return profiles.value.find(p => (p.$id || p.id) === selectedProfile.value)
})

const premiumPlans = computed(() => {
  return dashboard.value?.availablePlans.filter(p => p.type === 'premium') || []
})

const exclusivePlans = computed(() => {
  return dashboard.value?.availablePlans.filter(p => p.type === 'exclusive') || []
})

const activeCampaigns = computed(() => {
  return dashboard.value?.activeCampaigns || []
})

const stats = computed(() => dashboard.value?.stats)

const cityOptions = ref([
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
  'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington'
])

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    isLoading.value = true
    await profileStore.fetchProfiles()
    
    if (profiles.value.length > 0) {
      selectedProfile.value = profiles.value[0].$id || profiles.value[0].id
      selectedCity.value = profiles.value[0].locationCity || cityOptions.value[0]
      await loadAdvertisingDashboard()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load data'
  } finally {
    isLoading.value = false
  }
}

const loadAdvertisingDashboard = async () => {
  if (!selectedProfile.value) return
  
  try {
    dashboard.value = await advertisingService.getAdvertisingDashboard(selectedProfile.value)
  } catch (err: any) {
    error.value = err.message || 'Failed to load advertising dashboard'
  }
}

const onProfileChange = async () => {
  const profile = selectedProfileData.value
  if (profile) {
    selectedCity.value = profile.locationCity || cityOptions.value[0]
    await loadAdvertisingDashboard()
  }
}

const selectPlan = async (plan: AdvertisingPlan) => {
  selectedPlan.value = plan
  showPlanDetails.value = true
  
  if (plan.type === 'exclusive') {
    const available = await advertisingService.checkExclusiveAvailability(selectedCity.value, plan.id)
    if (!available) {
      error.value = 'No exclusive slots available in this city. Please try a different city or premium plan.'
      return
    }
  }
  
  error.value = ''
}

const proceedToPurchase = () => {
  if (!selectedProfile.value) {
    error.value = 'Please select a profile'
    return
  }
  
  if (!selectedCity.value) {
    error.value = 'Please select a city'
    return
  }
  
  showPayment.value = true
}

const handlePaymentSuccess = async (paymentData: any) => {
  try {
    if (!selectedPlan.value) return
    
    // Create the advertising purchase with payment processing
    const result = await advertisingService.purchaseAdvertising(
      selectedProfile.value,
      selectedPlan.value.id,
      selectedCity.value,
      authStore.user?.$id || '',
      true
    )
    
    // Activate the advertising after successful payment
    if (result.purchase.id) {
      await advertisingService.activateAdvertising(result.purchase.id)
    }
    
    success.value = `Successfully purchased ${selectedPlan.value.name}! Your profile boost is now active.`
    showPayment.value = false
    showPlanDetails.value = false
    selectedPlan.value = null
    
    await loadAdvertisingDashboard()
  } catch (err: any) {
    error.value = err.message || 'Failed to purchase advertising'
  }
}

const handlePaymentError = (errorMessage: string) => {
  error.value = errorMessage
  showPayment.value = false
}

const cancelPurchase = () => {
  showPayment.value = false
  showPlanDetails.value = false
  selectedPlan.value = null
}

const cancelCampaign = async (campaignId: string) => {
  try {
    const success = await advertisingService.cancelAdvertising(campaignId)
    if (success) {
      success.value = 'Campaign cancelled successfully'
      await loadAdvertisingDashboard()
    } else {
      error.value = 'Failed to cancel campaign'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to cancel campaign'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const getDaysRemaining = (endDate: string) => {
  const end = new Date(endDate)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

const getProgressPercentage = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()
  
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}
</script>

<template>
  <div class="advertising-page">
    <div class="container">
      <ErrorAlert 
        :error="error"
        :auto-clear="false"
        :dismissible="true"
        @clear="error = ''"
        @dismiss="error = ''"
      />
      
      <div v-if="success" class="alert alert-success">
        {{ success }}
        <button @click="success = ''" class="alert-close">×</button>
      </div>
      
      <div class="page-header">
        <h1>Advertising & Profile Boost</h1>
        <p>Increase your profile visibility and attract more clients with our advertising options.</p>
      </div>
      
      <!-- Profile Selection -->
      <div class="profile-selection">
        <div class="selection-group">
          <label for="profile">Select Profile</label>
          <select 
            id="profile" 
            v-model="selectedProfile" 
            @change="onProfileChange"
            class="form-select"
          >
            <option value="">Choose a profile...</option>
            <option 
              v-for="profile in profiles" 
              :key="profile.$id || profile.id"
              :value="profile.$id || profile.id"
            >
              {{ profile.name }} - {{ profile.locationCity }}
            </option>
          </select>
        </div>
        
        <div class="selection-group">
          <label for="city">Target City</label>
          <select 
            id="city" 
            v-model="selectedCity"
            class="form-select"
          >
            <option v-for="city in cityOptions" :key="city" :value="city">
              {{ city }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading advertising dashboard...</p>
      </div>
      
      <!-- Payment Form -->
      <div v-else-if="showPayment" class="payment-section">
        <div class="payment-header">
          <button @click="cancelPurchase" class="btn btn-text">
            ← Back to Plans
          </button>
          <h2>Complete Your Purchase</h2>
        </div>
        
        <div class="payment-content">
          <div class="purchase-summary">
            <div class="summary-card">
              <h3>{{ selectedPlan?.name }}</h3>
              <div class="plan-details">
                <div class="detail-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ selectedPlan?.type }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Duration:</span>
                  <span class="value">{{ selectedPlan?.duration }} days</span>
                </div>
                <div class="detail-item">
                  <span class="label">Profile:</span>
                  <span class="value">{{ selectedProfileData?.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">City:</span>
                  <span class="value">{{ selectedCity }}</span>
                </div>
                <div class="detail-item total">
                  <span class="label">Total:</span>
                  <span class="value">${{ selectedPlan?.price }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="payment-form-section">
            <PaymentForm 
              :amount="selectedPlan?.price || 0"
              :description="`${selectedPlan?.name} for ${selectedProfileData?.name}`"
              @payment-success="handlePaymentSuccess"
              @payment-error="handlePaymentError"
            />
          </div>
        </div>
      </div>
      
      <!-- Plan Details Modal -->
      <div v-else-if="showPlanDetails" class="plan-details-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ selectedPlan?.name }}</h2>
            <button @click="showPlanDetails = false" class="btn btn-text">×</button>
          </div>
          
          <div class="modal-body">
            <div class="plan-info">
              <div class="plan-badge" :class="selectedPlan?.type">
                {{ selectedPlan?.type }}
              </div>
              <div class="plan-price">${{ selectedPlan?.price }}</div>
              <div class="plan-duration">{{ selectedPlan?.duration }} days</div>
            </div>
            
            <p class="plan-description">{{ selectedPlan?.description }}</p>
            
            <div class="plan-features">
              <h4>Features Included:</h4>
              <ul>
                <li v-for="feature in selectedPlan?.features" :key="feature">
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="modal-actions">
            <button @click="showPlanDetails = false" class="btn btn-outline">
              Cancel
            </button>
            <button @click="proceedToPurchase" class="btn btn-primary">
              Purchase Now
            </button>
          </div>
        </div>
      </div>
      
      <!-- Main Dashboard -->
      <div v-else class="advertising-dashboard">
        <!-- Stats Overview -->
        <div v-if="stats" class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-value">${{ stats.totalSpent }}</div>
              <div class="stat-label">Total Spent</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeCampaigns }}</div>
              <div class="stat-label">Active Campaigns</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">👀</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalImpressions.toLocaleString() }}</div>
              <div class="stat-label">Total Views</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.clickThroughRate.toFixed(1) }}%</div>
              <div class="stat-label">Click Rate</div>
            </div>
          </div>
        </div>
        
        <!-- Active Campaigns -->
        <div v-if="activeCampaigns.length > 0" class="active-campaigns">
          <h2>Active Campaigns</h2>
          <div class="campaigns-grid">
            <div 
              v-for="campaign in activeCampaigns" 
              :key="campaign.id"
              class="campaign-card"
              :class="campaign.planType"
            >
              <div class="campaign-header">
                <div class="campaign-badge" :class="campaign.planType">
                  {{ campaign.planType }}
                </div>
                <div class="campaign-price">${{ campaign.price }}</div>
              </div>
              
              <h3>{{ campaign.planName }}</h3>
              <p class="campaign-city">📍 {{ campaign.city }}</p>
              
              <div class="campaign-timeline">
                <div class="timeline-info">
                  <span class="start-date">Started: {{ formatDate(campaign.startDate) }}</span>
                  <span class="end-date">Ends: {{ formatDate(campaign.endDate) }}</span>
                </div>
                
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: getProgressPercentage(campaign.startDate, campaign.endDate) + '%' }"
                  ></div>
                </div>
                
                <div class="days-remaining">
                  {{ getDaysRemaining(campaign.endDate) }} days remaining
                </div>
              </div>
              
              <div class="campaign-actions">
                <button @click="cancelCampaign(campaign.id)" class="btn btn-outline btn-sm">
                  Cancel Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Premium Plans -->
        <div class="plans-section">
          <h2>Premium Plans</h2>
          <p class="section-description">Boost your profile visibility with premium placement options.</p>
          
          <div class="plans-grid">
            <div 
              v-for="plan in premiumPlans" 
              :key="plan.id"
              class="plan-card premium"
              :class="{ popular: plan.isPopular }"
            >
              <div v-if="plan.isPopular" class="popular-badge">Most Popular</div>
              
              <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <div class="plan-price">
                  <span class="price">${{ plan.price }}</span>
                  <span class="duration">{{ plan.duration }} days</span>
                </div>
              </div>
              
              <p class="plan-description">{{ plan.description }}</p>
              
              <ul class="plan-features">
                <li v-for="feature in plan.features.slice(0, 3)" :key="feature">
                  ✓ {{ feature }}
                </li>
                <li v-if="plan.features.length > 3" class="more-features">
                  +{{ plan.features.length - 3 }} more features
                </li>
              </ul>
              
              <button @click="selectPlan(plan)" class="btn btn-primary btn-full">
                Select Plan
              </button>
            </div>
          </div>
        </div>
        
        <!-- Exclusive Plans -->
        <div class="plans-section">
          <h2>Exclusive Plans</h2>
          <p class="section-description">
            Elite placement with maximum visibility. Limited to 10 profiles per city.
          </p>
          
          <div class="plans-grid">
            <div 
              v-for="plan in exclusivePlans" 
              :key="plan.id"
              class="plan-card exclusive"
              :class="{ popular: plan.isPopular }"
            >
              <div v-if="plan.isPopular" class="popular-badge">Best Value</div>
              <div class="exclusive-badge">Limited Availability</div>
              
              <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <div class="plan-price">
                  <span class="price">${{ plan.price }}</span>
                  <span class="duration">{{ plan.duration }} day{{ plan.duration > 1 ? 's' : '' }}</span>
                </div>
              </div>
              
              <p class="plan-description">{{ plan.description }}</p>
              
              <ul class="plan-features">
                <li v-for="feature in plan.features.slice(0, 4)" :key="feature">
                  ★ {{ feature }}
                </li>
                <li v-if="plan.features.length > 4" class="more-features">
                  +{{ plan.features.length - 4 }} more features
                </li>
              </ul>
              
              <button @click="selectPlan(plan)" class="btn btn-primary btn-full exclusive">
                Select Exclusive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.advertising-page {
  padding: var(--spacing-lg) 0;
  min-height: 80vh;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  
  h1 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-md);
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
  }
}

.profile-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
  
  .selection-group {
    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
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
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.alert {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  position: relative;
  
  &.alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .alert-close {
    position: absolute;
    right: var(--spacing-md);
    top: var(--spacing-md);
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
}

.stat-card {
  background: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  .stat-icon {
    font-size: 2rem;
  }
  
  .stat-content {
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
    }
    
    .stat-label {
      color: var(--color-text-light);
      font-size: 0.9rem;
    }
  }
}

.active-campaigns {
  margin-bottom: var(--spacing-xxl);
  
  h2 {
    margin-bottom: var(--spacing-lg);
    color: var(--color-text-dark);
  }
}

.campaigns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.campaign-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  
  &.premium {
    border-left-color: var(--color-accent);
  }
  
  &.exclusive {
    border-left-color: #gold;
    background: linear-gradient(135deg, #fff 0%, #fff9e6 100%);
  }
  
  .campaign-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }
  
  .campaign-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    
    &.premium {
      background-color: var(--color-accent);
      color: white;
    }
    
    &.exclusive {
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      color: #8b4513;
    }
  }
  
  .campaign-price {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--color-text-dark);
  }
  
  h3 {
    margin-bottom: var(--spacing-xs);
    color: var(--color-text-dark);
  }
  
  .campaign-city {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
  
  .campaign-timeline {
    margin-bottom: var(--spacing-lg);
    
    .timeline-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: var(--color-text-light);
      margin-bottom: var(--spacing-sm);
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: var(--color-text-lighter);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: var(--spacing-sm);
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
        transition: width 0.3s ease;
      }
    }
    
    .days-remaining {
      text-align: center;
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
}

.plans-section {
  margin-bottom: var(--spacing-xxl);
  
  h2 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  .section-description {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-xl);
  }
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.plan-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
  
  &.popular {
    border: 2px solid var(--color-accent);
    transform: scale(1.05);
  }
  
  &.exclusive {
    background: linear-gradient(135deg, #fff 0%, #fff9e6 100%);
    border: 2px solid #ffd700;
  }
  
  .popular-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-accent);
    color: white;
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .exclusive-badge {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #8b4513;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .plan-header {
    text-align: center;
    margin-bottom: var(--spacing-lg);
    
    h3 {
      margin-bottom: var(--spacing-md);
      color: var(--color-text-dark);
    }
    
    .plan-price {
      .price {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-text-dark);
      }
      
      .duration {
        display: block;
        color: var(--color-text-light);
        font-size: 0.9rem;
      }
    }
  }
  
  .plan-description {
    color: var(--color-text);
    margin-bottom: var(--spacing-lg);
    line-height: 1.6;
  }
  
  .plan-features {
    list-style: none;
    margin-bottom: var(--spacing-xl);
    
    li {
      padding: var(--spacing-xs) 0;
      color: var(--color-text);
      
      &.more-features {
        color: var(--color-text-light);
        font-style: italic;
      }
    }
  }
}

.plan-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  
  .modal-content {
    background: white;
    border-radius: var(--border-radius-lg);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--color-text-lighter);
    
    h2 {
      margin: 0;
      color: var(--color-text-dark);
    }
  }
  
  .modal-body {
    padding: var(--spacing-lg);
    
    .plan-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      
      .plan-badge {
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--border-radius-sm);
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        
        &.premium {
          background-color: var(--color-accent);
          color: white;
        }
        
        &.exclusive {
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #8b4513;
        }
      }
      
      .plan-price {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text-dark);
      }
      
      .plan-duration {
        color: var(--color-text-light);
      }
    }
    
    .plan-features {
      h4 {
        margin-bottom: var(--spacing-md);
        color: var(--color-text-dark);
      }
      
      ul {
        list-style: none;
        
        li {
          padding: var(--spacing-xs) 0;
          color: var(--color-text);
        }
      }
    }
  }
  
  .modal-actions {
    padding: var(--spacing-lg);
    border-top: 1px solid var(--color-text-lighter);
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
  }
}

.payment-section {
  .payment-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    
    h2 {
      margin: 0;
      color: var(--color-text-dark);
    }
  }
  
  .payment-content {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: var(--spacing-xl);
  }
  
  .purchase-summary {
    .summary-card {
      background: white;
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-lg);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: var(--spacing-lg);
      
      h3 {
        margin-bottom: var(--spacing-lg);
        color: var(--color-text-dark);
      }
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--color-text-lighter);
      
      &:last-child {
        border-bottom: none;
      }
      
      &.total {
        border-top: 2px solid var(--color-text-lighter);
        padding-top: var(--spacing-md);
        margin-top: var(--spacing-md);
        font-weight: 600;
        font-size: 1.1rem;
      }
      
      .label {
        color: var(--color-text-light);
      }
      
      .value {
        color: var(--color-text-dark);
      }
    }
  }
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
    
    &.exclusive {
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      color: #8b4513;
      
      &:hover {
        background: linear-gradient(45deg, #ffed4e, #ffd700);
      }
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
  
  &.btn-full {
    width: 100%;
  }
  
  &.btn-sm {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
}

@media (max-width: 992px) {
  .profile-selection {
    grid-template-columns: 1fr;
  }
  
  .payment-content {
    grid-template-columns: 1fr;
  }
  
  .purchase-summary .summary-card {
    position: static !important;
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .campaigns-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>