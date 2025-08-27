<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EscortCard from '../components/escort/EscortCard.vue'
import { fetchAllEscorts, searchEscorts, filterEscortsByLocation, filterEscortsByService } from '../services/escortService'
import { availableServices } from '../constants/services'

const router = useRouter()
const escorts = ref([])
const filteredEscorts = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedLocation = ref('')
const selectedService = ref('')

// Event handlers for EscortCard
const handleToggleFavorite = (escortId: number) => {
  // In a real app, you'd implement favorite functionality
  console.log('Toggle favorite for escort:', escortId)
}

const handleStartMessage = (escortId: number, escortName: string) => {
  // This will be handled by the EscortCard component itself
  console.log('Starting message with:', escortName)
}

// Filter options
const locations = ["New York", "Los Angeles", "Miami", "Chicago", "Las Vegas", "San Francisco"]
const services = availableServices.map(service => service.label)

// Load escorts on component mount
onMounted(async () => {
  try {
    const data = await fetchAllEscorts()
    escorts.value = data
    filteredEscorts.value = data
  } catch (error) {
    console.error('Failed to fetch escorts:', error)
  } finally {
    isLoading.value = false
  }
})

// Search and filter functions
const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    isLoading.value = true
    try {
      filteredEscorts.value = await searchEscorts(searchQuery.value)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      isLoading.value = false
    }
  } else {
    applyFilters()
  }
}

const handleLocationChange = async () => {
  applyFilters()
}

const handleServiceChange = async () => {
  applyFilters()
}

const applyFilters = async () => {
  isLoading.value = true
  try {
    let results = [...escorts.value]
    
    if (selectedLocation.value) {
      results = await filterEscortsByLocation(selectedLocation.value)
    }
    
    if (selectedService.value) {
      // If we already filtered by location, filter these results further
      if (selectedLocation.value) {
        results = results.filter(escort => 
          escort.services.some(s => s.toLowerCase() === selectedService.value.toLowerCase())
        )
      } else {
        results = await filterEscortsByService(selectedService.value)
      }
    }
    
    if (searchQuery.value.trim()) {
      results = results.filter(escort => 
        escort.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        escort.location.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        escort.services.some(service => service.toLowerCase().includes(searchQuery.value.toLowerCase()))
      )
    }
    
    filteredEscorts.value = results
  } catch (error) {
    console.error('Filter operation failed:', error)
  } finally {
    isLoading.value = false
  }
}

const resetFilters = async () => {
  searchQuery.value = ''
  selectedLocation.value = ''
  selectedService.value = ''
  isLoading.value = true
  try {
    filteredEscorts.value = await fetchAllEscorts()
  } catch (error) {
    console.error('Failed to reset filters:', error)
  } finally {
    isLoading.value = false
  }
}

const navigateToProfile = (id: number) => {
  router.push(`/escorts/${id}`)
}
</script>

<template>
  <div class="escorts-page">
    <div class="page-header">
      <div class="container">
        <h1>Our Elite Companions</h1>
        <p>Browse our selection of sophisticated and elegant companions</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Search and filter section -->
      <div class="search-filter-section">
        <div class="search-container">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search by name, location or service..." 
            @keyup.enter="handleSearch"
          >
          <button class="search-button" @click="handleSearch">Search</button>
        </div>
        
        <div class="filters-container">
          <div class="filter-group">
            <label for="location">Location</label>
            <select id="location" v-model="selectedLocation" @change="handleLocationChange">
              <option value="">All Locations</option>
              <option v-for="location in locations" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="service">Service</label>
            <select id="service" v-model="selectedService" @change="handleServiceChange">
              <option value="">All Services</option>
              <option v-for="service in services" :key="service" :value="service">
                {{ service }}
              </option>
            </select>
          </div>
          
          <button class="reset-button" @click="resetFilters">Reset Filters</button>
        </div>
      </div>
      
      <!-- Results section -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Finding your perfect companion...</p>
      </div>
      
      <div v-else-if="filteredEscorts.length === 0" class="no-results">
        <h3>No escorts found</h3>
        <p>Try adjusting your search criteria or filters.</p>
        <button class="btn btn-primary" @click="resetFilters">View All Escorts</button>
      </div>
      
      <div v-else class="escorts-grid">
        <EscortCard 
          v-for="escort in filteredEscorts" 
          :key="escort.id" 
          :escort="escort"
          @view-profile="navigateToProfile"
          @toggle-favorite="handleToggleFavorite"
          @start-message="handleStartMessage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.escorts-page {
  padding-top: 0px;
}

.page-header {
  background-color: var(--color-primary-dark);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
  
  h1 {
    color: white;
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
  }
}

.search-filter-section {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: var(--spacing-xl);
}

.search-container {
  display: flex;
  margin-bottom: var(--spacing-md);
  
  input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: var(--border-radius-md) 0 0 var(--border-radius-md);
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
  
  .search-button {
    background-color: var(--color-primary);
    color: white;
    border: none;
    padding: 0 1.5rem;
    border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0;
    cursor: pointer;
    font-weight: 600;
    
    &:hover {
      background-color: var(--color-primary-light);
    }
  }
}

.filters-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  align-items: flex-end;
}

.filter-group {
  flex: 1;
  min-width: 200px;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236A0DAD' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.reset-button {
  background-color: transparent;
  border: 1px solid #ddd;
  color: var(--color-text);
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  
  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.escorts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  
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

.no-results {
  text-align: center;
  padding: var(--spacing-xxl) 0;
  
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .filters-container {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .filter-group {
    width: 100%;
  }
  
  .reset-button {
    width: 100%;
  }
}
</style>