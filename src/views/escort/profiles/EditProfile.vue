<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useProfileStore } from '../../../stores/profile'
import ErrorAlert from '../../../components/ErrorAlert.vue'
import LocationDropdowns from '../../../components/forms/LocationDropdowns.vue'
import { availableServices } from '../../../constants/services'
import type { ProfileFormData } from '../../../types/profile'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const isLoading = ref(false)
const isSaving = ref(false)
const currentStep = ref(1)
const totalSteps = 5
const profileId = computed(() => route.params.id as string)
const profile = ref<any>(null)
const uploadedFiles = ref<Array<{ 
  file: File | null, 
  preview: string, 
  blur: boolean,
  id?: string,
  existing?: boolean 
}>>([])
const selectedServices = ref<string[]>([])
const serviceDescriptions = ref<Record<string, string>>({})
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive<ProfileFormData>({
  name: '',
  age: '',
  location: {
    city: '',
    state: '',
    country: ''
  },
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
    isComplete: form.pricing.some((p: { amount: string }) => p.amount && parseFloat(p.amount) > 0)
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
    title: 'Media & Photos', 
    description: 'Upload photos and videos',
    key: 'media',
    required: false,
    isComplete: uploadedFiles.value.length > 0
  }
])

const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const isEscort = computed(() => userRole.value === 'escort')

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isEscort.value) {
    router.push('/')
    return
  }
  
  loadProfile()
})

