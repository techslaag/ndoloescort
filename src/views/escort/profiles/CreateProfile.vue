<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useProfileStore } from '../../../stores/profile'
import { useSubscriptionStore } from '../../../stores/subscription'
import { useToast } from '../../../composables/useToast'
import { getCurrencySymbol } from '../../../utils/currency'
import ErrorAlert from '../../../components/ErrorAlert.vue'
import LocationDropdowns from '../../../components/forms/LocationDropdownsOptimized.vue'
import ProfileActivationModal from '../../../components/profile/ProfileActivationModal.vue'
import { availableServices } from '../../../constants/services'
import { validateProfileCompletion } from '../../../utils/profileValidation'
import { profileService } from '../../../services/profileService'
import type { ProfileFormData } from '../../../types/profile'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const subscriptionStore = useSubscriptionStore()
const { success, error: showError } = useToast()

// Determine if we're in edit mode
const profileId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!profileId.value)
const profile = ref<any>(null)

const isLoading = ref(false)
const isSaving = ref(false)
const currentStep = ref(1)
const totalSteps = 5
const uploadedFiles = ref<Array<{ 
  file: File | null, 
  preview: string, 
  blur: boolean,
  id?: string,
  existing?: boolean,
  type?: 'photo' | 'video'
}>>([])
const selectedServices = ref<string[]>([])
const serviceDescriptions = ref<Record<string, string>>({})
const fileInput = ref<HTMLInputElement | null>(null)
const draftProfileId = ref<string | null>(null)
const showActivationModal = ref(false)
const initialDataLoaded = ref(false)
const locationDropdownsKey = ref(0)

const steps = computed(() => [
  { 
    number: 1, 
    title: 'Basic Information', 
    description: 'Personal details and location',
    key: 'basic',
    required: true,
    isComplete: !!(form.name && form.age && form.location.city && form.location.country && form.description)
  },
  { 
    number: 2, 
    title: 'Services', 
    description: 'Services you offer',
    key: 'services',
    required: true,
    isComplete: selectedServices.value.length > 0
  },
  { 
    number: 3, 
    title: 'Pricing', 
    description: 'Set your rates',
    key: 'pricing',
    required: true,
    isComplete: form.pricing.some(p => p.amount && parseFloat(p.amount) > 0)
  },
  { 
    number: 4, 
    title: 'Availability', 
    description: 'Working hours and schedule',
    key: 'availability',
    required: true,
    isComplete: Object.values(form.workingHours).some(day => day.enabled)
  },
  { 
    number: 5, 
    title: 'Media & Files', 
    description: 'Upload photos, videos and documents',
    key: 'media',
    required: false,
    isComplete: uploadedFiles.value.length > 0
  }
])

// profileCompletion removed - not used, replaced by detailedCompletion

const detailedCompletion = computed(() => {
  const stepStatuses = []
  
  // Basic Information
  const basicComplete = {
    name: !!form.name && form.name.trim().length >= 2,
    age: !!form.age && parseInt(form.age) >= 18,
    location: !!(form.location.city && form.location.country),
    description: !!form.description && form.description.trim().length >= 50
  }
  const basicPercentage = (Object.values(basicComplete).filter(v => v).length / 4) * 100
  stepStatuses.push({ step: 'Basic Info', percentage: basicPercentage })
  
  // Services
  const servicesComplete = selectedServices.value.length > 0 && 
    selectedServices.value.every(s => serviceDescriptions.value[s] && serviceDescriptions.value[s].length >= 20)
  stepStatuses.push({ step: 'Services', percentage: servicesComplete ? 100 : 0 })
  
  // Pricing
  const pricingComplete = form.pricing.some(p => p.amount && parseFloat(p.amount) > 0)
  stepStatuses.push({ step: 'Pricing', percentage: pricingComplete ? 100 : 0 })
  
  // Availability
  const availabilityComplete = Object.values(form.workingHours).some(day => day.enabled)
  stepStatuses.push({ step: 'Availability', percentage: availabilityComplete ? 100 : 0 })
  
  // Media
  const mediaComplete = uploadedFiles.value.length > 0
  stepStatuses.push({ step: 'Media', percentage: mediaComplete ? 100 : 0 })
  
  const overallPercentage = Math.round(stepStatuses.reduce((acc, s) => acc + s.percentage, 0) / 5)
  
  return {
    steps: stepStatuses,
    overall: overallPercentage,
    canPublish: overallPercentage === 100
  }
})

const form = reactive<ProfileFormData>({
  name: '',
  age: '',
  location: {
    city: '',
    state: '',
    country: ''
  },
  locationCity: '',
  locationState: '',
  locationCountry: '',
  description: '',
  bio: '',
  services: [],
  pricing: [
    { type: 'hourly', amount: '', description: 'Standard hourly rate' },
    { type: 'daily', amount: '', description: 'Full day rate' },
    { type: 'event', amount: '', description: 'Event rate' }
  ],
  workingHours: {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '18:00' },
    sunday: { enabled: false, start: '09:00', end: '18:00' }
  },
  preferences: {
    autoApproveBookings: false,
    requireDeposit: true,
    depositPercentage: '30',
    cancellationPolicy: '24 hours notice required for cancellation',
    minimumNotice: '2'
  }
})


const pricingTypes = [
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'daily', label: 'Daily Rate' },
  { value: 'event', label: 'Event Rate' },
  { value: 'custom', label: 'Custom Package' }
]

const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const currencySymbol = computed(() => {
  return getCurrencySymbol()
})

const isEscort = computed(() => userRole.value === 'escort')

const profilesRemaining = computed(() => subscriptionStore.profilesRemaining)
const subscriptionPlan = computed(() => subscriptionStore.currentPlan)

