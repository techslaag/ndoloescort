<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchEscortById } from '../services/escortService'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const escort = ref(null)
const isLoading = ref(true)
const selectedImage = ref('')
const activeTab = ref('about')
const showDatePicker = ref(false)
const bookingDate = ref('')
const bookingTime = ref('')
const bookingDuration = ref('2')

const fetchEscort = async () => {
  isLoading.value = true
  try {
    const id = parseInt(route.params.id as string)
    const data = await fetchEscortById(id)
    
    if (!data) {
      router.push('/not-found')
      return
    }
    
    escort.value = data
    selectedImage.value = data.profileImage
  } catch (error) {
    console.error('Failed to fetch escort details:', error)
  } finally {
    isLoading.value = false
  }
}

const selectImage = (image: string) => {
  selectedImage.value = image
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

const toggleDatePicker = () => {
  showDatePicker.value = !showDatePicker.value
}

const proceedToBooking = () => {
  // In a real app, validate inputs and then navigate to booking page
  if (bookingDate && bookingTime) {
    router.push({
      name: 'Booking',
      params: { id: route.params.id },
      query: {
        date: bookingDate.value,
        time: bookingTime.value,
        duration: bookingDuration.value
      }
    })
  }
}

const startMessage = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // Navigate to messages with escort info
  router.push({
    name: 'Messages',
    query: {
      receiver: escort.value.id,
      receiverName: escort.value.name
    }
  })
}

onMounted(() => {
  fetchEscort()
})
</script>

