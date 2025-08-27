<template>
  <div class="client-dashboard">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="dashboard-header">
      <div class="welcome-section">
        <h1>Welcome back, {{ authStore.user?.name || 'Client' }}!</h1>
        <p>Discover and book premium companion services</p>
      </div>
      
      <div class="header-actions">
        <button @click="router.push('/escorts')" class="btn btn-outline">
          Browse Escorts
        </button>
        <button @click="router.push('/favorites')" class="btn btn-primary">
          My Favorites
        </button>
      </div>
    </div>
    
    <div class="dashboard-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3>{{ stats.totalBookings }}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <h3>{{ stats.favoriteEscorts }}</h3>
            <p>Favorite Escorts</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💬</div>
          <div class="stat-content">
            <h3>{{ notificationStore.unreadCount }}</h3>
            <p>Unread Messages</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔍</div>
          <div class="stat-content">
            <h3>{{ stats.recentSearches }}</h3>
            <p>Recent Searches</p>
          </div>
        </div>
      </div>
      
      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Upcoming Bookings -->
        <div class="dashboard-section bookings-section">
          <div class="section-header">
            <h2>📅 Upcoming Bookings</h2>
            <button @click="router.push('/client/bookings')" class="btn btn-text">View All</button>
          </div>
          
          <div v-if="upcomingBookings.length === 0" class="empty-bookings">
            <div class="empty-icon">📅</div>
            <h3>No upcoming bookings</h3>
            <p>Browse our escorts to make your first booking</p>
            <button @click="router.push('/escorts')" class="btn btn-primary">
              Browse Escorts
            </button>
          </div>
          <div v-else class="bookings-list">
            <div 
              v-for="booking in upcomingBookings.slice(0, 3)" 
              :key="booking.id"
              class="booking-item"
              @click="router.push(`/bookings/${booking.id}`)"
            >
              <div class="booking-escort">
                <img :src="booking.escortPhoto" :alt="booking.escortName" class="escort-photo">
                <div class="escort-info">
                  <div class="escort-name">{{ booking.escortName }}</div>
                  <div class="booking-details">
                    {{ formatDate(booking.date) }} • {{ booking.time }}
                  </div>
                </div>
              </div>
              <div class="booking-meta">
                <span :class="['booking-status', booking.status]">{{ booking.status }}</span>
                <div class="booking-service">{{ booking.service }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Favorite Escorts -->
        <div class="dashboard-section favorites-section">
          <div class="section-header">
            <h2>⭐ Your Favorites</h2>
            <button @click="router.push('/favorites')" class="btn btn-text">View All</button>
          </div>
          
          <div v-if="favoriteEscorts.length === 0" class="empty-favorites">
            <p>No favorites yet</p>
            <button @click="router.push('/escorts')" class="btn btn-outline">
              Browse Escorts
            </button>
          </div>
          <div v-else class="favorites-grid">
            <div 
              v-for="escort in favoriteEscorts.slice(0, 4)" 
              :key="escort.id"
              class="favorite-card"
              @click="router.push(`/escorts/${escort.id}`)"
            >
              <img :src="escort.photo" :alt="escort.name" class="escort-photo">
              <div class="escort-info">
                <div class="escort-name">{{ escort.name }}</div>
                <div class="escort-rating">
                  {{ escort.rating }}⭐ ({{ escort.reviewCount }})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Activity & Recommendations -->
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
              class="activity-item"
            >
              <div class="activity-icon">{{ getActivityIcon(activity.type) }}</div>
              <div class="activity-content">
                <div class="activity-message">{{ activity.message }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Recommendations -->
        <div class="dashboard-section recommendations-section">
          <div class="section-header">
            <h2>💎 Recommended for You</h2>
          </div>
          
          <div class="recommendations-list">
            <div 
              v-for="escort in recommendations.slice(0, 3)" 
              :key="escort.id"
              class="recommendation-card"
              @click="router.push(`/escorts/${escort.id}`)"
            >
              <img :src="escort.photo" :alt="escort.name" class="escort-photo">
              <div class="escort-info">
                <div class="escort-name">{{ escort.name }}</div>
                <div class="escort-location">{{ escort.location }}</div>
                <div class="recommendation-reason">{{ escort.reason }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotificationStore } from '../../stores/notification'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const isLoading = ref(false)
const upcomingBookings = ref([])
const favoriteEscorts = ref([])
const recentActivity = ref([])
const recommendations = ref([])

const stats = ref({
  totalBookings: 0,
  favoriteEscorts: 0,
  recentSearches: 0
})

// User role computed properties
const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const isClient = computed(() => userRole.value === 'client')

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isClient.value) {
    // If user is escort, redirect to escort dashboard
    if (userRole.value === 'escort') {
      router.push('/escort/dashboard')
      return
    }
    router.push('/')
    return
  }
  
  await loadDashboardData()
})

