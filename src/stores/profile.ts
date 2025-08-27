import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { profileService } from '../services/profileService'
import { advertisingService } from '../services/advertisingService'
import type { EscortProfile, Service, PricingOption } from '../types/profile'
import type { AdvertisingPurchase } from '../types/advertising'

export const useProfileStore = defineStore('profile', () => {
  // State
  const profiles = ref<EscortProfile[]>([])
  const currentProfile = ref<EscortProfile | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref<{ [key: string]: number }>({})
  const profileAdvertising = ref<{ [profileId: string]: AdvertisingPurchase[] }>({})
  
  // Computed
  const activeProfiles = computed(() => 
    profiles.value.filter(p => p.status === 'active')
  )
  
  const draftProfiles = computed(() => 
    profiles.value.filter(p => p.status === 'draft')
  )
  
  const profileStats = computed(() => {
    if (!profiles.value.length) return null
    
    return {
      total: profiles.value.length,
      active: activeProfiles.value.length,
      draft: draftProfiles.value.length,
      totalViews: profiles.value.reduce((sum, p) => sum + p.stats.views, 0),
      totalBookings: profiles.value.reduce((sum, p) => sum + p.stats.bookings, 0),
      averageRating: profiles.value.reduce((sum, p) => sum + p.stats.rating, 0) / profiles.value.length
    }
  })

  const boostedProfiles = computed(() => {
    return profiles.value.filter(profile => {
      const profileId = profile.$id || profile.id
      const ads = profileAdvertising.value[profileId] || []
      return ads.some(ad => {
        const now = new Date()
        const endDate = new Date(ad.endDate)
        return ad.status === 'active' && endDate > now
      })
    })
  })

  const getProfileAdvertising = (profileId: string) => {
    return profileAdvertising.value[profileId] || []
  }

  const getActiveAdvertising = (profileId: string) => {
    const ads = profileAdvertising.value[profileId] || []
    const now = new Date()
    return ads.filter(ad => {
      const endDate = new Date(ad.endDate)
      return ad.status === 'active' && endDate > now
    })
  }

  const isProfileBoosted = (profileId: string) => {
    const activeAds = getActiveAdvertising(profileId)
    return activeAds.length > 0
  }

  const getProfileBoostType = (profileId: string) => {
    const activeAds = getActiveAdvertising(profileId)
    if (activeAds.length === 0) return null
    
    const exclusiveAd = activeAds.find(ad => ad.planType === 'exclusive')
    if (exclusiveAd) return 'exclusive'
    
    const premiumAd = activeAds.find(ad => ad.planType === 'premium')
    if (premiumAd) return 'premium'
    
    return null
  }

  // Actions
  const setError = (message: string | null) => {
    error.value = message
  }

  const clearError = () => {
    error.value = null
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // Profile CRUD operations
  const fetchUserProfiles = async (userId: string) => {
    try {
      setLoading(true)
      clearError()
      profiles.value = await profileService.getUserProfiles(userId)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profiles')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (profileId: string) => {
    try {
      setLoading(true)
      clearError()
      currentProfile.value = await profileService.getProfile(profileId)
      return currentProfile.value
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async (userId: string, profileData: Partial<EscortProfile>) => {
    try {
      setLoading(true)
      clearError()
      const newProfile = await profileService.createProfile(userId, profileData)
      profiles.value.push(newProfile)
      return newProfile
    } catch (err: any) {
      setError(err.message || 'Failed to create profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (profileId: string, updates: Partial<EscortProfile>) => {
    try {
      setLoading(true)
      clearError()
      const updatedProfile = await profileService.updateProfile(profileId, updates)
      
      // Update in profiles array
      const index = profiles.value.findIndex(p => p.id === profileId)
      if (index !== -1) {
        profiles.value[index] = updatedProfile
      }
      
      // Update current profile if it's the same
      if (currentProfile.value?.id === profileId) {
        currentProfile.value = updatedProfile
      }
      
      return updatedProfile
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteProfile = async (profileId: string) => {
    try {
      setLoading(true)
      clearError()
      
      // Set a deletion progress message
      setError('Deleting profile and related data...')
      
      // Delete from database using profileService (handles all related documents)
      await profileService.deleteProfile(profileId)
      
      // Clear the progress message
      clearError()
      
      // Remove from local state - check both id and $id
      profiles.value = profiles.value.filter(p => {
        const pId = (p as any).$id || (p as any).id
        return pId !== profileId
      })
      
      // Clear current profile if it's the one being deleted
      if (currentProfile.value) {
        const currentId = (currentProfile.value as any).$id || (currentProfile.value as any).id
        if (currentId === profileId) {
          currentProfile.value = null
        }
      }
      
      return { success: true, message: 'Profile and all related data deleted successfully' }
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Service management
  const addService = async (profileId: string, service: Omit<Service, 'id'>) => {
    try {
      clearError()
      const newService = await profileService.addService(profileId, service)
      
      // Update profile in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.services.push(newService)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.services.push(newService)
      }
      
      return newService
    } catch (err: any) {
      setError(err.message || 'Failed to add service')
      throw err
    }
  }

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    try {
      clearError()
      const updatedService = await profileService.updateService(serviceId, updates)
      
      // Update in all relevant profiles
      profiles.value.forEach(profile => {
        const serviceIndex = profile.services.findIndex(s => s.id === serviceId)
        if (serviceIndex !== -1) {
          profile.services[serviceIndex] = updatedService
        }
      })
      
      if (currentProfile.value) {
        const serviceIndex = currentProfile.value.services.findIndex(s => s.id === serviceId)
        if (serviceIndex !== -1) {
          currentProfile.value.services[serviceIndex] = updatedService
        }
      }
      
      return updatedService
    } catch (err: any) {
      setError(err.message || 'Failed to update service')
      throw err
    }
  }

  const removeService = async (serviceId: string, profileId: string) => {
    try {
      clearError()
      await profileService.deleteService(serviceId)
      
      // Remove from profile in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.services = profile.services.filter(s => s.id !== serviceId)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.services = currentProfile.value.services.filter(s => s.id !== serviceId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove service')
      throw err
    }
  }

  // Pricing management
  const addPricing = async (profileId: string, pricing: Omit<PricingOption, 'id'>) => {
    try {
      clearError()
      const newPricing = await profileService.addPricing(profileId, pricing)
      
      // Update profile in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.pricing.push(newPricing)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.pricing.push(newPricing)
      }
      
      return newPricing
    } catch (err: any) {
      setError(err.message || 'Failed to add pricing')
      throw err
    }
  }

  const updatePricing = async (pricingId: string, updates: Partial<PricingOption>) => {
    try {
      clearError()
      const updatedPricing = await profileService.updatePricing(pricingId, updates)
      
      // Update in all relevant profiles
      profiles.value.forEach(profile => {
        const pricingIndex = profile.pricing.findIndex(p => p.id === pricingId)
        if (pricingIndex !== -1) {
          profile.pricing[pricingIndex] = updatedPricing
        }
      })
      
      if (currentProfile.value) {
        const pricingIndex = currentProfile.value.pricing.findIndex(p => p.id === pricingId)
        if (pricingIndex !== -1) {
          currentProfile.value.pricing[pricingIndex] = updatedPricing
        }
      }
      
      return updatedPricing
    } catch (err: any) {
      setError(err.message || 'Failed to update pricing')
      throw err
    }
  }

  // Service and pricing management
  const createService = async (profileId: string, serviceData: any) => {
    try {
      setLoading(true)
      clearError()
      return await profileService.createService(profileId, serviceData)
    } catch (err: any) {
      setError(err.message || 'Failed to create service')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createPricing = async (profileId: string, pricingData: any) => {
    try {
      setLoading(true)
      clearError()
      return await profileService.createPricing(profileId, pricingData)
    } catch (err: any) {
      setError(err.message || 'Failed to create pricing')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Media management
  const uploadMedia = async (profileId: string, file: File, options: { blur?: boolean, caption?: string } = {}) => {
    try {
      clearError()
      const fileId = `${Date.now()}-${file.name}`
      uploadProgress.value[fileId] = 0
      
      // Simulate progress (in real implementation, this would come from the upload service)
      const progressInterval = setInterval(() => {
        uploadProgress.value[fileId] += 10
        if (uploadProgress.value[fileId] >= 100) {
          clearInterval(progressInterval)
        }
      }, 200)
      
      const newMedia = await profileService.uploadMedia(profileId, file, options)
      
      // Update profile in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.media.push(newMedia)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.media.push(newMedia)
      }
      
      delete uploadProgress.value[fileId]
      return newMedia
    } catch (err: any) {
      setError(err.message || 'Failed to upload media')
      throw err
    }
  }

  const removeMedia = async (mediaId: string, profileId: string) => {
    try {
      clearError()
      await profileService.deleteMedia(mediaId)
      
      // Remove from profile in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.media = profile.media.filter(m => m.id !== mediaId)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.media = currentProfile.value.media.filter(m => m.id !== mediaId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove media')
      throw err
    }
  }

  // Availability management
  const updateAvailability = async (profileId: string, date: string, slots: Array<{ start: string, end: string, available: boolean }>) => {
    try {
      clearError()
      const events = await profileService.updateAvailability(profileId, date, slots)
      
      // Update profile availability in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        // Remove existing events for this date
        profile.availability.schedule = profile.availability.schedule.filter(e => e.date !== date)
        // Add new events
        profile.availability.schedule.push(...events)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.availability.schedule = currentProfile.value.availability.schedule.filter(e => e.date !== date)
        currentProfile.value.availability.schedule.push(...events)
      }
      
      return events
    } catch (err: any) {
      setError(err.message || 'Failed to update availability')
      throw err
    }
  }

  const getAvailability = async (profileId: string, startDate: string, endDate: string) => {
    try {
      clearError()
      return await profileService.getAvailability(profileId, startDate, endDate)
    } catch (err: any) {
      setError(err.message || 'Failed to get availability')
      throw err
    }
  }

  const syncBookingWithCalendar = async (profileId: string, bookingId: string, date: string, startTime: string, endTime: string) => {
    try {
      clearError()
      const event = await profileService.syncBookingWithCalendar(profileId, bookingId, date, startTime, endTime)
      
      // Update profile availability in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.availability.schedule.push(event)
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.availability.schedule.push(event)
      }
      
      return event
    } catch (err: any) {
      setError(err.message || 'Failed to sync booking with calendar')
      throw err
    }
  }

  // Analytics
  const incrementProfileView = async (profileId: string) => {
    try {
      await profileService.incrementProfileView(profileId)
      
      // Update stats in state
      const profile = profiles.value.find(p => p.id === profileId)
      if (profile) {
        profile.stats.views++
      }
      
      if (currentProfile.value?.id === profileId) {
        currentProfile.value.stats.views++
      }
    } catch (err: any) {
      console.error('Failed to increment profile view:', err)
      // Don't throw error for analytics
    }
  }

  // Submit verification documents
  const submitVerification = async (profileId: string, formData: FormData) => {
    try {
      setLoading(true)
      clearError()
      
      // In a real implementation, this would upload to a secure verification service
      // For now, we'll simulate the upload
      const uploadPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true })
        }, 2000)
      })
      
      await uploadPromise
      
      // The actual verification status update is handled by updateProfile
      // after the documents are uploaded
      
      return { success: true }
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Reset store
  const reset = () => {
    profiles.value = []
    currentProfile.value = null
    isLoading.value = false
    error.value = null
    uploadProgress.value = {}
  }

  return {
    // State
    profiles,
    currentProfile,
    isLoading,
    error,
    uploadProgress,
    
    // Computed
    activeProfiles,
    draftProfiles,
    profileStats,
    
    // Actions
    setError,
    clearError,
    setLoading,
    fetchUserProfiles,
    fetchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    createService,
    createPricing,
    addService,
    updateService,
    removeService,
    addPricing,
    updatePricing,
    uploadMedia,
    removeMedia,
    updateAvailability,
    getAvailability,
    syncBookingWithCalendar,
    incrementProfileView,
    submitVerification,
    reset,
    // Advertising methods
    loadProfileAdvertising,
    refreshAdvertisingData,
    // Computed getters
    boostedProfiles,
    getProfileAdvertising,
    getActiveAdvertising,
    isProfileBoosted,
    getProfileBoostType
  }

  // Advertising methods
  async function loadProfileAdvertising(profileId: string) {
    try {
      const ads = await advertisingService.getProfileAdvertising(profileId)
      profileAdvertising.value[profileId] = ads
    } catch (err: any) {
      console.error('Failed to load profile advertising:', err)
      setError(err.message || 'Failed to load advertising data')
    }
  }

  async function refreshAdvertisingData() {
    try {
      for (const profile of profiles.value) {
        const profileId = profile.$id || profile.id
        await loadProfileAdvertising(profileId)
      }
    } catch (err: any) {
      console.error('Failed to refresh advertising data:', err)
    }
  }

  return {
    // State
    profiles,
    currentProfile,
    isLoading,
    error,
    uploadProgress,
    profileAdvertising,
    // Computed
    activeProfiles,
    draftProfiles,
    profileStats,
    boostedProfiles,
    // Methods
    setError,
    clearError,
    setLoading,
    fetchUserProfiles,
    fetchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    createService,
    createPricing,
    addService,
    updateService,
    removeService,
    addPricing,
    updatePricing,
    uploadMedia,
    removeMedia,
    updateAvailability,
    getAvailability,
    syncBookingWithCalendar,
    incrementProfileView,
    submitVerification,
    reset,
    // Advertising methods
    loadProfileAdvertising,
    refreshAdvertisingData,
    getProfileAdvertising,
    getActiveAdvertising,
    isProfileBoosted,
    getProfileBoostType
  }
}, {
  persist: {
    key: 'profile-store',
    pick: ['profiles', 'currentProfile', 'profileAdvertising']
  }
})