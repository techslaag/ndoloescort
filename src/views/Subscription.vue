<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '../stores/subscription'
import { useAuthStore } from '../stores/auth'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, type BillingPeriod } from '../types/subscription'
import { formatCurrency, getCurrencySymbol, getUserCurrency, convertFromUSD } from '../utils/currency'
import FlutterwavePayment from '../components/payment/FlutterwavePayment.vue'
import ErrorAlert from '../components/ErrorAlert.vue'

const router = useRouter()
const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const selectedPlan = ref<SubscriptionPlan | null>(null)
const selectedBillingPeriod = ref<BillingPeriod>('monthly')
const showPayment = ref(false)
const showCancelModal = ref(false)
const cancellationReason = ref('')
const showUpgradeModal = ref(false)
const upgradePlan = ref<SubscriptionPlan | null>(null)
const paymentRef = ref<InstanceType<typeof FlutterwavePayment>>()

const plans = computed(() => SUBSCRIPTION_PLANS)
const currentSubscription = computed(() => subscriptionStore.currentSubscription)
const currentPlan = computed(() => subscriptionStore.currentPlan)
const currentUsage = computed(() => subscriptionStore.currentUsage)
const daysUntilRenewal = computed(() => subscriptionStore.daysUntilRenewal)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userCurrency = ref(getUserCurrency())

// Watch for currency changes and save preference
watch(userCurrency, async (newCurrency) => {
  if (authStore.user) {
    try {
      // Import account from appwrite directly
      const { account } = await import('../lib/appwrite')
      const currentPrefs = authStore.user.prefs || {}
      await account.updatePrefs({ ...currentPrefs, currency: newCurrency })
      // Refresh user data to update local state
      await authStore.refreshUser()
    } catch (error) {
      console.error('Failed to save currency preference:', error)
    }
  }
})

onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push('/login?redirect=/subscription')
    return
  }

  await loadSubscriptionData()
})

const loadSubscriptionData = async () => {
  try {
    isLoading.value = true
    await subscriptionStore.loadUserSubscription()
  } catch (error) {
    console.error('Error loading subscription data:', error)
  } finally {
    isLoading.value = false
  }
}

const selectPlan = (plan: SubscriptionPlan) => {
  if (plan.tier === 'free' && currentSubscription.value) {
    // Can't downgrade to free
    return
  }

  selectedPlan.value = plan
  
  // For upgrades, show upgrade modal
  if (currentSubscription.value && plan.tier !== currentSubscription.value.tier) {
    upgradePlan.value = plan
    showUpgradeModal.value = true
  } else if (!currentSubscription.value || currentSubscription.value.tier === 'free') {
    // New subscription
    showPayment.value = true
  }
}

const proceedWithUpgrade = () => {
  showUpgradeModal.value = false
  showPayment.value = true
}

const handlePaymentSuccess = async (response: any) => {
  try {
    if (!selectedPlan.value) return

    // Payment successful, create or update subscription
    if (currentSubscription.value && currentSubscription.value.tier !== 'free') {
      // Upgrade existing subscription
      await subscriptionStore.updateSubscription(
        selectedPlan.value.id,
        selectedBillingPeriod.value
      )
    } else {
      // Create new subscription with Flutterwave transaction reference
      await subscriptionStore.createSubscription(
        selectedPlan.value.id,
        selectedBillingPeriod.value,
        response.tx_ref // Flutterwave transaction reference (will be stored as transactionId)
      )
    }

    showPayment.value = false
    selectedPlan.value = null
    
    // Reload subscription data
    await loadSubscriptionData()
  } catch (error: any) {
    console.error('Error processing subscription:', error)
  }
}

const handlePaymentClosed = () => {
  showPayment.value = false
}

const handlePaymentError = (err: Error) => {
  console.error('Payment error:', err)
  showPayment.value = false
  // Show error to user
  subscriptionStore.error = err.message
}

const cancelSubscription = async () => {
  try {
    await subscriptionStore.cancelSubscription(cancellationReason.value, false)
    showCancelModal.value = false
    cancellationReason.value = ''
    
    // Reload subscription data
    await loadSubscriptionData()
  } catch (error) {
    console.error('Error cancelling subscription:', error)
  }
}

