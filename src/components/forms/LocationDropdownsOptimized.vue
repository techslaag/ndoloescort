<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { locationCache } from '../../utils/locationCache'

interface Country {
  id: number
  name: string
  iso2: string
  iso3: string
  emoji: string
}

interface State {
  id: number
  name: string
  country_id: number
  country_code: string
  state_code: string
}

interface City {
  id: number
  name: string
  state_id: number
  state_code: string
  state_name: string
  country_id: number
  country_code: string
  country_name: string
}

interface Props {
  modelValue?: {
    city?: string
    state?: string
    country?: string
  }
  required?: boolean
  disabled?: boolean
}

interface Emits {
  'update:modelValue': [value: { city?: string, state?: string, country?: string }]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  required: false,
  disabled: false
})

const emit = defineEmits<Emits>()

// Local state
const selectedCountry = ref<Country | null>(null)
const selectedState = ref<State | null>(null)
const selectedCity = ref<City | null>(null)

// Search queries
const countrySearch = ref('')
const stateSearch = ref('')
const citySearch = ref('')

// Dropdown visibility
const showCountryDropdown = ref(false)
const showStateDropdown = ref(false)
const showCityDropdown = ref(false)

// Data storage
const countries = ref<Country[]>([])
const states = ref<State[]>([])
const cities = ref<City[]>([])

// Loading states
const isLoadingCountries = ref(false)
const isLoadingStates = ref(false)
const isLoadingCities = ref(false)

// Popular countries for quick selection
const POPULAR_COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 
  'Japan', 'Brazil', 'Mexico', 'India', 'China', 'South Korea'
]

// Load countries on mount
onMounted(async () => {
  await loadCountries()
  if (props.modelValue?.country) {
    await initializeFromProps()
  }
})

// Load countries
const loadCountries = async () => {
  if (countries.value.length === 0) {
    isLoadingCountries.value = true
    try {
      countries.value = await locationCache.getCountries()
    } finally {
      isLoadingCountries.value = false
    }
  }
}

// Load states for a country
const loadStates = async (countryId: number) => {
  isLoadingStates.value = true
  states.value = [] // Clear previous states
  try {
    states.value = await locationCache.getStates(countryId)
  } finally {
    isLoadingStates.value = false
  }
}

// Load cities for a state
const loadCitiesForState = async (stateId: number) => {
  isLoadingCities.value = true
  cities.value = [] // Clear previous cities
  try {
    cities.value = await locationCache.getCities(stateId)
  } finally {
    isLoadingCities.value = false
  }
}


// Filtered lists with performance optimization
const filteredCountries = computed(() => {
  if (!countrySearch.value) {
    // Show popular countries first
    const popular = countries.value.filter(c => POPULAR_COUNTRIES.includes(c.name))
    const others = countries.value
      .filter(c => !POPULAR_COUNTRIES.includes(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20 - popular.length)
    return [...popular, ...others]
  }
  
  const query = countrySearch.value.toLowerCase()
  return countries.value
    .filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.iso2.toLowerCase().includes(query) ||
      country.iso3.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name.toLowerCase().startsWith(query)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 20)
})

const filteredStates = computed(() => {
  if (!selectedCountry.value) return []
  
  const countryStates = states.value
  
  if (!stateSearch.value) {
    return countryStates.slice(0, 50)
  }
  
  const query = stateSearch.value.toLowerCase()
  return countryStates
    .filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.state_code.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name.toLowerCase().startsWith(query)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 25)
})

const filteredCities = computed(() => {
  if (!selectedState.value && !selectedCountry.value) return []
  if (cities.value.length === 0) return []
  
  const relevantCities = cities.value
  
  if (!citySearch.value) {
    return relevantCities.slice(0, 50)
  }
  
  const query = citySearch.value.toLowerCase()
  return relevantCities
    .filter(city => city.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name.toLowerCase().startsWith(query)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 30)
})

