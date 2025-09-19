<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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

// Load data lazily using cache manager
const countries = ref<Country[]>([])
const states = ref<State[]>([])
const cities = ref<City[]>([])

// Loading states
const isLoadingCountries = ref(false)
const isLoadingStates = ref(false)
const isLoadingCities = ref(false)

// Load countries immediately (small dataset)
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

// Load states only when country is selected
const loadStates = async (countryId: number) => {
  isLoadingStates.value = true
  try {
    states.value = await locationCache.getStates(countryId)
  } finally {
    isLoadingStates.value = false
  }
}

// Load cities only when needed
const loadCitiesForState = async (stateId: number) => {
  isLoadingCities.value = true
  try {
    cities.value = await locationCache.getCities(stateId)
  } finally {
    isLoadingCities.value = false
  }
}

const loadCitiesForCountry = async (countryId: number) => {
  isLoadingCities.value = true
  try {
    cities.value = await locationCache.getCities(0, countryId)
  } finally {
    isLoadingCities.value = false
  }
}

// Filtered options based on search with better performance
const filteredCountries = computed(() => {
  if (!countrySearch.value) {
    // Show top popular countries first, then alphabetical
    const popularCountries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Japan', 'Brazil', 'Mexico', 'India', 'China', 'Japan', 'South Korea']
    const popular = countries.value.filter(c => popularCountries.includes(c.name))
    const others = countries.value
      .filter(c => !popularCountries.includes(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20)
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
      // Prioritize matches that start with the query
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
  
  const countryStates = states.value.filter(state => 
    state.country_id === selectedCountry.value!.id
  )
  
  if (!stateSearch.value) {
    return countryStates
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50)
  }
  
  const query = stateSearch.value.toLowerCase()
  return countryStates
    .filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.state_code.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      // Prioritize matches that start with the query
      const aStartsWith = a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name.toLowerCase().startsWith(query)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 25)
})

const filteredCities = computed(() => {
  console.log('LocationDropdowns: Computing filteredCities', {
    selectedState: selectedState.value?.name,
    selectedCountry: selectedCountry.value?.name,
    citiesLoaded: cities.value.length,
    citySearch: citySearch.value
  })
  
  if (!selectedState.value && !selectedCountry.value) {
    console.log('LocationDropdowns: No state or country selected')
    return []
  }
  if (cities.value.length === 0) {
    console.log('LocationDropdowns: No cities loaded yet')
    return []
  }
  
  let relevantCities: City[]
  
  if (selectedState.value) {
    relevantCities = cities.value.filter(city => 
      city.state_id === selectedState.value!.id
    )
    console.log('LocationDropdowns: Found', relevantCities.length, 'cities for state', selectedState.value.name)
  } else {
    relevantCities = cities.value.filter(city => 
      city.country_id === selectedCountry.value!.id
    )
    console.log('LocationDropdowns: Found', relevantCities.length, 'cities for country', selectedCountry.value!.name)
  }
  
  if (!citySearch.value) {
    // Sort alphabetically and show reasonable number
    const result = relevantCities
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50)
    console.log('LocationDropdowns: Returning', result.length, 'cities (no search)')
    return result
  }
  
  const query = citySearch.value.toLowerCase()
  const result = relevantCities
    .filter(city => 
      city.name.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      // Prioritize matches that start with the query
      const aStartsWith = a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name.toLowerCase().startsWith(query)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 30)
  console.log('LocationDropdowns: Returning', result.length, 'cities (with search)')
  return result
})