const getPrice = (plan: SubscriptionPlan): number => {
  const basePrice = selectedBillingPeriod.value === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  return convertFromUSD(basePrice, userCurrency.value)
}

const getMonthlyEquivalent = (plan: SubscriptionPlan): number => {
  const basePrice = selectedBillingPeriod.value === 'monthly' 
    ? plan.monthlyPrice 
    : plan.yearlyPrice / 12
  return convertFromUSD(basePrice, userCurrency.value)
}

const getSavings = (plan: SubscriptionPlan): number => {
  if (selectedBillingPeriod.value === 'monthly') return 0
  return convertFromUSD(plan.yearlyDiscount, userCurrency.value)
}

const formatFeature = (feature: string): string => {
  const replacements: Record<string, string> = {
    'profilesPerMonth': 'Profiles per month',
    'premiumBoosts': 'Premium boosts',
    'messaging': 'Messaging',
    'audioCall': 'Audio calls',
    'videoCall': 'Video calls',
    'liveStreaming': 'Live streaming',
    'privateRoom': 'Private room',
    'receiveGifts': 'Receive gifts',
    'callRevenue': 'Keep call revenue',
    'blissescortReward': 'BlissEscort rewards',
    'supportLevel': 'Support level',
    'proFlag': 'Pro badge'
  }
  
  return replacements[feature] || feature
}

const isCurrentPlan = (plan: SubscriptionPlan): boolean => {
  return currentSubscription.value?.tier === plan.tier
}

const canSelectPlan = (plan: SubscriptionPlan): boolean => {
  if (!currentSubscription.value) return true
  
  const tierOrder = ['free', 'starter', 'pro', 'agency']
  const currentIndex = tierOrder.indexOf(currentSubscription.value.tier)
  const planIndex = tierOrder.indexOf(plan.tier)
  
  return planIndex > currentIndex
}
</script>

