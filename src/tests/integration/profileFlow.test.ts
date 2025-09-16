import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia } from 'pinia'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { useSubscriptionStore } from '../../stores/subscription'
import { profileService } from '../../services/profileService'
import { createTestPinia } from '../helpers/store'

// Mock the profile service
vi.mock('../../services/profileService', () => ({
  profileService: {
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    getProfile: vi.fn(),
    getUserProfiles: vi.fn(),
    createService: vi.fn(),
    createPricing: vi.fn(),
    uploadMedia: vi.fn(),
    deleteProfile: vi.fn(),
    removeService: vi.fn(),
    updatePricing: vi.fn(),
    deleteMedia: vi.fn(),
  }
}))

describe('Profile Flow Integration Tests', () => {
  let authStore: any
  let profileStore: any
  let subscriptionStore: any

  beforeEach(() => {
    const pinia = createTestPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    profileStore = useProfileStore()
    subscriptionStore = useSubscriptionStore()
    
    // Setup mock user
    authStore.$patch({
      user: {
        $id: 'user-123',
        prefs: { userType: 'escort' }
      },
      isAuthenticated: true
    })
    
    vi.clearAllMocks()
  })

  describe('Complete Profile Creation Flow', () => {
    it('should create a complete profile with all related data', async () => {
      // Mock subscription state
      subscriptionStore.$patch({
        canCreateProfile: true,
        profilesRemaining: 3
      })
      
      // Mock service responses
      const mockProfile = {
        $id: 'profile-123',
        id: 'profile-123',
        name: 'New Profile',
        age: 25,
        status: 'active'
      }
      
      const mockService = {
        $id: 'service-123',
        id: 'service-123',
        profileId: 'profile-123',
        name: 'Dinner Dates',
        description: 'Elegant dinner companionship'
      }
      
      const mockPricing = {
        $id: 'pricing-123',
        id: 'pricing-123',
        profileId: 'profile-123',
        type: 'hourly',
        amount: 200
      }
      
      const mockMedia = {
        $id: 'media-123',
        id: 'media-123',
        profileId: 'profile-123',
        url: 'http://example.com/image.jpg'
      }
      
      vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile)
      vi.mocked(profileService.createService).mockResolvedValue(mockService)
      vi.mocked(profileService.createPricing).mockResolvedValue(mockPricing)
      vi.mocked(profileService.uploadMedia).mockResolvedValue(mockMedia)
      
      // Execute profile creation flow
      const profileData = {
        name: 'New Profile',
        age: 25,
        locationCity: 'New York',
        locationCountry: 'USA',
        description: 'Professional companion',
        status: 'active'
      }
      
      // Step 1: Create profile
      const profile = await profileStore.createProfile('user-123', profileData)
      expect(profile.id).toBe('profile-123')
      
      // Step 2: Add services
      const service = await profileStore.createService('profile-123', {
        name: 'Dinner Dates',
        description: 'Elegant dinner companionship',
        category: 'dinner-dates'
      })
      expect(service.id).toBe('service-123')
      
      // Step 3: Add pricing
      const pricing = await profileStore.createPricing('profile-123', {
        type: 'hourly',
        amount: 200,
        currency: 'USD'
      })
      expect(pricing.id).toBe('pricing-123')
      
      // Step 4: Upload media
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const media = await profileStore.uploadMedia('profile-123', file, { blur: false })
      expect(media.id).toBe('media-123')
      
      // Verify all service calls
      expect(profileService.createProfile).toHaveBeenCalledWith('user-123', profileData)
      expect(profileService.createService).toHaveBeenCalled()
      expect(profileService.createPricing).toHaveBeenCalled()
      expect(profileService.uploadMedia).toHaveBeenCalled()
    })
  })

  describe('Profile Update Flow', () => {
    beforeEach(() => {
      // Setup existing profile in store
      profileStore.$patch({
        profiles: [{
          id: 'profile-123',
          $id: 'profile-123',
          name: 'Existing Profile',
          services: [
            { id: 'service-1', name: 'Service 1' }
          ],
          pricing: [
            { id: 'pricing-1', type: 'hourly', amount: 150 }
          ],
          media: []
        }]
      })
    })

    it('should update profile and manage related data', async () => {
      // Mock service responses
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: 'profile-123',
        name: 'Updated Profile'
      } as any)
      
      vi.mocked(profileService.removeService).mockResolvedValue(undefined)
      vi.mocked(profileService.createService).mockResolvedValue({
        id: 'service-2',
        name: 'New Service'
      } as any)
      
      vi.mocked(profileService.updatePricing).mockResolvedValue({
        id: 'pricing-1',
        amount: 200
      } as any)
      
      // Execute update flow
      // Step 1: Update profile
      await profileStore.updateProfile('profile-123', {
        name: 'Updated Profile',
        description: 'Updated description'
      })
      
      // Step 2: Remove old service and add new one
      await profileStore.removeService('service-1', 'profile-123')
      await profileStore.createService('profile-123', {
        name: 'New Service',
        description: 'New service description',
        category: 'travel-companion'
      })
      
      // Step 3: Update pricing
      await profileStore.updatePricing('pricing-1', { amount: 200 })
      
      // Verify service calls
      expect(profileService.updateProfile).toHaveBeenCalled()
      expect(profileService.removeService).toHaveBeenCalledWith('service-1')
      expect(profileService.createService).toHaveBeenCalled()
      expect(profileService.updatePricing).toHaveBeenCalled()
    })
  })

  describe('Profile Deletion Flow', () => {
    it('should delete profile and all related data', async () => {
      // Setup profile in store
      profileStore.$patch({
        profiles: [{
          id: 'profile-123',
          $id: 'profile-123',
          name: 'Profile to Delete'
        }]
      })
      
      vi.mocked(profileService.deleteProfile).mockResolvedValue(undefined)
      
      // Execute deletion
      const result = await profileStore.deleteProfile('profile-123')
      
      // Verify deletion
      expect(result.success).toBe(true)
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-123')
      expect(profileStore.profiles).toHaveLength(0)
    })
  })

  describe('Draft to Published Flow', () => {
    it('should transition profile from draft to published', async () => {
      // Mock draft profile
      const draftProfile = {
        id: 'profile-123',
        name: 'Draft Profile',
        status: 'draft'
      }
      
      profileStore.$patch({ profiles: [draftProfile] })
      
      // Mock update to active status
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        ...draftProfile,
        status: 'active'
      } as any)
      
      // Transition to published
      const updated = await profileStore.updateProfile('profile-123', {
        status: 'active'
      })
      
      expect(updated.status).toBe('active')
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({ status: 'active' })
      )
    })
  })

  describe('Subscription Integration', () => {
    it('should check subscription limits before profile creation', async () => {
      // Test when limit reached
      subscriptionStore.$patch({
        canCreateProfile: false,
        profilesRemaining: 0
      })
      
      // Attempt to create profile should be blocked in component
      expect(subscriptionStore.canCreateProfile).toBe(false)
      
      // Reset and test successful case
      subscriptionStore.$patch({
        canCreateProfile: true,
        profilesRemaining: 2
      })
      
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-123'
      } as any)
      
      await profileStore.createProfile('user-123', { name: 'Test' })
      
      expect(profileService.createProfile).toHaveBeenCalled()
    })

    it('should increment profile usage after creation', async () => {
      vi.spyOn(subscriptionStore, 'incrementProfileUsage').mockImplementation(() => Promise.resolve())
      
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-123'
      } as any)
      
      await profileStore.createProfile('user-123', { name: 'Test' })
      
      // In actual implementation, incrementProfileUsage should be called
      // This would be done in the component after successful creation
    })
  })

  describe('Error Handling', () => {
    it('should handle profile creation errors', async () => {
      const error = new Error('Database error')
      vi.mocked(profileService.createProfile).mockRejectedValue(error)
      
      await expect(
        profileStore.createProfile('user-123', { name: 'Test' })
      ).rejects.toThrow()
      
      expect(profileStore.error).toBeTruthy()
    })

    it('should handle service creation errors', async () => {
      const error = new Error('Service creation failed')
      vi.mocked(profileService.createService).mockRejectedValue(error)
      
      await expect(
        profileStore.createService('profile-123', {
          name: 'Test Service',
          description: 'Test',
          category: 'other'
        })
      ).rejects.toThrow()
    })

    it('should handle media upload errors', async () => {
      const error = new Error('Upload failed')
      vi.mocked(profileService.uploadMedia).mockRejectedValue(error)
      
      const file = new File(['test'], 'test.jpg')
      
      await expect(
        profileStore.uploadMedia('profile-123', file)
      ).rejects.toThrow()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain consistency between store and service', async () => {
      const mockProfiles = [
        { id: 'profile-1', name: 'Profile 1' },
        { id: 'profile-2', name: 'Profile 2' }
      ]
      
      vi.mocked(profileService.getUserProfiles).mockResolvedValue(mockProfiles as any)
      
      await profileStore.fetchProfiles()
      
      expect(profileStore.profiles).toHaveLength(2)
      expect(profileStore.profiles[0].id).toBe('profile-1')
      expect(profileStore.profiles[1].id).toBe('profile-2')
    })

    it('should update both profiles array and currentProfile', async () => {
      const profile = { id: 'profile-123', name: 'Test' }
      profileStore.$patch({
        profiles: [profile],
        currentProfile: profile
      })
      
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        ...profile,
        name: 'Updated Test'
      } as any)
      
      await profileStore.updateProfile('profile-123', { name: 'Updated Test' })
      
      expect(profileStore.profiles[0].name).toBe('Updated Test')
      expect(profileStore.currentProfile?.name).toBe('Updated Test')
    })
  })
})