const loadProfile = async () => {
  try {
    isLoading.value = true
    profile.value = await profileStore.fetchProfile(profileId.value)
    
    console.log('Loaded profile with all collections:', profile.value)
    
    // Map profile data to form (handle both nested and flattened structures)
    form.name = profile.value.name || ''
    form.age = (profile.value.age || '').toString()
    
    // Handle location (flattened vs nested)
    if (profile.value.locationCity) {
      // Flattened structure
      form.location = {
        city: profile.value.locationCity || '',
        state: profile.value.locationState || '',
        country: profile.value.locationCountry || ''
      }
    } else if (profile.value.location) {
      // Nested structure
      form.location = profile.value.location
    } else {
      // Default
      form.location = { city: '', state: '', country: '' }
    }
    
    form.description = profile.value.description || ''
    form.bio = profile.value.bio || ''
    
    // Handle services (these are now in separate collections, so may be empty)
    form.services = (profile.value.services || []).map((s: any) => ({
      name: s.name,
      description: s.description,
      category: s.category
    }))
    
    // Handle pricing (these are now in separate collections, so may be empty)
    form.pricing = (profile.value.pricing || []).map((p: any) => ({
      type: p.type,
      amount: p.amount.toString(),
      description: p.description || ''
    }))
    
    // Handle working hours (flattened vs nested)
    if (profile.value.workingHours && typeof profile.value.workingHours === 'string') {
      // Flattened structure - parse JSON string
      try {
        form.workingHours = JSON.parse(profile.value.workingHours)
      } catch {
        // Use default if parsing fails
        form.workingHours = {
          monday: { enabled: true, start: '09:00', end: '18:00' },
          tuesday: { enabled: true, start: '09:00', end: '18:00' },
          wednesday: { enabled: true, start: '09:00', end: '18:00' },
          thursday: { enabled: true, start: '09:00', end: '18:00' },
          friday: { enabled: true, start: '09:00', end: '18:00' },
          saturday: { enabled: false, start: '09:00', end: '18:00' },
          sunday: { enabled: false, start: '09:00', end: '18:00' }
        }
      }
    } else if (profile.value.availability?.workingHours) {
      // Nested structure
      form.workingHours = profile.value.availability.workingHours
    }
    
    // Handle preferences (flattened vs nested)
    if (profile.value.preferencesAutoApproveBookings !== undefined) {
      // Flattened structure
      form.preferences = {
        autoApproveBookings: profile.value.preferencesAutoApproveBookings || false,
        requireDeposit: profile.value.preferencesRequireDeposit || true,
        depositPercentage: (profile.value.preferencesDepositPercentage || 30).toString(),
        cancellationPolicy: profile.value.preferencesCancellationPolicy || '24 hours notice required',
        minimumNotice: (profile.value.preferencesMinimumNotice || 2).toString()
      }
    } else if (profile.value.preferences) {
      // Nested structure
      form.preferences = {
        ...profile.value.preferences,
        depositPercentage: profile.value.preferences.depositPercentage?.toString() || '30',
        minimumNotice: profile.value.preferences.minimumNotice.toString()
      }
    }
    
    // Load services data into selectedServices and serviceDescriptions
    const servicesData = profile.value.services || []
    console.log('Profile services loaded from collections:', servicesData)
    
    if (servicesData && servicesData.length > 0) {
      // Map the service data to selectedServices and serviceDescriptions
      selectedServices.value = servicesData.map((s: any) => {
        // Services from collection should have name, category, or value field
        const serviceName = s.name || s.category || s.value || ''
        
        // Try to match with availableServices
        const matchedService = availableServices.find(
          availService => availService.label.toLowerCase() === serviceName.toLowerCase() ||
                         availService.value === s.category ||
                         availService.value === s.value ||
                         availService.value === serviceName.toLowerCase().replace(/\s+/g, '-')
        )
        
        return matchedService ? matchedService.value : serviceName.toLowerCase().replace(/\s+/g, '-')
      })
      
      // Store custom descriptions for each service
      servicesData.forEach((s: any) => {
        const serviceName = s.name || s.category || s.value || ''
        const matchedService = availableServices.find(
          availService => availService.label.toLowerCase() === serviceName.toLowerCase() ||
                         availService.value === s.category ||
                         availService.value === s.value ||
                         availService.value === serviceName.toLowerCase().replace(/\s+/g, '-')
        )
        const serviceKey = matchedService ? matchedService.value : serviceName.toLowerCase().replace(/\s+/g, '-')
        serviceDescriptions.value[serviceKey] = s.description || ''
      })
      
      // Ensure all selected services have at least an empty description
      selectedServices.value.forEach(serviceValue => {
        if (!serviceDescriptions.value[serviceValue]) {
          serviceDescriptions.value[serviceValue] = ''
        }
      })
      
      console.log('Mapped services:', selectedServices.value)
      console.log('Service descriptions:', serviceDescriptions.value)
    }
    
    // Load media files
    if (profile.value.media && profile.value.media.length > 0) {
      uploadedFiles.value = profile.value.media.map((media: any) => ({
        file: null, // We don't have the actual file object for existing media
        preview: media.url,
        blur: media.blur || false,
        id: media.id || media.$id, // Store the media ID for later use
        existing: true // Flag to indicate this is existing media
      }))
    }
  } catch (error) {
    console.error('Error loading profile:', error)
    authStore.setError('Failed to load profile. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const canProceedToStep = (step: number): boolean => {
  switch (step) {
    case 2: // Services step
      return !!(form.name && form.age && form.location.city && form.location.country && form.description)
    case 3: // Pricing step
      return selectedServices.value.length > 0 && selectedServices.value.every(service => serviceDescriptions.value[service])
    case 4: // Availability step
      return form.pricing.some(p => p.amount)
    case 5: // Media step
      return true // No specific requirements for availability step
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

const handleErrorClear = () => {
  authStore.clearError()
}

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
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    // Validate file size (5MB limit for all file types)
    // Note: Images and videos will have preview functionality, other files will show file info
    
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
        blur: file.type.startsWith('image/') // Only images can be blurred
      })
    }
    
    // Read as data URL for all file types to enable preview where possible
    reader.readAsDataURL(file)
  }
}

const toggleBlur = (index: number) => {
  uploadedFiles.value[index].blur = !uploadedFiles.value[index].blur
}