<template>
  <div class="subscription-page">
    <div class="container">
      <ErrorAlert 
        :error="subscriptionStore.error"
        :dismissible="true"
        @dismiss="() => subscriptionStore.clearError()"
      />

      <!-- Page Header -->
      <div class="page-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your needs and unlock premium features</p>
        
        <!-- Currency and Billing Controls -->
        <div class="controls-wrapper">
          <!-- Currency Selector -->
          <div class="currency-selector">
            <select v-model="userCurrency" class="currency-select">
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
              <option value="XAF">XAF</option>
              <option value="XOF">XOF</option>
              <option value="NGN">₦ NGN</option>
              <option value="ZAR">R ZAR</option>
              <option value="KES">KSh KES</option>
              <option value="GHS">₵ GHS</option>
            </select>
          </div>
          
          <!-- Billing Period Toggle -->
          <div class="billing-toggle">
            <button 
              :class="{ active: selectedBillingPeriod === 'monthly' }"
              @click="selectedBillingPeriod = 'monthly'"
            >
              Monthly
            </button>
            <button 
              :class="{ active: selectedBillingPeriod === 'yearly' }"
              @click="selectedBillingPeriod = 'yearly'"
            >
              Yearly
              <span class="save-badge">Save up to 20%</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Current Subscription Info -->
      <div v-if="currentSubscription && currentSubscription.tier !== 'free'" class="current-subscription">
        <div class="subscription-card">
          <div class="subscription-header">
            <h3>Current Subscription</h3>
            <span class="status-badge" :class="subscriptionStore.subscriptionStatus">
              {{ subscriptionStore.subscriptionStatus }}
            </span>
          </div>
          
          <div class="subscription-details">
            <div class="detail-row">
              <span class="label">Plan:</span>
              <span class="value">{{ currentPlan?.name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Billing:</span>
              <span class="value">{{ currentSubscription.billingPeriod }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Next renewal:</span>
              <span class="value">{{ daysUntilRenewal }} days</span>
            </div>
          </div>

          <!-- Usage Stats -->
          <div v-if="currentUsage" class="usage-stats">
            <h4>Current Usage</h4>
            <div class="usage-grid">
              <div class="usage-item">
                <span class="usage-label">Profiles</span>
                <div class="usage-bar">
                  <div 
                    class="usage-fill" 
                    :style="{ width: `${(currentUsage.profilesCreated / (currentUsage.profilesCreated + currentUsage.profilesRemaining)) * 100}%` }"
                  ></div>
                </div>
                <span class="usage-text">
                  {{ currentUsage.profilesCreated }} / {{ currentUsage.profilesCreated + currentUsage.profilesRemaining }}
                </span>
              </div>
              
              <div v-if="currentUsage.premiumBoostsRemaining > 0" class="usage-item">
                <span class="usage-label">Premium Boosts</span>
                <div class="usage-bar">
                  <div 
                    class="usage-fill premium" 
                    :style="{ width: `${(currentUsage.premiumBoostsUsed / (currentUsage.premiumBoostsUsed + currentUsage.premiumBoostsRemaining)) * 100}%` }"
                  ></div>
                </div>
                <span class="usage-text">
                  {{ currentUsage.premiumBoostsUsed }} / {{ currentUsage.premiumBoostsUsed + currentUsage.premiumBoostsRemaining }}
                </span>
              </div>
            </div>
          </div>

          <div class="subscription-actions">
            <button 
              v-if="!currentSubscription.cancelAtPeriodEnd"
              @click="showCancelModal = true" 
              class="btn btn-outline"
            >
              Cancel Subscription
            </button>
            <div v-else class="cancellation-notice">
              Subscription will end on {{ new Date(currentSubscription.currentPeriodEnd).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading subscription plans...</p>
      </div>

      <!-- Payment Form -->
      <div v-else-if="showPayment && selectedPlan" class="payment-section">
        <div class="payment-header">
          <button @click="showPayment = false" class="btn btn-text">
            ← Back to Plans
          </button>
          <h2>Complete Your Purchase</h2>
        </div>
        
        <div class="payment-content">
          <div class="purchase-summary">
            <div class="summary-card">
              <h3>{{ selectedPlan.name }} Plan</h3>
              <div class="price-display">
                <span class="currency">{{ getCurrencySymbol(userCurrency) }}</span>
                <span class="amount">{{ formatCurrency(getPrice(selectedPlan), userCurrency, { showSymbol: false }) }}</span>
                <span class="period">/{{ selectedBillingPeriod === 'monthly' ? 'month' : 'year' }}</span>
              </div>
              
              <div v-if="selectedBillingPeriod === 'yearly' && getSavings(selectedPlan) > 0" class="savings-info">
                Save {{ formatCurrency(getSavings(selectedPlan)) }} per year
              </div>
              
              <div class="features-summary">
                <h4>Included Features:</h4>
                <ul>
                  <li v-for="highlight in selectedPlan.highlights" :key="highlight">
                    {{ highlight }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="payment-form-section">
            <FlutterwavePayment
              ref="paymentRef"
              :amount="getPrice(selectedPlan)"
              :currency="userCurrency"
              :description="`${selectedPlan.name} subscription - ${selectedBillingPeriod}`"
              payment-type="subscription"
              :related-id="selectedPlan.id"
              :metadata="{
                planId: selectedPlan.id,
                planName: selectedPlan.name,
                billingPeriod: selectedBillingPeriod,
                tier: selectedPlan.tier
              }"
              @success="handlePaymentSuccess"
              @error="handlePaymentError"
              @closed="handlePaymentClosed"
            />
          </div>
        </div>
      </div>

      <!-- Subscription Plans -->
      <div v-else class="plans-grid">
        <div 
          v-for="plan in plans" 
          :key="plan.id"
          class="plan-card"
          :class="{
            current: isCurrentPlan(plan),
            popular: plan.isPopular,
            recommended: plan.isRecommended,
            disabled: !canSelectPlan(plan)
          }"
        >
          <div v-if="plan.isPopular" class="badge popular-badge">Most Popular</div>
          <div v-if="plan.isRecommended" class="badge recommended-badge">Recommended</div>
          <div v-if="isCurrentPlan(plan)" class="badge current-badge">Current Plan</div>
          
          <div class="plan-header">
            <h3>{{ plan.name }}</h3>
            <p class="plan-description">{{ plan.description }}</p>
          </div>
          
          <div class="plan-pricing">
            <div class="price-main">
              <span class="currency">{{ getCurrencySymbol(userCurrency) }}</span>
              <span class="amount">{{ formatCurrency(getPrice(plan), userCurrency, { showSymbol: false }) }}</span>
              <span class="period">/{{ selectedBillingPeriod === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
            
            <div v-if="selectedBillingPeriod === 'yearly' && plan.monthlyPrice > 0" class="price-comparison">
              {{ formatCurrency(getMonthlyEquivalent(plan), userCurrency) }}/month
            </div>
            
            <div v-if="selectedBillingPeriod === 'yearly' && getSavings(plan) > 0" class="savings-badge">
              Save {{ formatCurrency(getSavings(plan), userCurrency) }}
            </div>
          </div>
          
          <div class="plan-features">
            <ul class="features-list">
              <li v-for="(highlight, index) in plan.highlights.slice(0, 4)" :key="highlight" class="feature-item">
                <span class="feature-icon">✓</span>
                {{ highlight }}
              </li>
            </ul>
          </div>
          
          <div class="plan-action">
            <button 
              v-if="!isCurrentPlan(plan)"
              @click="selectPlan(plan)"
              class="btn btn-primary btn-full"
              :disabled="!canSelectPlan(plan)"
            >
              {{ canSelectPlan(plan) ? 'Select Plan' : 'Downgrade Not Available' }}
            </button>
            <div v-else class="current-plan-label">
              Your Current Plan
            </div>
            
            <a href="#features-comparison" class="see-all-features">
              See all features →
            </a>
          </div>
        </div>
      </div>

      <!-- Features Comparison -->
      <div id="features-comparison" class="features-comparison">
        <h2>Compare All Features</h2>
        <div class="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  {{ plan.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Profiles per month</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  {{ plan.features.profilesPerMonth }}
                </td>
              </tr>
              <tr>
                <td>Premium boosts</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  {{ plan.features.premiumBoosts.quantity || '-' }}
                </td>
              </tr>
              <tr>
                <td>Messaging</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.messaging" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Audio calls</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.audioCall" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Video calls</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.videoCall" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Live streaming</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.liveStreaming" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Private room</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.privateRoom" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Receive gifts</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.receiveGifts" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Keep call revenue</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.callRevenue" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>BlissEscort rewards</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.blissescortReward" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
              <tr>
                <td>Support</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  {{ plan.features.supportLevel === 'priority' ? 'Priority' : 'Standard' }}
                </td>
              </tr>
              <tr>
                <td>Pro badge</td>
                <td v-for="plan in plans" :key="plan.id" :class="{ highlight: isCurrentPlan(plan) }">
                  <span v-if="plan.features.proFlag" class="feature-yes">✓</span>
                  <span v-else class="feature-no">✗</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Cancel Subscription Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal-content">
        <h2>Cancel Subscription</h2>
        <p>Are you sure you want to cancel your subscription? You'll keep access until the end of your current billing period.</p>
        
        <div class="form-group">
          <label for="reason">Reason for cancellation (optional)</label>
          <textarea 
            id="reason"
            v-model="cancellationReason"
            rows="4"
            placeholder="Help us improve by telling us why you're leaving..."
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button @click="showCancelModal = false" class="btn btn-outline">
            Keep Subscription
          </button>
          <button @click="cancelSubscription" class="btn btn-danger">
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>

    <!-- Upgrade Confirmation Modal -->
    <div v-if="showUpgradeModal" class="modal-overlay" @click.self="showUpgradeModal = false">
      <div class="modal-content">
        <h2>Upgrade to {{ upgradePlan?.name }}</h2>
        <p>You're about to upgrade your subscription. The new features will be available immediately.</p>
        
        <div class="upgrade-details">
          <div class="detail-row">
            <span class="label">New plan:</span>
            <span class="value">{{ upgradePlan?.name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">New price:</span>
            <span class="value">{{ formatCurrency(upgradePlan ? getPrice(upgradePlan) : 0, userCurrency) }}/{{ selectedBillingPeriod }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Billing:</span>
            <span class="value">Prorated amount will be charged</span>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="showUpgradeModal = false" class="btn btn-outline">
            Cancel
          </button>
          <button @click="proceedWithUpgrade" class="btn btn-primary">
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.subscription-page {
  padding: var(--spacing-lg) 0;
  min-height: 80vh;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  
  h1 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xl);
  }
}

.controls-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
}

.currency-selector {
  .currency-select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    background: white;
    color: var(--color-text-dark);
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--color-accent);
    }
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
    }
  }
}

.billing-toggle {
  display: inline-flex;
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  padding: 4px;
  
  button {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    background: transparent;
    color: var(--color-text);
    font-weight: 500;
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &.active {
      background: white;
      color: var(--color-text-dark);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .save-badge {
      position: absolute;
      top: -38px;
      right: -8px;
      background: var(--color-success);
      color: white;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: var(--border-radius-sm);
      font-weight: 600;
    }
  }
}

.current-subscription {
  margin-bottom: var(--spacing-xxl);
  
  .subscription-card {
    background: white;
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xl);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    margin: 0 auto;
  }
  
  .subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    
    h3 {
      margin: 0;
      color: var(--color-text-dark);
    }
  }
  
  .status-badge {
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    
    &.active {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    
    &.cancelling {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }
  }
  
  .subscription-details {
    margin-bottom: var(--spacing-lg);
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--color-text-lighter);
      
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
}

.usage-stats {
  margin: var(--spacing-lg) 0;
  
  h4 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  .usage-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .usage-item {
    .usage-label {
      display: block;
      font-size: 0.9rem;
      color: var(--color-text-light);
      margin-bottom: var(--spacing-xs);
    }
    
    .usage-bar {
      width: 100%;
      height: 8px;
      background: var(--color-text-lighter);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: var(--spacing-xs);
      
      .usage-fill {
        height: 100%;
        background: var(--color-accent);
        transition: width 0.3s ease;
        
        &.premium {
          background: linear-gradient(90deg, #ffd700, #ffed4e);
        }
      }
    }
    
    .usage-text {
      font-size: 0.9rem;
      color: var(--color-text);
    }
  }
}

.subscription-actions {
  margin-top: var(--spacing-lg);
  
  .cancellation-notice {
    text-align: center;
    color: var(--color-warning);
    font-style: italic;
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

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
  align-items: stretch;
  justify-items: stretch;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, minmax(240px, 1fr));
    overflow-x: auto;
    padding-bottom: var(--spacing-md);
  }
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: visible;
  }
  
  @media (max-width: 576px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
  }
}

.plan-card {
  background: white;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  
  @media (max-width: 992px) {
    padding: var(--spacing-lg);
    height: 520px;
  }
  
  @media (max-width: 576px) {
    padding: var(--spacing-md);
    height: 540px;
  }
  
  &.current {
    border-color: var(--color-success);
    background: var(--color-success-bg);
  }
  
  &.popular {
    border-color: var(--color-accent);
  }
  
  &.recommended {
    border-color: var(--color-primary);
  }
  
  &.disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    
    &.popular-badge {
      background: var(--color-accent);
      color: white;
    }
    
    &.recommended-badge {
      background: var(--color-primary);
      color: white;
    }
    
    &.current-badge {
      background: var(--color-success);
      color: white;
    }
  }
}

