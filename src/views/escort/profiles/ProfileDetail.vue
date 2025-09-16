<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useProfileStore } from '../../../stores/profile'
import ErrorAlert from '../../../components/ErrorAlert.vue'
import MediaGallery from '../../../components/profile/MediaGallery.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const isLoading = ref(false)
const activeTab = ref('overview')
const profileId = computed(() => route.params.id as string)
const profile = computed(() => profileStore.currentProfile)

// Stats data
const stats = ref({
  views: 0,
  bookings: 0,
  rating: 0,
  reviews: 0,
  earnings: {
    thisMonth: 0,
    lastMonth: 0,
    total: 0
  }
})

// Verification badges
const verificationBadges = computed(() => {
  if (!profile.value) return []
  
  const badges = []
  if (profile.value.verificationIsVerified) {
    badges.push({ icon: '✓', label: 'Verified', color: 'green' })
  }
  if (profile.value.verificationIdVerified) {
    badges.push({ icon: '🆔', label: 'ID Verified', color: 'blue' })
  }
  if (profile.value.verificationPhotoVerified) {
    badges.push({ icon: '📸', label: 'Photo Verified', color: 'purple' })
  }
  return badges
})

// Load profile data
const loadProfile = async () => {
  try {
    isLoading.value = true
    authStore.clearError()
    
    // Fetch profile details
    await profileStore.fetchProfile(profileId.value)
    
    // Load advertising data for this profile
    await profileStore.loadProfileAdvertising(profileId.value)
    
    // Update stats
    if (profile.value) {
      stats.value = {
        views: profile.value.statsViews || profile.value.stats?.views || 0,
        bookings: profile.value.statsBookings || profile.value.stats?.bookings || 0,
        rating: profile.value.statsRating || profile.value.stats?.rating || 0,
        reviews: profile.value.statsReviewCount || profile.value.stats?.reviewCount || 0,
        earnings: {
          thisMonth: 2500, // TODO: Fetch from backend
          lastMonth: 3200,
          total: 45000
        }
      }
    }
  } catch (error: any) {
    console.error('Error loading profile:', error)
    authStore.setError('Failed to load profile details')
  } finally {
    isLoading.value = false
  }
}

// Navigation functions
const navigateToEdit = () => {
  router.push(`/escort/profiles/${profileId.value}/edit`)
}

const navigateToAnalytics = () => {
  router.push(`/escort/profiles/${profileId.value}/analytics`)
}

const navigateToVerification = () => {
  router.push(`/escort/profiles/${profileId.value}/verification`)
}

const navigateBack = () => {
  router.push('/escort/profiles')
}