const removeFile = async (index: number) => {
  const file = uploadedFiles.value[index]
  
  // If it's an existing media file, delete it from the server
  if (file.existing && file.id) {
    try {
      await profileStore.removeMedia(file.id, profileId.value)
    } catch (error) {
      console.error('Error removing media:', error)
      authStore.setError('Failed to remove media. Please try again.')
      return
    }
  }
  
  // Remove from the local array
  uploadedFiles.value.splice(index, 1)
}


const saveProfile = async () => {
  try {
    isSaving.value = true
    
    // Validate form
    if (!form.name || !form.age || !form.location.city || !form.location.country) {
      authStore.setError('Please fill in all required fields')
      return
    }
    
    if (form.services.length === 0) {
      authStore.setError('Please add at least one service')
      return
    }
    
    // At least one pricing option should have an amount
    const hasValidPricing = form.pricing.some(p => p.amount && parseFloat(p.amount) > 0)
    if (!hasValidPricing) {
      authStore.setError('Please set at least one pricing option')
      return
    }
    
    // Update profile using proper structure
    await profileStore.updateProfile(profileId.value, {
      name: form.name,
      age: parseInt(form.age),
      location: {
        city: form.location.city,
        state: form.location.state || '',
        country: form.location.country
      },
      description: form.description,
      bio: form.bio || '',
      availability: {
        workingHours: form.workingHours,
        advanceBookingDays: 30
      },
      preferences: {
        autoApproveBookings: form.preferences.autoApproveBookings,
        requireDeposit: form.preferences.requireDeposit,
        depositPercentage: form.preferences.requireDeposit ? parseInt(form.preferences.depositPercentage || '0') : 0,
        cancellationPolicy: form.preferences.cancellationPolicy,
        minimumNotice: parseInt(form.preferences.minimumNotice || '2')
      },
      updatedAt: new Date().toISOString()
    } as any)
    
    // Update services in separate collection
    // Note: In a full implementation, you'd want to handle service updates properly
    // For now, we'll just save the services if there are any changes
    if (form.services && form.services.length > 0) {
      for (const service of form.services) {
        // This is a simplified approach - in reality you'd need to track service IDs
        // and handle create/update/delete operations properly
        await profileStore.createService(profileId.value, {
          name: service.name,
          description: service.description,
          category: service.category
        })
      }
    }
    
    // Update pricing in separate collection
    if (form.pricing && form.pricing.length > 0) {
      for (const pricing of form.pricing.filter(p => p.amount && parseFloat(p.amount) > 0)) {
        await profileStore.createPricing(profileId.value, {
          type: pricing.type as 'hourly' | 'daily' | 'event' | 'custom',
          amount: parseInt(pricing.amount),
          currency: 'USD',
          description: pricing.description || ''
        })
      }
    }
    
    // Upload new media files using store (only non-existing files)
    for (const uploadedFile of uploadedFiles.value) {
      if (!uploadedFile.existing && uploadedFile.file) {
        await profileStore.uploadMedia(profileId.value, uploadedFile.file, {
          blur: uploadedFile.blur
        })
      }
    }
    
    // Clear any errors and show success
    authStore.clearError()
    console.log('Profile updated successfully')
    
    // Redirect to profiles page
    router.push('/escort/profiles')
  } catch (error) {
    console.error('Error saving profile:', error)
    authStore.setError('Failed to save profile. Please try again.')
  } finally {
    isSaving.value = false
  }
}

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
  <div class="edit-profile">
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
        <h1>Edit Your Professional Profile</h1>
        <p>Update your presence and connect with quality clients</p>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>
    
    <div v-else class="profile-editor">
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
      
      <form @submit.prevent="saveProfile" class="profile-form">
        <!-- Step 1: Basic Information -->
        <div v-if="currentStep === 1" class="form-section">
          <div class="section-header">
            <h2>Basic Information</h2>
            <p class="section-subtitle">Update your professional details</p>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label for="name">
                Profile Name
                <span class="required">*</span>
                <span class="field-hint">Your professional name clients will see</span>
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
            </div>
          
            <div class="form-group">
              <label for="age">
                Age
                <span class="required">*</span>
                <span class="field-hint">Must be 18 or older</span>
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
            </div>
          </div>
          
          <LocationDropdowns 
            v-model="form.location"
            :required="true"
          />
          
          <div class="form-group full-width">
            <label for="description">
              Short Description
              <span class="required">*</span>
              <span class="field-hint">A captivating intro that appears in search results</span>
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
          </div>
          
          <div class="form-group full-width">
            <label for="bio">
              Detailed Bio
              <span class="field-hint">Share your personality, interests, and what makes you unique</span>
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
          </div>
        </div>
        
        <!-- Step 2: Services -->
        <div v-if="currentStep === 2" class="form-section">
          <div class="section-header">
            <h2>Services You Offer</h2>
            <p class="section-subtitle">Select the professional services you provide</p>
          </div>
          
          <div class="services-selection">
            <div class="services-grid">
              <div 
                v-for="service in availableServices" 
                :key="service.value"
                class="service-card"
                :class="{ 
                  'selected': selectedServices.includes(service.value),
                  'featured': service.featured 
                }"
                @click="toggleService(service.value)"
              >
                <div class="service-icon">{{ getServiceIcon(service.value) }}</div>
                <div class="service-info">
                  <h3>{{ service.label }}</h3>
                  <p>{{ service.description }}</p>
                </div>
                <div class="service-badge" v-if="service.featured">✨ Popular</div>
                <div class="selection-indicator">
                  <svg v-if="selectedServices.includes(service.value)" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedServices.length > 0" class="service-descriptions">
            <h3>Customize Your Service Descriptions</h3>
            <p class="section-description">Add personalized descriptions to attract the right clients</p>
            
            <div class="service-description-cards">
              <div 
                v-for="serviceValue in selectedServices" 
                :key="serviceValue"
                class="service-description-card"
              >
                <div class="service-header">
                  <div class="service-icon">{{ getServiceIcon(serviceValue) }}</div>
                  <h4>{{ getServiceLabel(serviceValue) }}</h4>
                </div>
                
                <div class="form-group">
                  <label>Your Personal Description</label>
                  <textarea 
                    v-model="serviceDescriptions[serviceValue]"
                    rows="3"
                    :placeholder="`Describe your ${getServiceLabel(serviceValue).toLowerCase()} service in detail...`"
                    class="form-textarea"
                    maxlength="500"
                  ></textarea>
                  <div class="char-count">{{ (serviceDescriptions[serviceValue] || '').length }}/500</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step 3: Pricing -->
        <div v-if="currentStep === 3" class="form-section">
          <div class="section-header">
            <h2>Set Your Rates</h2>
            <p class="section-subtitle">Professional pricing that reflects your value</p>
          </div>
          
          <div class="pricing-options">
            <div class="pricing-grid">
              <div 
                v-for="(pricing, index) in form.pricing" 
                :key="index"
                class="pricing-card"
              >
                <div class="pricing-header">
                  <div class="pricing-icon">
                    {{ pricing.type === 'hourly' ? '⏰' : pricing.type === 'daily' ? '📅' : pricing.type === 'event' ? '🎉' : '📦' }}
                  </div>
                  <h3>{{ pricing.type === 'hourly' ? 'Hourly Rate' : pricing.type === 'daily' ? 'Daily Rate' : pricing.type === 'event' ? 'Event Rate' : 'Custom Package' }}</h3>
                </div>
                
                <div class="form-group">
                  <label>Amount</label>
                  <div class="rate-input">
                    <span class="currency">$</span>
                    <input 
                      v-model="pricing.amount"
                      type="number"
                      min="0"
                      step="10"
                      placeholder="0"
                      class="form-input rate-field"
                    />
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Description (Optional)</label>
                  <input 
                    v-model="pricing.description"
                    type="text"
                    :placeholder="`e.g., What's included in your ${pricing.type} rate?`"
                    class="form-input"
                    maxlength="200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step 4: Availability -->
        <div v-if="currentStep === 4" class="form-section">
          <div class="section-header">
            <h2>Your Availability</h2>
            <p class="section-subtitle">Set your working hours and booking preferences</p>
          </div>
          
          <div class="availability-settings">
            <div class="working-hours">
              <h3>Working Hours</h3>
              <div class="hours-grid">
                <div 
                  v-for="(day, dayName) in form.workingHours" 
                  :key="dayName"
                  class="day-card"
                  :class="{ 'enabled': day.enabled }"
                >
                  <div class="day-header">
                    <label class="day-toggle">
                      <input 
                        type="checkbox" 
                        v-model="day.enabled" 
                        class="day-checkbox"
                      />
                      <span class="day-name">{{ String(dayName).charAt(0).toUpperCase() + String(dayName).slice(1) }}</span>
                    </label>
                  </div>
                  
                  <div v-if="day.enabled" class="time-inputs">
                    <div class="time-input-group">
                      <label>From</label>
                      <input 
                        type="time" 
                        v-model="day.start" 
                        class="form-input time-input"
                      />
                    </div>
                    <div class="time-divider">to</div>
                    <div class="time-input-group">
                      <label>Until</label>  
                      <input 
                        type="time" 
                        v-model="day.end" 
                        class="form-input time-input"
                      />
                    </div>
                  </div>
                  
                  <div v-else class="day-unavailable">
                    <span>Not Available</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="booking-preferences">
              <h3>Booking Preferences</h3>
              
              <div class="preferences-grid">
                <div class="preference-card">
                  <label class="preference-toggle">
                    <input 
                      type="checkbox" 
                      v-model="form.preferences.autoApproveBookings"
                      class="preference-checkbox"
                    />
                    <div class="toggle-content">
                      <h4>Auto-approve bookings</h4>
                      <p>Automatically accept booking requests that meet your criteria</p>
                    </div>
                  </label>
                </div>
                
                <div class="preference-card">
                  <label class="preference-toggle">
                    <input 
                      type="checkbox" 
                      v-model="form.preferences.requireDeposit"
                      class="preference-checkbox"
                    />
                    <div class="toggle-content">
                      <h4>Require deposit</h4>
                      <p>Request a deposit to secure bookings</p>
                    </div>
                  </label>
                  
                  <div v-if="form.preferences.requireDeposit" class="deposit-settings">
                    <div class="form-group">
                      <label>Deposit Percentage</label>
                      <div class="rate-input">
                        <input 
                          v-model="form.preferences.depositPercentage"
                          type="number"
                          min="10"
                          max="100"
                          step="5"
                          class="form-input"
                        />
                        <span class="unit">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="form-grid">
                <div class="form-group">
                  <label>Minimum Notice (hours)</label>
                  <input 
                    v-model="form.preferences.minimumNotice"
                    type="number"
                    min="1"
                    max="72"
                    placeholder="2"
                    class="form-input"
                  />
                </div>
              </div>
              
              <div class="form-group full-width">
                <label>Cancellation Policy</label>
                <textarea 
                  v-model="form.preferences.cancellationPolicy"
                  rows="3"
                  placeholder="Describe your cancellation policy (e.g., '24 hours notice required for cancellation without penalty')"
                  class="form-textarea"
                  maxlength="500"
                ></textarea>
                <div class="char-count">{{ (form.preferences.cancellationPolicy || '').length }}/500</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step 5: Media & Photos -->
        <div v-if="currentStep === 5" class="form-section">
          <div class="section-header">
            <h2>Photos & Media</h2>
            <p class="section-subtitle">Showcase your professional image</p>
          </div>
          
          <div class="media-upload-section">
            <div v-if="uploadedFiles.length > 0" class="uploaded-media">
              <div class="media-grid">
                <div 
                  v-for="(file, index) in uploadedFiles" 
                  :key="index"
                  class="media-item"
                >
                  <div class="media-preview" :class="{ 'blurred': file.blur }">
                    <!-- Image preview -->
                    <img 
                      v-if="file.file && file.file.type.startsWith('image/')" 
                      :src="file.preview" 
                      :alt="file.file.name"
                    />
                    <!-- Video preview -->
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
                    
                    <div class="media-overlay">
                      <button 
                        type="button" 
                        @click="removeFile(index)" 
                        class="remove-media-btn"
                        title="Remove media"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div class="media-controls">
                    <label v-if="file.file && file.file.type.startsWith('image/')" class="blur-toggle">
                      <input 
                        type="checkbox" 
                        v-model="file.blur"
                        @change="toggleBlur(index)"
                      />
                      <span>Blur faces for privacy</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="upload-area" @click="fileInput?.click()">
              <input 
                ref="fileInput"
                type="file" 
                multiple 
                @change="handleFileUpload"
                style="display: none;"
              />
              
              <div class="upload-content">
                <div class="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"/>
                  </svg>
                </div>
                <h3>Upload Files</h3>
                <p>Add photos, videos, and documents to showcase your services</p>
                <div class="upload-specs">
                  <span>All file types up to 5MB each</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step Navigation -->
        <div class="step-navigation">
          <button 
            v-if="currentStep > 1"
            @click="prevStep" 
            type="button"
            class="btn btn-outline"
          >
            ← Previous Step
          </button>
          
          <div class="step-progress">
            Step {{ currentStep }} of {{ totalSteps }}
          </div>
          
          <button 
            v-if="currentStep < totalSteps"
            @click="nextStep" 
            type="button"
            class="btn btn-primary"
            :disabled="!canProceedToStep(currentStep + 1)"
          >
            Next Step →
          </button>
          
          <button 
            v-if="currentStep === totalSteps"
            type="submit"
            class="btn btn-primary"
            :disabled="isSaving"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-profile {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: var(--spacing-lg);
}