// Function to initialize from props
const initializeFromProps = async () => {
  console.log('LocationDropdowns: Initializing from props:', props.modelValue)
  
  await loadCountries()
  
  // Step 1: Set country
  if (props.modelValue.country) {
    const country = countries.value.find(c => 
      c.name === props.modelValue.country || c.iso2 === props.modelValue.country
    )
    if (country) {
      selectedCountry.value = country
      countrySearch.value = country.name
      console.log('LocationDropdowns: Set country:', country.name)
      
      // Load states for selected country
      await loadStates(country.id)
      console.log('LocationDropdowns: Loaded', states.value.length, 'states for country')
    }
  }
  
  // Step 2: Set state
  if (props.modelValue.state && selectedCountry.value) {
    const state = states.value.find(s => 
      s.name === props.modelValue.state && s.country_id === selectedCountry.value!.id
    )
    if (state) {
      selectedState.value = state
      stateSearch.value = state.name
      console.log('LocationDropdowns: Set state:', state.name)
    }
  }
  
  // Step 3: Set city (with improved logic)
  if (props.modelValue.city) {
    console.log('LocationDropdowns: Looking for city:', props.modelValue.city)
    
    // If we have a selected state, load cities for that state
    if (selectedState.value) {
      console.log('LocationDropdowns: Loading cities for state:', selectedState.value.name)
      await loadCitiesForState(selectedState.value.id)
      console.log('LocationDropdowns: Loaded', cities.value.length, 'cities for state')
      
      // Try multiple matching strategies
      let city = cities.value.find(c => 
        c.name === props.modelValue.city && c.state_id === selectedState.value!.id
      )
      
      // If exact match fails, try case-insensitive match
      if (!city) {
        city = cities.value.find(c => 
          c.name.toLowerCase() === props.modelValue.city!.toLowerCase() && c.state_id === selectedState.value!.id
        )
      }
      
      // If still no match, try common variations (prioritize exact + suffix matches)
      if (!city && props.modelValue.city) {
        const searchCity = props.modelValue.city.toLowerCase()
        const stateCities = cities.value.filter(c => c.state_id === selectedState.value!.id)
        
        // First, try common suffixes
        city = stateCities.find(c => {
          const cityName = c.name.toLowerCase()
          return (
            cityName === searchCity + ' city' ||
            cityName === searchCity + ' township' ||
            cityName === searchCity + ' borough'
          )
        })
        
        // If still no match, try partial matches but prioritize those that start with search term
        if (!city) {
          const matches = stateCities.filter(c => {
            const cityName = c.name.toLowerCase()
            return cityName.includes(searchCity) || searchCity.includes(cityName)
          })
          
          // Prioritize cities that start with the search term
          city = matches.find(c => c.name.toLowerCase().startsWith(searchCity)) || matches[0]
        }
      }
      
      if (city) {
        console.log('LocationDropdowns: Found and set city:', city.name)
        selectedCity.value = city
        citySearch.value = city.name
      } else {
        console.log('LocationDropdowns: City not found in state!')
        console.log('  Looking for city:', props.modelValue.city)
        console.log('  In state:', selectedState.value!.name, '(ID:', selectedState.value!.id, ')')
        console.log('  Available cities:', cities.value.slice(0, 10).map(c => ({ name: c.name, state_id: c.state_id })))
      }
    } else if (selectedCountry.value) {
      // Load cities for the entire country
      console.log('LocationDropdowns: Loading cities for country:', selectedCountry.value.name)
      await loadCitiesForCountry(selectedCountry.value.id)
      console.log('LocationDropdowns: Loaded', cities.value.length, 'cities for country')
      
      // Try multiple matching strategies
      let city = cities.value.find(c => 
        c.name === props.modelValue.city && c.country_id === selectedCountry.value!.id
      )
      
      // If exact match fails, try case-insensitive match
      if (!city) {
        city = cities.value.find(c => 
          c.name.toLowerCase() === props.modelValue.city!.toLowerCase() && c.country_id === selectedCountry.value!.id
        )
      }
      
      // If still no match, try common variations (prioritize exact + suffix matches)
      if (!city && props.modelValue.city) {
        const searchCity = props.modelValue.city.toLowerCase()
        const countryCities = cities.value.filter(c => c.country_id === selectedCountry.value!.id)
        
        // First, try common suffixes
        city = countryCities.find(c => {
          const cityName = c.name.toLowerCase()
          return (
            cityName === searchCity + ' city' ||
            cityName === searchCity + ' township' ||
            cityName === searchCity + ' borough'
          )
        })
        
        // If still no match, try partial matches but prioritize those that start with search term
        if (!city) {
          const matches = countryCities.filter(c => {
            const cityName = c.name.toLowerCase()
            return cityName.includes(searchCity) || searchCity.includes(cityName)
          })
          
          // Prioritize cities that start with the search term
          city = matches.find(c => c.name.toLowerCase().startsWith(searchCity)) || matches[0]
        }
      }
      
      if (city) {
        console.log('LocationDropdowns: Found and set city:', city.name)
        selectedCity.value = city
        citySearch.value = city.name
      } else {
        console.log('LocationDropdowns: City not found in country!')
        console.log('  Looking for city:', props.modelValue.city)
        console.log('  In country:', selectedCountry.value!.name, '(ID:', selectedCountry.value!.id, ')')
        console.log('  Available cities:', cities.value.slice(0, 10).map(c => ({ name: c.name, country_id: c.country_id })))
      }
    }
  }
}

