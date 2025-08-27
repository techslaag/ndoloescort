<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { useNotificationStore } from '../../stores/notification'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const recentActivity = ref([])
const earnings = ref({
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  pending: 0
})
const bookings = ref({
  today: [],
  upcoming: [],
  pending: []
})

const stats = computed(() => ({
  totalProfiles: profileStore.profiles?.length || 0,
  activeProfiles: profileStore.profiles?.filter(p => p.status === 'active').length || 0,
  totalViews: profileStore.profiles?.reduce((total, p) => total + (p.statsViews || 0), 0) || 0,
  totalBookings: profileStore.profiles?.reduce((total, p) => total + (p.statsBookings || 0), 0) || 0,
  boostedProfiles: profileStore.boostedProfiles?.length || 0
}))

const profiles = computed(() => profileStore.profiles || [])

// User role computed properties
const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const isEscort = computed(() => userRole.value === 'escort')

// Check if user is escort, redirect if not
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isEscort.value) {
    router.push('/')
    return
  }
  
  await loadDashboardData()
})

const loadDashboardData = async () => {
  try {
    isLoading.value = true
    
    // Load profiles
    await profileStore.fetchProfiles()
    
    // Load advertising data for profiles
    await profileStore.refreshAdvertisingData()
    
    // Load recent activity
    recentActivity.value = [
      {
        id: '1',
        type: 'profile_view',
        message: 'Your profile "Sophia" was viewed 5 times',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        profileId: '1'
      },
      {
        id: '2',
        type: 'booking_request',
        message: 'New booking request from John D.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        urgent: true
      },
      {
        id: '3',
        type: 'message',
        message: 'New message from verified client',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'payment',
        message: 'Payment of $500 received',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        amount: 500
      }
    ]
    
    // Load earnings data
    earnings.value = {
      today: 850,
      thisWeek: 3200,
      thisMonth: 12500,
      pending: 1200
    }
    
    // Load bookings
    bookings.value = {
      today: [
        {
          id: '1',
          clientName: 'John D.',
          time: '19:00',
          duration: '2 hours',
          service: 'Dinner Date',
          status: 'confirmed'
        }
      ],
      upcoming: [
        {
          id: '2',
          clientName: 'Michael S.',
          date: 'Tomorrow',
          time: '20:30',
          duration: '3 hours',
          service: 'Social Event',
          status: 'confirmed'
        },
        {
          id: '3',
          clientName: 'Robert K.',
          date: 'Friday',
          time: '18:00',
          duration: '4 hours',
          service: 'Evening Companion',
          status: 'confirmed'
        }
      ],
      pending: [
        {
          id: '4',
          clientName: 'David L.',
          date: 'Saturday',
          time: '19:00',
          duration: '2 hours',
          service: 'Dinner Date',
          status: 'pending'
        }
      ]
    }
    
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    authStore.setError('Failed to load dashboard data')
  } finally {
    isLoading.value = false
  }
}

const handleErrorClear = () => {
  authStore.clearError()
}

const navigateToProfiles = () => {
  router.push('/escort/profiles')
}

const createNewProfile = () => {
  router.push('/escort/profiles/create')
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'profile_view': return '👁️'
    case 'booking_request': return '📅'
    case 'message': return '💬'
    case 'payment': return '💰'
    case 'review': return '⭐'
    default: return '📊'
  }
}

const getActivityClass = (activity: any) => {
  return {
    'activity-urgent': activity.urgent,
    'activity-payment': activity.type === 'payment'
  }
}

const formatTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }
}

const handleBookingAction = (bookingId: string, action: 'accept' | 'decline') => {
  console.log(`${action} booking ${bookingId}`)
  // TODO: Implement booking action logic
}
</script>