.form-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: none;
    color: var(--color-accent);
    font-size: 1rem;
    cursor: pointer;
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(183, 110, 121, 0.1);
      transform: translateX(-2px);
    }
    
    svg {
      transition: transform 0.3s ease;
    }
    
    &:hover svg {
      transform: translateX(-2px);
    }
  }
  
  .header-content {
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      
      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.2rem;
      max-width: 600px;
      margin: 0 auto;
    }
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-text-lighter);
    border-top: 3px solid var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.profile-editor {
  max-width: 800px;
  margin: 0 auto;
}

/* Simple Step Indicator Styles */
.step-indicator-simple {
  margin-bottom: var(--spacing-xl);
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.steps-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
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
  
  &.clickable {
    cursor: pointer;
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
    
    .step-label {
      color: var(--color-text-dark);
    }
  }
  
  &:not(.clickable) {
    opacity: 0.5;
  }
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
}

.progress-line {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-text-lighter);
  z-index: 1;
}

.progress-line-fill {
  position: absolute;
  top: 20px;
  left: 0;
  height: 2px;
  background: var(--color-accent);
  transition: width 0.5s ease;
  z-index: 1;
}

.profile-form {
  .form-section {
    background: white;
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xxl);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    margin-bottom: var(--spacing-xl);
    
    .section-header {
      text-align: center;
      margin-bottom: var(--spacing-xl);
      
      h2 {
        color: var(--color-text-dark);
        margin-bottom: var(--spacing-sm);
        font-size: 1.8rem;
        font-weight: 600;
      }
      
      .section-subtitle {
        color: var(--color-text-light);
        font-size: 1rem;
      }
    }
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.form-group {
  margin-bottom: var(--spacing-lg);
  
  &.full-width {
    grid-column: 1 / -1;
  }
  
  label {
    display: block;
    color: var(--color-text-dark);
    font-weight: 500;
    margin-bottom: var(--spacing-sm);
    
    .required {
      color: #ef4444;
      margin-left: 2px;
    }
    
    .field-hint {
      display: block;
      color: var(--color-text-light);
      font-weight: 400;
      font-size: 0.85rem;
      margin-top: 2px;
    }
  }
}

.input-wrapper, .textarea-wrapper {
  position: relative;
  
  .input-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-light);
    pointer-events: none;
  }
}

