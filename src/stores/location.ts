import { defineStore } from 'pinia'
import { ref } from 'vue'
import { locale } from '../lib/appwrite'
import { encryptedStorageAdapter } from '../lib/encryption'

export interface Country {
  code: string
  name: string
  flag: string
  countryCode?: string
}

export const useLocationStore = defineStore('location', () => {
  const currentLocation = ref<Country | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const locationConfirmed = ref(false)

  // Countries with their flags and codes
  const availableCountries: Country[] = [
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
    { code: 'EU', name: 'Europe', flag: '🇪🇺' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲' }
  ]

  // Get user's current location from Appwrite locale
  const getUserLocation = async (force = false) => {
    // Don't auto-detect location if already confirmed and not forced
    if (locationConfirmed.value && !force) {

      console.log('locationConfirmed.value', locationConfirmed.value)
      console.log('force', force)
      console.log('currentLocation.value', currentLocation.value)
      return currentLocation.value
    }

    try {
      isLoading.value = true
      error.value = null
      
      const result = await locale.get()
      const countryCode = result.countryCode
      
      // Find the country in our available countries
      const country = availableCountries.find(c => c.code === countryCode)
      
      if (country) {
        if(result.eu){
          currentLocation.value = availableCountries[3]
        }else{
          currentLocation.value = country
        }
      } else {
        currentLocation.value = availableCountries[0]
      }
      currentLocation.value.countryCode = countryCode
      
      return currentLocation.value
    } catch (err: any) {
      error.value = err.message || 'Failed to get user location'
      // Default to Cameroon on error
      currentLocation.value = availableCountries[0]
      return currentLocation.value
    } finally {
      isLoading.value = false
    }
  }

  // Get current location without auto-detection
  const getCurrentLocation = () => {
    return currentLocation.value
  }

  // Update user location
  const updateLocation = async (countryCode: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      const country = availableCountries.find(c => c.code === countryCode)
      if (!country) {
        throw new Error('Invalid country code')
      }
      
      currentLocation.value = country
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update location'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Set location confirmed status
  const setLocationConfirmed = (confirmed: boolean) => {
    locationConfirmed.value = confirmed
  }

  // Initialize location
  const init = async () => {
    // Always initialize location if not set
    if (!currentLocation.value) {
      await getUserLocation()
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    currentLocation,
    availableCountries,
    isLoading,
    error,
    locationConfirmed,
    getUserLocation,
    updateLocation,
    setLocationConfirmed,
    init,
    clearError,
    getCurrentLocation
  }
}, {
  persist: {
    key: 'location-store',
    storage: encryptedStorageAdapter
  }
}) 