.plan-header {
  text-align: center;
  margin-bottom: var(--spacing-md);
  overflow: hidden;
  
  h3 {
    margin-bottom: var(--spacing-xs);
    color: var(--color-text-dark);
    font-size: 1.25rem;
    word-wrap: break-word;
  }
  
  .plan-description {
    color: var(--color-text-light);
    font-size: 0.875rem;
    word-wrap: break-word;
  }
}

.plan-pricing {
  text-align: center;
  margin-bottom: var(--spacing-md);
  overflow: hidden;
  
  .price-main {
    margin-bottom: var(--spacing-sm);
    display: flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    
    .currency {
      font-size: 1.5rem;
      color: var(--color-text);
      vertical-align: top;
      flex-shrink: 0;
      
      @media (max-width: 576px) {
        font-size: 1.2rem;
      }
    }
    
    .amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
      word-break: break-word;
      max-width: 100%;
      
      @media (max-width: 992px) {
        font-size: 2rem;
      }
      
      @media (max-width: 576px) {
        font-size: 1.5rem;
      }
    }
    
    .period {
      font-size: 1rem;
      color: var(--color-text-light);
      
      @media (max-width: 576px) {
        font-size: 0.9rem;
      }
    }
  }
  
  .price-comparison {
    font-size: 0.9rem;
    color: var(--color-text-light);
  }
  
  .savings-badge {
    display: inline-block;
    background: var(--color-success-bg);
    color: var(--color-success);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: var(--spacing-sm);
  }
}

