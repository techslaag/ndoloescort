<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useProfileStore } from '../../../stores/profile'
import { useSubscriptionStore } from '../../../stores/subscription'
import ErrorAlert from '../../../components/ErrorAlert.vue'
import LocationDropdowns from '../../../components/forms/LocationDropdowns.vue'
import { availableServices } from '../../../constants/services'
import type { ProfileFormData } from '../../../types/profile'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const subscriptionStore = useSubscriptionStore()

const isLoading = ref(false)
const isSaving = ref(false)
const currentStep = ref(1)
const totalSteps = 5
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
const draftProfileId = ref<string | null>(null)

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

const isEscort = computed(() => userRole.value === 'escort')

const profilesRemaining = computed(() => subscriptionStore.profilesRemaining)
const canCreateNewProfile = computed(() => subscriptionStore.canCreateProfile)
const subscriptionPlan = computed(() => subscriptionStore.currentPlan)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isEscort.value) {
    router.push('/')
    return
  }

  // Load subscription data
  await subscriptionStore.loadUserSubscription()
  
  // Check if user can create a profile
  if (!subscriptionStore.canCreateProfile) {
    profileStore.setError('You have reached your monthly profile creation limit. Please upgrade your subscription to create more profiles.')
    return
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
  // Check Step 1: Basic Information (required)
  if (!form.name || !form.age || !form.location.city || !form.location.country || !form.description) {
    return false
  }
  
  // Check Step 2: Services (at least one service with description)
  if (selectedServices.value.length === 0 || 
      !selectedServices.value.every(service => serviceDescriptions.value[service])) {
    return false
  }
  
  // Check Step 3: Pricing (at least one pricing option)
  if (!form.pricing.some(p => p.amount && parseFloat(p.amount) > 0)) {
    return false
  }
  
  // Check Step 4: Availability (working hours configured)
  const hasWorkingHours = Object.values(form.workingHours).some(day => day.enabled)
  if (!hasWorkingHours) {
    return false
  }
  
  // Step 5: Media is optional
  return true
}

const canPublish = computed(() => hasMinimumRequirements())

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
      await profileStore.removeMedia(file.id, 'temp-profile-id')
    } catch (error) {
      console.error('Error removing media:', error)
      authStore.setError('Failed to remove media. Please try again.')
      return
    }
  }
  
  // Remove from the local array
  uploadedFiles.value.splice(index, 1)
}


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
    
    // Prepare profile data with whatever is filled
    const profileData = {
      name: form.name || 'Untitled Profile',
      age: form.age ? parseInt(form.age) : 18,
      locationCity: form.location.city || '',
      locationState: form.location.state || '',
      locationCountry: form.location.country || '',
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
    
    if (draftProfileId.value) {
      // Update existing draft
      await profileStore.updateProfile(draftProfileId.value, profileData)
    } else {
      // Create new draft profile
      const profile = await profileStore.createProfile(authStore.user!.$id, profileData)
      draftProfileId.value = profile.$id || profile.id
      
      // Increment subscription usage for new profile
      await subscriptionStore.incrementProfileUsage()
    }
    
    // Save services if any
    if (selectedServices.value.length > 0 && draftProfileId.value) {
      // First delete existing services for this profile
      try {
        const profile = profileStore.profiles.find(p => (p.$id || p.id) === draftProfileId.value)
        if (profile?.services && profile.services.length > 0) {
          for (const service of profile.services) {
            await profileStore.removeService(service.id, draftProfileId.value)
          }
        }
      } catch (error) {
        console.error('Error removing existing services:', error)
      }
      
      // Add new services
      for (const serviceValue of selectedServices.value) {
        if (serviceDescriptions.value[serviceValue]) {
          await profileStore.createService(draftProfileId.value, {
            name: getServiceLabel(serviceValue),
            description: serviceDescriptions.value[serviceValue],
            category: serviceValue
          })
        }
      }
    }
    
    // Save pricing if any
    if (draftProfileId.value) {
      // First delete existing pricing for this profile
      try {
        const profile = profileStore.profiles.find(p => (p.$id || p.id) === draftProfileId.value)
        if (profile?.pricing && profile.pricing.length > 0) {
          for (const pricing of profile.pricing) {
            await profileStore.updatePricing(pricing.id, { amount: 0 }) // Mark as deleted
          }
        }
      } catch (error) {
        console.error('Error removing existing pricing:', error)
      }
      
      // Add new pricing
      for (const pricing of form.pricing.filter(p => p.amount)) {
        await profileStore.createPricing(draftProfileId.value, {
          type: pricing.type as 'hourly' | 'daily' | 'event' | 'custom',
          amount: parseInt(pricing.amount),
          currency: 'USD',
          description: pricing.description || ''
        })
      }
    }
    
    // Upload media files if any
    if (draftProfileId.value) {
      for (const uploadedFile of uploadedFiles.value) {
        if (!uploadedFile.existing && uploadedFile.file) {
          await profileStore.uploadMedia(draftProfileId.value, uploadedFile.file, {
            blur: uploadedFile.blur
          })
        }
      }
    }
    
    // Show success message - we'll clear the error and could show a toast/notification
    authStore.clearError()
    console.log('Profile saved as draft successfully')
  } catch (error) {
    console.error('Error saving draft:', error)
    authStore.setError('Failed to save draft. Please try again.')
  } finally {
    isSaving.value = false
  }
}