const loadDashboardData = async () => {
  try {
    isLoading.value = true
    
    // Load upcoming bookings
    upcomingBookings.value = [
      {
        id: '1',
        escortName: 'Sophia Laurent',
        escortPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time: '19:00',
        duration: '2 hours',
        service: 'Dinner Date',
        status: 'confirmed',
        location: 'Manhattan'
      },
      {
        id: '2',
        escortName: 'Isabella Rose',
        escortPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: '20:00',
        duration: '3 hours',
        service: 'Social Event',
        status: 'pending',
        location: 'Brooklyn'
      }
    ]
    
    // Load favorite escorts
    favoriteEscorts.value = [
      {
        id: '1',
        name: 'Sophia Laurent',
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
        rating: 4.9,
        reviewCount: 127,
        location: 'Manhattan'
      },
      {
        id: '2',
        name: 'Isabella Rose',
        photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
        rating: 4.8,
        reviewCount: 89,
        location: 'Brooklyn'
      },
      {
        id: '3',
        name: 'Victoria Grace',
        photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces',
        rating: 4.7,
        reviewCount: 156,
        location: 'Queens'
      },
      {
        id: '4',
        name: 'Anastasia Divine',
        photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces',
        rating: 4.9,
        reviewCount: 203,
        location: 'Manhattan'
      }
    ]
    
    // Load recent activity
    recentActivity.value = [
      {
        id: '1',
        type: 'booking_confirmed',
        message: 'Your booking with Sophia Laurent has been confirmed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'message',
        message: 'New message from Isabella Rose',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'favorite',
        message: 'You added Victoria Grace to your favorites',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'review',
        message: 'You left a review for Anastasia Divine',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    // Load recommendations
    recommendations.value = [
      {
        id: '5',
        name: 'Elena Summers',
        photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=faces',
        location: 'Manhattan',
        reason: 'Based on your recent bookings'
      },
      {
        id: '6',
        name: 'Carmen Deluxe',
        photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop&crop=faces',
        location: 'Brooklyn',
        reason: 'Highly rated in your area'
      },
      {
        id: '7',
        name: 'Natasha Elite',
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=100&h=100&fit=crop&crop=faces',
        location: 'Queens',
        reason: 'Similar preferences match'
      }
    ]
    
    // Update stats
    stats.value = {
      totalBookings: 12,
      favoriteEscorts: favoriteEscorts.value.length,
      recentSearches: 8
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

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'booking_confirmed': return '✅'
    case 'booking_pending': return '⏳'
    case 'message': return '💬'
    case 'favorite': return '⭐'
    case 'review': return '📝'
    case 'payment': return '💳'
    default: return '📊'
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}
</script>

<style scoped lang="scss">
.client-dashboard {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    
    h2 {
      color: var(--color-text-dark);
      margin: 0;
      font-size: 1.2rem;
    }
  }
}

.bookings-section {
  .empty-bookings {
    text-align: center;
    padding: var(--spacing-xl);
    
    .empty-icon {
      font-size: 3rem;
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
  
  .bookings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .booking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(var(--color-accent-rgb), 0.05);
      transform: translateY(-1px);
    }
    
    .booking-escort {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      
      .escort-photo {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
      }
      
      .escort-info {
        .escort-name {
          font-weight: 600;
          color: var(--color-text-dark);
          margin-bottom: 2px;
        }
        
        .booking-details {
          font-size: 0.8rem;
          color: var(--color-text-light);
        }
      }
    }
    
    .booking-meta {
      text-align: right;
      
      .booking-status {
        padding: 4px 8px;
        border-radius: var(--border-radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        display: block;
        margin-bottom: var(--spacing-xs);
        
        &.confirmed {
          background: rgba(40, 167, 69, 0.1);
          color: var(--color-success);
        }
        
        &.pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }
      }
      
      .booking-service {
        font-size: 0.8rem;
        color: var(--color-text-light);
      }
    }
  }
}

.favorites-section {
  .empty-favorites {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-light);
  }
  
  .favorites-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .favorite-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(var(--color-accent-rgb), 0.05);
      transform: translateY(-1px);
    }
    
    .escort-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .escort-info {
      .escort-name {
        font-weight: 600;
        color: var(--color-text-dark);
        font-size: 0.9rem;
        margin-bottom: 2px;
      }
      
      .escort-rating {
        font-size: 0.7rem;
        color: var(--color-text-light);
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

.recommendations-section {
  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .recommendation-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(var(--color-accent-rgb), 0.05);
      transform: translateY(-1px);
    }
    
    .escort-photo {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .escort-info {
      .escort-name {
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 2px;
      }
      
      .escort-location {
        font-size: 0.8rem;
        color: var(--color-text-light);
        margin-bottom: 2px;
      }
      
      .recommendation-reason {
        font-size: 0.7rem;
        color: var(--color-accent);
        font-style: italic;
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

@media (max-width: 768px) {
  .client-dashboard {
    padding: var(--spacing-md);
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: var(--spacing-lg);
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .bottom-grid {
    grid-template-columns: 1fr;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>