// Load profile data when in edit mode
const loadProfile = async () => {
  if (!profileId.value) return
  
  try {
    isLoading.value = true
    const fetchedProfile = await profileStore.fetchProfile(profileId.value)
    profile.value = fetchedProfile || profileStore.profiles.find((p: any) => p.id === profileId.value)
    
    console.log('CreateProfile: Fetched profile data:', {
      profileId: profileId.value,
      fetchedProfile,
      foundInStore: profileStore.profiles.find((p: any) => p.id === profileId.value),
      allKeys: profile.value ? Object.keys(profile.value) : 'NO PROFILE'
    })
    
    if (!profile.value) {
      authStore.setError('Profile not found')
      router.push('/escort/profiles')
      return
    }
    
    // Set draftProfileId for updates
    draftProfileId.value = profileId.value
    
    // Populate form with existing data
    form.name = profile.value.name || ''
    form.age = profile.value.age?.toString() || ''
    
    // Set location data - handle both nested and flat structures
    const locationData = {
      city: profile.value.locationCity || profile.value.location?.city || '',
      state: profile.value.locationState || profile.value.location?.state || '',
      country: profile.value.locationCountry || profile.value.location?.country || ''
    }
    
    console.log('CreateProfile: Loading location data:', {
      profileData: {
        locationCity: profile.value.locationCity,
        locationState: profile.value.locationState, 
        locationCountry: profile.value.locationCountry,
        nestedLocation: profile.value.location,
        allLocationFields: Object.keys(profile.value).filter(key => key.toLowerCase().includes('location'))
      },
      extractedLocation: locationData
    })
    
    // Set both nested and flat structure immediately
    form.locationCity = locationData.city
    form.locationState = locationData.state
    form.locationCountry = locationData.country
    form.location = { ...locationData }
    
    console.log('CreateProfile: Set form location data:', form.location)
    
    form.description = profile.value.description || ''
    form.bio = profile.value.bio || ''
    
    // Parse working hours if stored as JSON string
    if (profile.value.workingHours) {
      if (typeof profile.value.workingHours === 'string') {
        form.workingHours = JSON.parse(profile.value.workingHours)
      } else {
        form.workingHours = profile.value.workingHours
      }
    }
    
    // Load preferences
    form.preferences = {
      autoApproveBookings: profile.value.preferencesAutoApproveBookings || false,
      requireDeposit: profile.value.preferencesRequireDeposit || false,
      depositPercentage: profile.value.preferencesDepositPercentage?.toString() || '30',
      cancellationPolicy: profile.value.preferencesCancellationPolicy || '24 hours notice required for cancellation',
      minimumNotice: profile.value.preferencesMinimumNotice?.toString() || '2'
    }
    
    // Load services
    if (profile.value.services && profile.value.services.length > 0) {
      selectedServices.value = profile.value.services.map((s: any) => s.category || s.value)
      profile.value.services.forEach((service: any) => {
        if (service.category) {
          serviceDescriptions.value[service.category] = service.description || ''
        }
      })
    }
    
    // Load pricing
    if (profile.value.pricing && profile.value.pricing.length > 0) {
      form.pricing = profile.value.pricing.map((p: any) => ({
        type: p.type,
        amount: p.amount?.toString() || '',
        description: p.description || ''
      }))
    }
    
    // Load media
    if (profile.value.media && profile.value.media.length > 0) {
      console.log('Loading media with blur states:', profile.value.media.map((m: any) => ({
        id: m.id || m.$id,
        isBlurred: m.isBlurred,
        type: m.type
      })))
      uploadedFiles.value = profile.value.media.map((m: any) => ({
        file: null,
        preview: m.url || m.thumbnailUrl,
        blur: m.isBlurred || false,
        id: m.id || m.$id,
        existing: true,
        type: m.type || 'photo' // 'photo' or 'video'
      }))
    }
    
    initialDataLoaded.value = true
    
    // Force LocationDropdowns to re-render with the updated data
    locationDropdownsKey.value++
    await nextTick()
    console.log('CreateProfile: Data loaded, LocationDropdowns should now initialize with:', form.location)
    
  } catch (error) {
    console.error('Error loading profile:', error)
    authStore.setError('Failed to load profile. Please try again.')
    router.push('/escort/profiles')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isEscort.value) {
    router.push('/')
    return
  }

  try {
    // Load subscription data - this will create a free subscription if none exists
    await subscriptionStore.loadUserSubscription()
    
    // In edit mode, just load the profile
    if (isEditMode.value) {
      await loadProfile()
    } else {
      // Load user's existing profiles to check limits
      await profileStore.fetchProfiles()
      
      // Check if user is on free plan and already has a profile
      if (subscriptionStore.isFreeTier && profileStore.profiles.length >= 1) {
        authStore.setError('Free plan allows only 1 profile. Please upgrade your subscription to create more profiles.')
        setTimeout(() => {
          router.push('/subscription')
        }, 3000)
        return
      }
      
      // Check general profile creation limits
      if (!subscriptionStore.canCreateProfile) {
        authStore.setError(`You have reached your monthly profile creation limit. You have ${subscriptionStore.profilesRemaining} profiles remaining this month. Please upgrade your subscription to create more profiles.`)
        setTimeout(() => {
          router.push('/subscription')
        }, 3000)
        return
      }
    }
  } catch (error) {
    console.error('Error loading subscription data:', error)
    authStore.setError('Failed to load subscription information. Please refresh the page.')
  }
})

const handleErrorClear = () => {
  authStore.clearError()
}

const canProceedToStep = (step: number): boolean => {
  switch (step) {
    case 2: // Services step
      return !!(form.name && form.age && form.location.city && form.location.country && form.description)
    case 3: // Pricing step
      return selectedServices.value.length > 0
    case 4: // Availability step
      return form.pricing.some((p: { amount: string }) => p.amount && parseFloat(p.amount) > 0)
    case 5: // Media step
      return Object.values(form.workingHours).some(day => day.enabled)
    default:
      return true
  }
}

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceedToStep(currentStep.value + 1)) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const goToStep = (step: number) => {
  if (step <= currentStep.value || canProceedToStep(step)) {
    currentStep.value = step
  }
}

const hasMinimumRequirements = (): boolean => {
  // Use the detailed completion calculation
  return detailedCompletion.value.overall >= 80 // Allow publishing at 80% completion (4 out of 5 steps)
}

const canPublish = computed(() => detailedCompletion.value.canPublish)

const toggleService = (serviceValue: string) => {
  const index = selectedServices.value.indexOf(serviceValue)
  if (index > -1) {
    selectedServices.value.splice(index, 1)
    delete serviceDescriptions.value[serviceValue]
  } else {
    selectedServices.value.push(serviceValue)
  }
}

const getServiceIcon = (serviceValue: string) => {
  const icons: Record<string, string> = {
    'dinner-dates': '🍽️',
    'travel-companion': '✈️',
    'event-accompaniment': '🎭',
    'vip-events': '🥂',
    'private-experiences': '💫',
    'business-functions': '💼',
    'weekend-getaways': '🏖️'
  }
  return icons[serviceValue] || '⭐'
}

const getServiceLabel = (serviceValue: string) => {
  const service = availableServices.find(s => s.value === serviceValue)
  return service ? service.label : serviceValue
}



const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files) return
  
  // Count existing media types
  let existingVideos = uploadedFiles.value.filter(f => 
    (f.type === 'video') || (f.file && f.file.type.startsWith('video/'))
  ).length
  let existingImages = uploadedFiles.value.filter(f => 
    (f.type === 'photo') || (f.file && f.file.type.startsWith('image/'))
  ).length
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    
    // Check media limits
    if (isVideo && existingVideos >= 1) {
      authStore.setError('You can only upload a maximum of 1 video')
      continue
    }
    
    if (isImage && existingImages >= 5) {
      authStore.setError('You can only upload a maximum of 5 images')
      continue
    }
    
    // Validate file size (5MB limit for all file types)
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      authStore.setError(`${file.name} is too large. Maximum size is 5MB`)
      continue
    }
    
    // Create preview (for images/videos) or file info (for other types)
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedFiles.value.push({
        file,
        preview: e.target?.result as string,
        blur: false, // Default to unblurred
        type: isVideo ? 'video' : isImage ? 'photo' : undefined
      })
      
      // Update counts for next iteration
      if (isVideo) existingVideos++
      if (isImage) existingImages++
    }
    
    // Read as data URL for all file types to enable preview where possible
    reader.readAsDataURL(file)
  }
}


const removeFile = async (index: number) => {
  const file = uploadedFiles.value[index]
  
  // If it's an existing media file, delete it from the server
  if (file.existing && file.id && (draftProfileId.value || profileId.value)) {
    try {
      await profileStore.removeMedia(file.id, draftProfileId.value || profileId.value!)
    } catch (error) {
      console.error('Error removing media:', error)
      authStore.setError('Failed to remove media. Please try again.')
      return
    }
  }
  
  // Remove from the local array
  uploadedFiles.value.splice(index, 1)
}

// Removed toggleBlur function - v-model handles the state change directly


const addPricingOption = () => {
  form.pricing.push({
    type: 'custom',
    amount: '',
    description: ''
  })
}