<template>
  <div class="escort-dashboard">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="dashboard-header">
      <div class="welcome-section">
        <h1>Welcome back, {{ authStore.user?.name || 'Escort' }}!</h1>
        <p>Manage your profiles and track your performance</p>
      </div>
      
      <div class="header-actions">
        <button @click="navigateToProfiles" class="btn btn-outline">
          View All Profiles
        </button>
        <button @click="createNewProfile" class="btn btn-primary">
          Create New Profile
        </button>
      </div>
    </div>
    
    <div class="dashboard-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <h3>{{ stats.totalProfiles }}</h3>
            <p>Total Profiles</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{ stats.activeProfiles }}</h3>
            <p>Active Profiles</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">👁️</div>
          <div class="stat-content">
            <h3>{{ stats.totalViews }}</h3>
            <p>Total Views</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3>{{ stats.totalBookings }}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        
        <div class="stat-card boosted">
          <div class="stat-icon">🚀</div>
          <div class="stat-content">
            <h3>{{ stats.boostedProfiles }}</h3>
            <p>Boosted Profiles</p>
          </div>
        </div>
      </div>
      
      <!-- Recent Profiles -->
      <div class="profiles-section">
        <div class="section-header">
          <h2>Your Profiles</h2>
          <button @click="navigateToProfiles" class="btn btn-text">View All</button>
        </div>
        
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading your profiles...</p>
        </div>
        
        <div v-else-if="profiles.length === 0" class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>No profiles yet</h3>
          <p>Create your first escort profile to start receiving bookings</p>
          <button @click="createNewProfile" class="btn btn-primary">
            Create Your First Profile
          </button>
        </div>
        
        <div v-else class="profiles-grid">
          <div 
            v-for="profile in profiles.slice(0, 3)" 
            :key="profile.id || profile.$id"
            class="profile-card"
            @click="router.push(`/escort/profiles/${profile.id || profile.$id}`)"
          >
            <div class="profile-header">
              <h3>{{ profile.name }}</h3>
              <span :class="['status-badge', profile.status]">
                {{ profile.status }}
              </span>
            </div>
            
            <div class="profile-stats">
              <div class="stat">
                <span class="stat-label">Views:</span>
                <span class="stat-value">{{ profile.statsViews || 0 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Rating:</span>
                <span class="stat-value">{{ (profile.statsRating || 0).toFixed(1) }}★</span>
              </div>
            </div>
            
            <div class="profile-footer">
              <span class="last-updated">
                Updated: {{ new Date(profile.updatedAt || profile.createdAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Earnings Overview -->
        <div class="dashboard-section earnings-section">
          <div class="section-header">
            <h2>💰 Earnings Overview</h2>
            <button @click="router.push('/escort/earnings')" class="btn btn-text">View All</button>
          </div>
          
          <div class="earnings-grid">
            <div class="earning-card">
              <div class="earning-label">Today</div>
              <div class="earning-value">${{ earnings.today }}</div>
            </div>
            <div class="earning-card">
              <div class="earning-label">This Week</div>
              <div class="earning-value">${{ earnings.thisWeek }}</div>
            </div>
            <div class="earning-card">
              <div class="earning-label">This Month</div>
              <div class="earning-value">${{ earnings.thisMonth }}</div>
            </div>
            <div class="earning-card pending">
              <div class="earning-label">Pending</div>
              <div class="earning-value">${{ earnings.pending }}</div>
            </div>
          </div>
        </div>
        
        <!-- Today's Bookings -->
        <div class="dashboard-section bookings-section">
          <div class="section-header">
            <h2>📅 Today's Schedule</h2>
            <button @click="router.push('/escort/bookings')" class="btn btn-text">View All</button>
          </div>
          
          <div v-if="bookings.today.length === 0" class="empty-bookings">
            <p>No bookings today</p>
          </div>
          <div v-else class="bookings-list">
            <div 
              v-for="booking in bookings.today" 
              :key="booking.id"
              class="booking-item"
            >
              <div class="booking-info">
                <div class="booking-client">{{ booking.clientName }}</div>
                <div class="booking-details">
                  {{ booking.time }} • {{ booking.duration }} • {{ booking.service }}
                </div>
              </div>
              <span :class="['booking-status', booking.status]">{{ booking.status }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Activity & Actions Grid -->
      <div class="bottom-grid">
        <!-- Recent Activity -->
        <div class="dashboard-section activity-section">
          <div class="section-header">
            <h2>📊 Recent Activity</h2>
          </div>
          
          <div class="activity-list">
            <div 
              v-for="activity in recentActivity.slice(0, 5)" 
              :key="activity.id"
              :class="['activity-item', getActivityClass(activity)]"
            >
              <div class="activity-icon">{{ getActivityIcon(activity.type) }}</div>
              <div class="activity-content">
                <div class="activity-message">{{ activity.message }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="dashboard-section quick-actions">
          <h2>⚡ Quick Actions</h2>
          <div class="actions-grid">
            <button @click="createNewProfile" class="action-card">
              <div class="action-icon">➕</div>
              <h3>Create Profile</h3>
              <p>Add a new escort profile</p>
            </button>
            
            <button @click="router.push('/messages')" class="action-card">
              <div class="action-icon">💬</div>
              <h3>Messages</h3>
              <p>{{ notificationStore.unreadCount }} unread</p>
            </button>
            
            <button @click="router.push('/escort/bookings')" class="action-card">
              <div class="action-icon">📅</div>
              <h3>Bookings</h3>
              <p>{{ bookings.pending.length }} pending</p>
            </button>
            
            <button @click="router.push('/escort/advertising')" class="action-card">
              <div class="action-icon">📈</div>
              <h3>Boost Profile</h3>
              <p>Increase visibility</p>
            </button>
            
            <button @click="router.push('/escort/settings')" class="action-card">
              <div class="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Manage your account</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.escort-dashboard {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--color-background);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xxl);
  
  .welcome-section {
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2rem;
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.1rem;
    }
  }
  
  .header-actions {
    display: flex;
    gap: var(--spacing-md);
  }
}

.dashboard-content {
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
}

.stat-card {
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  &.boosted {
    background: linear-gradient(135deg, #fff 0%, #fff9e6 100%);
    border-color: #ffd700;
    
    .stat-icon {
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #8b4513;
    }
    
    .stat-content h3 {
      color: #b8860b;
    }
  }
  
  .stat-icon {
    font-size: 2rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-background-alt);
    border-radius: var(--border-radius-lg);
  }
  
  .stat-content {
    h3 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-dark);
      margin: 0 0 var(--spacing-xs);
    }
    
    p {
      color: var(--color-text-light);
      margin: 0;
      font-weight: 500;
    }
  }
}

.profiles-section {
  margin-bottom: var(--spacing-xxl);
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    
    h2 {
      color: var(--color-text-dark);
      margin: 0;
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
  padding: var(--spacing-xxl);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.profile-card {
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: var(--color-accent);
  }
  
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    h3 {
      color: var(--color-text-dark);
      margin: 0;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: var(--border-radius-lg);
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
      
      &.active {
        background: rgba(40, 167, 69, 0.1);
        color: var(--color-success);
      }
      
      &.inactive {
        background: rgba(108, 117, 125, 0.1);
        color: var(--color-text-light);
      }
    }
  }
  
  .profile-footer {
    .last-updated {
      font-size: 0.8rem;
      color: var(--color-text-lighter);
    }
  }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xxl);
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

.dashboard-section {
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.earnings-section {
  .earnings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .earning-card {
    background: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    text-align: center;
    
    &.pending {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .earning-label {
      font-size: 0.8rem;
      color: var(--color-text-light);
      margin-bottom: var(--spacing-xs);
    }
    
    .earning-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
    }
  }
}

.bookings-section {
  .empty-bookings {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--color-text-light);
  }
  
  .bookings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .booking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-md);
    
    .booking-info {
      .booking-client {
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 2px;
      }
      
      .booking-details {
        font-size: 0.8rem;
        color: var(--color-text-light);
      }
    }
    
    .booking-status {
      padding: 4px 8px;
      border-radius: var(--border-radius-sm);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      
      &.confirmed {
        background: rgba(40, 167, 69, 0.1);
        color: var(--color-success);
      }
      
      &.pending {
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
      }
    }
  }
}

.activity-section {
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .activity-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-md);
    transition: background-color 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
    }
    
    &.activity-urgent {
      background: rgba(220, 53, 69, 0.05);
      border-left: 3px solid var(--color-danger);
    }
    
    &.activity-payment {
      background: rgba(40, 167, 69, 0.05);
      border-left: 3px solid var(--color-success);
    }
    
    .activity-icon {
      font-size: 1.2rem;
    }
    
    .activity-content {
      flex: 1;
      
      .activity-message {
        font-size: 0.9rem;
        color: var(--color-text-dark);
        margin-bottom: 2px;
      }
      
      .activity-time {
        font-size: 0.7rem;
        color: var(--color-text-lighter);
      }
    }
  }
}

