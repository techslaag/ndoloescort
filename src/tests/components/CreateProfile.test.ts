import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import CreateProfile from '../../views/escort/profiles/CreateProfile.vue'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { useSubscriptionStore } from '../../stores/subscription'
import { createTestPinia } from '../helpers/store'
import { nextTick } from 'vue'

// Mock router before importing components
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  currentRoute: { value: { path: '/escort/profiles/create' } }
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => ({
    params: {},
    query: {},
    path: '/escort/profiles/create',
  }),
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

describe('CreateProfile Component', () => {
  let wrapper: any
  let authStore: any
  let profileStore: any
  let subscriptionStore: any
  let pinia: any

  beforeEach(async () => {
    // Reset mocks
    mockPush.mockClear()
    
    pinia = createTestPinia()
    setActivePinia(pinia)
    
    authStore = useAuthStore()
    profileStore = useProfileStore()
    subscriptionStore = useSubscriptionStore()
    
    // Mock store state
    authStore.$patch({
      isAuthenticated: true,
      user: {
        $id: 'user-123',
        prefs: { userType: 'escort' }
      },
      error: null
    })
    
    // Set subscription store state directly
    subscriptionStore.$patch({
      canCreateProfile: true,
      profilesRemaining: 3,
      currentPlan: {
        tier: 'starter',
        name: 'Starter',
        profileLimit: 5
      }
    })
    
    // Mock store methods
    vi.spyOn(subscriptionStore, 'loadUserSubscription').mockResolvedValue(undefined)
    vi.spyOn(subscriptionStore, 'incrementProfileUsage').mockResolvedValue(undefined)
    vi.spyOn(profileStore, 'createProfile').mockResolvedValue({ id: 'profile-123', $id: 'profile-123' })
    vi.spyOn(profileStore, 'createService').mockResolvedValue({ id: 'service-123' })
    vi.spyOn(profileStore, 'createPricing').mockResolvedValue({ id: 'pricing-123' })
    vi.spyOn(profileStore, 'uploadMedia').mockResolvedValue({ id: 'media-123' })
    vi.spyOn(profileStore, 'updateProfile').mockResolvedValue({ id: 'profile-123' })
    vi.spyOn(authStore, 'setError').mockImplementation((msg) => { authStore.error = msg })
    vi.spyOn(authStore, 'clearError').mockImplementation(() => { authStore.error = null })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should mount successfully', async () => {
      wrapper = mount(CreateProfile, {
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
      expect(wrapper.exists()).toBe(true)
    })

    it('should load subscription data on mount', async () => {
      wrapper = mount(CreateProfile, {
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
      expect(subscriptionStore.loadUserSubscription).toHaveBeenCalled()
    })

    it('should redirect if user is not authenticated', async () => {
      authStore.$patch({ isAuthenticated: false })
      mockPush.mockClear()
      
      wrapper = mount(CreateProfile, {
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
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should redirect if user is not an escort', async () => {
      authStore.$patch({
        user: {
          $id: 'user-123',
          prefs: { userType: 'client' }
        }
      })
      
      wrapper = mount(CreateProfile, {
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
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('Form Steps Navigation', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
    })

    it('should start at step 1', () => {
      expect(wrapper.vm.currentStep).toBe(1)
    })

    it('should navigate to next step when requirements are met', async () => {
      // Fill required fields for step 1
      wrapper.vm.form.name = 'Test Profile'
      wrapper.vm.form.age = '25'
      wrapper.vm.form.location = { city: 'New York', country: 'USA' }
      wrapper.vm.form.description = 'Test description'
      
      await nextTick()
      
      // Should be able to proceed to step 2
      expect(wrapper.vm.canProceedToStep(2)).toBe(true)
      
      // Click next button
      wrapper.vm.nextStep()
      await nextTick()
      
      expect(wrapper.vm.currentStep).toBe(2)
    })

    it('should not navigate to next step when requirements are not met', async () => {
      // Don't fill required fields
      wrapper.vm.form.name = ''
      
      expect(wrapper.vm.canProceedToStep(2)).toBe(false)
      
      wrapper.vm.nextStep()
      await nextTick()
      
      expect(wrapper.vm.currentStep).toBe(1)
    })

    it('should navigate back to previous step', async () => {
      wrapper.vm.currentStep = 2
      await nextTick()
      
      wrapper.vm.prevStep()
      await nextTick()
      
      expect(wrapper.vm.currentStep).toBe(1)
    })
  })

  describe('Service Selection', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
      
      // Navigate to services step
      wrapper.vm.form.name = 'Test Profile'
      wrapper.vm.form.age = '25'
      wrapper.vm.form.location = { city: 'New York', country: 'USA' }
      wrapper.vm.form.description = 'Test description'
      wrapper.vm.currentStep = 2
      await nextTick()
    })

    it('should toggle service selection', async () => {
      expect(wrapper.vm.selectedServices).toHaveLength(0)
      
      wrapper.vm.toggleService('dinner-dates')
      await nextTick()
      
      expect(wrapper.vm.selectedServices).toContain('dinner-dates')
      
      wrapper.vm.toggleService('dinner-dates')
      await nextTick()
      
      expect(wrapper.vm.selectedServices).not.toContain('dinner-dates')
    })

    it('should require service descriptions', async () => {
      wrapper.vm.selectedServices = ['dinner-dates', 'travel-companion']
      await nextTick()
      
      // Without descriptions - should not be able to proceed
      expect(wrapper.vm.canProceedToStep(3)).toBe(false)
      
      // Add description for first service only
      wrapper.vm.serviceDescriptions['dinner-dates'] = 'Elegant dinner companionship'
      await nextTick()
      
      // Still should not be able to proceed (missing second description)
      expect(wrapper.vm.canProceedToStep(3)).toBe(false)
      
      // Add description for second service
      wrapper.vm.serviceDescriptions['travel-companion'] = 'Luxury travel experiences'
      await nextTick()
      
      // Now should be able to proceed
      expect(wrapper.vm.canProceedToStep(3)).toBe(true)
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
    })

    it('should validate all required fields before publishing', () => {
      expect(wrapper.vm.hasMinimumRequirements()).toBe(false)
      
      // Fill all required fields
      wrapper.vm.form.name = 'Test Profile'
      wrapper.vm.form.age = '25'
      wrapper.vm.form.location = { city: 'New York', country: 'USA' }
      wrapper.vm.form.description = 'Test description'
      wrapper.vm.selectedServices = ['dinner-dates']
      wrapper.vm.serviceDescriptions = { 'dinner-dates': 'Service description' }
      wrapper.vm.form.pricing[0].amount = '200'
      wrapper.vm.form.workingHours.monday.enabled = true
      
      expect(wrapper.vm.hasMinimumRequirements()).toBe(true)
    })

    it('should disable publish button when requirements not met', async () => {
      wrapper.vm.currentStep = 5
      await nextTick()
      
      const publishButton = wrapper.find('button[type="submit"]')
      expect(publishButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Profile Publishing', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
      
      // Fill all required fields
      wrapper.vm.form.name = 'Test Profile'
      wrapper.vm.form.age = '25'
      wrapper.vm.form.location = { city: 'New York', country: 'USA' }
      wrapper.vm.form.description = 'Test description'
      wrapper.vm.selectedServices = ['dinner-dates']
      wrapper.vm.serviceDescriptions = { 'dinner-dates': 'Service description' }
      wrapper.vm.form.pricing[0].amount = '200'
      wrapper.vm.form.workingHours.monday.enabled = true
      wrapper.vm.currentStep = 5
      await nextTick()
    })

    it('should publish profile successfully', async () => {
      await wrapper.vm.publishProfile()
      await flushPromises()
      
      expect(profileStore.createProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'Test Profile',
          age: 25,
          locationCity: 'New York',
          locationCountry: 'USA',
          description: 'Test description',
          status: 'active'
        })
      )
      
      expect(profileStore.createService).toHaveBeenCalled()
      expect(profileStore.createPricing).toHaveBeenCalled()
      expect(subscriptionStore.incrementProfileUsage).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/escort/profiles')
    })

    it('should handle publish errors', async () => {
      profileStore.createProfile.mockRejectedValue(new Error('Create failed'))
      
      await wrapper.vm.publishProfile()
      await flushPromises()
      
      expect(authStore.setError).toHaveBeenCalledWith(
        'Failed to create profile. Please try again.'
      )
    })
  })

  describe('Draft Saving', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
    })

    it('should save profile as draft', async () => {
      wrapper.vm.form.name = 'Draft Profile'
      wrapper.vm.form.description = 'Draft description'
      
      await wrapper.vm.saveAsDraft()
      await flushPromises()
      
      // The actual call includes more fields, so check the important ones
      expect(profileStore.createProfile).toHaveBeenCalled()
      const callArgs = profileStore.createProfile.mock.calls[0]
      expect(callArgs[0]).toBe('user-123')
      expect(callArgs[1].name).toBe('Draft Profile')
      expect(callArgs[1].description).toBe('Draft description')
      // Status is set in the component after profile creation
    })

    it('should update existing draft', async () => {
      wrapper.vm.draftProfileId = 'draft-123'
      
      await wrapper.vm.saveAsDraft()
      await flushPromises()
      
      expect(profileStore.updateProfile).toHaveBeenCalledWith(
        'draft-123',
        expect.any(Object)
      )
    })
  })

  describe('Media Upload', () => {
    beforeEach(async () => {
      wrapper = mount(CreateProfile, {
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
      wrapper.vm.currentStep = 5
      await nextTick()
    })

    it('should handle file upload', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      // Create a mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(function() {
          // Simulate async file read
          setTimeout(() => {
            this.onload({ target: { result: 'data:image/jpeg;base64,test' } })
          }, 0)
        }),
        onload: null,
        result: 'data:image/jpeg;base64,test'
      }
      
      global.FileReader = vi.fn(() => mockFileReader) as any
      
      const event = {
        target: {
          files: [file]
        }
      }
      
      await wrapper.vm.handleFileUpload(event)
      await flushPromises()
      await nextTick()
      
      expect(wrapper.vm.uploadedFiles).toHaveLength(1)
      expect(wrapper.vm.uploadedFiles[0]).toMatchObject({
        file,
        blur: true, // Images can be blurred
        preview: 'data:image/jpeg;base64,test'
      })
    })

    it('should reject large files', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [largeFile]
        }
      }
      
      await wrapper.vm.handleFileUpload(event)
      await flushPromises()
      
      expect(authStore.setError).toHaveBeenCalledWith(
        'large.jpg is too large. Maximum size is 5MB'
      )
      expect(wrapper.vm.uploadedFiles).toHaveLength(0)
    })

    it('should remove uploaded files', async () => {
      wrapper.vm.uploadedFiles = [
        { file: new File(['test'], 'test.jpg'), preview: 'data:...', blur: false }
      ]
      
      await wrapper.vm.removeFile(0)
      
      expect(wrapper.vm.uploadedFiles).toHaveLength(0)
    })
  })
})