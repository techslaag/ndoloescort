<template>
  <div class="location-dropdowns">
    <!-- Country Selection -->
    <div class="form-group">
      <label>Country {{ required ? '*' : '' }}</label>
      <div class="search-dropdown" :class="{ disabled }">
        <div class="search-input-wrapper">
          <input
            v-model="countrySearch"
            type="text"
            placeholder="Search countries..."
            :disabled="disabled"
            :required="required"
            @focus="handleCountryFocus"
            @input="showCountryDropdown = true"
            autocomplete="off"
          />
          <button
            v-if="selectedCountry && !disabled"
            type="button"
            @click="clearCountry"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showCountryDropdown && !disabled" class="dropdown-menu">
          <div v-if="isLoadingCountries" class="dropdown-item disabled">
            Loading countries...
          </div>
          <template v-else>
            <div
              v-for="country in filteredCountries"
              :key="country.id"
              @click="selectCountry(country)"
              class="dropdown-item"
              :class="{ selected: selectedCountry?.id === country.id }"
            >
              <span class="country-emoji">{{ country.emoji }}</span>
              <span class="country-name">{{ country.name }}</span>
            </div>
            
            <div v-if="filteredCountries.length === 0" class="dropdown-item disabled">
              No countries found
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- State/Province Selection -->
    <div class="form-group">
      <label>State/Province</label>
      <div class="search-dropdown" :class="{ disabled: disabled || !selectedCountry }">
        <div class="search-input-wrapper">
          <input
            v-model="stateSearch"
            type="text"
            placeholder="Search states/provinces..."
            :disabled="disabled || !selectedCountry"
            @focus="handleStateFocus"
            @input="showStateDropdown = true"
            autocomplete="off"
          />
          <button
            v-if="selectedState && !disabled"
            type="button"
            @click="clearState"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showStateDropdown && !disabled && selectedCountry" class="dropdown-menu">
          <div v-if="isLoadingStates" class="dropdown-item disabled">
            Loading states...
          </div>
          <template v-else>
            <div
              v-for="state in filteredStates"
              :key="state.id"
              @click="selectState(state)"
              class="dropdown-item"
              :class="{ selected: selectedState?.id === state.id }"
            >
              {{ state.name }}
            </div>
            
            <div v-if="filteredStates.length === 0" class="dropdown-item disabled">
              No states/provinces found
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- City Selection -->
    <div class="form-group">
      <label>City {{ required ? '*' : '' }}</label>
      <div class="search-dropdown" :class="{ disabled: disabled || (!selectedState && !selectedCountry) }">
        <div class="search-input-wrapper">
          <input
            v-model="citySearch"
            type="text"
            placeholder="Start typing to search cities..."
            :disabled="disabled || (!selectedState && !selectedCountry)"
            :required="required"
            @focus="handleCityFocus"
            @input="handleCityInput"
            autocomplete="off"
          />
          <button
            v-if="selectedCity && !disabled"
            type="button"
            @click="clearCity"
            class="clear-btn"
          >
            ×
          </button>
        </div>
        
        <div v-if="showCityDropdown && !disabled && (selectedState || selectedCountry)" class="dropdown-menu">
          <div v-if="isLoadingCities" class="dropdown-item disabled">
            Loading cities...
          </div>
          <template v-else>
            <div
              v-for="city in filteredCities"
              :key="city.id"
              @click="selectCity(city)"
              class="dropdown-item"
              :class="{ selected: selectedCity?.id === city.id }"
            >
              <span class="city-name">{{ city.name }}</span>
              <span v-if="!selectedState" class="city-state">{{ city.state_name }}</span>
            </div>
            
            <div v-if="filteredCities.length === 0 && citySearch && citySearch.length >= 2" class="dropdown-item disabled">
              No cities found
            </div>
            <div v-if="!citySearch || citySearch.length < 2" class="dropdown-item disabled">
              Type at least 2 characters to search cities...
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Backdrop to close dropdowns -->
    <div
      v-if="showCountryDropdown || showStateDropdown || showCityDropdown"
      class="dropdown-backdrop"
      @click="closeAllDropdowns"
    ></div>
  </div>
</template>

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

// Debounced city search
let citySearchTimeout: NodeJS.Timeout

// Load data functions
const loadCountries = async () => {
  if (countries.value.length === 0 && !isLoadingCountries.value) {
    isLoadingCountries.value = true
    try {
      countries.value = await locationCache.getCountries()
    } finally {
      isLoadingCountries.value = false
    }
  }
}

const loadStates = async (countryId: number) => {
  isLoadingStates.value = true
  try {
    states.value = await locationCache.getStates(countryId)
  } finally {
    isLoadingStates.value = false
  }
}

const loadCities = async (stateId?: number, countryId?: number) => {
  if (citySearch.value.length < 2) return
  
  isLoadingCities.value = true
  try {
    if (stateId) {
      cities.value = await locationCache.getCities(stateId)
    } else if (countryId) {
      cities.value = await locationCache.getCities(0, countryId)
    }
  } finally {
    isLoadingCities.value = false
  }
}

