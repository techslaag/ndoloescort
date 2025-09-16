interface LocationCache {
  countries: any[]
  states: { [countryId: number]: any[] }
  cities: { [stateId: number]: any[] }
  lastUpdated: number
}

class LocationCacheManager {
  private cache: LocationCache = {
    countries: [],
    states: {},
    cities: {},
    lastUpdated: 0
  }
  
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
  
  async getCountries(): Promise<any[]> {
    if (this.cache.countries.length === 0 || this.isCacheExpired()) {
      const { default: countriesData } = await import('../assets/countries.json')
      this.cache.countries = countriesData
      this.cache.lastUpdated = Date.now()
    }
    return this.cache.countries
  }
  
  async getStates(countryId: number): Promise<any[]> {
    if (!this.cache.states[countryId]) {
      const { default: statesData } = await import('../assets/states.json')
      // Filter and cache states for this country
      this.cache.states[countryId] = statesData.filter((state: any) => 
        state.country_id === countryId
      )
    }
    return this.cache.states[countryId]
  }
  
  async getCities(stateId: number, countryId?: number): Promise<any[]> {
    const cacheKey = stateId
    
    if (!this.cache.cities[cacheKey]) {
      // Load cities on demand to avoid memory issues
      const { default: citiesData } = await import('../assets/cities.json')
      
      if (stateId) {
        this.cache.cities[cacheKey] = citiesData.filter((city: any) => 
          city.state_id === stateId
        )
      } else if (countryId) {
        this.cache.cities[cacheKey] = citiesData.filter((city: any) => 
          city.country_id === countryId
        )
      }
    }
    return this.cache.cities[cacheKey] || []
  }
  
  private isCacheExpired(): boolean {
    return Date.now() - this.cache.lastUpdated > this.CACHE_DURATION
  }
  
  clearCache(): void {
    this.cache = {
      countries: [],
      states: {},
      cities: {},
      lastUpdated: 0
    }
  }
}

export const locationCache = new LocationCacheManager()