// Initialize from props
const initializeFromProps = async () => {
  if (!props.modelValue) return
  
  // Set country
  if (props.modelValue.country) {
    const country = countries.value.find(c => 
      c.name === props.modelValue.country || c.iso2 === props.modelValue.country
    )
    if (country) {
      selectedCountry.value = country
      countrySearch.value = country.name
      
      // Load states
      await loadStates(country.id)
      
      // Set state
      if (props.modelValue.state) {
        const state = states.value.find(s => s.name === props.modelValue.state)
        if (state) {
          selectedState.value = state
          stateSearch.value = state.name
          
          // Load cities
          await loadCitiesForState(state.id)
          
          // Set city
          if (props.modelValue.city) {
            const city = cities.value.find(c => c.name === props.modelValue.city)
            if (city) {
              selectedCity.value = city
              citySearch.value = city.name
            }
          }
        }
      }
    }
  }
}

// Watch for prop changes
watch(() => props.modelValue, async (newValue) => {
  if (!newValue) return
  
  const countryChanged = newValue.country !== selectedCountry.value?.name
  const stateChanged = newValue.state !== selectedState.value?.name
  const cityChanged = newValue.city !== selectedCity.value?.name
  
  if (countryChanged || stateChanged || cityChanged) {
    await initializeFromProps()
  }
}, { deep: true })

// Selection handlers
const selectCountry = async (country: Country) => {
  selectedCountry.value = country
  countrySearch.value = country.name
  showCountryDropdown.value = false
  
  // Reset state and city
  selectedState.value = null
  selectedCity.value = null
  stateSearch.value = ''
  citySearch.value = ''
  cities.value = []
  
  // Load states
  await loadStates(country.id)
  
  emitUpdate()
}

const selectState = async (state: State) => {
  selectedState.value = state
  stateSearch.value = state.name
  showStateDropdown.value = false
  
  // Reset city
  selectedCity.value = null
  citySearch.value = ''
  
  // Load cities
  await loadCitiesForState(state.id)
  
  emitUpdate()
}

const selectCity = (city: City) => {
  selectedCity.value = city
  citySearch.value = city.name
  showCityDropdown.value = false
  
  emitUpdate()
}

// Emit update
const emitUpdate = () => {
  const value = {
    city: selectedCity.value?.name || '',
    state: selectedState.value?.name || '',
    country: selectedCountry.value?.name || ''
  }
  emit('update:modelValue', value)
}

// Focus handlers
const handleCountryFocus = () => {
  if (!props.disabled) {
    showCountryDropdown.value = true
    showStateDropdown.value = false
    showCityDropdown.value = false
  }
}

const handleStateFocus = () => {
  if (!props.disabled && selectedCountry.value) {
    showStateDropdown.value = true
    showCountryDropdown.value = false
    showCityDropdown.value = false
  }
}

const handleCityFocus = () => {
  if (!props.disabled && (selectedState.value || selectedCountry.value)) {
    showCityDropdown.value = true
    showCountryDropdown.value = false
    showStateDropdown.value = false
  }
}

// Clear functions
const clearCountry = () => {
  selectedCountry.value = null
  selectedState.value = null
  selectedCity.value = null
  countrySearch.value = ''
  stateSearch.value = ''
  citySearch.value = ''
  states.value = []
  cities.value = []
  emitUpdate()
}

const clearState = () => {
  selectedState.value = null
  selectedCity.value = null
  stateSearch.value = ''
  citySearch.value = ''
  cities.value = []
  emitUpdate()
}

const clearCity = () => {
  selectedCity.value = null
  citySearch.value = ''
  emitUpdate()
}

// Blur handlers with timeout
const handleCountryBlur = () => {
  setTimeout(() => {
    showCountryDropdown.value = false
  }, 200)
}

const handleStateBlur = () => {
  setTimeout(() => {
    showStateDropdown.value = false
  }, 200)
}

const handleCityBlur = () => {
  setTimeout(() => {
    showCityDropdown.value = false
  }, 200)
}

</script>