const removePricingOption = (index: number) => {
  // Don't remove the first 3 default pricing options
  if (index > 2) {
    form.pricing.splice(index, 1)
  }
}

const saveAsDraft = async () => {
  try {
    isSaving.value = true
    
    // Debug: Check if there's presence service interference
    console.log('Starting profile save...')
    console.log('Current authStore.user:', authStore.user)
    
    // Prepare profile data with whatever is filled
    const profileData = {
      name: form.name || 'Untitled Profile',
      age: form.age ? parseInt(form.age) : 18,
      locationCity: form.location.city || form.locationCity || '',
      locationState: form.location.state || form.locationState || '',
      locationCountry: form.location.country || form.locationCountry || '',
      description: form.description || '',
      bio: form.bio || '',
      workingHours: JSON.stringify(form.workingHours),
      availabilityAdvanceBookingDays: 30,
      preferencesAutoApproveBookings: form.preferences.autoApproveBookings,
      preferencesRequireDeposit: form.preferences.requireDeposit,
      preferencesDepositPercentage: form.preferences.requireDeposit ? parseInt(form.preferences.depositPercentage || '0') : null,
      preferencesCancellationPolicy: form.preferences.cancellationPolicy,
      preferencesMinimumNotice: parseInt(form.preferences.minimumNotice || '2')
    }
    
    console.log('Saving profile with location:', {
      city: profileData.locationCity,
      state: profileData.locationState,
      country: profileData.locationCountry
    })
    
    if (draftProfileId.value || isEditMode.value) {
      // Update existing profile
      const updateId = draftProfileId.value || profileId.value!
      console.log('Updating existing profile:', updateId)
      await profileStore.updateProfile(updateId, profileData)
      draftProfileId.value = updateId
      
      // Make sure profile is in edit mode if we have a profileId
      if (profileId.value && !draftProfileId.value) {
        draftProfileId.value = profileId.value
      }
    } else {
      // Create new draft profile
      console.log('Creating profile with data:', profileData)
      console.log('User ID:', authStore.user!.$id)
      console.log('Full user object:', authStore.user)
      
      const profile = await profileStore.createProfile(authStore.user!.$id, profileData)
      draftProfileId.value = profile.$id || profile.id
      console.log('Created profile:', profile)
      console.log('Draft profile ID set to:', draftProfileId.value)
      
      // Try to increment subscription usage for new profile
      try {
        await subscriptionStore.incrementProfileUsage()
      } catch (usageError) {
        console.error('Error incrementing profile usage:', usageError)
        // Don't fail the entire save operation if usage tracking fails
        // The profile was already created successfully
      }
    }
    
    // Batch save services, pricing, and media in parallel
    if (draftProfileId.value) {
      const batchOperations = []
      
      // Services - only create if we have services with descriptions
      const servicesToCreate = selectedServices.value
        .filter(sv => serviceDescriptions.value[sv])
        .map(serviceValue => ({
          name: getServiceLabel(serviceValue),
          description: serviceDescriptions.value[serviceValue],
          category: serviceValue
        }))
      
      if (servicesToCreate.length > 0) {
        // Create all services in parallel
        const servicePromises = servicesToCreate.map(service =>
          profileStore.createService(draftProfileId.value!, service)
        )
        batchOperations.push(...servicePromises)
      }
      
      // Pricing - only create valid pricing options
      const validPricing = form.pricing.filter(p => p.amount)
      if (validPricing.length > 0) {
        const pricingPromises = validPricing.map(pricing =>
          profileStore.createPricing(draftProfileId.value!, {
            type: pricing.type as 'hourly' | 'daily' | 'event' | 'custom',
            amount: parseInt(pricing.amount),
            currency: 'USD',
            description: pricing.description || ''
          })
        )
        batchOperations.push(...pricingPromises)
      }
      
      // Media - only upload new files
      const newMedia = uploadedFiles.value.filter(f => !f.existing && f.file)
      if (newMedia.length > 0) {
        const mediaPromises = newMedia.map(uploadedFile =>
          profileStore.uploadMedia(draftProfileId.value!, uploadedFile.file!, {
            blur: uploadedFile.blur
          })
        )
        batchOperations.push(...mediaPromises)
      }
      
      // Execute all operations in parallel
      if (batchOperations.length > 0) {
        console.log(`Executing ${batchOperations.length} operations in parallel`)
        await Promise.all(batchOperations)
      }
    }
    
    // Check if all steps are completed and auto-activate
    if (draftProfileId.value && detailedCompletion.value.overall === 100) {
      try {
        const savedProfile = profileStore.profiles.find((p: any) => p.id === draftProfileId.value)
        
        if (savedProfile && savedProfile.status !== 'active') {
          // Simple activation - just update the status
          await profileStore.updateProfile(draftProfileId.value, { status: 'active' })
          await profileStore.fetchProfiles()
          success('Profile saved and activated successfully!')
          authStore.clearError()
          return
        }
      } catch (activationError) {
        console.log('Could not auto-activate profile:', activationError)
        // Continue with normal save flow
      }
    }
    
    // Show success message - we'll clear the error and could show a toast/notification
    authStore.clearError()
    console.log('Profile saved successfully')
    
    // Show success message
    const message = detailedCompletion.value.overall === 100 && profile.value?.status === 'active' 
      ? 'Profile saved successfully!' 
      : 'Profile saved as draft successfully!'
    success(message)
  } catch (error: any) {
    console.error('Error saving draft:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response,
      stack: error.stack
    })
    
    // Show more specific error message
    const errorMessage = error.message || 'Failed to save draft. Please try again.'
    authStore.setError(errorMessage)
    showError(errorMessage)
  } finally {
    isSaving.value = false
  }
}

const publishProfile = async () => {
  try {
    isLoading.value = true
    authStore.clearError()
    
    // Step 1: Check if we're updating an active profile
    if (isEditMode.value && profile.value?.status === 'active') {
      await saveAsDraft()
      success('Profile updated successfully!')
      router.push('/escort/profiles')
      return
    }
    
    // Step 2: Validate completion
    const completion = detailedCompletion.value
    if (completion.overall < 100) {
      const missingSteps = completion.steps
        .filter(s => s.percentage < 100)
        .map(s => s.step)
        .join(', ')
      
      authStore.setError(`Please complete the following sections: ${missingSteps}`)
      showError(`Profile is ${completion.overall}% complete. Please finish all required sections.`)
      return
    }
    
    // Step 3: Combine save and activate in a single operation
    const profileIdToPublish = profileId.value || draftProfileId.value
    
    // Prepare all profile data including status update
    const profileData = {
      name: form.name || 'Untitled Profile',
      age: form.age ? parseInt(form.age) : 18,
      locationCity: form.location.city || form.locationCity || '',
      locationState: form.location.state || form.locationState || '',
      locationCountry: form.location.country || form.locationCountry || '',
      description: form.description || '',
      bio: form.bio || '',
      workingHours: JSON.stringify(form.workingHours),
      availabilityAdvanceBookingDays: 30,
      preferencesAutoApproveBookings: form.preferences.autoApproveBookings,
      preferencesRequireDeposit: form.preferences.requireDeposit,
      preferencesDepositPercentage: form.preferences.requireDeposit ? parseInt(form.preferences.depositPercentage || '0') : null,
      preferencesCancellationPolicy: form.preferences.cancellationPolicy,
      preferencesMinimumNotice: parseInt(form.preferences.minimumNotice || '2'),
      status: 'active', // Set status to active directly
      updatedAt: new Date().toISOString()
    }
    
    console.log('Publishing profile with data:', { id: profileIdToPublish, status: profileData.status })
    
    if (profileIdToPublish) {
      // Update existing profile with active status
      await profileStore.updateProfile(profileIdToPublish, profileData)
      
      // Handle services, pricing, and media in parallel to reduce requests
      const updatePromises = []
      
      // Update services if changed
      if (selectedServices.value.length > 0) {
        updatePromises.push(updateServices())
      }
      
      // Update pricing if changed
      if (form.pricing.length > 0) {
        updatePromises.push(updatePricing())
      }
      
      // Wait for all updates to complete
      await Promise.all(updatePromises)
      
      // Upload any new media files
      if (uploadedFiles.value.some(f => !f.existing && f.file)) {
        await uploadNewMedia()
      }
    } else {
      // Create new profile with active status
      const newProfile = await profileStore.createProfile(authStore.user!.$id, profileData)
      draftProfileId.value = newProfile.$id || newProfile.id
      
      // Create services, pricing, and upload media
      await Promise.all([
        createServices(),
        createPricing(),
        uploadNewMedia()
      ])
    }
    
    // Only refresh profiles once at the end
    await profileStore.fetchProfiles()
    
    // Clear any errors and show success
    authStore.clearError()
    success('🎉 Profile published successfully!')
    
    // Navigate immediately
    router.push('/escort/profiles')
    
  } catch (error: any) {
    console.error('Error publishing profile:', error)
    const errorMessage = error.message || 'Failed to publish profile. Please try again.'
    authStore.setError(errorMessage)
    showError(errorMessage)
  } finally {
    isLoading.value = false
  }
}

