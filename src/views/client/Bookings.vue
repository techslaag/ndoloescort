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
          <p>Track your appointments and booking history</p>
        </div>
        
        <div class="header-actions">
          <button @click="showFilters = !showFilters" class="btn btn-outline">
            🔍 Filters
          </button>
          <button @click="router.push('/escorts')" class="btn btn-primary">
            ➕ New Booking
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
              <option value="upcoming">Upcoming</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="past">Past Bookings</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Companion</label>
            <input 
              type="text" 
              v-model="filters.escortSearch" 
              placeholder="Search by companion name..."
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
        <div class="stat-card upcoming">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h3>{{ stats.upcoming }}</h3>
            <p>Upcoming</p>
          </div>
        </div>
        
        <div class="stat-card total">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <h3>{{ stats.total }}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        
        <div class="stat-card favorites">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <h3>{{ stats.favorites }}</h3>
            <p>Favorite Companions</p>
          </div>
        </div>
        
        <div class="stat-card spent">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3>${{ stats.totalSpent }}</h3>
            <p>Total Spent</p>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading your bookings...</p>
      </div>
      
      <!-- Bookings List -->
      <div v-else class="bookings-list">
        <div v-if="filteredBookings.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No bookings found</h3>
          <p v-if="hasActiveFilters">Try adjusting your filters to see more results</p>
          <p v-else>Ready to book your first appointment?</p>
          <button @click="router.push('/escorts')" class="btn btn-primary">
            Browse Companions
          </button>
        </div>
        
        <div v-else class="bookings-container">
          <!-- Group by date -->
          <div v-for="group in groupedBookings" :key="group.date" class="booking-group">
            <h2 class="group-header">
              {{ group.title }} 
              <span class="group-count">({{ group.bookings.length }})</span>
            </h2>
            
            <div class="booking-cards">
              <div 
                v-for="booking in group.bookings" 
                :key="booking.id"
                :class="['booking-card', booking.status]"
              >
                <div class="booking-header">
                  <div class="escort-info">
                    <img :src="booking.escortPhoto" :alt="booking.escortName" class="escort-photo">
                    <div class="escort-details">
                      <h3>{{ booking.escortName }}</h3>
                      <div class="booking-meta">
                        <span class="service">{{ booking.service }}</span>
                        <span class="separator">•</span>
                        <span class="location">{{ booking.location }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="booking-status">
                    <span :class="['status-badge', booking.status]">
                      {{ getStatusLabel(booking.status) }}
                    </span>
                    <div class="booking-amount">${{ booking.amount }}</div>
                  </div>
                </div>
                
                <div class="booking-details">
                  <div class="detail-row">
                    <div class="detail-item">
                      <span class="label">📅 Date & Time:</span>
                      <span class="value">{{ formatDateTime(booking.date, booking.time) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">⏱️ Duration:</span>
                      <span class="value">{{ booking.duration }} hours</span>
                    </div>
                  </div>
                  
                  <div v-if="booking.specialRequests" class="special-requests">
                    <span class="label">💬 Special Requests:</span>
                    <span class="value">{{ booking.specialRequests }}</span>
                  </div>
                  
                  <div class="booking-timeline">
                    <div class="timeline-item">
                      <span class="timeline-label">Booked:</span>
                      <span class="timeline-value">{{ formatRelativeTime(booking.bookedAt) }}</span>
                    </div>
                    <div v-if="booking.confirmedAt" class="timeline-item">
                      <span class="timeline-label">Confirmed:</span>
                      <span class="timeline-value">{{ formatRelativeTime(booking.confirmedAt) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="booking-actions">
                  <button 
                    v-if="booking.status === 'confirmed'"
                    @click="contactEscort(booking)"
                    class="btn btn-primary"
                  >
                    💬 Message
                  </button>
                  
                  <button 
                    v-if="canModify(booking)"
                    @click="modifyBooking(booking)"
                    class="btn btn-outline"
                  >
                    ✏️ Modify
                  </button>
                  
                  <button 
                    v-if="canCancel(booking)"
                    @click="cancelBooking(booking.id)"
                    class="btn btn-danger"
                    :disabled="isUpdating"
                  >
                    🚫 Cancel
                  </button>
                  
                  <button 
                    v-if="canReview(booking)"
                    @click="writeReview(booking)"
                    class="btn btn-success"
                  >
                    ⭐ Review
                  </button>
                  
                  <button 
                    v-if="canRebook(booking)"
                    @click="rebookEscort(booking)"
                    class="btn btn-outline"
                  >
                    🔄 Book Again
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
            <div class="escort-section">
              <img :src="selectedBooking.escortPhoto" :alt="selectedBooking.escortName" class="escort-photo-large">
              <div class="escort-details">
                <h3>{{ selectedBooking.escortName }}</h3>
                <p class="escort-location">📍 {{ selectedBooking.location }}</p>
                <div class="escort-rating">
                  <span>{{ selectedBooking.escortRating }}⭐</span>
                  <span>({{ selectedBooking.escortReviews }} reviews)</span>
                </div>
              </div>
            </div>
            
            <div class="booking-details-section">
              <h4>Booking Information</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Service:</span>
                  <span class="value">{{ selectedBooking.service }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Date & Time:</span>
                  <span class="value">{{ formatDateTime(selectedBooking.date, selectedBooking.time) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Duration:</span>
                  <span class="value">{{ selectedBooking.duration }} hours</span>
                </div>
                <div class="detail-item">
                  <span class="label">Amount:</span>
                  <span class="value">${{ selectedBooking.amount }}</span>
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
              
              <div v-if="selectedBooking.status === 'completed' && selectedBooking.review" class="review-section">
                <h4>Your Review</h4>
                <div class="review-content">
                  <div class="review-rating">{{ selectedBooking.review.rating }}⭐</div>
                  <p>{{ selectedBooking.review.comment }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-outline">Close</button>
          <button 
            v-if="selectedBooking.status === 'confirmed'"
            @click="contactEscort(selectedBooking)"
            class="btn btn-primary"
          >
            💬 Message
          </button>
        </div>
      </div>
    </div>
    
    <!-- Review Modal -->
    <div v-if="reviewBooking" class="modal-overlay" @click="closeReviewModal">
      <div class="modal-content review-modal" @click.stop>
        <div class="modal-header">
          <h2>Write a Review</h2>
          <button @click="closeReviewModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="review-form">
            <div class="escort-info">
              <img :src="reviewBooking.escortPhoto" :alt="reviewBooking.escortName" class="escort-photo">
              <h3>{{ reviewBooking.escortName }}</h3>
            </div>
            
            <div class="rating-input">
              <label>Rating</label>
              <div class="star-rating">
                <button 
                  v-for="star in 5" 
                  :key="star"
                  @click="reviewRating = star"
                  :class="['star', { active: star <= reviewRating }]"
                >
                  ⭐
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="review-comment">Your Review</label>
              <textarea 
                id="review-comment"
                v-model="reviewComment"
                placeholder="Share your experience..."
                rows="5"
                required
              ></textarea>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeReviewModal" class="btn btn-outline">Cancel</button>
          <button 
            @click="submitReview"
            class="btn btn-primary"
            :disabled="!reviewRating || !reviewComment.trim() || isSubmitting"
          >
            <span v-if="isSubmitting">Submitting...</span>
            <span v-else>Submit Review</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const isUpdating = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const showFilters = ref(false)
const selectedBooking = ref<any>(null)
const reviewBooking = ref<any>(null)
const reviewRating = ref(0)
const reviewComment = ref('')

const filters = ref({
  status: '',
  dateRange: 'all',
  escortSearch: ''
})

const bookings = ref([
  {
    id: '1',
    escortName: 'Sophia Laurent',
    escortPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
    escortRating: 4.9,
    escortReviews: 127,
    service: 'Dinner Date',
    date: '2025-01-17',
    time: '19:00',
    duration: 2,
    location: 'The Plaza Hotel, NYC',
    amount: 600,
    status: 'confirmed',
    specialRequests: 'Business attire, Italian cuisine preference',
    bookedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    confirmedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    escortName: 'Isabella Rose',
    escortPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
    escortRating: 4.8,
    escortReviews: 89,
    service: 'Social Event',
    date: '2025-01-20',
    time: '20:00',
    duration: 3,
    location: 'Metropolitan Museum Gala',
    amount: 900,
    status: 'pending',
    specialRequests: 'Black tie event, will provide event details',
    bookedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    escortName: 'Victoria Grace',
    escortPhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces',
    escortRating: 4.7,
    escortReviews: 156,
    service: 'Business Function',
    date: '2025-01-14',
    time: '18:30',
    duration: 4,
    location: 'Ritz Carlton Ballroom',
    amount: 1200,
    status: 'completed',
    bookedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    confirmedAt: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    review: {
      rating: 5,
      comment: 'Absolutely wonderful experience! Professional, elegant, and charming.'
    }
  },
  {
    id: '4',
    escortName: 'Anastasia Divine',
    escortPhoto: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=faces',
    escortRating: 4.9,
    escortReviews: 203,
    service: 'Travel Companion',
    date: '2025-01-10',
    time: '08:00',
    duration: 24,
    location: 'NYC → Miami',
    amount: 3600,
    status: 'completed',
    bookedAt: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
    confirmedAt: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
  }
])

const stats = computed(() => ({
  upcoming: bookings.value.filter(b => {
    const bookingDate = new Date(`${b.date}T${b.time}`)
    return bookingDate > new Date() && ['confirmed', 'pending'].includes(b.status)
  }).length,
  total: bookings.value.length,
  favorites: 4, // Mock data
  totalSpent: bookings.value
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.amount, 0)
}))

const filteredBookings = computed(() => {
  let filtered = [...bookings.value]
  
  if (filters.value.status) {
    filtered = filtered.filter(b => b.status === filters.value.status)
  }
  
  if (filters.value.dateRange !== 'all') {
    const now = new Date()
    
    switch (filters.value.dateRange) {
      case 'upcoming':
        filtered = filtered.filter(b => {
          const bookingDate = new Date(`${b.date}T${b.time}`)
          return bookingDate > now
        })
        break
      case 'week':
        const weekFromNow = new Date(now)
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        filtered = filtered.filter(b => {
          const bookingDate = new Date(`${b.date}T${b.time}`)
          return bookingDate >= now && bookingDate <= weekFromNow
        })
        break
      case 'month':
        filtered = filtered.filter(b => {
          const bookingDate = new Date(b.date)
          return bookingDate.getMonth() === now.getMonth() && 
                 bookingDate.getFullYear() === now.getFullYear()
        })
        break
      case 'past':
        filtered = filtered.filter(b => {
          const bookingDate = new Date(`${b.date}T${b.time}`)
          return bookingDate < now
        })
        break
    }
  }
  
  if (filters.value.escortSearch) {
    const search = filters.value.escortSearch.toLowerCase()
    filtered = filtered.filter(b => 
      b.escortName.toLowerCase().includes(search) ||
      b.service.toLowerCase().includes(search)
    )
  }
  
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const groupedBookings = computed(() => {
  const now = new Date()
  const groups: any[] = []
  const groupMap = new Map()
  
  filteredBookings.value.forEach(booking => {
    const bookingDate = new Date(`${booking.date}T${booking.time}`)
    let groupKey = ''
    let groupTitle = ''
    
    if (bookingDate > now) {
      groupKey = 'upcoming'
      groupTitle = 'Upcoming Bookings'
    } else {
      const diffTime = Math.abs(now.getTime() - bookingDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 7) {
        groupKey = 'recent'
        groupTitle = 'Recent'
      } else if (diffDays <= 30) {
        groupKey = 'thisMonth'
        groupTitle = 'This Month'
      } else {
        groupKey = 'older'
        groupTitle = 'Earlier'
      }
    }
    
    if (!groupMap.has(groupKey)) {
      const group = {
        date: groupKey,
        title: groupTitle,
        bookings: []
      }
      groupMap.set(groupKey, group)
      groups.push(group)
    }
    
    groupMap.get(groupKey).bookings.push(booking)
  })
  
  // Sort groups by priority
  const priority = ['upcoming', 'recent', 'thisMonth', 'older']
  return groups.sort((a, b) => priority.indexOf(a.date) - priority.indexOf(b.date))
})

const hasActiveFilters = computed(() => {
  return filters.value.status || 
         filters.value.dateRange !== 'all' || 
         filters.value.escortSearch
})

onMounted(() => {
  loadBookings()
})

const loadBookings = async () => {
  isLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (err: any) {
    error.value = err.message || 'Failed to load bookings'
  } finally {
    isLoading.value = false
  }
}

const cancelBooking = async (bookingId: string) => {
  if (!confirm('Are you sure you want to cancel this booking?')) return
  
  isUpdating.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const booking = bookings.value.find(b => b.id === bookingId)
    if (booking) {
      booking.status = 'cancelled'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to cancel booking'
  } finally {
    isUpdating.value = false
  }
}

const contactEscort = (booking: any) => {
  router.push(`/messages?escort=${booking.escortName}`)
}

const modifyBooking = (booking: any) => {
  router.push(`/booking/${booking.escortId}/modify?bookingId=${booking.id}`)
}

const rebookEscort = (booking: any) => {
  router.push(`/booking/${booking.escortId}`)
}

const writeReview = (booking: any) => {
  reviewBooking.value = booking
  reviewRating.value = 0
  reviewComment.value = ''
}

const submitReview = async () => {
  if (!reviewRating.value || !reviewComment.value.trim()) return
  
  isSubmitting.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Add review to booking
    if (reviewBooking.value) {
      const booking = bookings.value.find(b => b.id === reviewBooking.value.id)
      if (booking) {
        booking.review = {
          rating: reviewRating.value,
          comment: reviewComment.value
        }
      }
    }
    
    closeReviewModal()
  } catch (err: any) {
    error.value = err.message || 'Failed to submit review'
  } finally {
    isSubmitting.value = false
  }
}

const canModify = (booking: any) => {
  const bookingDate = new Date(`${booking.date}T${booking.time}`)
  const now = new Date()
  const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return booking.status === 'confirmed' && hoursUntilBooking > 24
}

const canCancel = (booking: any) => {
  const bookingDate = new Date(`${booking.date}T${booking.time}`)
  const now = new Date()
  return ['pending', 'confirmed'].includes(booking.status) && bookingDate > now
}

const canReview = (booking: any) => {
  return booking.status === 'completed' && !booking.review
}

const canRebook = (booking: any) => {
  return booking.status === 'completed'
}

const viewBookingDetails = (booking: any) => {
  selectedBooking.value = booking
}

const closeModal = () => {
  selectedBooking.value = null
}

const closeReviewModal = () => {
  reviewBooking.value = null
  reviewRating.value = 0
  reviewComment.value = ''
}

const resetFilters = () => {
  filters.value = {
    status: '',
    dateRange: 'all',
    escortSearch: ''
  }
}

const applyFilters = () => {
  showFilters.value = false
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

const formatDateTime = (date: string, time: string) => {
  const dateObj = new Date(`${date}T${time}`)
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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
// Reuse the same styles as escort bookings but adapt for client perspective
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
  
  &.upcoming {
    border-left-color: var(--color-accent);
  }
  
  &.total {
    border-left-color: var(--color-success);
  }
  
  &.favorites {
    border-left-color: #ffc107;
  }
  
  &.spent {
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
  
  .escort-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    
    .escort-photo {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .escort-details {
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
  
  &.review-modal {
    max-width: 500px;
  }
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

.escort-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  
  .escort-photo-large {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .escort-details {
    h3 {
      margin: 0 0 var(--spacing-xs);
      color: var(--color-text-dark);
    }
    
    .escort-location {
      color: var(--color-text-light);
      margin: 0 0 var(--spacing-xs);
      font-size: 0.9rem;
    }
    
    .escort-rating {
      color: var(--color-text-light);
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
  
  .special-requests-section, .review-section {
    background: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-md);
    margin-top: var(--spacing-md);
    
    h4 {
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      color: var(--color-text-dark);
      line-height: 1.5;
      margin: 0;
    }
  }
  
  .review-content {
    .review-rating {
      font-size: 1.2rem;
      margin-bottom: var(--spacing-sm);
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

.review-form {
  .escort-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    
    .escort-photo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    h3 {
      color: var(--color-text-dark);
      margin: 0;
    }
  }
  
  .rating-input {
    margin-bottom: var(--spacing-lg);
    
    label {
      display: block;
      font-weight: 500;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
    }
    
    .star-rating {
      display: flex;
      gap: var(--spacing-xs);
      
      .star {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        opacity: 0.3;
        transition: opacity 0.2s ease;
        
        &.active {
          opacity: 1;
        }
        
        &:hover {
          opacity: 0.8;
        }
      }
    }
  }
  
  .form-group {
    label {
      display: block;
      font-weight: 500;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
    }
  }
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
  
  .modal-content {
    margin: var(--spacing-md);
  }
  
  .escort-section {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>