<template>
  <div class="location-dropdowns" @click.stop>
    <!-- Country Dropdown -->
    <div class="form-group">
      <label>
        Country
        <span v-if="required" class="required">*</span>
      </label>
      <div class="dropdown-container">
        <input
          v-model="countrySearch"
          type="text"
          :placeholder="selectedCountry ? selectedCountry.name : 'Select a country'"
          @focus="handleCountryFocus"
          @blur="handleCountryBlur"
          :disabled="disabled"
          class="dropdown-input"
          autocomplete="off"
        />
        <div class="input-actions">
          <span v-if="selectedCountry" class="country-emoji">{{ selectedCountry.emoji }}</span>
          <button
            v-if="selectedCountry && !disabled"
            type="button"
            @click.stop="clearCountry"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showCountryDropdown && !disabled" class="dropdown-list">
          <div v-if="isLoadingCountries" class="dropdown-loading">Loading countries...</div>
          <div
            v-else-if="filteredCountries.length === 0"
            class="dropdown-empty"
          >
            No countries found
          </div>
          <div
            v-else
            v-for="country in filteredCountries"
            :key="country.id"
            @click="selectCountry(country)"
            class="dropdown-item"
          >
            <span class="country-emoji">{{ country.emoji }}</span>
            <span>{{ country.name }}</span>
            <span class="country-code">{{ country.iso2 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- State/Province Dropdown -->
    <div class="form-group">
      <label>
        State/Province
        <span v-if="required && states.length > 0" class="required">*</span>
      </label>
      <div class="dropdown-container">
        <input
          v-model="stateSearch"
          type="text"
          :placeholder="selectedState ? selectedState.name : 'Select a state/province'"
          @focus="handleStateFocus"
          @blur="handleStateBlur"
          :disabled="disabled || !selectedCountry"
          class="dropdown-input"
          autocomplete="off"
        />
        <div class="input-actions">
          <button
            v-if="selectedState && !disabled"
            type="button"
            @click.stop="clearState"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showStateDropdown && !disabled" class="dropdown-list">
          <div v-if="isLoadingStates" class="dropdown-loading">Loading states...</div>
          <div
            v-else-if="filteredStates.length === 0"
            class="dropdown-empty"
          >
            {{ stateSearch ? 'No states found' : 'No states available for this country' }}
          </div>
          <div
            v-else
            v-for="state in filteredStates"
            :key="state.id"
            @click="selectState(state)"
            class="dropdown-item"
          >
            <span>{{ state.name }}</span>
            <span class="state-code">{{ state.state_code }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- City Dropdown -->
    <div class="form-group">
      <label>
        City
        <span v-if="required" class="required">*</span>
      </label>
      <div class="dropdown-container">
        <input
          v-model="citySearch"
          type="text"
          :placeholder="selectedCity ? selectedCity.name : 'Select a city'"
          @focus="handleCityFocus"
          @blur="handleCityBlur"
          :disabled="disabled || (!selectedState && !selectedCountry)"
          class="dropdown-input"
          autocomplete="off"
        />
        <div class="input-actions">
          <button
            v-if="selectedCity && !disabled"
            type="button"
            @click.stop="clearCity"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showCityDropdown && !disabled" class="dropdown-list">
          <div v-if="isLoadingCities" class="dropdown-loading">Loading cities...</div>
          <div
            v-else-if="filteredCities.length === 0"
            class="dropdown-empty"
          >
            {{ citySearch ? 'No cities found' : 'No cities available' }}
          </div>
          <div
            v-else
            v-for="city in filteredCities"
            :key="city.id"
            @click="selectCity(city)"
            class="dropdown-item"
          >
            <span>{{ city.name }}</span>
            <span v-if="!selectedState" class="city-state">{{ city.state_name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.location-dropdowns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    
    .required {
      color: #ef4444;
      margin-left: 0.25rem;
    }
  }
}

.dropdown-container {
  position: relative;
}

.dropdown-input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 3rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
}

.input-actions {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.country-emoji {
  font-size: 1.25rem;
}

.clear-btn {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
  
  &:hover {
    background: #d1d5db;
    color: #374151;
  }
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 50;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f3f4f6;
  }
  
  .country-code,
  .state-code {
    margin-left: auto;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .city-state {
    margin-left: auto;
    color: #9ca3af;
    font-size: 0.875rem;
  }
}

.dropdown-loading,
.dropdown-empty {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
}

@media (max-width: 640px) {
  .dropdown-input {
    font-size: 16px; // Prevent zoom on iOS
  }
  
  .dropdown-list {
    max-height: 250px;
  }
}
</style>