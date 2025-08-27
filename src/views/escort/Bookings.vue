<template>
  <div class="bookings-page">
    <ErrorAlert 
      :error="error"
      :auto-clear="false"
      :dismissible="true"
      @clear="clearError"
      @dismiss="clearError"
    />
    
    <div class="container">
      <div class="page-header">
        <div class="header-content">
          <h1>My Bookings</h1>
          <p>Manage your appointments and client requests</p>
        </div>
        
        <div class="header-actions">
          <div class="view-toggle">
            <button 
              :class="['toggle-btn', { active: viewMode === 'list' }]"
              @click="viewMode = 'list'"
            >
              📋 List
            </button>
            <button 
              :class="['toggle-btn', { active: viewMode === 'calendar' }]"
              @click="viewMode = 'calendar'"
            >
              📅 Calendar
            </button>
          </div>
          
          <button @click="showFilters = !showFilters" class="btn btn-outline">
            🔍 Filters
          </button>
        </div>
      </div>
      
      <!-- Filters -->
      <div v-if="showFilters" class="filters-section">
        <div class="filters-grid">
          <div class="filter-group">
            <label>Status</label>
            <select v-model="filters.status">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Date Range</label>
            <select v-model="filters.dateRange">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Client</label>
            <input 
              type="text" 
              v-model="filters.clientSearch" 
              placeholder="Search by client name..."
            >
          </div>
          
          <div class="filter-actions">
            <button @click="resetFilters" class="btn btn-text">Clear</button>
            <button @click="applyFilters" class="btn btn-primary">Apply</button>
          </div>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-content">
            <h3>{{ stats.pending }}</h3>
            <p>Pending Requests</p>
          </div>
        </div>
        
        <div class="stat-card confirmed">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{ stats.confirmed }}</h3>
            <p>Confirmed</p>
          </div>
        </div>
        
        <div class="stat-card today">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3>{{ stats.today }}</h3>
            <p>Today</p>
          </div>
        </div>
        
        <div class="stat-card earnings">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3>${{ stats.monthlyEarnings }}</h3>
            <p>This Month</p>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading bookings...</p>
      </div>
      
      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="bookings-list">
        <div v-if="filteredBookings.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No bookings found</h3>
          <p v-if="hasActiveFilters">Try adjusting your filters to see more results</p>
          <p v-else>New booking requests will appear here</p>
        </div>
        
        <div v-else class="bookings-container">
          <!-- Group by status -->
          <div v-for="group in groupedBookings" :key="group.status" class="booking-group">
            <h2 class="group-header">
              {{ group.title }} 
              <span class="group-count">({{ group.bookings.length }})</span>
            </h2>
            
            <div class="booking-cards">
              <div 
                v-for="booking in group.bookings" 
                :key="booking.$id"
                :class="['booking-card', booking.status]"
              >
                <div class="booking-header">
                  <div class="client-info">
                    <img :src="booking.clientPhoto || `https://ui-avatars.com/api/?name=${booking.clientName || 'Client'}&background=random`" :alt="booking.clientName || 'Client'" class="client-photo">
                    <div class="client-details">
                      <h3>{{ booking.clientName || 'Client' }}</h3>
                      <div class="booking-meta">
                        <span class="service">{{ booking.service || booking.packageType || 'Service' }}</span>
                        <span class="separator">•</span>
                        <span class="duration">{{ Math.round(booking.duration / 60) }} hours</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="booking-status">
                    <span :class="['status-badge', booking.status]">
                      {{ getStatusLabel(booking.status) }}
                    </span>
                    <div class="booking-amount">${{ booking.totalAmount }}</div>
                  </div>
                </div>
                
                <div class="booking-details">
                  <div class="detail-row">
                    <div class="detail-item">
                      <span class="label">📅 Date & Time:</span>
                      <span class="value">{{ formatDateTime(booking.startDateTime) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">📍 Location:</span>
                      <span class="value">{{ booking.location }}</span>
                    </div>
                  </div>
                  
                  <div v-if="booking.specialRequests" class="special-requests">
                    <span class="label">💬 Special Requests:</span>
                    <span class="value">{{ booking.specialRequests }}</span>
                  </div>
                  
                  <div class="booking-timeline">
                    <div class="timeline-item">
                      <span class="timeline-label">Requested:</span>
                      <span class="timeline-value">{{ formatRelativeTime(booking.$createdAt || '') }}</span>
                    </div>
                    <div v-if="booking.confirmedAt" class="timeline-item">
                      <span class="timeline-label">Confirmed:</span>
                      <span class="timeline-value">{{ formatRelativeTime(booking.confirmedAt) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="booking-actions">
                  <button 
                    v-if="booking.status === 'pending'"
                    @click="acceptBooking(booking.$id!)"
                    class="btn btn-success"
                    :disabled="isUpdating"
                  >
                    ✅ Accept
                  </button>
                  
                  <button 
                    v-if="booking.status === 'pending'"
                    @click="declineBooking(booking.$id!)"
                    class="btn btn-danger"
                    :disabled="isUpdating"
                  >
                    ❌ Decline
                  </button>
                  
                  <button 
                    v-if="booking.status === 'confirmed'"
                    @click="viewBookingDetails(booking)"
                    class="btn btn-outline"
                  >
                    📞 Contact Client
                  </button>
                  
                  <button 
                    v-if="canComplete(booking)"
                    @click="completeBooking(booking.$id!)"
                    class="btn btn-primary"
                    :disabled="isUpdating"
                  >
                    ✨ Mark Complete
                  </button>
                  
                  <button 
                    v-if="canCancel(booking)"
                    @click="cancelBooking(booking.$id!)"
                    class="btn btn-outline"
                    :disabled="isUpdating"
                  >
                    🚫 Cancel
                  </button>
                  
                  <button 
                    @click="viewBookingDetails(booking)"
                    class="btn btn-text"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Calendar View -->
      <div v-else class="calendar-view">
        <div class="calendar-header">
          <button @click="changeMonth(-1)" class="btn btn-outline">‹ Previous</button>
          <h2>{{ currentMonthYear }}</h2>
          <button @click="changeMonth(1)" class="btn btn-outline">Next ›</button>
        </div>
        
        <div class="calendar-grid">
          <div class="calendar-weekdays">
            <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
          </div>
          
          <div class="calendar-days">
            <div 
              v-for="day in calendarDays" 
              :key="day.date"
              :class="['calendar-day', {
                'other-month': !day.isCurrentMonth,
                'today': day.isToday,
                'has-bookings': day.bookings.length > 0
              }]"
            >
              <div class="day-number">{{ day.day }}</div>
              <div class="day-bookings">
                <div 
                  v-for="booking in day.bookings.slice(0, 2)" 
                  :key="booking.$id"
                  :class="['booking-dot', booking.status]"
                  :title="`${getTimeFromDateTime(booking.startDateTime)} - ${booking.clientName || 'Client'} (${booking.service || 'Service'})`"
                >
                  {{ getTimeFromDateTime(booking.startDateTime) }}
                </div>
                <div v-if="day.bookings.length > 2" class="more-bookings">
                  +{{ day.bookings.length - 2 }} more
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Booking Details Modal -->
    <div v-if="selectedBooking" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Booking Details</h2>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="booking-info">
            <div class="client-section">
              <img :src="selectedBooking.clientPhoto || `https://ui-avatars.com/api/?name=${selectedBooking.clientName || 'Client'}&background=random`" :alt="selectedBooking.clientName || 'Client'" class="client-photo-large">
              <div class="client-details">
                <h3>{{ selectedBooking.clientName || 'Client' }}</h3>
                <p class="client-contact">📧 {{ selectedBooking.clientEmail || 'Email not available' }}</p>
                <p class="client-contact">📱 {{ selectedBooking.clientPhone || 'Phone not available' }}</p>
              </div>
            </div>
            
            <div class="booking-details-section">
              <h4>Booking Information</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Service:</span>
                  <span class="value">{{ selectedBooking.service || selectedBooking.packageType || 'Service' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Date & Time:</span>
                  <span class="value">{{ formatDateTime(selectedBooking.startDateTime) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Duration:</span>
                  <span class="value">{{ Math.round(selectedBooking.duration / 60) }} hours</span>
                </div>
                <div class="detail-item">
                  <span class="label">Amount:</span>
                  <span class="value">${{ selectedBooking.totalAmount }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Location:</span>
                  <span class="value">{{ selectedBooking.location }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span :class="['status-badge', selectedBooking.status]">
                    {{ getStatusLabel(selectedBooking.status) }}
                  </span>
                </div>
              </div>
              
              <div v-if="selectedBooking.specialRequests" class="special-requests-section">
                <h4>Special Requests</h4>
                <p>{{ selectedBooking.specialRequests }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-outline">Close</button>
          <button 
            v-if="selectedBooking.status === 'confirmed'"
            @click="startMessaging(selectedBooking)"
            class="btn btn-primary"
          >
            💬 Message Client
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { bookingService, type Booking, type BookingStats } from '../../services/bookingService'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const isUpdating = ref(false)
const error = ref('')
const viewMode = ref<'list' | 'calendar'>('list')
const showFilters = ref(false)
const selectedBooking = ref<Booking | null>(null)

const currentDate = ref(new Date())
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const filters = ref({
  status: '',
  dateRange: 'all' as 'all' | 'today' | 'tomorrow' | 'week' | 'month',
  clientSearch: ''
})

const bookings = ref<Booking[]>([])
const bookingStats = ref<BookingStats>({
  pending: 0,
  confirmed: 0,
  today: 0,
  monthlyEarnings: 0,
  totalBookings: 0,
  completionRate: 0
})

// Auto-refresh interval
let refreshInterval: NodeJS.Timeout | null = null

const stats = computed(() => bookingStats.value)

const filteredBookings = computed(() => {
  let filtered = [...bookings.value]
  
  if (filters.value.clientSearch) {
    const search = filters.value.clientSearch.toLowerCase()
    filtered = filtered.filter(b => 
      (b.clientName?.toLowerCase().includes(search) || false) ||
      (b.service?.toLowerCase().includes(search) || false)
    )
  }
  
  return filtered
})

const groupedBookings = computed(() => {
  const groups: { status: string; title: string; bookings: Booking[] }[] = [
    { status: 'pending', title: 'Pending Requests', bookings: [] },
    { status: 'confirmed', title: 'Confirmed Bookings', bookings: [] },
    { status: 'completed', title: 'Completed', bookings: [] },
    { status: 'cancelled', title: 'Cancelled', bookings: [] }
  ]
  
  filteredBookings.value.forEach(booking => {
    const group = groups.find(g => g.status === booking.status)
    if (group) group.bookings.push(booking)
  })
  
  return groups.filter(g => g.bookings.length > 0)
})

const hasActiveFilters = computed(() => {
  return filters.value.status || 
         filters.value.dateRange !== 'all' || 
         filters.value.clientSearch
})

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const days = []
  const today = new Date()
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    
    const dayBookings = bookings.value.filter(booking => {
      const bookingDate = new Date(booking.startDateTime).toISOString().split('T')[0]
      return bookingDate === date.toISOString().split('T')[0]
    })
    
    days.push({
      date: date.toISOString().split('T')[0],
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: date.toDateString() === today.toDateString(),
      bookings: dayBookings
    })
  }
  
  return days
})

onMounted(() => {
  loadBookings()
  loadStats()
  
  // Auto-refresh every 30 seconds
  refreshInterval = setInterval(() => {
    loadBookings()
    loadStats()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

const loadBookings = async () => {
  if (!authStore.user) return
  
  isLoading.value = true
  try {
    const results = await bookingService.getEscortBookings(
      authStore.user.$id,
      filters.value
    )
    bookings.value = results
  } catch (err: any) {
    error.value = err.message || 'Failed to load bookings'
  } finally {
    isLoading.value = false
  }
}

const loadStats = async () => {
  if (!authStore.user) return
  
  try {
    const stats = await bookingService.getBookingStats(authStore.user.$id, 'escort')
    bookingStats.value = stats
  } catch (err: any) {
    console.error('Failed to load stats:', err)
  }
}

const acceptBooking = async (bookingId: string) => {
  isUpdating.value = true
  try {
    const result = await bookingService.acceptBooking(bookingId)
    if (result) {
      await loadBookings()
      await loadStats()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to accept booking'
  } finally {
    isUpdating.value = false
  }
}

const declineBooking = async (bookingId: string) => {
  isUpdating.value = true
  try {
    const result = await bookingService.declineBooking(bookingId, 'Not available')
    if (result) {
      await loadBookings()
      await loadStats()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to decline booking'
  } finally {
    isUpdating.value = false
  }
}

const completeBooking = async (bookingId: string) => {
  isUpdating.value = true
  try {
    const result = await bookingService.completeBooking(bookingId)
    if (result) {
      await loadBookings()
      await loadStats()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to complete booking'
  } finally {
    isUpdating.value = false
  }
}

const cancelBooking = async (bookingId: string) => {
  if (!confirm('Are you sure you want to cancel this booking?')) return
  
  isUpdating.value = true
  try {
    const result = await bookingService.cancelBooking(bookingId, 'Cancelled by escort')
    if (result) {
      await loadBookings()
      await loadStats()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to cancel booking'
  } finally {
    isUpdating.value = false
  }
}

const canComplete = (booking: Booking) => {
  return booking.status === 'confirmed' && new Date(booking.startDateTime) <= new Date()
}

const canCancel = (booking: Booking) => {
  return ['pending', 'confirmed'].includes(booking.status) && new Date(booking.startDateTime) > new Date()
}

const viewBookingDetails = (booking: Booking) => {
  selectedBooking.value = booking
}

const closeModal = () => {
  selectedBooking.value = null
}

const startMessaging = (booking: Booking) => {
  // Navigate to messages with client
  router.push(`/messages?client=${booking.clientId}`)
  closeModal()
}

const resetFilters = () => {
  filters.value = {
    status: '',
    dateRange: 'all',
    clientSearch: ''
  }
}

const applyFilters = () => {
  loadBookings()
  showFilters.value = false
}

const changeMonth = (direction: number) => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + direction)
  currentDate.value = newDate
}

const getStatusLabel = (status: string) => {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return labels[status] || status
}

const formatDateTime = (dateTime: string) => {
  const dateObj = new Date(dateTime)
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const getTimeFromDateTime = (dateTime: string) => {
  const dateObj = new Date(dateTime)
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const formatRelativeTime = (timestamp: string) => {
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

const clearError = () => {
  error.value = ''
}
</script>

<style scoped lang="scss">
.bookings-page {
  padding: var(--spacing-lg) 0;
  min-height: 80vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  
  .header-content {
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-xs);
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.1rem;
    }
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  .view-toggle {
    display: flex;
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    overflow: hidden;
    
    .toggle-btn {
      padding: 8px 16px;
      border: none;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: var(--color-background-alt);
      }
      
      &.active {
        background: var(--color-accent);
        color: white;
      }
    }
  }
}

.filters-section {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  align-items: end;
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    
    label {
      font-weight: 500;
      color: var(--color-text-dark);
      font-size: 0.9rem;
    }
  }
  
  .filter-actions {
    display: flex;
    gap: var(--spacing-sm);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.stat-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  
  &.pending {
    border-left-color: #ffc107;
  }
  
  &.confirmed {
    border-left-color: var(--color-success);
  }
  
  &.today {
    border-left-color: var(--color-accent);
  }
  
  &.earnings {
    border-left-color: #17a2b8;
  }
  
  .stat-icon {
    font-size: 2rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-background-alt);
    border-radius: var(--border-radius-lg);
  }
  
  .stat-content {
    h3 {
      font-size: 1.8rem;
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
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
  }
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
  }
}

.booking-group {
  margin-bottom: var(--spacing-xxl);
  
  .group-header {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--color-background-alt);
    
    .group-count {
      color: var(--color-text-light);
      font-weight: normal;
    }
  }
}

.booking-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.booking-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  &.pending {
    border-left-color: #ffc107;
  }
  
  &.confirmed {
    border-left-color: var(--color-success);
  }
  
  &.completed {
    border-left-color: #6c757d;
  }
  
  &.cancelled {
    border-left-color: var(--color-danger);
  }
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  
  .client-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    
    .client-photo {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .client-details {
      h3 {
        margin: 0 0 var(--spacing-xs);
        color: var(--color-text-dark);
      }
      
      .booking-meta {
        color: var(--color-text-light);
        font-size: 0.9rem;
        
        .separator {
          margin: 0 var(--spacing-xs);
        }
      }
    }
  }
  
  .booking-status {
    text-align: right;
    
    .booking-amount {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-xs);
    }
  }
}

.status-badge {
  padding: 4px 12px;
  border-radius: var(--border-radius-lg);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  
  &.pending {
    background: rgba(255, 193, 7, 0.1);
    color: #ffc107;
  }
  
  &.confirmed {
    background: rgba(40, 167, 69, 0.1);
    color: var(--color-success);
  }
  
  &.completed {
    background: rgba(108, 117, 125, 0.1);
    color: #6c757d;
  }
  
  &.cancelled {
    background: rgba(220, 53, 69, 0.1);
    color: var(--color-danger);
  }
}

.booking-details {
  margin-bottom: var(--spacing-lg);
  
  .detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
  }
  
  .detail-item {
    display: flex;
    gap: var(--spacing-xs);
    
    .label {
      color: var(--color-text-light);
      font-weight: 500;
      white-space: nowrap;
    }
    
    .value {
      color: var(--color-text-dark);
    }
  }
  
  .special-requests {
    background: var(--color-background-alt);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-md);
    margin-top: var(--spacing-sm);
    
    .label {
      display: block;
      color: var(--color-text-light);
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }
    
    .value {
      color: var(--color-text-dark);
      line-height: 1.5;
    }
  }
  
  .booking-timeline {
    display: flex;
    gap: var(--spacing-lg);
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid #eee;
    
    .timeline-item {
      display: flex;
      gap: var(--spacing-xs);
      
      .timeline-label {
        color: var(--color-text-light);
        font-size: 0.8rem;
        font-weight: 500;
      }
      
      .timeline-value {
        color: var(--color-text-dark);
        font-size: 0.8rem;
      }
    }
  }
}

.booking-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.calendar-view {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  
  h2 {
    color: var(--color-text-dark);
    margin: 0;
  }
}

.calendar-grid {
  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    margin-bottom: var(--spacing-sm);
    
    .weekday {
      text-align: center;
      font-weight: 600;
      color: var(--color-text-light);
      padding: var(--spacing-sm);
    }
  }
  
  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    
    .calendar-day {
      min-height: 100px;
      padding: var(--spacing-xs);
      background: var(--color-background-alt);
      border-radius: var(--border-radius-sm);
      
      &.other-month {
        opacity: 0.3;
      }
      
      &.today {
        background: rgba(var(--color-accent-rgb), 0.1);
        border: 2px solid var(--color-accent);
      }
      
      &.has-bookings {
        background: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }
      
      .day-number {
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: var(--spacing-xs);
      }
      
      .day-bookings {
        .booking-dot {
          background: var(--color-accent);
          color: white;
          padding: 2px 6px;
          border-radius: var(--border-radius-sm);
          font-size: 0.7rem;
          margin-bottom: 2px;
          display: block;
          
          &.pending {
            background: #ffc107;
          }
          
          &.confirmed {
            background: var(--color-success);
          }
          
          &.completed {
            background: #6c757d;
          }
          
          &.cancelled {
            background: var(--color-danger);
          }
        }
        
        .more-bookings {
          font-size: 0.6rem;
          color: var(--color-text-light);
          text-align: center;
        }
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid #eee;
  
  h2 {
    color: var(--color-text-dark);
    margin: 0;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-light);
    
    &:hover {
      color: var(--color-text-dark);
    }
  }
}

.modal-body {
  padding: var(--spacing-lg);
}

.client-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  
  .client-photo-large {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .client-details {
    h3 {
      margin: 0 0 var(--spacing-xs);
      color: var(--color-text-dark);
    }
    
    .client-contact {
      color: var(--color-text-light);
      margin: 0 0 var(--spacing-xs);
      font-size: 0.9rem;
    }
  }
}

.booking-details-section {
  h4 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-md);
  }
  
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }
  
  .special-requests-section {
    background: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    
    h4 {
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      color: var(--color-text-dark);
      line-height: 1.5;
      margin: 0;
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
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
  
  &.btn-success {
    background-color: var(--color-success);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #218838;
    }
  }
  
  &.btn-danger {
    background-color: var(--color-danger);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #c82333;
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
    padding: 4px 8px;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .booking-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
  
  .booking-actions {
    justify-content: center;
  }
  
  .detail-row {
    grid-template-columns: 1fr !important;
  }
  
  .calendar-days .calendar-day {
    min-height: 80px;
  }
  
  .modal-content {
    margin: var(--spacing-md);
  }
  
  .client-section {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>