const publishProfile = async () => {
  try {
    isLoading.value = true
    
    // Check minimum requirements
    if (!hasMinimumRequirements()) {
      authStore.setError('Please complete all required steps before publishing')
      return
    }
    
    // Prepare profile data with 'active' status
    const profileData = {
      name: form.name,
      age: parseInt(form.age),
      locationCity: form.location.city,
      locationState: form.location.state || '',
      locationCountry: form.location.country,
      description: form.description,
      bio: form.bio || '',
      workingHours: JSON.stringify(form.workingHours),
      availabilityAdvanceBookingDays: 30,
      preferencesAutoApproveBookings: form.preferences.autoApproveBookings,
      preferencesRequireDeposit: form.preferences.requireDeposit,
      preferencesDepositPercentage: form.preferences.requireDeposit ? parseInt(form.preferences.depositPercentage || '0') : null,
      preferencesCancellationPolicy: form.preferences.cancellationPolicy,
      preferencesMinimumNotice: parseInt(form.preferences.minimumNotice || '2'),
      status: 'active' as 'active' // Set as active when publishing
    }
    
    let profileId: string
    
    if (draftProfileId.value) {
      // Update existing draft to active
      await profileStore.updateProfile(draftProfileId.value, profileData)
      profileId = draftProfileId.value
    } else {
      // Create new active profile
      const profile = await profileStore.createProfile(authStore.user!.$id, profileData)
      profileId = profile.$id || profile.id
      
      // Increment subscription usage for new profile (if not already incremented during draft)
      await subscriptionStore.incrementProfileUsage()
    }
    
    // Create services in separate collection
    for (const serviceValue of selectedServices.value) {
      await profileStore.createService(profileId, {
        name: getServiceLabel(serviceValue),
        description: serviceDescriptions.value[serviceValue] || '',
        category: serviceValue 
      })
    }
    
    // Create pricing options in separate collection
    for (const pricing of form.pricing.filter(p => p.amount)) {
      await profileStore.createPricing(profileId, {
        type: pricing.type as 'hourly' | 'daily' | 'event' | 'custom',
        amount: parseInt(pricing.amount),
        currency: 'USD',
        description: pricing.description || ''
      })
    }
    
    // Upload media files
    for (const uploadedFile of uploadedFiles.value) {
      if (!uploadedFile.existing && uploadedFile.file) {
        await profileStore.uploadMedia(profileId, uploadedFile.file, {
          blur: uploadedFile.blur
        })
      }
    }
    
    // Redirect to profiles page
    router.push('/escort/profiles')
  } catch (error) {
    console.error('Error creating profile:', error)
    authStore.setError('Failed to create profile. Please try again.')
  } finally {
    isLoading.value = false
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
        <h1>Create Your Professional Profile</h1>
        <p>Build your presence and connect with quality clients</p>
        
        <!-- Subscription Status -->
        <div v-if="subscriptionPlan" class="subscription-status">
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
        
        <div class="header-stats">
          <div class="stat">
            <div class="stat-icon">📝</div>
            <div class="stat-text">
              <strong>{{ currentStep }} of {{ totalSteps }}</strong>
              <span>Steps Completed</span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-icon">⏱️</div>
            <div class="stat-text">
              <strong>~10 min</strong>
              <span>To Complete</span>
            </div>
          </div>
          <div class="stat" v-if="draftProfileId">
            <div class="stat-icon">💾</div>
            <div class="stat-text">
              <strong>Draft Saved</strong>
              <span>Auto-saving enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Simple Step Indicator -->
    <div class="step-indicator-simple">
      <div class="steps-progress">
        <div 
          v-for="(step, index) in steps" 
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
        <h2>Pricing Options</h2>
        <p class="section-description">Set flexible pricing for different durations and packages</p>
        
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
                  <span class="currency">$</span>
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
                <select v-model="pricing.type" :disabled="index < 3">
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
        <h2>Availability Settings</h2>
        <p class="section-description">Set your working hours and booking preferences</p>
        
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
        <h2>Photos, Videos & Documents</h2>
        <p class="section-description">Upload media files and documents to showcase your services</p>
        
        <div class="uploaded-media" v-if="uploadedFiles.length > 0">
          <div v-for="(file, index) in uploadedFiles" :key="index" class="media-item">
            <div class="media-preview" :class="{ blurred: file.blur }">
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
            </div>
            <div class="media-controls">
              <label v-if="file.file && file.file.type.startsWith('image/')" class="blur-toggle">
                <input type="checkbox" v-model="file.blur" />
                <span>Blur face</span>
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
            <span>Images, videos, documents up to 5MB each</span>
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
            :disabled="isLoading || !canPublish" 
            class="btn btn-primary"
            :title="!canPublish ? 'Complete all required steps to publish' : ''"
          >
            <span v-if="isLoading">Publishing...</span>
            <span v-else>Publish Profile</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped lang="scss">
.create-profile {
  padding: var(--spacing-xl);
  max-width: 800px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: var(--spacing-xxl);
  
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
  }
  
  .header-content {
    text-align: center;
    
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2.5rem;
      font-weight: 700;
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.2rem;
      margin-bottom: var(--spacing-xl);
    }
  }
  
  .header-stats {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xl);
    padding: var(--spacing-lg);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-lg);
    
    .stat {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      
      .stat-icon {
        font-size: 2rem;
      }
      
      .stat-text {
        text-align: left;
        
        strong {
          display: block;
          color: var(--color-text-dark);
          font-size: 1.1rem;
        }
        
        span {
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
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
  
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      
      input[type="checkbox"] {
        width: auto;
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
    
    .nav-right {
      width: 100%;
      justify-content: center;
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
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.form-group {
  label {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    color: var(--color-text-dark);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    font-size: 0.95rem;
    
    .required {
      color: var(--color-danger);
      font-size: 1.1rem;
    }
    
    .field-hint {
      color: var(--color-text-light);
      font-weight: 400;
      font-size: 0.85rem;
      margin-left: auto;
    }
  }
  
  &.full-width {
    grid-column: 1 / -1;
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
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-light);
    }
    
    &::placeholder {
      color: var(--color-text-lighter);
    }
  }
  
  .input-icon {
    position: absolute;
    right: var(--spacing-md);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-light);
    pointer-events: none;
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
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-light);
    }
  }
  
  .char-count {
    position: absolute;
    bottom: var(--spacing-sm);
    right: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--color-text-light);
    background: white;
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
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
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
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
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
</style> 