.textarea-wrapper {
  .char-count {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 0.75rem;
    color: var(--color-text-light);
    background: white;
    padding: 2px 4px;
    border-radius: 4px;
  }
}

.form-input, .form-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(183, 110, 121, 0.1);
  }
  
  &::placeholder {
    color: var(--color-text-light);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  padding-bottom: 32px; // Space for char count
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-top: var(--spacing-xl);
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .step-progress {
    color: var(--color-text-light);
    font-weight: 500;
    font-size: 0.9rem;
    
    @media (max-width: 768px) {
      order: -1;
    }
  }
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
      transform: translateY(-1px);
    }
  }
  
  &.btn-outline {
    background-color: transparent;
    color: var(--color-text-dark);
    border: 1px solid var(--color-text-lighter);
    
    &:hover:not(:disabled) {
      background-color: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
}

@media (max-width: 768px) {
  .edit-profile {
    padding: var(--spacing-md);
  }
  
  .form-header {
    .header-content h1 {
      font-size: 1.8rem;
    }
  }
  
  .profile-form .form-section {
    padding: var(--spacing-lg);
  }
  
  .step-navigation {
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
}

/* Services Styles */
.services-selection {
  margin-bottom: var(--spacing-xl);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.service-card {
  position: relative;
  background: white;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--color-accent-light);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: var(--color-accent);
    background: linear-gradient(135deg, rgba(183, 110, 121, 0.05) 0%, rgba(183, 110, 121, 0.1) 100%);
    box-shadow: 0 0 0 3px rgba(183, 110, 121, 0.1);
  }
  
  &.featured {
    border-color: #fbbf24;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
      border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
    }
  }
}

