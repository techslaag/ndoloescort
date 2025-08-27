<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLocationStore } from '../stores/location'

const emit = defineEmits<{
  'location-confirmed': []
}>()

const locationStore = useLocationStore()
const isVisible = ref(false)
const isConfirmed = ref(false)
const showAllCountries = ref(false)

const detectedLocation = ref<any>(null)

const confirmCurrentLocation = async () => {
  isConfirmed.value = true
  isVisible.value = false
  // Update store confirmation status (Pinia will persist automatically)
  locationStore.setLocationConfirmed(true)
  // Emit event to parent
  emit('location-confirmed')
}

const selectDifferentLocation = async (countryCode: string) => {
  await locationStore.updateLocation(countryCode)
  isConfirmed.value = true
  isVisible.value = false
  // Update store confirmation status (Pinia will persist automatically)
  locationStore.setLocationConfirmed(true)
  // Emit event to parent
  emit('location-confirmed')
}

const toggleCountryList = () => {
  showAllCountries.value = !showAllCountries.value
}

onMounted(async () => {
  // Check if user has already confirmed their location using store state
  if (!locationStore.locationConfirmed) {
    // Get user's current location (force = true to bypass confirmation check)
    await locationStore.getUserLocation(true)
    detectedLocation.value = locationStore.currentLocation
    isVisible.value = true
  } else {
    isConfirmed.value = true
    emit('location-confirmed')
  }
})

// Watch for confirmation changes
const isLocationDetected = computed(() => {
  return detectedLocation.value && detectedLocation.value.name
})

// Expose confirmation status
defineExpose({
  isConfirmed
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="location-confirmation-overlay">
      <div class="location-confirmation-modal">
        <div class="modal-header">
          <div class="header-content">
            <div class="location-icon">📍</div>
            <h2>Confirm Your Location</h2>
          </div>
        </div>
        
        <div class="modal-body">
          <!-- Detected Location Section -->
          <div v-if="isLocationDetected" class="detected-location-section">
            <p class="detection-message">
              We detected you're in:
            </p>
            <div class="detected-location">
              <span class="country-flag">{{ detectedLocation.flag }}</span>
              <span class="country-name">{{ detectedLocation.name }}</span>
            </div>
            
            <div class="location-actions">
              <button 
                @click="confirmCurrentLocation" 
                class="btn btn-primary confirm-btn"
              >
                Yes, that's correct
              </button>
              <button 
                @click="toggleCountryList" 
                class="btn btn-secondary change-btn"
              >
                No, choose different location
              </button>
            </div>
          </div>
          
          <!-- Location Not Detected Section -->
          <div v-else class="no-location-section">
            <p class="no-location-message">
              We couldn't detect your location. Please select your country:
            </p>
            <button 
              @click="toggleCountryList" 
              class="btn btn-primary select-btn"
            >
              Select Location
            </button>
          </div>
          
          <!-- All Countries List -->
          <div v-if="showAllCountries" class="countries-section">
            <h3>Select Your Location</h3>
            <div class="countries-grid">
              <div
                v-for="country in locationStore.availableCountries"
                :key="country.code"
                class="country-item"
                :class="{ 'selected': detectedLocation?.code === country.code }"
                @click="selectDifferentLocation(country.code)"
              >
                <span class="country-flag">{{ country.flag }}</span>
                <span class="country-name">{{ country.name }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <small>
            You can change your location anytime from the header menu.
          </small>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.location-confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.location-confirmation-modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.location-icon {
  font-size: 3rem;
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.detected-location-section {
  margin-bottom: var(--spacing-lg);
}

.detection-message {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: var(--spacing-md);
}

.detected-location {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: #f9fafb;
  border-radius: 12px;
  margin-bottom: var(--spacing-lg);
  border: 2px solid #e5e7eb;
  
  .country-flag {
    font-size: 2rem;
  }
  
  .country-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }
}

.no-location-section {
  margin-bottom: var(--spacing-lg);
}

.no-location-message {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: var(--spacing-md);
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  &.btn-primary {
    background-color: #10b981;
    color: white;
    
    &:hover {
      background-color: #059669;
    }
  }
  
  &.btn-secondary {
    background-color: #f3f4f6;
    color: #374151;
    
    &:hover {
      background-color: #e5e7eb;
    }
  }
}

.countries-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid #e5e7eb;
}

.countries-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.country-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  
  &:hover {
    background-color: #f9fafb;
    border-color: #e5e7eb;
  }
  
  &.selected {
    background-color: #ecfdf5;
    border-color: #10b981;
  }
  
  .country-flag {
    font-size: 1.5rem;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .country-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #374151;
  }
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid #e5e7eb;
  
  small {
    color: #6b7280;
    font-size: 0.8rem;
    line-height: 1.4;
  }
}

@media (max-width: 640px) {
  .location-confirmation-modal {
    max-width: 90%;
    max-height: 95%;
  }
  
  .modal-header {
    padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .location-icon {
    font-size: 2.5rem;
  }
  
  h2 {
    font-size: 1.5rem;
  }
  
  .modal-body {
    padding: var(--spacing-md);
  }
  
  .detected-location {
    .country-flag {
      font-size: 1.5rem;
    }
    
    .country-name {
      font-size: 1.1rem;
    }
  }
  
  .countries-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .modal-footer {
    padding: var(--spacing-md);
  }
}
</style> 