// Helper function to update services
const updateServices = async () => {
  if (!draftProfileId.value && !profileId.value) return
  
  const profileIdToUse = draftProfileId.value || profileId.value!
  
  // For now, just create all services fresh (simpler and fewer requests)
  const servicePromises = selectedServices.value.map(serviceValue => 
    profileStore.addService(profileIdToUse, {
      name: getServiceLabel(serviceValue),
      description: serviceDescriptions.value[serviceValue] || '',
      category: serviceValue
    })
  )
  
  await Promise.all(servicePromises)
}

// Helper function to update pricing
const updatePricing = async () => {
  if (!draftProfileId.value && !profileId.value) return
  
  const profileIdToUse = draftProfileId.value || profileId.value!
  
  // For now, just create all pricing fresh (simpler and fewer requests)
  const pricingPromises = form.pricing
    .filter(p => p.amount && p.type)
    .map(pricingOption => 
      profileStore.addPricing(profileIdToUse, pricingOption)
    )
  
  await Promise.all(pricingPromises)
}

// Helper function to create services for new profile
const createServices = async () => {
  if (!draftProfileId.value) return
  
  const servicePromises = selectedServices.value.map(serviceValue => 
    profileStore.addService(draftProfileId.value!, {
      name: getServiceLabel(serviceValue),
      description: serviceDescriptions.value[serviceValue] || '',
      category: serviceValue
    })
  )
  
  await Promise.all(servicePromises)
}

// Helper function to create pricing for new profile
const createPricing = async () => {
  if (!draftProfileId.value) return
  
  const pricingPromises = form.pricing
    .filter(p => p.amount && p.type)
    .map(pricingOption => 
      profileStore.addPricing(draftProfileId.value!, pricingOption)
    )
  
  await Promise.all(pricingPromises)
}

// Helper function to upload new media
const uploadNewMedia = async () => {
  if (!draftProfileId.value && !profileId.value) return
  
  const profileIdToUse = draftProfileId.value || profileId.value!
  
  const mediaPromises = uploadedFiles.value
    .filter(f => !f.existing && f.file)
    .map(uploadedFile => 
      profileStore.uploadMedia(profileIdToUse, uploadedFile.file!, {
        blur: uploadedFile.blur
      })
    )
  
  await Promise.all(mediaPromises)
}

const handleProfileActivation = async () => {
  try {
    if (!draftProfileId.value) return
    
    // Use the service's activateProfile method which includes validation
    await profileService.activateProfile(draftProfileId.value)
    
    // Refresh the profile in the store
    await profileStore.fetchProfile(draftProfileId.value)
    
    // Also refresh all profiles to ensure the list is up to date
    await profileStore.fetchProfiles()
    
    // Show success message
    success('Profile activated successfully!')
    
    // Redirect to profiles page
    router.push('/escort/profiles')
  } catch (error) {
    console.error('Error activating profile:', error)
    authStore.setError('Failed to activate profile. Please ensure all required fields are completed.')
  }
}

const closeActivationModal = () => {
  showActivationModal.value = false
  isLoading.value = false
}

const currentProfileForModal = computed(() => {
  if (!draftProfileId.value) return {}
  
  const profile = profileStore.profiles.find((p: any) => p.id === draftProfileId.value)
  return profile || {}
})

// locationKey removed - was unused

// Watch for location changes and sync with flat structure
watch(() => form.location, (newLocation) => {
  console.log('CreateProfile: form.location changed:', newLocation)
  form.locationCity = newLocation.city || ''
  form.locationState = newLocation.state || ''
  form.locationCountry = newLocation.country || ''
}, { deep: true })

// Also watch flat fields and sync back to nested structure
watch([() => form.locationCity, () => form.locationState, () => form.locationCountry], 
  ([city, state, country]) => {
    console.log('CreateProfile: Flat fields changed:', { city, state, country })
    form.location = {
      city: city || '',
      state: state || '',
      country: country || ''
    }
  })

// Watch for profile data being loaded and update location
watch(() => profile.value, (newProfile) => {
  if (newProfile && isEditMode.value && !initialDataLoaded.value) {
    // Re-populate location data when profile becomes available
    const locationData = {
      city: newProfile.locationCity || newProfile.location?.city || '',
      state: newProfile.locationState || newProfile.location?.state || '',
      country: newProfile.locationCountry || newProfile.location?.country || ''
    }
    
    console.log('Profile loaded, updating location:', {
      profile: newProfile,
      locationData
    })
    
    form.location = locationData
    form.locationCity = locationData.city
    form.locationState = locationData.state
    form.locationCountry = locationData.country
  }
}, { immediate: true })

const goBack = () => {
  router.push('/escort/profiles')
}

// Helper functions for file handling
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileType = (mimeType: string): string => {
  if (!mimeType) return 'Unknown'
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'text/plain': 'Text File',
    'application/zip': 'ZIP Archive',
    'application/x-rar-compressed': 'RAR Archive',
  }
  
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType.startsWith('audio/')) return 'Audio'
  
  return typeMap[mimeType] || mimeType.split('/')[1].toUpperCase() + ' File'
}
</script>