.quick-actions {
  h2 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
  }
  
  .actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
}

.profile-stats {
  display: flex;
  gap: var(--spacing-md);
  margin: var(--spacing-sm) 0;
  
  .stat {
    display: flex;
    flex-direction: column;
    
    .stat-label {
      font-size: 0.7rem;
      color: var(--color-text-light);
      margin-bottom: 2px;
    }
    
    .stat-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
}

.action-card {
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    border-color: var(--color-accent);
  }
  
  .action-icon {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-xs);
  }
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-xs);
    font-size: 0.9rem;
  }
  
  p {
    color: var(--color-text-light);
    margin: 0;
    font-size: 0.7rem;
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
}

// Tablet styles
@media (max-width: 1024px) {
  .escort-dashboard {
    padding: var(--spacing-lg);
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
  }
  
  .profiles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-grid,
  .bottom-grid {
    gap: var(--spacing-lg);
  }
}

// Mobile styles
@media (max-width: 768px) {
  .escort-dashboard {
    padding: var(--spacing-md);
    padding-top: calc(70px + var(--spacing-md)); // Account for fixed header
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
    margin-bottom: var(--spacing-xl);
    
    .welcome-section {
      h1 {
        font-size: 1.5rem;
      }
      
      p {
        font-size: 1rem;
      }
    }
    
    .header-actions {
      width: 100%;
      flex-direction: column;
      
      .btn {
        width: 100%;
        padding: var(--spacing-md) var(--spacing-lg);
      }
    }
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xl);
  }
  
  .stat-card {
    padding: var(--spacing-md);
    
    .stat-icon {
      width: 45px;
      height: 45px;
      font-size: 1.5rem;
    }
    
    .stat-content {
      h3 {
        font-size: 1.5rem;
      }
      
      p {
        font-size: 0.85rem;
      }
    }
  }
  
  .section-header {
    h2 {
      font-size: 1.3rem;
    }
    
    .btn-text {
      font-size: 0.9rem;
    }
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .bottom-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .profiles-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .profile-card {
    padding: var(--spacing-md);
    
    .profile-header h3 {
      font-size: 1.1rem;
    }
  }
  
  .earnings-section {
    .earnings-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm);
    }
    
    .earning-card {
      padding: var(--spacing-sm);
      
      .earning-label {
        font-size: 0.75rem;
      }
      
      .earning-value {
        font-size: 1.25rem;
      }
    }
  }
  
  .bookings-section {
    .booking-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-xs);
      padding: var(--spacing-md);
      
      .booking-info {
        width: 100%;
        
        .booking-client {
          font-size: 0.95rem;
        }
        
        .booking-details {
          font-size: 0.75rem;
        }
      }
      
      .booking-status {
        align-self: flex-end;
      }
    }
  }
  
  .activity-section {
    .activity-item {
      padding: var(--spacing-sm);
      
      .activity-icon {
        font-size: 1rem;
        min-width: 30px;
      }
      
      .activity-content {
        .activity-message {
          font-size: 0.85rem;
        }
      }
    }
  }
  
  .quick-actions {
    h2 {
      font-size: 1.3rem;
      margin-bottom: var(--spacing-md);
    }
    
    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
    }
  }
  
  .action-card {
    padding: var(--spacing-sm);
    
    .action-icon {
      font-size: 1.25rem;
    }
    
    h3 {
      font-size: 0.85rem;
      margin-bottom: 2px;
    }
    
    p {
      font-size: 0.65rem;
    }
  }
  
  .dashboard-section {
    padding: var(--spacing-md);
  }
}