// Initialize from props on mount
onMounted(async () => {
  console.log('LocationDropdowns: Component mounted with props:', props.modelValue)
  await loadCountries()
  
  // Small delay to ensure parent component has finished setting up
  await new Promise(resolve => setTimeout(resolve, 100))
  await initializeFromProps()
})

// Watch for changes to modelValue prop
watch(() => props.modelValue, async (newValue, oldValue) => {
  console.log('LocationDropdowns: Props changed', { newValue, oldValue })
  
  // Only re-initialize if the values actually changed
  const countryChanged = newValue.country !== selectedCountry.value?.name
  const stateChanged = newValue.state !== selectedState.value?.name
  const cityChanged = newValue.city !== selectedCity.value?.name
  
  if (countryChanged || stateChanged || cityChanged) {
    console.log('LocationDropdowns: Re-initializing due to prop changes')
    await initializeFromProps()
  }
}, { deep: true, immediate: false })

// Watchers for cascading updates
watch(selectedCountry, async (newCountry, oldCountry) => {
  if (newCountry) {
    countrySearch.value = newCountry.name
    // Load states when country is selected
    await loadStates(newCountry.id)
    
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

watch(selectedState, async (newState, oldState) => {
  if (newState) {
    stateSearch.value = newState.name
    // Load cities for this specific state
    await loadCitiesForState(newState.id)
    
    // Only reset city when state actually changes (not during initialization)
    if (oldState && newState.id !== oldState.id) {
      selectedCity.value = null
      citySearch.value = ''
    }
    updateModelValue()
  }
})

watch(selectedCity, (newCity, oldCity) => {
  console.log('LocationDropdowns: selectedCity watcher triggered:', {
    old: oldCity?.name,
    new: newCity?.name
  })
  if (newCity) {
    citySearch.value = newCity.name
    updateModelValue()
  }
}, { immediate: false, deep: true })

// Update model value
const updateModelValue = () => {
  const newValue = {
    country: selectedCountry.value?.name || '',
    state: selectedState.value?.name || '',
    city: selectedCity.value?.name || ''
  }
  console.log('LocationDropdowns: updateModelValue emitting:', newValue)
  emit('update:modelValue', newValue)
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
  console.log('LocationDropdowns: selectCity called with:', city)
  console.log('LocationDropdowns: Current selectedCity before:', selectedCity.value)
  
  // Try forcing Vue to recognize the change
  selectedCity.value = null
  nextTick(() => {
    selectedCity.value = city
    citySearch.value = city.name
    console.log('LocationDropdowns: selectedCity after nextTick:', selectedCity.value)
    
    // Manually trigger the update
    updateModelValue()
    
    // Delay closing dropdown
    setTimeout(() => {
      showCityDropdown.value = false
    }, 100)
  })
}

// Focus handlers
const handleCountryFocus = () => {
  if (!props.disabled) {
    showCountryDropdown.value = true
  }
}

const handleStateFocus = async () => {
  if (!props.disabled && selectedCountry.value) {
    await loadStates(selectedCountry.value.id)
    showStateDropdown.value = true
  }
}

const handleCityFocus = async () => {
  console.log('LocationDropdowns: handleCityFocus called', {
    disabled: props.disabled,
    selectedState: selectedState.value?.name,
    selectedCountry: selectedCountry.value?.name
  })
  
  if (!props.disabled && (selectedState.value || selectedCountry.value)) {
    if (selectedState.value) {
      console.log('LocationDropdowns: Loading cities for state focus')
      await loadCitiesForState(selectedState.value.id)
    } else if (selectedCountry.value) {
      console.log('LocationDropdowns: Loading cities for country focus')
      await loadCitiesForCountry(selectedCountry.value.id)
    }
    showCityDropdown.value = true
    console.log('LocationDropdowns: Set showCityDropdown to true')
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
  console.log('LocationDropdowns: closeDropdowns called')
  showCountryDropdown.value = false
  showStateDropdown.value = false
  showCityDropdown.value = false
}
</script>

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
            <span class="loading-spinner"></span>
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
              <span class="country-emoji">{{ country.emoji || '🌍' }}</span>
              <span class="country-name">{{ country.name }}</span>
            </div>
            
            <div v-if="filteredCountries.length === 0" class="dropdown-item disabled">
              No countries found for "{{ countrySearch }}"
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
            <span class="loading-spinner"></span>
            Loading states/provinces...
          </div>
          <template v-else>
            <div
              v-for="state in filteredStates"
              :key="state.id"
              @click="selectState(state)"
              class="dropdown-item"
              :class="{ selected: selectedState?.id === state.id }"
            >
              <span class="state-name">{{ state.name }}</span>
              <span class="state-code">({{ state.state_code }})</span>
            </div>
            
            <div v-if="filteredStates.length === 0" class="dropdown-item disabled">
              No states/provinces found{{ stateSearch ? ` for "${stateSearch}"` : '' }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- City Selection -->
    <div class="form-group">
      <label>City {{ required ? '*' : '' }}</label>
      <!-- Debug info -->
      <div v-if="!selectedState && !selectedCountry" class="debug-info" style="font-size: 0.8rem; color: orange; margin-bottom: 4px;">
        Please select a country and state first
      </div>
      <div v-else-if="!selectedState" class="debug-info" style="font-size: 0.8rem; color: blue; margin-bottom: 4px;">
        State: None | Country: {{ selectedCountry?.name }}
      </div>
      <div v-else class="debug-info" style="font-size: 0.8rem; color: green; margin-bottom: 4px;">
        State: {{ selectedState?.name }} | Country: {{ selectedCountry?.name }} | Cities: {{ cities.length }}
      </div>
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
        
        <div v-if="showCityDropdown && !disabled && (selectedState || selectedCountry)" class="dropdown-menu" @click.stop>
          <div v-if="isLoadingCities" class="dropdown-item disabled">
            <span class="loading-spinner"></span>
            Loading cities...
          </div>
          <template v-else>
            <div
              v-for="city in filteredCities"
              :key="city.id"
              @click.stop="selectCity(city)"
              @mousedown.prevent="() => console.log('LocationDropdowns: mousedown on city:', city.name)"
              @mouseup="() => console.log('LocationDropdowns: mouseup on city:', city.name)"
              class="dropdown-item"
              :class="{ selected: selectedCity?.id === city.id }"
              style="cursor: pointer;"
            >
              <span class="city-name" style="pointer-events: none;">{{ city.name }}</span>
              <span v-if="!selectedState" class="city-state" style="pointer-events: none;">{{ city.state_name }}</span>
            </div>
            
            <div v-if="filteredCities.length === 0 && citySearch" class="dropdown-item disabled">
              No cities found for "{{ citySearch }}"
            </div>
            <div v-if="filteredCities.length === 0 && !citySearch" class="dropdown-item disabled">
              {{ selectedState ? 'Start typing to search cities...' : 'Select a state first for better results' }}
            </div>
          </template>
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
  z-index: 1001;
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

.state-name {
  flex: 1;
}

.state-code {
  font-size: 0.85rem;
  color: var(--color-text-light);
  font-weight: 500;
}

.city-name {
  flex: 1;
}

.city-state {
  font-size: 0.9rem;
  color: var(--color-text-light);
}

.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid var(--color-text-light);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: var(--spacing-xs);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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