<template>
  <div class="create-profile">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="form-header">
      <button @click="goBack" class="back-btn">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
        </svg>
        Back to Profiles
      </button>
      
      <div class="header-content">
        <h1>{{ isEditMode ? 'Edit' : 'Create' }} Your Professional Profile</h1>
        <p>{{ isEditMode ? 'Update your profile information' : 'Build your presence and connect with quality clients' }}</p>
        
        <!-- Subscription Status -->
        <div v-if="subscriptionPlan && !isEditMode" class="subscription-status">
          <div class="status-badge" :class="subscriptionPlan.tier">
            <span class="plan-name">{{ subscriptionPlan.name }} Plan</span>
            <span class="separator">•</span>
            <span class="profiles-remaining">
              {{ profilesRemaining }} profile{{ profilesRemaining !== 1 ? 's' : '' }} remaining this month
            </span>
          </div>
          <router-link v-if="profilesRemaining === 0" to="/subscription" class="upgrade-link">
            Upgrade to create more profiles
          </router-link>
        </div>
        
      </div>
    </div>
    
    <!-- Simple Step Indicator -->
    <div class="step-indicator-simple">
      <div class="steps-progress">
        <div 
          v-for="step in steps" 
          :key="step.number"
          class="step-item"
          :class="{ 
            'active': currentStep === step.number,
            'completed': step.isComplete,
            'clickable': step.number <= currentStep || canProceedToStep(step.number)
          }"
          @click="goToStep(step.number)"
        >
          <div class="step-number">
            <svg v-if="step.isComplete" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.485 1.431a1.473 1.473 0 0 1 2.104 2.062l-7.84 9.801a1.473 1.473 0 0 1-2.12.04L.431 8.138a1.473 1.473 0 0 1 2.084-2.083l4.111 4.112 6.82-8.69a.486.486 0 0 1 .04-.045z"/>
            </svg>
            <span v-else>{{ step.number }}</span>
          </div>
          <span class="step-label">{{ step.title }}</span>
        </div>
        <div class="progress-line"></div>
        <div 
          class="progress-line-fill" 
          :style="{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }"
        ></div>
      </div>
    </div>
    
    <form @submit.prevent="publishProfile" class="profile-form">
      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 1" class="form-section">
        <div class="section-header">
          <h2>Basic Information</h2>
          <p class="section-subtitle">Let's start with your professional details</p>
          <div v-if="steps[0].isComplete" class="step-complete-badge">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Section Complete</span>
          </div>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="name">
              Profile Name
              <span class="required">*</span>
            </label>
            <div class="input-wrapper">
              <input 
                id="name"
                v-model="form.name"
                type="text"
                placeholder="e.g., Isabella Rose"
                required
                class="form-input"
              />
              <div class="input-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                </svg>
              </div>
            </div>
            <div class="field-hint">Your professional name clients will see</div>
          </div>
        
          <div class="form-group">
            <label for="age">
              Age
              <span class="required">*</span>
            </label>
            <div class="input-wrapper">
              <input 
                id="age"
                v-model="form.age"
                type="number"
                min="18"
                max="99"
                placeholder="18"
                required
                class="form-input"
              />
              <div class="input-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z"/>
                </svg>
              </div>
            </div>
            <div class="field-hint">Must be 18 or older</div>
          </div>
        </div>
        
        <LocationDropdowns 
          v-if="!isEditMode || initialDataLoaded"
          v-model="form.location"
          :required="true"
          :key="`location-${locationDropdownsKey}-${profile?.id || 'new'}-${form.location.city}-${form.location.state}-${form.location.country}`"
        />
        
        <!-- Loading placeholder for location dropdowns -->
        <div v-else class="location-loading">
          <div class="loading-spinner">Loading location data...</div>
        </div>
        
        <div class="form-group full-width">
          <label for="description">
            Short Description
            <span class="required">*</span>
          </label>
          <div class="textarea-wrapper">
            <textarea 
              id="description"
              v-model="form.description"
              rows="3"
              placeholder="I'm a sophisticated companion who enjoys fine dining, cultural events, and meaningful conversations..."
              required
              class="form-textarea"
              maxlength="500"
            ></textarea>
            <div class="char-count">{{ form.description.length }}/500</div>
          </div>
          <div class="field-hint">A captivating intro that appears in search results</div>
        </div>
        
        <div class="form-group full-width">
          <label for="bio">
            Detailed Bio
          </label>
          <div class="textarea-wrapper">
            <textarea 
              id="bio"
              v-model="form.bio"
              rows="6"
              placeholder="Share more about your background, interests, education, hobbies, and what clients can expect when spending time with you..."
              class="form-textarea"
              maxlength="2000"
            ></textarea>
            <div class="char-count">{{ (form.bio || '').length }}/2000</div>
          </div>
          <div class="field-hint">Share your personality, interests, and what makes you unique</div>
        </div>
        
        <div class="tips-box">
          <h4>💡 Profile Tips</h4>
          <ul>
            <li>Use a professional name that's easy to remember</li>
            <li>Write descriptions that highlight your unique qualities</li>
            <li>Be authentic while maintaining privacy</li>
            <li>Focus on the experiences you provide</li>
          </ul>
        </div>
      </div>
      
      <!-- Step 2: Services -->
      <div v-if="currentStep === 2" class="form-section">
        <div class="section-header">
          <h2>Services Offered</h2>
          <p class="section-subtitle">Select and describe the experiences you provide</p>
          <div v-if="steps[1].isComplete" class="step-complete-badge">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Section Complete</span>
          </div>
        </div>
        
        <div class="services-selection">
          <h3 class="services-title">Choose Your Services</h3>
          <div class="services-grid">
            <div 
              v-for="service in availableServices" 
              :key="service.value"
              class="service-card"
              :class="{ 'selected': selectedServices.includes(service.value) }"
              @click="toggleService(service.value)"
            >
              <div class="service-icon">
                {{ getServiceIcon(service.value) }}
              </div>
              <h4 class="service-name">{{ service.label }}</h4>
              <div class="service-checkbox">
                <svg v-if="selectedServices.includes(service.value)" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M16.707 5.293a.5.5 0 0 1 0 .708l-8 8a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7 12.586l7.293-7.293a.5.5 0 0 1 .708 0z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div v-if="selectedServices.length > 0" class="selected-services">
            <h3>Add descriptions for your selected services:</h3>
            <div v-for="serviceValue in selectedServices" :key="serviceValue" class="service-item">
              <div class="form-group">
                <label>{{ getServiceLabel(serviceValue) }} - Description *</label>
                <textarea 
                  v-model="serviceDescriptions[serviceValue]"
                  rows="3"
                  :placeholder="`Describe your ${getServiceLabel(serviceValue)} service in detail...`"
                  required
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Step 3: Pricing -->
      <div v-if="currentStep === 3" class="form-section">
        <div class="section-header">
          <h2>Pricing Options</h2>
          <p class="section-description">Set flexible pricing for different durations and packages</p>
          <div v-if="steps[2].isComplete" class="step-complete-badge">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Section Complete</span>
          </div>
        </div>
        
        <div class="pricing-list">
          <div v-for="(pricing, index) in form.pricing" :key="index" class="pricing-item">
            <div class="pricing-header">
              <h4>{{ pricingTypes.find(t => t.value === pricing.type)?.label || 'Custom Package' }}</h4>
              <button 
                v-if="index > 2" 
                type="button" 
                @click="removePricingOption(index)" 
                class="remove-btn"
              >
                Remove
              </button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Amount *</label>
                <div class="rate-input">
                  <span class="currency">{{ currencySymbol }}</span>
                  <input 
                    v-model="pricing.amount"
                    type="number"
                    min="0"
                    step="10"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label>Type</label>
                <select v-model="pricing.type" :disabled="index < 3 || pricing.type === 'custom'">
                  <option v-for="type in pricingTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <input 
                v-model="pricing.description"
                type="text"
                placeholder="e.g., Includes dinner and entertainment"
              />
            </div>
          </div>
          
          <button type="button" @click="addPricingOption" class="btn btn-outline">
            + Add Custom Package
          </button>
        </div>
      </div>
      
      <!-- Step 4: Availability -->
      <div v-if="currentStep === 4" class="form-section">
        <div class="section-header">
          <h2>Availability Settings</h2>
          <p class="section-description">Set your working hours and booking preferences</p>
          <div v-if="steps[3].isComplete" class="step-complete-badge">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Section Complete</span>
          </div>
        </div>
        
        <div class="working-hours">
          <h3>Working Hours</h3>
          <div class="hours-grid">
            <div v-for="(day, dayName) in form.workingHours" :key="dayName" class="day-row">
              <label class="day-toggle">
                <input type="checkbox" v-model="day.enabled" />
                <span>{{ String(dayName).charAt(0).toUpperCase() + String(dayName).slice(1) }}</span>
              </label>
              
              <div v-if="day.enabled" class="time-inputs">
                <input type="time" v-model="day.start" />
                <span>to</span>
                <input type="time" v-model="day.end" />
              </div>
            </div>
          </div>
        </div>
        
        <div class="booking-preferences">
          <h3>Booking Preferences</h3>
          
          <div class="form-group">
            <label class="checkbox-group">
              <input type="checkbox" v-model="form.preferences.autoApproveBookings" />
              <span>Auto-approve bookings</span>
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-group">
              <input type="checkbox" v-model="form.preferences.requireDeposit" />
              <span>Require deposit for bookings</span>
            </label>
            
            <div v-if="form.preferences.requireDeposit" class="deposit-settings">
              <label>Deposit Percentage</label>
              <div class="rate-input">
                <input 
                  v-model="form.preferences.depositPercentage"
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                />
                <span class="unit">%</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Minimum Notice (hours)</label>
            <input 
              v-model="form.preferences.minimumNotice"
              type="number"
              min="1"
              max="72"
              placeholder="2"
            />
          </div>
          
          <div class="form-group">
            <label>Cancellation Policy</label>
            <textarea 
              v-model="form.preferences.cancellationPolicy"
              rows="3"
              placeholder="Describe your cancellation policy..."
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- Step 5: Media & Files -->
      <div v-if="currentStep === 5" class="form-section">
        <div class="section-header">
          <h2>Photos, Videos</h2>
          <p class="section-description">Upload media files to showcase your services</p>
          <div v-if="steps[4].isComplete" class="step-complete-badge">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Section Complete</span>
          </div>
        </div>
        
        <!-- Media count display -->
        <div v-if="uploadedFiles.length > 0" class="media-count">
          <div class="count-item">
            <span class="count-icon">🖼️</span>
            <span class="count-text">{{ uploadedFiles.filter(f => (f.type === 'photo') || (f.file && f.file.type.startsWith('image/'))).length }} / 5 images</span>
          </div>
          <div class="count-item">
            <span class="count-icon">🎥</span>
            <span class="count-text">{{ uploadedFiles.filter(f => (f.type === 'video') || (f.file && f.file.type.startsWith('video/'))).length }} / 1 video</span>
          </div>
        </div>
        
        <div class="uploaded-media" v-if="uploadedFiles.length > 0">
          <div v-for="(file, index) in uploadedFiles" :key="index" class="media-item">
            <div class="media-preview" :class="{ blurred: file.blur }">
              <!-- Existing media (from server) -->
              <img 
                v-if="file.existing && file.preview && file.type === 'photo'" 
                :src="file.preview" 
                :alt="'Profile photo'"
              />
              <video 
                v-else-if="file.existing && file.preview && file.type === 'video'" 
                :src="file.preview" 
                controls
              >
                Your browser does not support the video tag.
              </video>
              <!-- New image upload -->
              <img 
                v-else-if="file.file && file.file.type.startsWith('image/')" 
                :src="file.preview" 
                :alt="file.file.name"
              />
              <!-- New video upload -->
              <video 
                v-else-if="file.file && file.file.type.startsWith('video/')" 
                :src="file.preview" 
                controls
              >
                Your browser does not support the video tag.
              </video>
              <!-- Other file types - show file icon and name -->
              <div v-else class="file-preview">
                <div class="file-icon">📄</div>
                <div class="file-info">
                  <div class="file-name">{{ file.file?.name || 'Unknown file' }}</div>
                  <div class="file-size">{{ formatFileSize(file.file?.size || 0) }}</div>
                  <div class="file-type">{{ getFileType(file.file?.type || '') }}</div>
                </div>
              </div>
            </div>
            <div class="media-controls">
              <label v-if="(file.file && file.file.type.startsWith('image/')) || (file.existing && file.type === 'photo')" class="blur-toggle">
                <input type="checkbox" v-model="file.blur" />
                <span class="toggle-switch"></span>
                <span class="toggle-label">{{ file.blur ? 'Face Blurred' : 'Face Visible' }}</span>
              </label>
              <button type="button" @click="removeFile(index)" class="remove-btn">
                Remove
              </button>
            </div>
          </div>
        </div>
        
        <div class="photo-upload">
          <label class="upload-area">
            <input 
              ref="fileInput"
              type="file" 
              multiple 
              @change="handleFileUpload"
              style="display: none;"
            />
            <div class="upload-icon">📎</div>
            <p>Click to upload files</p>
            <span>Max: 5 images, 1 video (5MB each)</span>
          </label>
        </div>
      </div>
      
      <!-- Step Navigation -->
      <div class="step-navigation">
        <button 
          v-if="currentStep > 1"
          type="button" 
          @click="prevStep" 
          class="btn btn-outline"
        >
          ← Previous
        </button>
        
        <button type="button" @click="goBack" class="btn btn-ghost">
          Cancel
        </button>
        
        <div class="nav-right">
          <button 
            type="button" 
            @click="saveAsDraft" 
            :disabled="isSaving"
            class="btn btn-outline"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else-if="isEditMode">Save Changes</span>
            <span v-else>{{ draftProfileId ? 'Update Draft' : 'Save as Draft' }}</span>
          </button>
          
          <button 
            v-if="currentStep < totalSteps"
            type="button" 
            @click="nextStep" 
            :disabled="!canProceedToStep(currentStep + 1)"
            class="btn btn-primary"
          >
            Next →
          </button>
          
          <button 
            v-if="currentStep === totalSteps"
            type="submit" 
            :disabled="isLoading" 
            class="btn btn-primary"
            :class="{ 'btn-success': detailedCompletion.overall === 100 }"
          >
            <span v-if="isLoading" class="loading-spinner">
              <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ profile?.status === 'active' ? 'Updating...' : 'Publishing...' }}
            </span>
            <span v-else-if="profile?.status === 'active'">Update Profile</span>
            <span v-else-if="detailedCompletion.overall === 100">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" class="inline mr-2">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              Publish Profile
            </span>
            <span v-else>Complete Profile ({{ detailedCompletion.overall }}%)</span>
          </button>
        </div>
      </div>
    </form>
    
    <!-- Profile Activation Modal -->
    <ProfileActivationModal 
      :show="showActivationModal"
      :profile="currentProfileForModal"
      :profile-id="draftProfileId || ''"
      @close="closeActivationModal"
      @activated="handleProfileActivation"
    />
  </div>