.service-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-sm);
}

.service-info {
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-xs);
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  p {
    color: var(--color-text-light);
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
  }
}

.service-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
}

.selection-indicator {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
  
  .service-card.selected & {
    opacity: 1;
    transform: scale(1);
  }
}

.service-descriptions {
  margin-top: var(--spacing-xl);
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.3rem;
    font-weight: 600;
  }
  
  .section-description {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
}

.service-description-cards {
  display: grid;
  gap: var(--spacing-lg);
}

.service-description-card {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  
  .service-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    
    .service-icon {
      font-size: 1.5rem;
      margin: 0;
    }
    
    h4 {
      color: var(--color-text-dark);
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
  }
}

/* Pricing Styles */
.pricing-options {
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
  }
}

.pricing-card {
  background: white;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--color-accent-light);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .pricing-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    
    .pricing-icon {
      font-size: 1.5rem;
    }
    
    h3 {
      color: var(--color-text-dark);
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
  }
}

.rate-input {
  display: flex;
  align-items: center;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: border-color 0.3s ease;
  
  &:focus-within {
    border-color: var(--color-accent);
  }
  
  .currency {
    background: var(--color-background-alt);
    color: var(--color-text-dark);
    padding: 14px;
    font-weight: 500;
    border-right: 1px solid var(--color-text-lighter);
  }
  
  .rate-field {
    border: none;
    flex: 1;
    font-size: 1.1rem;
    font-weight: 500;
    
    &:focus {
      box-shadow: none;
    }
  }
  
  .unit {
    background: var(--color-background-alt);
    color: var(--color-text-dark);
    padding: 14px;
    font-weight: 500;
    border-left: 1px solid var(--color-text-lighter);
  }
}

