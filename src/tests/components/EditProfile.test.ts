import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import EditProfile from '../../views/escort/profiles/EditProfile.vue'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { createTestPinia } from '../helpers/store'
import { nextTick } from 'vue'

// Mock router
const mockPush = vi.fn()
const mockRoute = {
  params: { id: 'profile-123' }
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useRoute: () => mockRoute,
}))

// Mock child components
vi.mock('../../components/ErrorAlert.vue', () => ({
  default: { 
    name: 'ErrorAlert',
    template: '<div class="error-alert">{{ error }}</div>', 
    props: ['error'] 
  }
}))

vi.mock('../../components/forms/LocationDropdowns.vue', () => ({
  default: { 
    name: 'LocationDropdowns',
    template: '<div class="location-dropdowns"></div>', 
    props: ['modelValue', 'required'],
    emits: ['update:modelValue']
  }
}))

// Mock constants
vi.mock('../../constants/services', () => ({
  availableServices: [
    { value: 'dinner-dates', label: 'Dinner Dates', description: 'Elegant dinner companionship' },
    { value: 'travel-companion', label: 'Travel Companion', description: 'Travel companionship' },
    { value: 'event-accompaniment', label: 'Event Accompaniment', description: 'Event companionship' },
  ]
}))

describe('EditProfile Component', () => {
  let wrapper: any
  let authStore: any
  let profileStore: any
  let pinia: any

  const mockProfile = {
    $id: 'profile-123',
    id: 'profile-123',
    name: 'Existing Profile',
    age: 25,
    locationCity: 'New York',
    locationState: 'NY',
    locationCountry: 'USA',
    description: 'Existing description',
    bio: 'Existing bio',
    services: [
      {
        id: 'service-1',
        name: 'Dinner Dates',
        description: 'Elegant dinner companionship',
        category: 'dinner-dates'
      }
    ],
    pricing: [
      {
        id: 'pricing-1',
        type: 'hourly',
        amount: 200,
        description: 'Standard hourly rate'
      }
    ],
    media: [
      {
        id: 'media-1',
        url: 'http://example.com/image.jpg',
        blur: false
      }
    ],
    workingHours: JSON.stringify({
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '18:00' },
      sunday: { enabled: false, start: '09:00', end: '18:00' }
    }),
    preferencesAutoApproveBookings: false,
    preferencesRequireDeposit: true,
    preferencesDepositPercentage: 30,
    preferencesCancellationPolicy: '24 hours notice required',
    preferencesMinimumNotice: 2
  }

  beforeEach(async () => {
    // Reset mocks
    mockPush.mockClear()
    
    pinia = createTestPinia()
    setActivePinia(pinia)
    
    authStore = useAuthStore()
    profileStore = useProfileStore()
    
    // Mock store state
    authStore.$patch({
      isAuthenticated: true,
      user: {
        $id: 'user-123',
        prefs: { userType: 'escort' }
      },
      error: null
    })
    
    // Mock store methods
    vi.spyOn(profileStore, 'fetchProfile').mockResolvedValue(mockProfile)
    vi.spyOn(profileStore, 'updateProfile').mockResolvedValue(mockProfile)
    vi.spyOn(profileStore, 'createService').mockResolvedValue({ id: 'service-123' })
    vi.spyOn(profileStore, 'removeService').mockResolvedValue(undefined)
    vi.spyOn(profileStore, 'createPricing').mockResolvedValue({ id: 'pricing-123' })
    vi.spyOn(profileStore, 'updatePricing').mockResolvedValue({ id: 'pricing-123' })
    vi.spyOn(profileStore, 'uploadMedia').mockResolvedValue({ id: 'media-123' })
    vi.spyOn(profileStore, 'removeMedia').mockResolvedValue(undefined)
    vi.spyOn(authStore, 'setError').mockImplementation((msg) => { authStore.error = msg })
    vi.spyOn(authStore, 'clearError').mockImplementation(() => { authStore.error = null })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    beforeEach(async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await flushPromises()
    })

    it('should mount successfully', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('should load profile data on mount', async () => {
      expect(profileStore.fetchProfile).toHaveBeenCalledWith('profile-123')
    })

    it('should populate form with existing profile data', async () => {
      expect(wrapper.vm.form.name).toBe('Existing Profile')
      expect(wrapper.vm.form.age).toBe('25')
      expect(wrapper.vm.form.location.city).toBe('New York')
      expect(wrapper.vm.form.location.state).toBe('NY')
      expect(wrapper.vm.form.location.country).toBe('USA')
      expect(wrapper.vm.form.description).toBe('Existing description')
      expect(wrapper.vm.form.bio).toBe('Existing bio')
    })

    it('should populate services correctly', async () => {
      expect(wrapper.vm.selectedServices).toContain('dinner-dates')
      expect(wrapper.vm.serviceDescriptions['dinner-dates']).toBe('Elegant dinner companionship')
    })

    it('should populate pricing correctly', async () => {
      expect(wrapper.vm.form.pricing[0]).toMatchObject({
        type: 'hourly',
        amount: '200',
        description: 'Standard hourly rate'
      })
    })

    it('should populate media files correctly', async () => {
      expect(wrapper.vm.uploadedFiles).toHaveLength(1)
      expect(wrapper.vm.uploadedFiles[0]).toMatchObject({
        preview: 'http://example.com/image.jpg',
        blur: false,
        existing: true,
        id: 'media-1'
      })
    })
  })

  describe('Form Editing', () => {
    beforeEach(async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await flushPromises()
    })

    it('should update form fields', async () => {
      wrapper.vm.form.name = 'Updated Profile'
      wrapper.vm.form.age = '26'
      
      await nextTick()
      
      expect(wrapper.vm.form.name).toBe('Updated Profile')
      expect(wrapper.vm.form.age).toBe('26')
    })

    it('should add new services', async () => {
      wrapper.vm.currentStep = 2
      await nextTick()
      
      wrapper.vm.toggleService('travel-companion')
      wrapper.vm.serviceDescriptions['travel-companion'] = 'Luxury travel experiences'
      
      await nextTick()
      
      expect(wrapper.vm.selectedServices).toContain('travel-companion')
      expect(wrapper.vm.serviceDescriptions['travel-companion']).toBe('Luxury travel experiences')
    })

    it('should remove existing services', async () => {
      wrapper.vm.currentStep = 2
      await nextTick()
      
      wrapper.vm.toggleService('dinner-dates')
      
      await nextTick()
      
      expect(wrapper.vm.selectedServices).not.toContain('dinner-dates')
    })

    it('should add new pricing options', async () => {
      wrapper.vm.currentStep = 3
      await nextTick()
      
      wrapper.vm.addPricingOption()
      
      expect(wrapper.vm.form.pricing).toHaveLength(4)
      expect(wrapper.vm.form.pricing[3].type).toBe('custom')
    })

    it('should remove pricing options', async () => {
      wrapper.vm.currentStep = 3
      await nextTick()
      
      wrapper.vm.form.pricing.push({ type: 'custom', amount: '500', description: 'Custom rate' })
      const initialLength = wrapper.vm.form.pricing.length
      
      wrapper.vm.removePricingOption(3)
      
      expect(wrapper.vm.form.pricing).toHaveLength(initialLength - 1)
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await flushPromises()
    })

    it('should validate all required fields', () => {
      expect(wrapper.vm.hasMinimumRequirements()).toBe(true)
      
      // Remove required field
      wrapper.vm.form.name = ''
      expect(wrapper.vm.hasMinimumRequirements()).toBe(false)
      
      // Restore field
      wrapper.vm.form.name = 'Test Profile'
      expect(wrapper.vm.hasMinimumRequirements()).toBe(true)
    })

    it('should validate step progression', () => {
      // Can proceed to step 2
      expect(wrapper.vm.canProceedToStep(2)).toBe(true)
      
      // Remove required field
      wrapper.vm.form.description = ''
      expect(wrapper.vm.canProceedToStep(2)).toBe(false)
    })

    it('should validate service descriptions', () => {
      wrapper.vm.selectedServices = ['dinner-dates', 'travel-companion']
      wrapper.vm.serviceDescriptions = { 'dinner-dates': 'Description 1' }
      
      expect(wrapper.vm.canProceedToStep(3)).toBe(false)
      
      wrapper.vm.serviceDescriptions['travel-companion'] = 'Description 2'
      expect(wrapper.vm.canProceedToStep(3)).toBe(true)
    })
  })

  describe('Profile Saving', () => {
    beforeEach(async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await flushPromises()
      wrapper.vm.currentStep = 5
      await nextTick()
    })

    it('should save profile successfully', async () => {
      mockPush.mockClear()
      
      wrapper.vm.form.name = 'Updated Profile'
      wrapper.vm.selectedServices = ['dinner-dates', 'travel-companion']
      wrapper.vm.serviceDescriptions = {
        'dinner-dates': 'Updated dinner service',
        'travel-companion': 'New travel service'
      }
      
      await wrapper.vm.saveProfile()
      await flushPromises()
      
      // Check profile update was called
      expect(profileStore.updateProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({
          name: 'Updated Profile',
          age: 25,
          locationCity: 'New York',
          locationState: 'NY',
          locationCountry: 'USA',
          description: 'Existing description'
        })
      )
      
      // Check services were updated
      expect(profileStore.removeService).toHaveBeenCalledWith('service-1', 'profile-123')
      expect(profileStore.createService).toHaveBeenCalledTimes(2)
      
      // Check navigation
      expect(mockPush).toHaveBeenCalledWith('/escort/profiles')
    })

    it('should handle validation errors', async () => {
      authStore.clearError()
      wrapper.vm.form.name = ''
      
      await wrapper.vm.saveProfile()
      
      expect(authStore.setError).toHaveBeenCalledWith('Please fill in all required fields')
      expect(profileStore.updateProfile).not.toHaveBeenCalled()
    })

    it('should handle save errors', async () => {
      profileStore.updateProfile.mockRejectedValue(new Error('Update failed'))
      authStore.clearError()
      
      await wrapper.vm.saveProfile()
      await flushPromises()
      
      expect(authStore.setError).toHaveBeenCalledWith('Failed to save profile. Please try again.')
    })
  })

  describe('Media Management', () => {
    beforeEach(async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await flushPromises()
      wrapper.vm.currentStep = 5
      await nextTick()
    })

    it('should handle new file uploads', async () => {
      const file = new File(['test'], 'new.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [file]
        }
      }
      
      await wrapper.vm.handleFileUpload(event)
      await flushPromises()
      
      expect(wrapper.vm.uploadedFiles).toHaveLength(2)
      expect(wrapper.vm.uploadedFiles[1]).toMatchObject({
        file,
        blur: true,
        existing: false
      })
    })

    it('should remove existing media', async () => {
      profileStore.removeMedia.mockClear()
      
      await wrapper.vm.removeFile(0)
      await flushPromises()
      
      expect(profileStore.removeMedia).toHaveBeenCalledWith('media-1', 'profile-123')
      expect(wrapper.vm.uploadedFiles).toHaveLength(0)
    })

    it('should toggle blur on media', async () => {
      wrapper.vm.uploadedFiles[0].blur = false
      
      wrapper.vm.toggleBlur(0)
      
      expect(wrapper.vm.uploadedFiles[0].blur).toBe(true)
    })
  })

  describe('Navigation', () => {
    it('should navigate back to profiles list', async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      await nextTick()
      
      mockPush.mockClear()
      wrapper.vm.goBack()
      
      expect(mockPush).toHaveBeenCalledWith('/escort/profiles')
    })

    it('should show loading state while fetching profile', async () => {
      wrapper = mount(EditProfile, {
        global: {
          plugins: [pinia],
          stubs: {
            ErrorAlert: true,
            LocationDropdowns: true,
            RouterLink: { template: '<a><slot /></a>' }
          }
        }
      })
      
      expect(wrapper.vm.isLoading).toBe(false)
      
      const promise = wrapper.vm.loadProfile()
      expect(wrapper.vm.isLoading).toBe(true)
      
      await promise
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })
})