</template>

<style scoped lang="scss">
.create-profile {
  padding: var(--spacing-xl);
  max-width: 900px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: var(--spacing-lg) var(--spacing-md);
    max-width: none;
  }
  
  @media (max-width: 480px) {
    padding: var(--spacing-md);
  }
}

.form-header {
  margin-bottom: var(--spacing-xxl);
  
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-xl);
  }
  
  @media (max-width: 480px) {
    margin-bottom: var(--spacing-lg);
  }
  
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: none;
    color: var(--color-accent);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-accent-light);
      transform: translateX(-2px);
    }
    
    svg {
      transition: transform 0.2s ease;
    }
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
      padding: var(--spacing-xs) var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }
  }
  
  .header-content {
    text-align: center;
    
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2.5rem;
      font-weight: 700;
      
      @media (max-width: 768px) {
        font-size: 2rem;
      }
      
      @media (max-width: 480px) {
        font-size: 1.75rem;
        line-height: 1.2;
      }
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.2rem;
      margin-bottom: var(--spacing-xl);
      
      @media (max-width: 768px) {
        font-size: 1.1rem;
      }
      
      @media (max-width: 480px) {
        font-size: 1rem;
        margin-bottom: var(--spacing-lg);
      }
    }
  }
  
}

.profile-form {
  .form-section {
    background: white;
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    
    h2 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-md);
      font-size: 1.3rem;
    }
    
    .section-description {
      color: var(--color-text-light);
      font-size: 0.9rem;
      margin-bottom: var(--spacing-md);
    }
  }
}