/* Availability Styles */
.availability-settings {
  .working-hours {
    margin-bottom: var(--spacing-xl);
    
    h3 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-lg);
      font-size: 1.3rem;
      font-weight: 600;
    }
  }
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.day-card {
  background: white;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  transition: all 0.3s ease;
  
  &.enabled {
    border-color: var(--color-accent);
    background: linear-gradient(135deg, rgba(183, 110, 121, 0.05) 0%, rgba(183, 110, 121, 0.1) 100%);
  }
  
  .day-header {
    margin-bottom: var(--spacing-sm);
    
    .day-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;
      
      .day-checkbox {
        width: auto;
        margin: 0;
      }
      
      .day-name {
        font-weight: 600;
        color: var(--color-text-dark);
      }
    }
  }
  
  .time-inputs {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    
    .time-input-group {
      flex: 1;
      
      label {
        display: block;
        font-size: 0.8rem;
        color: var(--color-text-light);
        margin-bottom: 4px;
      }
      
      .time-input {
        width: 100%;
        padding: 8px 12px;
        font-size: 0.9rem;
      }
    }
    
    .time-divider {
      color: var(--color-text-light);
      font-weight: 500;
      margin-top: 20px;
    }
  }
  
  .day-unavailable {
    text-align: center;
    color: var(--color-text-light);
    font-style: italic;
    padding: var(--spacing-md) 0;
  }
}