.plan-features {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-sm);
  
  .features-list {
    list-style: none;
    margin-bottom: var(--spacing-md);
    
    .feature-item {
      padding: 8px 0;
      display: flex;
      align-items: start;
      gap: var(--spacing-sm);
      font-size: 0.875rem;
      line-height: 1.4;
      
      @media (max-width: 576px) {
        padding: 6px 0;
        font-size: 0.8rem;
      }
      
      .feature-icon {
        color: var(--color-success);
        font-weight: 600;
        flex-shrink: 0;
        font-size: 1rem;
        margin-top: 1px;
      }
    }
  }
  
  .features-badge {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: auto;
    flex-wrap: wrap;
    justify-content: center;
    
    .badge-item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-md);
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      
      &.premium {
        background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        color: #856404;
      }
      
      &.pro {
        background: linear-gradient(135deg, #e7f3ff 0%, #cfe2ff 100%);
        color: #0c5460;
      }
    }
  }
}

.plan-action {
  margin-top: auto;
  padding-top: var(--spacing-md);
  
  .current-plan-label {
    text-align: center;
    color: var(--color-success);
    font-weight: 600;
    padding: var(--spacing-md);
    background: var(--color-success-bg);
    border-radius: var(--border-radius-md);
  }
  
  .see-all-features {
    display: block;
    text-align: center;
    margin-top: var(--spacing-sm);
    color: var(--color-accent);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--color-accent-dark);
      text-decoration: underline;
    }
  }
}