.form-group {
  margin-bottom: var(--spacing-md);
  
  label {
    display: block;
    color: var(--color-text-dark);
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
  }
  
  input, textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    transition: border-color 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }
  
  textarea {
    resize: vertical;
    min-height: 100px;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.service-checkbox {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-accent);
  }
  
  &.selected {
    border-color: var(--color-accent);
    background: rgba(183, 110, 121, 0.1);
  }
  
  input[type="checkbox"] {
    width: auto;
    margin-right: var(--spacing-sm);
  }
  
  .checkbox-label {
    color: var(--color-text-dark);
    font-weight: 500;
  }
}

.rate-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  
  .currency {
    padding: 12px 8px 12px 16px;
    background: var(--color-background-alt);
    color: var(--color-text-dark);
    font-weight: 500;
  }
  
  input {
    border: none;
    border-radius: 0;
    flex: 1;
  }
  
  .unit {
    padding: 12px 16px 12px 8px;
    background: var(--color-background-alt);
    color: var(--color-text-light);
    font-size: 0.9rem;
  }
}

.photo-upload {
  .upload-area {
    border: 2px dashed var(--color-text-lighter);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xxl);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--color-accent);
      background: var(--color-background-alt);
    }
    
    .upload-icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-md);
    }
    
    p {
      color: var(--color-text-dark);
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
    }
    
    span {
      color: var(--color-text-light);
      font-size: 0.9rem;
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  
  @media (max-width: 480px) {
    padding: 10px 20px;
    font-size: 0.95rem;
    min-height: 44px;
    width: 100%;
  }
  
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    &.btn-success {
      background-color: #10b981;
      
      &:hover:not(:disabled) {
        background-color: #059669;
      }
    }
    
    .loading-spinner {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    }
  }
  
  &.btn-outline {
    background-color: transparent;
    color: var(--color-text-dark);
    border: 1px solid var(--color-text-lighter);
    
    &:hover {
      background-color: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
  
  &.btn-ghost {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-light);
    
    &:hover {
      color: var(--color-text-dark);
      background: var(--color-background-alt);
    }
  }
}

.tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-text-lighter);
  
  .tab {
    padding: 12px 24px;
    background: none;
    border: none;
    color: var(--color-text-light);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    
    &:hover {
      color: var(--color-text-dark);
    }
    
    &.active {
      color: var(--color-accent);
      
      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--color-accent);
      }
    }
  }
}

.services-list,
.pricing-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.service-item,
.pricing-item {
  padding: var(--spacing-md);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  .service-header,
  .pricing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    h4 {
      color: var(--color-text-dark);
      margin: 0;
    }
  }
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 0.9rem;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
}

.working-hours {
  margin-bottom: var(--spacing-xl);
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-md);
  }
}

.hours-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.day-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  .day-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    min-width: 120px;
    
    input[type="checkbox"] {
      width: auto;
    }
  }
  
  .time-inputs {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    
    input[type="time"] {
      width: auto;
      padding: 8px 12px;
    }
  }
}

.booking-preferences {
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-md);
  }
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  
  input[type="checkbox"] {
    width: auto;
  }
}

.deposit-settings {
  margin-top: var(--spacing-sm);
  margin-left: var(--spacing-lg);
  
  .rate-input {
    max-width: 150px;
  }
}



.media-count {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  .count-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    
    .count-icon {
      font-size: 1.2rem;
    }
    
    .count-text {
      color: var(--color-text);
      font-size: 0.9rem;
      font-weight: 500;
    }
  }
}

.uploaded-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.media-item {
  .media-preview {
    width: 100%;
    height: 200px;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    position: relative;
    border: 1px solid var(--color-text-lighter);
    
    img, video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    &.blurred {
      position: relative;
      
      img, video {
        filter: blur(15px);
      }
      
      &::after {
        content: '👤';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        opacity: 0.5;
        z-index: 1;
        pointer-events: none;
      }
    }
    
    .file-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: var(--color-background-alt);
      flex-direction: column;
      gap: var(--spacing-md);
      
      .file-icon {
        font-size: 3rem;
        opacity: 0.5;
      }
      
      .file-info {
        text-align: center;
        
        .file-name {
          font-weight: 600;
          color: var(--color-text-dark);
          margin-bottom: var(--spacing-xs);
          word-break: break-word;
          font-size: 0.9rem;
        }
        
        .file-size {
          color: var(--color-text-light);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-xs);
        }
        
        .file-type {
          color: var(--color-text-light);
          font-size: 0.8rem;
          font-style: italic;
        }
      }
    }
  }
  
  .media-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-xs);
    
    .blur-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.9rem;
      cursor: pointer;
      position: relative;
      
      input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
        background: #e5e7eb;
        border-radius: 12px;
        transition: background 0.3s;
        flex-shrink: 0;
        
        &::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }
      
      input[type="checkbox"]:checked + .toggle-switch {
        background: #6366f1;
        
        &::after {
          transform: translateX(20px);
        }
      }
      
      .toggle-label {
        font-weight: 500;
        color: var(--color-text);
        user-select: none;
      }
      
      &:hover .toggle-switch {
        opacity: 0.8;
      }
    }
  }
}

@media (max-width: 768px) {
  .create-profile {
    padding: var(--spacing-md);
  }
  
  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    
    .tab {
      white-space: nowrap;
    }
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .day-row {
    flex-direction: column;
    align-items: flex-start;
    
    .time-inputs {
      width: 100%;
    }
  }
  
  .uploaded-media {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .form-actions {
    flex-direction: column;
  }
}

/* Simple Step Indicator Styles */
.step-indicator-simple {
  margin-bottom: var(--spacing-xl);
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
  }
  
  @media (max-width: 480px) {
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
  }
}