const toggleProfileStatus = async () => {
  if (!profile.value) return
  
  try {
    const newStatus = profile.value.status === 'active' ? 'inactive' : 'active'
    await profileStore.updateProfile(profileId.value, { status: newStatus })
    authStore.setError(`Profile ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, true)
  } catch (error) {
    authStore.setError('Failed to update profile status')
  }
}

const previewProfile = () => {
  // Open in new tab
  window.open(`/escorts/${profileId.value}`, '_blank')
}

const boostProfile = () => {
  router.push('/escort/advertising')
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Initialize
onMounted(() => {
  loadProfile()
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && newId !== profileId.value) {
    loadProfile()
  }
})

const handleErrorClear = () => {
  authStore.clearError()
}
</script>

<template>
  <div class="profile-detail">
    <!-- Header with back button -->
    <div class="page-header">
      <button @click="navigateBack" class="back-button">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
        </svg>
        Back to Profiles
      </button>
    </div>
    
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading profile details...</p>
    </div>
    
    <div v-else-if="!profile" class="empty-state">
      <div class="empty-icon">🚫</div>
      <h3>Profile not found</h3>
      <p>The profile you're looking for doesn't exist or you don't have permission to view it.</p>
      <button @click="navigateBack" class="btn btn-primary">Back to Profiles</button>
    </div>
    
    <div v-else class="profile-content">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="header-content">
          <div class="profile-info">
            <h1>{{ profile.name }}</h1>
            <div class="profile-meta">
              <span class="location">
                📍 {{ profile.location?.city }}, {{ profile.location?.state }}
              </span>
              <span class="separator">•</span>
              <span :class="['status', profile.status]">
                {{ profile.status === 'active' ? '🟢' : '🔴' }} {{ profile.status }}
              </span>
              <span class="separator">•</span>
              <span class="profile-id">ID: {{ profileId }}</span>
            </div>
            <div class="verification-badges">
              <span 
                v-for="badge in verificationBadges" 
                :key="badge.label"
                :class="['badge', badge.color]"
              >
                {{ badge.icon }} {{ badge.label }}
              </span>
            </div>
          </div>
          
          <div class="header-actions">
            <button @click="previewProfile" class="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
              </svg>
              Preview
            </button>
            <button @click="navigateToEdit" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="quick-stats">
          <div class="stat-card">
            <div class="stat-icon">👁️</div>
            <div class="stat-content">
              <h3>{{ stats.views.toLocaleString() }}</h3>
              <p>Profile Views</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <h3>{{ stats.bookings }}</h3>
              <p>Bookings</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <h3>{{ stats.rating.toFixed(1) }}</h3>
              <p>Rating ({{ stats.reviews }} reviews)</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <h3>{{ formatCurrency(stats.earnings.thisMonth) }}</h3>
              <p>This Month</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          @click="toggleProfileStatus" 
          :class="['btn', profile.status === 'active' ? 'btn-danger' : 'btn-success']"
        >
          {{ profile.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate' }} Profile
        </button>
        <button @click="boostProfile" class="btn btn-boost">
          🚀 Boost Profile
        </button>
        <button @click="navigateToAnalytics" class="btn btn-outline">
          📊 View Analytics
        </button>
        <button @click="navigateToVerification" class="btn btn-outline">
          ✓ Verification
        </button>
      </div>
      
      <!-- Tabs Navigation -->
      <div class="tabs-nav">
        <button 
          v-for="tab in ['overview', 'services', 'pricing', 'media', 'availability']" 
          :key="tab"
          :class="['tab', { active: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="tab-panel">
          <div class="section">
            <h2>About</h2>
            <div class="bio-section">
              <p>{{ profile.bio || 'No bio provided' }}</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Description</h2>
            <div class="description-section">
              <p>{{ profile.description || 'No description provided' }}</p>
            </div>
          </div>
          
          <div class="section">
            <h2>Personal Details</h2>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Age:</span>
                <span class="value">{{ profile.age || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Height:</span>
                <span class="value">{{ profile.physicalHeight || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Body Type:</span>
                <span class="value">{{ profile.physicalBodyType || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Ethnicity:</span>
                <span class="value">{{ profile.physicalEthnicity || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Hair Color:</span>
                <span class="value">{{ profile.physicalHairColor || 'Not specified' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Eye Color:</span>
                <span class="value">{{ profile.physicalEyeColor || 'Not specified' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Services Tab -->
        <div v-if="activeTab === 'services'" class="tab-panel">
          <div class="section">
            <h2>Services Offered</h2>
            <div v-if="profile.services && profile.services.length > 0" class="services-list">
              <div v-for="service in profile.services" :key="service.id" class="service-card">
                <div class="service-header">
                  <h3>{{ service.name }}</h3>
                  <span :class="['service-status', service.enabled ? 'active' : 'inactive']">
                    {{ service.enabled ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <p class="service-description">{{ service.description }}</p>
                <div class="service-meta">
                  <span class="duration">⏱️ {{ service.duration }} min</span>
                  <span class="price">💵 {{ formatCurrency(service.price) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-services">
              <p>No services configured</p>
              <button @click="navigateToEdit" class="btn btn-primary">Add Services</button>
            </div>
          </div>
        </div>
        
        <!-- Pricing Tab -->
        <div v-if="activeTab === 'pricing'" class="tab-panel">
          <div class="section">
            <h2>Pricing Options</h2>
            <div v-if="profile.pricing && profile.pricing.length > 0" class="pricing-list">
              <div v-for="price in profile.pricing" :key="price.id" class="pricing-card">
                <h3>{{ price.type }}</h3>
                <div class="price-amount">{{ formatCurrency(price.amount) }}</div>
                <p class="price-description">{{ price.description }}</p>
              </div>
            </div>
            <div v-else class="empty-pricing">
              <p>No pricing configured</p>
              <button @click="navigateToEdit" class="btn btn-primary">Set Pricing</button>
            </div>
          </div>
        </div>
        
        <!-- Media Tab -->
        <div v-if="activeTab === 'media'" class="tab-panel">
          <div class="section">
            <h2>Photos & Media</h2>
            <MediaGallery 
              v-if="profile.media && profile.media.length > 0"
              :media="profile.media" 
              :editable="false"
            />
            <div v-else class="empty-media">
              <p>No media uploaded</p>
              <button @click="navigateToEdit" class="btn btn-primary">Upload Photos</button>
            </div>
          </div>
        </div>
        
        <!-- Availability Tab -->
        <div v-if="activeTab === 'availability'" class="tab-panel">
          <div class="section">
            <h2>Working Hours</h2>
            <div class="availability-grid">
              <div 
                v-for="(hours, day) in profile.workingHours" 
                :key="day"
                class="day-schedule"
                :class="{ disabled: !hours.enabled }"
              >
                <h4>{{ day.charAt(0).toUpperCase() + day.slice(1) }}</h4>
                <div v-if="hours.enabled" class="hours">
                  {{ hours.start }} - {{ hours.end }}
                </div>
                <div v-else class="unavailable">Unavailable</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-detail {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--color-background);
}

.page-header {
  margin-bottom: var(--spacing-lg);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  color: var(--color-text-dark);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-background-alt);
    border-color: var(--color-accent);
  }
}

.loading-container {
  text-align: center;
  padding: 4rem;
  
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

.empty-state {
  text-align: center;
  padding: 4rem;
  background: white;
  border-radius: var(--border-radius-lg);
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: 0.5rem;
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: 2rem;
  }
}

.profile-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
}

.profile-header {
  margin-bottom: var(--spacing-xl);
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-xl);
    gap: var(--spacing-xl);
  }
  
  .profile-info {
    flex: 1;
    
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2rem;
    }
    
    .profile-meta {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--color-text-light);
      margin-bottom: var(--spacing-md);
      
      .separator {
        color: var(--color-text-lighter);
      }
      
      .status {
        font-weight: 500;
        
        &.active {
          color: var(--color-success);
        }
        
        &.inactive {
          color: var(--color-text-light);
        }
      }
      
      .profile-id {
        font-size: 0.875rem;
        font-family: monospace;
      }
    }
    
    .verification-badges {
      display: flex;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      
      .badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--border-radius-lg);
        font-size: 0.875rem;
        font-weight: 500;
        
        &.green {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }
        
        &.blue {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        
        &.purple {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
        }
      }
    }
  }
  
  .header-actions {
    display: flex;
    gap: var(--spacing-md);
  }
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.stat-card {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  .stat-icon {
    font-size: 2rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: var(--border-radius-md);
  }
  
  .stat-content {
    h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
      margin: 0;
    }
    
    p {
      color: var(--color-text-light);
      margin: 0;
      font-size: 0.875rem;
    }
  }
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
}

.tabs-nav {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 2px solid var(--color-text-lighter);
  margin-bottom: var(--spacing-xl);
  overflow-x: auto;
  
  .tab {
    padding: var(--spacing-md) var(--spacing-lg);
    background: none;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    font-weight: 500;
    position: relative;
    transition: all 0.2s ease;
    white-space: nowrap;
    
    &:hover {
      color: var(--color-text-dark);
    }
    
    &.active {
      color: var(--color-accent);
      
      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--color-accent);
      }
    }
  }
}

.tab-content {
  .tab-panel {
    animation: fadeIn 0.3s ease;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section {
  margin-bottom: var(--spacing-xl);
  
  h2 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    font-size: 1.25rem;
  }
}

.bio-section,
.description-section {
  background: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  
  p {
    color: var(--color-text);
    line-height: 1.6;
    margin: 0;
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  
  .detail-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    
    .label {
      color: var(--color-text-light);
      font-weight: 500;
    }
    
    .value {
      color: var(--color-text-dark);
    }
  }
}

.services-list {
  display: grid;
  gap: var(--spacing-md);
}

.service-card {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  
  .service-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    
    h3 {
      color: var(--color-text-dark);
      margin: 0;
    }
    
    .service-status {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--border-radius-sm);
      
      &.active {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }
      
      &.inactive {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }
    }
  }
  
  .service-description {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
  }
  
  .service-meta {
    display: flex;
    gap: var(--spacing-lg);
    color: var(--color-text-light);
    font-size: 0.875rem;
  }
}

.pricing-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.pricing-card {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
    text-transform: capitalize;
  }
  
  .price-amount {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-accent);
    margin-bottom: var(--spacing-sm);
  }
  
  .price-description {
    color: var(--color-text-light);
    font-size: 0.875rem;
  }
}

.availability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.day-schedule {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  text-align: center;
  
  &.disabled {
    opacity: 0.6;
  }
  
  h4 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 0.875rem;
    text-transform: capitalize;
  }
  
  .hours {
    color: var(--color-text);
    font-weight: 500;
  }
  
  .unavailable {
    color: var(--color-text-light);
    font-style: italic;
  }
}

.empty-services,
.empty-pricing,
.empty-media {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &.btn-primary {
    background: var(--color-accent);
    color: white;
    
    &:hover {
      background: var(--color-accent-dark);
    }
  }
  
  &.btn-outline {
    background: white;
    color: var(--color-text-dark);
    border: 1px solid var(--color-text-lighter);
    
    &:hover {
      background: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
  
  &.btn-success {
    background: #22c55e;
    color: white;
    
    &:hover {
      background: #16a34a;
    }
  }
  
  &.btn-danger {
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
    }
  }
  
  &.btn-boost {
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #8b4513;
    
    &:hover {
      background: linear-gradient(135deg, #ffed4e, #ffd700);
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .profile-detail {
    padding: var(--spacing-md);
  }
  
  .profile-content {
    padding: var(--spacing-lg);
  }
  
  .profile-header {
    .header-content {
      flex-direction: column;
      gap: var(--spacing-lg);
    }
    
    .header-actions {
      width: 100%;
      
      .btn {
        flex: 1;
      }
    }
  }
  
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    .btn {
      flex: 1;
      min-width: 0;
    }
  }
  
  .tabs-nav {
    .tab {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: 0.875rem;
    }
  }
  
  .pricing-list {
    grid-template-columns: 1fr;
  }
  
  .availability-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>