<template>
  <div class="escort-profile">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading profile...</p>
    </div>
    
    <template v-else-if="escort">
      <!-- Profile header -->
      <div class="profile-header">
        <div class="container">
          <div class="header-content">
            <h1>{{ escort.name }}, {{ escort.age }}</h1>
            <div class="profile-meta">
              <div class="location">
                <span class="icon">📍</span> {{ escort.location }}
              </div>
              <div class="rating">
                <span class="stars">★★★★★</span>
                <span class="rating-value">{{ escort.rating.toFixed(1) }}</span>
              </div>
              <div class="rate">{{ escort.rate }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="container">
        <div class="profile-content">
          <!-- Profile gallery -->
          <div class="profile-gallery">
            <div class="main-image">
              <img :src="selectedImage" :alt="`${escort.name}`">
            </div>
            <div class="thumbnail-images">
              <div 
                v-for="(image, index) in escort.gallery" 
                :key="index" 
                class="thumbnail"
                :class="{ active: selectedImage === image }"
                @click="selectImage(image)"
              >
                <img :src="image" :alt="`${escort.name} thumbnail ${index + 1}`">
              </div>
            </div>
          </div>
          
          <!-- Profile details -->
          <div class="profile-details">
            <!-- Tabs navigation -->
            <div class="tabs-navigation">
              <button 
                class="tab-button" 
                :class="{ active: activeTab === 'about' }"
                @click="setActiveTab('about')"
              >
                About
              </button>
              <button 
                class="tab-button" 
                :class="{ active: activeTab === 'services' }"
                @click="setActiveTab('services')"
              >
                Services
              </button>
              <button 
                class="tab-button" 
                :class="{ active: activeTab === 'stats' }"
                @click="setActiveTab('stats')"
              >
                Stats
              </button>
              <button 
                class="tab-button" 
                :class="{ active: activeTab === 'availability' }"
                @click="setActiveTab('availability')"
              >
                Availability
              </button>
            </div>
            
            <!-- Tab content -->
            <div class="tab-content">
              <!-- About tab -->
              <div v-if="activeTab === 'about'" class="about-content">
                <p class="description">{{ escort.description }}</p>
                
                <div class="languages">
                  <h3>Languages</h3>
                  <div class="language-tags">
                    <span 
                      v-for="(language, index) in escort.languages" 
                      :key="index" 
                      class="language-tag"
                    >
                      {{ language }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Services tab -->
              <div v-if="activeTab === 'services'" class="services-content">
                <h3>Services Offered</h3>
                <ul class="services-list">
                  <li v-for="(service, index) in escort.services" :key="index">
                    <span class="checkmark">✓</span> {{ service }}
                  </li>
                </ul>
                
                <div class="service-note">
                  <p><strong>Note:</strong> For detailed information about services and arrangements, please discuss directly after booking.</p>
                </div>
              </div>
              
              <!-- Stats tab -->
              <div v-if="activeTab === 'stats'" class="stats-content">
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">Height</span>
                    <span class="stat-value">{{ escort.height }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Measurements</span>
                    <span class="stat-value">{{ escort.measurements }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Hair</span>
                    <span class="stat-value">{{ escort.hairColor }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Eyes</span>
                    <span class="stat-value">{{ escort.eyeColor }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Nationality</span>
                    <span class="stat-value">{{ escort.nationality }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Age</span>
                    <span class="stat-value">{{ escort.age }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Availability tab -->
              <div v-if="activeTab === 'availability'" class="availability-content">
                <h3>Availability</h3>
                <ul class="availability-list">
                  <li v-for="(time, index) in escort.availability" :key="index">
                    {{ time }}
                  </li>
                </ul>
                
                <p class="availability-note">For special arrangements or extended bookings, please inquire during the booking process.</p>
              </div>
            </div>
            
            <!-- Booking section -->
            <div class="booking-section">
              <div v-if="!showDatePicker" class="initial-booking">
                <div class="rate-display">
                  <div class="rate-amount">{{ escort.rate }}</div>
                  <div class="rate-label">Starting Rate</div>
                </div>
                <div class="action-buttons">
                  <button @click="startMessage" class="btn btn-secondary btn-lg message-btn">
                    💬 Message
                  </button>
                  <button @click="toggleDatePicker" class="btn btn-primary btn-lg">Book Now</button>
                </div>
              </div>
              
              <div v-else class="date-picker">
                <h3>Select Date and Time</h3>
                <div class="booking-form">
                  <div class="form-group">
                    <label for="booking-date">Date</label>
                    <input 
                      type="date" 
                      id="booking-date" 
                      v-model="bookingDate"
                      min="2025-01-01"
                    >
                  </div>
                  
                  <div class="form-group">
                    <label for="booking-time">Time</label>
                    <input 
                      type="time" 
                      id="booking-time" 
                      v-model="bookingTime"
                    >
                  </div>
                  
                  <div class="form-group">
                    <label for="booking-duration">Duration (hours)</label>
                    <select id="booking-duration" v-model="bookingDuration">
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="4">4 hours</option>
                      <option value="8">8 hours (Dinner date)</option>
                      <option value="24">Overnight (12 hours)</option>
                    </select>
                  </div>
                  
                  <div class="booking-buttons">
                    <button @click="toggleDatePicker" class="btn btn-outline">Cancel</button>
                    <button @click="proceedToBooking" class="btn btn-primary">Continue</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.escort-profile {
  padding-top: 0px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(106, 13, 173, 0.3);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: var(--spacing-md);
  }
  
  p {
    color: var(--color-text-light);
  }
}

.profile-header {
  background-color: var(--color-primary-dark);
  padding: var(--spacing-xl) 0;
  color: white;
  margin-bottom: var(--spacing-xl);
  
  h1 {
    color: white;
    margin-bottom: var(--spacing-sm);
  }
  
  .profile-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    color: rgba(255, 255, 255, 0.8);
    
    .icon {
      margin-right: 0.25rem;
    }
    
    .stars {
      color: gold;
      margin-right: 0.25rem;
    }
    
    .rate {
      background-color: var(--color-accent);
      color: white;
      padding: 0.3rem 0.75rem;
      border-radius: var(--border-radius-sm);
      font-weight: 600;
    }
  }
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xxl);
}

.profile-gallery {
  .main-image {
    width: 100%;
    height: 500px;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    margin-bottom: var(--spacing-md);
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .thumbnail-images {
    display: flex;
    gap: var(--spacing-sm);
    
    .thumbnail {
      width: 100px;
      height: 100px;
      border-radius: var(--border-radius-sm);
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s ease;
      
      &.active, &:hover {
        border-color: var(--color-primary);
      }
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}

.profile-details {
  display: flex;
  flex-direction: column;
}

.tabs-navigation {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: var(--spacing-md);
  
  .tab-button {
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--color-text-light);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.active, &:hover {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  }
}

.tab-content {
  flex: 1;
  margin-bottom: var(--spacing-lg);
  
  .description {
    line-height: 1.7;
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.3rem;
  }
}

.languages {
  margin-top: var(--spacing-lg);
  
  .language-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .language-tag {
    background-color: var(--color-background-alt);
    padding: 0.3rem 0.75rem;
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
    color: var(--color-primary);
  }
}

.services-list {
  list-style: none;
  margin-bottom: var(--spacing-md);
  
  li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    
    .checkmark {
      color: var(--color-primary);
      margin-right: 0.5rem;
      font-weight: bold;
    }
  }
}

.service-note {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  
  .stat-item {
    display: flex;
    flex-direction: column;
    
    .stat-label {
      font-size: 0.9rem;
      color: var(--color-text-light);
      margin-bottom: 0.25rem;
    }
    
    .stat-value {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--color-text-dark);
    }
  }
}

.availability-list {
  list-style: none;
  margin-bottom: var(--spacing-md);
  
  li {
    padding: 0.75rem 0;
    border-bottom: 1px solid #eee;
  }
}

.availability-note {
  color: var(--color-text-light);
  font-style: italic;
  margin-top: var(--spacing-md);
}

.booking-section {
  margin-top: auto;
  padding: var(--spacing-md);
  background-color: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.initial-booking {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  
  .rate-display {
    text-align: center;
    
    .rate-amount {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-primary-dark);
    }
    
    .rate-label {
      font-size: 0.9rem;
      color: var(--color-text-light);
    }
  }
  
  .action-buttons {
    display: flex;
    gap: var(--spacing-sm);
    
    .btn-lg {
      flex: 1;
      padding: 0.75rem 1.5rem;
      font-size: 0.95rem;
    }
    
    .message-btn {
      background: var(--color-text-light);
      color: white;
      border: 1px solid var(--color-text-light);
      
      &:hover {
        background: var(--color-text);
        border-color: var(--color-text);
      }
    }
  }
}

.date-picker {
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-primary-dark);
  }
  
  .booking-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
    
    .form-group:nth-child(3) {
      grid-column: span 2;
    }
    
    .booking-buttons {
      grid-column: span 2;
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      margin-top: var(--spacing-sm);
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 992px) {
  .profile-content {
    grid-template-columns: 1fr;
  }
  
  .profile-gallery {
    .main-image {
      height: 400px;
    }
  }
}

@media (max-width: 768px) {
  .profile-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .profile-gallery {
    .thumbnail-images {
      justify-content: center;
      flex-wrap: wrap;
    }
  }
  
  .tabs-navigation {
    overflow-x: auto;
    padding-bottom: var(--spacing-sm);
    
    .tab-button {
      white-space: nowrap;
    }
  }
  
  .initial-booking {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
    
    .btn-lg {
      width: 100%;
    }
  }
  
  .date-picker {
    .booking-form {
      grid-template-columns: 1fr;
      
      .form-group:nth-child(3) {
        grid-column: span 1;
      }
      
      .booking-buttons {
        grid-column: span 1;
        flex-direction: column-reverse;
        
        .btn {
          width: 100%;
        }
      }
    }
  }
}
</style>