.steps-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  
  @media (max-width: 768px) {
    justify-content: center;
    gap: var(--spacing-lg);
  }
  
  @media (max-width: 480px) {
    justify-content: space-evenly;
    gap: var(--spacing-sm);
  }
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  position: relative;
  z-index: 2;
  flex: 1;
  cursor: default;
  
  @media (max-width: 480px) {
    flex-direction: column;
    justify-content: center;
    text-align: center;
    padding: 0;
    border-radius: 0;
    transition: none;
    gap: var(--spacing-xs);
  }
  
  &.clickable {
    cursor: pointer;
    
    @media (max-width: 480px) {
      &:hover {
        background-color: transparent;
      }
    }
  }
  
  &.active {
    .step-number {
      background: var(--color-accent);
      color: white;
      transform: scale(1.1);
      box-shadow: 0 0 0 4px rgba(183, 110, 121, 0.2);
    }
    
    .step-label {
      color: var(--color-accent);
      font-weight: 600;
    }
  }
  
  &.completed {
    .step-number {
      background: #10b981;
      color: white;
    }
    
  }
  
  // &:not(.clickable) {
  //   // opacity: 0.5;
  // }
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-text-lighter);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.step-label {
  font-size: 0.85rem;
  color: var(--color-text-light);
  text-align: center;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
  
  @media (max-width: 480px) {
    display: none;
  }
}

.progress-line {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-text-lighter);
  z-index: 1;
  
  @media (max-width: 480px) {
    display: none;
  }
}

.progress-line-fill {
  position: absolute;
  top: 20px;
  left: 0;
  height: 2px;
  background: var(--color-accent);
  transition: width 0.5s ease;
  z-index: 1;
  
  @media (max-width: 480px) {
    display: none;
  }
}

/* Step Navigation Styles */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-text-lighter);
  margin-top: var(--spacing-lg);
  
  .nav-right {
    display: flex;
    gap: var(--spacing-sm);
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    
    .nav-right {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
  
  @media (max-width: 480px) {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
    
    .nav-right {
      flex-direction: column;
      gap: var(--spacing-xs);
    }
  }
}

.btn-ghost {
  background: none;
  border: 1px solid transparent;
  color: var(--color-text-light);
  
  &:hover {
    color: var(--color-text-dark);
    background: var(--color-background-alt);
  }
}

/* Improved Form Styles */
.form-section {
  .section-header {
    margin-bottom: var(--spacing-xl);
    position: relative;
    
    h2 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-xs);
      font-size: 1.8rem;
      font-weight: 600;
    }
    
    .section-subtitle {
      color: var(--color-text-light);
      font-size: 1.1rem;
    }
    
    .step-complete-badge {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: #d1fae5;
      color: #10b981;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      
      svg {
        flex-shrink: 0;
      }
      
      @media (max-width: 640px) {
        position: static;
        margin-top: var(--spacing-sm);
        display: inline-flex;
      }
    }
  }
}

/* Field Hints */
.field-hint {
  display: block;
  color: var(--color-text-light);
  font-size: 0.85rem;
  margin-top: var(--spacing-xs);
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  @media (max-width: 480px) {
    gap: var(--spacing-md);
  }
}

.form-group {
  margin-bottom: var(--spacing-lg);
  
  label {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    color: var(--color-text-dark);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    font-size: 1rem;
    
    .required {
      color: var(--color-danger);
      font-size: 1.1rem;
    }
  }
  
  &.full-width {
    grid-column: 1 / -1;
  }
  
  @media (max-width: 480px) {
    margin-bottom: var(--spacing-md);
    
    label {
      font-size: 0.95rem;
    }
  }
}

.input-wrapper {
  position: relative;
  
  .form-input {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    padding-right: 48px;
    border: 2px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;
    min-height: 48px;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-light);
    }
    
    &::placeholder {
      color: var(--color-text-lighter);
    }
    
    @media (max-width: 480px) {
      padding: var(--spacing-sm) var(--spacing-md);
      padding-right: 42px;
      font-size: 0.95rem;
      min-height: 44px;
    }
  }
  
  .input-icon {
    position: absolute;
    right: var(--spacing-md);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-light);
    pointer-events: none;
    
    @media (max-width: 480px) {
      right: var(--spacing-sm);
      
      svg {
        width: 18px;
        height: 18px;
      }
    }
  }
}

.textarea-wrapper {
  position: relative;
  
  .form-textarea {
    width: 100%;
    padding: var(--spacing-md);
    border: 2px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s ease;
    min-height: 100px;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-light);
    }
    
    &::placeholder {
      color: var(--color-text-lighter);
    }
    
    @media (max-width: 480px) {
      padding: var(--spacing-sm);
      font-size: 0.95rem;
      min-height: 80px;
    }
  }
  
  .char-count {
    position: absolute;
    bottom: var(--spacing-sm);
    right: var(--spacing-sm);
    font-size: 0.8rem;
    color: var(--color-text-light);
    background: white;
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
    
    @media (max-width: 480px) {
      font-size: 0.75rem;
      bottom: 6px;
      right: 6px;
    }
  }
}

/* Tips Box */
.tips-box {
  background: var(--color-accent-light);
  border: 1px solid var(--color-accent);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-xl);
  
  h4 {
    color: var(--color-accent-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.1rem;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      position: relative;
      padding-left: var(--spacing-lg);
      margin-bottom: var(--spacing-xs);
      color: var(--color-text-dark);
      
      &:before {
        content: "✓";
        position: absolute;
        left: 0;
        color: var(--color-accent);
        font-weight: bold;
      }
    }
  }
}

/* Services Grid */
.services-title {
  color: var(--color-text-dark);
  font-size: 1.2rem;
  margin-bottom: var(--spacing-lg);
  font-weight: 600;
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
    margin-bottom: var(--spacing-md);
  }
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-sm);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-lg);
  }
}

.service-card {
  position: relative;
  padding: var(--spacing-lg);
  background: var(--color-background-alt);
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: var(--spacing-md);
  }
  
  @media (max-width: 480px) {
    padding: var(--spacing-sm);
    text-align: left;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    @media (max-width: 480px) {
      transform: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
  
  &.selected {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
    
    .service-checkbox {
      background: var(--color-accent);
      color: white;
    }
  }
  
  .service-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-sm);
  }
  
  .service-name {
    color: var(--color-text-dark);
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
  
  .service-checkbox {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--color-text-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
}

/* Required Badge Updates */
.required-badge,
.complete-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  font-weight: 600;
  margin-left: var(--spacing-xs);
}

.required-badge {
  background: var(--color-warning-light);
  color: var(--color-warning-dark);
}

.complete-badge {
  background: var(--color-success-light);
  color: var(--color-success-dark);
}

/* Step Icon and Line */
.step-icon {
  position: relative;
  
  .step-line {
    position: absolute;
    top: 50%;
    left: 100%;
    width: 100%;
    height: 2px;
    background: var(--color-text-lighter);
    z-index: -1;
  }
}

.step-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.subscription-status {
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-lg);
    font-size: 0.9rem;
    gap: var(--spacing-sm);
    
    &.free {
      background: var(--color-text-lighter);
      color: var(--color-text);
    }
    
    &.starter {
      background: var(--color-accent-bg);
      color: var(--color-accent);
    }
    
    &.pro {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }
    
    &.agency {
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #8b4513;
    }
    
    .plan-name {
      font-weight: 600;
    }
    
    .separator {
      opacity: 0.6;
    }
    
    .profiles-remaining {
      opacity: 0.9;
    }
  }
  
  .upgrade-link {
    display: inline-block;
    margin-top: var(--spacing-sm);
    color: var(--color-accent);
    text-decoration: none;
    font-size: 0.9rem;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

/* Location Loading */
.location-loading {
  padding: var(--spacing-lg);
  text-align: center;
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  border: 2px solid var(--color-text-lighter);
  
  .loading-spinner {
    color: var(--color-text-light);
    font-style: italic;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style> 