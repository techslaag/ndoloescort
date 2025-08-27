<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import countriesData from '../../assets/countries.json'
import statesData from '../../assets/states.json'
import citiesData from '../../assets/cities.json'

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

// Load data
const countries = ref<Country[]>(countriesData as Country[])
const states = ref<State[]>(statesData as State[])
const cities = ref<City[]>(citiesData as City[])

// Filtered options based on search
const filteredCountries = computed(() => {
  if (!countrySearch.value) return countries.value.slice(0, 50) // Limit for performance
  
  return countries.value
    .filter(country => 
      country.name.toLowerCase().includes(countrySearch.value.toLowerCase())
    )
    .slice(0, 20)
})

const filteredStates = computed(() => {
  if (!selectedCountry.value) return []
  
  const countryStates = states.value.filter(state => 
    state.country_id === selectedCountry.value!.id
  )
  
  if (!stateSearch.value) return countryStates.slice(0, 50)
  
  return countryStates
    .filter(state => 
      state.name.toLowerCase().includes(stateSearch.value.toLowerCase())
    )
    .slice(0, 20)
})

const filteredCities = computed(() => {
  if (!selectedState.value && !selectedCountry.value) return []
  
  let countryCities: City[]
  
  if (selectedState.value) {
    countryCities = cities.value.filter(city => 
      city.state_id === selectedState.value!.id
    )
  } else {
    countryCities = cities.value.filter(city => 
      city.country_id === selectedCountry.value!.id
    )
  }
  
  if (!citySearch.value) return countryCities.slice(0, 50)
  
  return countryCities
    .filter(city => 
      city.name.toLowerCase().includes(citySearch.value.toLowerCase())
    )
    .slice(0, 20)
})

// Function to initialize from props
const initializeFromProps = () => {
  if (props.modelValue.country) {
    const country = countries.value.find(c => 
      c.name === props.modelValue.country || c.iso2 === props.modelValue.country
    )
    if (country) {
      selectedCountry.value = country
      countrySearch.value = country.name
    }
  }
  
  if (props.modelValue.state && selectedCountry.value) {
    const state = states.value.find(s => 
      s.name === props.modelValue.state && s.country_id === selectedCountry.value!.id
    )
    if (state) {
      selectedState.value = state
      stateSearch.value = state.name
    }
  }
  
  if (props.modelValue.city) {
    // If we have a selected state, find city within that state
    if (selectedState.value) {
      const city = cities.value.find(c => 
        c.name === props.modelValue.city && c.state_id === selectedState.value!.id
      )
      if (city) {
        selectedCity.value = city
        citySearch.value = city.name
      }
    } else if (selectedCountry.value) {
      // Otherwise, find city within the country
      const city = cities.value.find(c => 
        c.name === props.modelValue.city && c.country_id === selectedCountry.value!.id
      )
      if (city) {
        selectedCity.value = city
        citySearch.value = city.name
      }
    }
  }
}

// Initialize from props on mount
onMounted(() => {
  initializeFromProps()
})

// Watch for changes to modelValue prop
watch(() => props.modelValue, (newValue) => {
  // Only re-initialize if the values actually changed
  if (newValue.country !== selectedCountry.value?.name ||
      newValue.state !== selectedState.value?.name ||
      newValue.city !== selectedCity.value?.name) {
    initializeFromProps()
  }
}, { deep: true })

// Watchers for cascading updates
watch(selectedCountry, (newCountry, oldCountry) => {
  if (newCountry) {
    countrySearch.value = newCountry.name
    // Only reset state and city when country actually changes (not during initialization)
    if (oldCountry && newCountry.id !== oldCountry.id) {
      selectedState.value = null
      selectedCity.value = null
      stateSearch.value = ''
      citySearch.value = ''
    }
    updateModelValue()
  }
})

watch(selectedState, (newState, oldState) => {
  if (newState) {
    stateSearch.value = newState.name
    // Only reset city when state actually changes (not during initialization)
    if (oldState && newState.id !== oldState.id) {
      selectedCity.value = null
      citySearch.value = ''
    }
    updateModelValue()
  }
})

watch(selectedCity, (newCity) => {
  if (newCity) {
    citySearch.value = newCity.name
    updateModelValue()
  }
})

// Update model value
const updateModelValue = () => {
  emit('update:modelValue', {
    country: selectedCountry.value?.name || '',
    state: selectedState.value?.name || '',
    city: selectedCity.value?.name || ''
  })
}

// Selection handlers
const selectCountry = (country: Country) => {
  selectedCountry.value = country
  showCountryDropdown.value = false
}

const selectState = (state: State) => {
  selectedState.value = state
  showStateDropdown.value = false
}

const selectCity = (city: City) => {
  selectedCity.value = city
  showCityDropdown.value = false
}

// Focus handlers
const handleCountryFocus = () => {
  if (!props.disabled) {
    showCountryDropdown.value = true
  }
}

const handleStateFocus = () => {
  if (!props.disabled && selectedCountry.value) {
    showStateDropdown.value = true
  }
}

const handleCityFocus = () => {
  if (!props.disabled && (selectedState.value || selectedCountry.value)) {
    showCityDropdown.value = true
  }
}

// Clear selections
const clearCountry = () => {
  selectedCountry.value = null
  selectedState.value = null
  selectedCity.value = null
  countrySearch.value = ''
  stateSearch.value = ''
  citySearch.value = ''
  updateModelValue()
}

const clearState = () => {
  selectedState.value = null
  selectedCity.value = null
  stateSearch.value = ''
  citySearch.value = ''
  updateModelValue()
}

const clearCity = () => {
  selectedCity.value = null
  citySearch.value = ''
  updateModelValue()
}

// Close dropdowns when clicking outside
const closeDropdowns = () => {
  showCountryDropdown.value = false
  showStateDropdown.value = false
  showCityDropdown.value = false
}
</script>

<template>
  <div class="location-dropdowns" @click.stop>
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
            placeholder="Search cities..."
            :disabled="disabled || (!selectedState && !selectedCountry)"
            :required="required"
            @focus="handleCityFocus"
            @input="showCityDropdown = true"
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
          
          <div v-if="filteredCities.length === 0" class="dropdown-item disabled">
            No cities found
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop to close dropdowns -->
    <div
      v-if="showCountryDropdown || showStateDropdown || showCityDropdown"
      @click="closeDropdowns"
      class="dropdown-backdrop"
    ></div>
  </div>
</template>

<style scoped lang="scss">
.location-dropdowns {
  position: relative;
  
  .form-group {
    margin-bottom: var(--spacing-md);
    
    label {
      display: block;
      color: var(--color-text-dark);
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }
  }
}

.search-dropdown {
  position: relative;
  
  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.search-input-wrapper {
  position: relative;
  
  input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    transition: border-color 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    
    &:disabled {
      background-color: var(--color-background-alt);
      cursor: not-allowed;
    }
  }
  
  .clear-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-light);
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      color: var(--color-text-dark);
    }
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-top: none;
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  
  &:hover:not(.disabled) {
    background-color: var(--color-background-alt);
  }
  
  &.selected {
    background-color: var(--color-accent);
    color: white;
  }
  
  &.disabled {
    color: var(--color-text-light);
    cursor: not-allowed;
    font-style: italic;
  }
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
  color: var(--color-text-light);
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Custom scrollbar for dropdown */
.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: var(--color-background-alt);
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: var(--color-text-lighter);
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-light);
}

@media (max-width: 768px) {
  .dropdown-menu {
    max-height: 150px;
  }
  
  .dropdown-item {
    padding: 10px 12px;
    font-size: 0.9rem;
  }
}
</style>