.booking-preferences {
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    font-size: 1.3rem;
    font-weight: 600;
  }
}

.preferences-grid {
  display: grid;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.preference-card {
  background: white;
  border: 2px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.3s ease;
  
  .preference-toggle {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    cursor: pointer;
    
    .preference-checkbox {
      width: auto;
      margin: 0;
      margin-top: 2px;
    }
    
    .toggle-content {
      flex: 1;
      
      h4 {
        color: var(--color-text-dark);
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1.1rem;
        font-weight: 600;
      }
      
      p {
        color: var(--color-text-light);
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }
  }
  
  .deposit-settings {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--color-text-lighter);
  }
}

/* Media Upload Styles */
.media-upload-section {
  .uploaded-media {
    margin-bottom: var(--spacing-xl);
  }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.media-item {
  .media-preview {
    position: relative;
    width: 100%;
    height: 200px;
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    background: var(--color-background-alt);
    
    img, video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    &.blurred {
      img, video {
        filter: blur(10px);
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
    
    .media-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      
      .remove-media-btn {
        background: rgba(255, 255, 255, 0.9);
        color: #dc2626;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: white;
          transform: scale(1.1);
        }
      }
    }
    
    &:hover .media-overlay {
      opacity: 1;
    }
  }
  
  .media-controls {
    margin-top: var(--spacing-sm);
    
    .blur-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.9rem;
      color: var(--color-text-dark);
      cursor: pointer;
      
      input[type="checkbox"] {
        width: auto;
        margin: 0;
      }
    }
  }
}

.upload-area {
  border: 2px dashed var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xxl);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--color-background-alt);
  
  &:hover {
    border-color: var(--color-accent);
    background: rgba(183, 110, 121, 0.05);
  }
  
  .upload-content {
    .upload-icon {
      color: var(--color-accent);
      margin-bottom: var(--spacing-md);
    }
    
    h3 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 1.3rem;
      font-weight: 600;
    }
    
    p {
      color: var(--color-text-light);
      margin-bottom: var(--spacing-md);
      font-size: 1rem;
    }
    
    .upload-specs {
      color: var(--color-text-light);
      font-size: 0.9rem;
      
      span {
        background: white;
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid var(--color-text-lighter);
      }
    }
  }
}

@media (max-width: 768px) {
  .services-grid,
  .pricing-options .pricing-grid,
  .hours-grid,
  .media-grid {
    grid-template-columns: 1fr;
  }
  
  .service-card,
  .pricing-card,
  .day-card {
    min-width: unset;
  }
  
  .time-inputs {
    flex-direction: column;
    
    .time-divider {
      margin: var(--spacing-xs) 0;
    }
  }
  
  .upload-area {
    padding: var(--spacing-lg);
  }
}
</style>