// Small mobile styles
@media (max-width: 480px) {
  .escort-dashboard {
    padding: var(--spacing-sm);
    padding-top: calc(70px + var(--spacing-sm));
  }
  
  .dashboard-header {
    .welcome-section {
      h1 {
        font-size: 1.25rem;
      }
      
      p {
        font-size: 0.9rem;
      }
    }
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    &.boosted {
      grid-column: 1;
    }
  }
  
  .quick-actions {
    .actions-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .empty-state {
    padding: var(--spacing-lg);
    
    .empty-icon {
      font-size: 3rem;
    }
    
    h3 {
      font-size: 1.25rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
}

// Landscape orientation adjustments
@media (max-width: 768px) and (orientation: landscape) {
  .escort-dashboard {
    padding-top: calc(60px + var(--spacing-md));
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .quick-actions .actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

// Touch device optimizations
@media (hover: none) and (pointer: coarse) {
  .profile-card,
  .action-card,
  .btn {
    -webkit-tap-highlight-color: transparent;
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  .stat-card {
    &:active {
      transform: scale(0.98);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
  }
  
  .activity-item {
    min-height: 48px; // Minimum touch target size
    
    &:active {
      background: var(--color-background-alt);
    }
  }
  
  .booking-item {
    min-height: 60px;
  }
}

// Improve profile cards horizontal scrolling on mobile
@media (max-width: 480px) {
  .profiles-grid {
    display: flex !important;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    margin: 0 calc(-1 * var(--spacing-sm));
    padding-left: var(--spacing-sm);
    padding-right: var(--spacing-sm);
    
    &::-webkit-scrollbar {
      height: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--color-background-alt);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--color-text-lighter);
      border-radius: 3px;
      
      &:hover {
        background: var(--color-text-light);
      }
    }
    
    .profile-card {
      flex: 0 0 280px;
      scroll-snap-align: start;
    }
  }
}

// Safe area insets for modern phones
@supports (padding: max(0px)) {
  .escort-dashboard {
    padding-left: max(var(--spacing-xl), env(safe-area-inset-left));
    padding-right: max(var(--spacing-xl), env(safe-area-inset-right));
  }
  
  @media (max-width: 768px) {
    .escort-dashboard {
      padding-left: max(var(--spacing-md), env(safe-area-inset-left));
      padding-right: max(var(--spacing-md), env(safe-area-inset-right));
    }
  }
}
</style> 