.features-comparison {
  margin-top: var(--spacing-xxl);
  
  h2 {
    text-align: center;
    margin-bottom: var(--spacing-xl);
    color: var(--color-text-dark);
  }
}

.comparison-table {
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    
    th, td {
      padding: var(--spacing-md);
      text-align: center;
      border-bottom: 1px solid var(--color-text-lighter);
      
      &:first-child {
        text-align: left;
        font-weight: 600;
      }
      
      &.highlight {
        background: var(--color-accent-bg);
      }
    }
    
    th {
      background: var(--color-background-alt);
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    .feature-yes {
      color: var(--color-success);
      font-weight: 600;
      font-size: 1.2rem;
    }
    
    .feature-no {
      color: var(--color-text-lighter);
      font-size: 1.2rem;
    }
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
      
      .price-display {
        text-align: center;
        margin-bottom: var(--spacing-md);
        
        .currency {
          font-size: 1.2rem;
          vertical-align: top;
        }
        
        .amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-dark);
        }
        
        .period {
          color: var(--color-text-light);
        }
      }
      
      .savings-info {
        text-align: center;
        color: var(--color-success);
        font-weight: 600;
        margin-bottom: var(--spacing-lg);
      }
      
      .features-summary {
        h4 {
          margin-bottom: var(--spacing-md);
          color: var(--color-text-dark);
        }
        
        ul {
          list-style: none;
          
          li {
            padding: var(--spacing-xs) 0;
            color: var(--color-text);
            
            &:before {
              content: '✓';
              color: var(--color-success);
              font-weight: 600;
              margin-right: var(--spacing-sm);
            }
          }
        }
      }
    }
  }
}

.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  
  h2 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-lg);
  }
  
  .form-group {
    margin-bottom: var(--spacing-lg);
    
    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    textarea {
      width: 100%;
      padding: var(--spacing-md);
      border: 1px solid var(--color-text-lighter);
      border-radius: var(--border-radius-md);
      resize: vertical;
    }
  }
  
  .upgrade-details {
    background: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    margin-bottom: var(--spacing-lg);
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      
      .label {
        color: var(--color-text-light);
      }
      
      .value {
        font-weight: 600;
        color: var(--color-text-dark);
      }
    }
  }
  
  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
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
  
  &.btn-danger {
    background-color: var(--color-danger);
    color: white;
    
    &:hover {
      background-color: var(--color-danger-dark);
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
}

@media (max-width: 992px) {
  .payment-content {
    grid-template-columns: 1fr;
  }
  
  .purchase-summary .summary-card {
    position: static !important;
  }
  
}

@media (max-width: 768px) {
  .comparison-table {
    font-size: 0.9rem;
    
    th, td {
      padding: var(--spacing-sm);
    }
  }
}
</style>