// Filtered options
const filteredCountries = computed(() => {
  if (!countrySearch.value) {
    const popularCountries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Japan']
    const popular = countries.value.filter(c => popularCountries.includes(c.name))
    const others = countries.value.filter(c => !popularCountries.includes(c.name)).slice(0, 30)
    return [...popular, ...others]
  }
  
  const query = countrySearch.value.toLowerCase()
  return countries.value
    .filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.iso2.toLowerCase().includes(query)
    )
    .slice(0, 15)
})

const filteredStates = computed(() => {
  if (!stateSearch.value) return states.value.slice(0, 30)
  
  const query = stateSearch.value.toLowerCase()
  return states.value
    .filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.state_code.toLowerCase().includes(query)
    )
    .slice(0, 15)
})

const filteredCities = computed(() => {
  if (!citySearch.value || citySearch.value.length < 2) return []
  
  const query = citySearch.value.toLowerCase()
  return cities.value
    .filter(city => city.name.toLowerCase().includes(query))
    .slice(0, 15)
})

// Event handlers
const handleCountryFocus = async () => {
  if (!props.disabled) {
    await loadCountries()
    showCountryDropdown.value = true
  }
}

const handleStateFocus = async () => {
  if (!props.disabled && selectedCountry.value) {
    await loadStates(selectedCountry.value.id)
    showStateDropdown.value = true
  }
}

const handleCityFocus = () => {
  if (!props.disabled && (selectedState.value || selectedCountry.value)) {
    showCityDropdown.value = true
  }
}

const handleCityInput = () => {
  showCityDropdown.value = true
  
  // Debounce city loading
  clearTimeout(citySearchTimeout)
  citySearchTimeout = setTimeout(async () => {
    if (citySearch.value.length >= 2) {
      if (selectedState.value) {
        await loadCities(selectedState.value.id)
      } else if (selectedCountry.value) {
        await loadCities(0, selectedCountry.value.id)
      }
    }
  }, 300)
}

// Selection handlers
const selectCountry = async (country: Country) => {
  selectedCountry.value = country
  countrySearch.value = country.name
  showCountryDropdown.value = false
  
  // Reset dependent selections
  selectedState.value = null
  selectedCity.value = null
  stateSearch.value = ''
  citySearch.value = ''
  cities.value = []
  
  updateModelValue()
}

const selectState = async (state: State) => {
  selectedState.value = state
  stateSearch.value = state.name
  showStateDropdown.value = false
  
  // Reset city selection
  selectedCity.value = null
  citySearch.value = ''
  cities.value = []
  
  updateModelValue()
}

const selectCity = (city: City) => {
  selectedCity.value = city
  citySearch.value = city.name
  showCityDropdown.value = false
  updateModelValue()
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
  updateModelValue()
}

const clearState = () => {
  selectedState.value = null
  selectedCity.value = null
  stateSearch.value = ''
  citySearch.value = ''
  cities.value = []
  updateModelValue()
}

const clearCity = () => {
  selectedCity.value = null
  citySearch.value = ''
  updateModelValue()
}

const closeAllDropdowns = () => {
  showCountryDropdown.value = false
  showStateDropdown.value = false
  showCityDropdown.value = false
}

// Update model value
const updateModelValue = () => {
  emit('update:modelValue', {
    country: selectedCountry.value?.name || '',
    state: selectedState.value?.name || '',
    city: selectedCity.value?.name || ''
  })
}

// Initialize from props
const initializeFromProps = async () => {
  if (props.modelValue.country) {
    await loadCountries()
    const country = countries.value.find(c => 
      c.name === props.modelValue.country || c.iso2 === props.modelValue.country
    )
    if (country) {
      selectedCountry.value = country
      countrySearch.value = country.name
      
      if (props.modelValue.state) {
        await loadStates(country.id)
        const state = states.value.find(s => s.name === props.modelValue.state)
        if (state) {
          selectedState.value = state
          stateSearch.value = state.name
          
          if (props.modelValue.city) {
            await loadCities(state.id)
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

onMounted(() => {
  initializeFromProps()
})

// Watch for prop changes
watch(() => props.modelValue, initializeFromProps, { deep: true })
</script>

<style scoped>
.location-dropdowns {
  display: grid;
  gap: 1rem;
}

.form-group {
  position: relative;
}

.search-dropdown {
  position: relative;
}

.search-dropdown.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-wrapper input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 2rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: var(--primary-color, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
}

.clear-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item.selected {
  background-color: var(--primary-color, #007bff);
  color: white;
}

.dropdown-item.disabled {
  color: #666;
  cursor: not-allowed;
  font-style: italic;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.country-emoji {
  font-size: 1.2rem;
}

.country-name {
  flex: 1;
}

.city-name {
  flex: 1;
}

.city-state {
  font-size: 0.9rem;
  color: #666;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

@media (min-width: 768px) {
  .location-dropdowns {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
</style>