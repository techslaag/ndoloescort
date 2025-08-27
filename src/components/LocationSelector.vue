<template>
  <div class="location-selector">
    <button 
      @click="toggleDropdown" 
      class="location-button"
      :disabled="locationStore.isLoading"
    >
      <span v-if="locationStore.currentLocation" class="location-flag">
        {{ locationStore.currentLocation.flag }}
      </span>
      <span v-else class="location-flag">🌍</span>
      <span class="location-text">
        {{ locationStore.currentLocation?.name || 'Select Location' }}
      </span>
      <span class="dropdown-arrow" :class="{ 'rotated': isOpen }">▼</span>
    </button>
    
    <div v-if="isOpen" class="location-dropdown">
      <div class="dropdown-header">
        <h3>Select Location</h3>
        <button @click="closeDropdown" class="close-btn">×</button>
      </div>
      
      <div class="countries-list">
        <button
          v-for="country in locationStore.availableCountries"
          :key="country.code"
          @click="selectLocation(country.code)"
          class="country-item"
          :class="{ 'active': locationStore.currentLocation?.code === country.code }"
        >
          <span class="country-flag">{{ country.flag }}</span>
          <span class="country-name">{{ country.name }}</span>
          <span v-if="locationStore.currentLocation?.code === country.code" class="check-icon">✓</span>
        </button>
      </div>
    </div>
    
    <!-- Overlay to close dropdown when clicking outside -->
    <div v-if="isOpen" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useLocationStore } from '../stores/location'

const locationStore = useLocationStore()
const isOpen = ref(false)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectLocation = async (countryCode: string) => {
  try {
    await locationStore.updateLocation(countryCode)
    closeDropdown()
  } catch (error) {
    console.error('Failed to update location:', error)
  }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.location-selector')) {
    closeDropdown()
  }
}

// Close dropdown on escape key
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDropdown()
  }
}

onMounted(() => {
  // Initialize location if not already set
  if (!locationStore.currentLocation) {
    locationStore.init()
  }
  
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped lang="scss">
.location-selector {
  position: relative;
  display: inline-block;
}

.location-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  min-width: 140px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.location-flag {
  font-size: 1.2rem;
}

.location-text {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  
  &.rotated {
    transform: rotate(180deg);
  }
}

.location-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--color-background-dark);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  min-width: 280px;
  max-height: 400px;
  overflow: hidden;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    margin: 0;
    color: white;
    font-size: 1rem;
    font-weight: 600;
  }
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

.countries-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.country-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    background: rgba(var(--color-accent-rgb), 0.2);
    color: var(--color-accent);
  }
}

.country-flag {
  font-size: 1.2rem;
  min-width: 24px;
}

.country-name {
  flex: 1;
  font-weight: 500;
}

.check-icon {
  color: var(--color-accent);
  font-weight: bold;
  font-size: 1.1rem;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Mobile styles
@media (max-width: 768px) {
  .location-button {
    min-width: 120px;
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .location-text {
    display: none;
  }
  
  .location-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 320px;
    max-height: 80vh;
    margin-top: 0;
  }
  
  .countries-list {
    max-height: 60vh;
  }
}

// Scrollbar styling for countries list
.countries-list::-webkit-scrollbar {
  width: 6px;
}

.countries-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.countries-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}
</style> 