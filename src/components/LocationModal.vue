<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLocationStore } from '../stores/location'

const locationStore = useLocationStore()
const isOpen = ref(false)

const openModal = () => {
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const selectLocation = async (countryCode: string) => {
  await locationStore.updateLocation(countryCode)
  closeModal()
}

// Initialize location when component mounts
onMounted(() => {
  locationStore.init()
})

// Expose openModal for parent components
defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Change Location</h3>
          <button class="close-button" @click="closeModal">
            <span>&times;</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="countries-grid">
            <div
              v-for="country in locationStore.availableCountries"
              :key="country.code"
              class="country-item"
              :class="{ 'selected': locationStore.currentLocation?.code === country.code }"
              @click="selectLocation(country.code)"
            >
              <span class="country-flag">{{ country.flag }}</span>
              <span class="country-name">{{ country.name }}</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <small>
            Select your preferred location to see relevant content and services.
          </small>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-overlay {
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

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: #f3f4f6;
      color: #374151;
    }
  }
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.countries-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
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
  text-align: center;
  flex-shrink: 0;
  
  small {
    color: #6b7280;
    font-size: 0.875rem;
  }
}

@media (max-width: 640px) {
  .countries-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .modal-content {
    margin: var(--spacing-md);
  }
}
</style> 