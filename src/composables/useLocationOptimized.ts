import { ref, computed } from 'vue'
import { locationCache } from '../utils/locationCache'

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

export function useLocationOptimized() {
  const countries = ref<Country[]>([])
  const states = ref<State[]>([])
  const cities = ref<City[]>([])
  
  const isLoadingCountries = ref(false)
  const isLoadingStates = ref(false)
  const isLoadingCities = ref(false)
  
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
  
  const loadCities = async (stateId: number, countryId?: number) => {
    isLoadingCities.value = true
    try {
      cities.value = await locationCache.getCities(stateId, countryId)
    } finally {
      isLoadingCities.value = false
    }
  }
  
  const getFilteredCountries = (searchQuery: string) => {
    if (!searchQuery) {
      // Show popular countries first
      const popularCountries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Japan']
      const popular = countries.value.filter(c => popularCountries.includes(c.name))
      const others = countries.value.filter(c => !popularCountries.includes(c.name)).slice(0, 30)
      return [...popular, ...others]
    }
    
    const query = searchQuery.toLowerCase()
    return countries.value
      .filter(country => 
        country.name.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query)
      )
      .slice(0, 15)
  }
  
  const getFilteredStates = (searchQuery: string) => {
    if (!searchQuery) return states.value.slice(0, 30)
    
    const query = searchQuery.toLowerCase()
    return states.value
      .filter(state => 
        state.name.toLowerCase().includes(query) ||
        state.state_code.toLowerCase().includes(query)
      )
      .slice(0, 15)
  }
  
  const getFilteredCities = (searchQuery: string) => {
    if (!searchQuery) {
      // For large datasets, show major cities first
      if (cities.value.length > 100) {
        return cities.value
          .sort((a, b) => {
            // Prioritize cities with shorter names (often major cities)
            if (a.name.length !== b.name.length) {
              return a.name.length - b.name.length
            }
            return a.name.localeCompare(b.name)
          })
          .slice(0, 25)
      }
      return cities.value.slice(0, 25)
    }
    
    const query = searchQuery.toLowerCase()
    return cities.value
      .filter(city => city.name.toLowerCase().includes(query))
      .slice(0, 15)
  }
  
  return {
    countries,
    states,
    cities,
    isLoadingCountries,
    isLoadingStates,
    isLoadingCities,
    loadCountries,
    loadStates,
    loadCities,
    getFilteredCountries,
    getFilteredStates,
    getFilteredCities
  }
}