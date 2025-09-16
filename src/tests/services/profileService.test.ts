import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProfileService } from '../../services/profileService'
import { databases, storage, ID } from '../../lib/appwrite'
import type { EscortProfile, Service, PricingOption } from '../../types/profile'

// Mock Appwrite modules
vi.mock('../../lib/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    getDocument: vi.fn(),
    listDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  },
  storage: {
    createFile: vi.fn(),
    getFileView: vi.fn(),
    deleteFile: vi.fn(),
  },
  ID: {
    unique: vi.fn(() => 'test-id-' + Math.random()),
  },
  DATABASE_ID: 'test-db',
  PROFILES_COLLECTION_ID: 'test-profiles',
  SERVICES_COLLECTION_ID: 'test-services',
  PRICING_COLLECTION_ID: 'test-pricing',
  MEDIA_COLLECTION_ID: 'test-media',
  CALENDAR_COLLECTION_ID: 'test-calendar',
  MEDIA_BUCKET_ID: 'test-bucket',
}))

describe('ProfileService', () => {
  let profileService: ProfileService
  
  beforeEach(() => {
    profileService = new ProfileService()
    vi.clearAllMocks()
  })

  describe('createProfile', () => {
    it('should create a profile with default values', async () => {
      const mockProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        name: 'Test Profile',
        age: 25,
        status: 'draft',
      }
      
      vi.mocked(databases.createDocument).mockResolvedValue(mockProfile as any)
      
      const profileData = {
        name: 'Test Profile',
        age: 25,
        locationCity: 'New York',
        locationCountry: 'USA',
        description: 'Test description',
      }
      
      const result = await profileService.createProfile('user-123', profileData)
      
      expect(databases.createDocument).toHaveBeenCalledWith(
        '6890df67000788c3e8f6', // Hardcoded DATABASE_ID in service
        '6890e0b10016147d8374', // Hardcoded PROFILES_COLLECTION_ID in service
        expect.any(String),
        expect.objectContaining({
          userId: 'user-123',
          name: 'Test Profile',
          age: 25,
          locationCity: 'New York',
          locationCountry: 'USA',
          description: 'Test description',
          statsViews: 0,
          statsBookings: 0,
          statsRating: 0,
          statsReviewCount: 0,
          verificationIsVerified: false,
          verificationIdVerified: false,
          verificationPhotoVerified: false,
          status: 'draft',
        })
      )
      
      expect(result).toEqual(mockProfile)
    })

    it('should handle errors properly', async () => {
      const error = new Error('Database error')
      vi.mocked(databases.createDocument).mockRejectedValue(error)
      
      await expect(
        profileService.createProfile('user-123', { name: 'Test' })
      ).rejects.toThrow()
    })
  })

  describe('updateProfile', () => {
    it('should update a profile with new data', async () => {
      const mockUpdatedProfile = {
        $id: 'profile-123',
        name: 'Updated Profile',
        age: 26,
      }
      
      vi.mocked(databases.updateDocument).mockResolvedValue(mockUpdatedProfile as any)
      
      const updates = {
        name: 'Updated Profile',
        age: 26,
      }
      
      const result = await profileService.updateProfile('profile-123', updates)
      
      expect(databases.updateDocument).toHaveBeenCalledWith(
        'test-db',
        'test-profiles',
        'profile-123',
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(String),
        })
      )
      
      expect(result).toEqual(mockUpdatedProfile)
    })
  })

  describe('getProfile', () => {
    it('should fetch profile with all related collections', async () => {
      const mockProfile = {
        $id: 'profile-123',
        name: 'Test Profile',
        age: 25,
      }
      
      const mockServices = {
        documents: [
          { $id: 'service-1', name: 'Service 1', profileId: 'profile-123' },
          { $id: 'service-2', name: 'Service 2', profileId: 'profile-123' },
        ],
      }
      
      const mockPricing = {
        documents: [
          { $id: 'pricing-1', type: 'hourly', amount: 100, profileId: 'profile-123' },
        ],
      }
      
      const mockMedia = {
        documents: [
          { $id: 'media-1', url: 'http://test.com/image.jpg', profileId: 'profile-123' },
        ],
      }
      
      const mockCalendar = {
        documents: [],
      }
      
      vi.mocked(databases.getDocument).mockResolvedValue(mockProfile as any)
      vi.mocked(databases.listDocuments).mockImplementation((dbId, collectionId) => {
        switch (collectionId) {
          case 'test-services':
            return Promise.resolve(mockServices as any)
          case 'test-pricing':
            return Promise.resolve(mockPricing as any)
          case 'test-media':
            return Promise.resolve(mockMedia as any)
          case 'test-calendar':
            return Promise.resolve(mockCalendar as any)
          default:
            return Promise.resolve({ documents: [] } as any)
        }
      })
      
      const result = await profileService.getProfile('profile-123')
      
      expect(databases.getDocument).toHaveBeenCalledWith(
        'test-db',
        'test-profiles',
        'profile-123'
      )
      
      expect(databases.listDocuments).toHaveBeenCalledTimes(4)
      
      expect(result).toMatchObject({
        ...mockProfile,
        services: mockServices.documents,
        pricing: mockPricing.documents,
        media: mockMedia.documents,
        availability: expect.objectContaining({
          schedule: mockCalendar.documents,
        }),
      })
    })
  })

  describe('Service Management', () => {
    it('should create a service', async () => {
      const mockService = {
        $id: 'service-123',
        profileId: 'profile-123',
        name: 'Test Service',
        description: 'Test service description',
        category: 'companionship',
      }
      
      vi.mocked(databases.createDocument).mockResolvedValue(mockService as any)
      
      const serviceData = {
        name: 'Test Service',
        description: 'Test service description',
        category: 'companionship',
      }
      
      const result = await profileService.createService('profile-123', serviceData)
      
      expect(databases.createDocument).toHaveBeenCalledWith(
        'test-db',
        'test-services',
        expect.any(String),
        expect.objectContaining({
          profileId: 'profile-123',
          ...serviceData,
        })
      )
      
      expect(result).toEqual(mockService)
    })

    it('should delete a service', async () => {
      await profileService.deleteService('service-123')
      
      expect(databases.deleteDocument).toHaveBeenCalledWith(
        'test-db',
        'test-services',
        'service-123'
      )
    })
  })

  describe('Pricing Management', () => {
    it('should create a pricing option', async () => {
      const mockPricing = {
        $id: 'pricing-123',
        profileId: 'profile-123',
        type: 'hourly',
        amount: 200,
        currency: 'USD',
      }
      
      vi.mocked(databases.createDocument).mockResolvedValue(mockPricing as any)
      
      const pricingData = {
        type: 'hourly',
        amount: 200,
        currency: 'USD',
      }
      
      const result = await profileService.createPricing('profile-123', pricingData)
      
      expect(databases.createDocument).toHaveBeenCalledWith(
        'test-db',
        'test-pricing',
        expect.any(String),
        expect.objectContaining({
          profileId: 'profile-123',
          ...pricingData,
        })
      )
      
      expect(result).toEqual(mockPricing)
    })

    it('should update a pricing option', async () => {
      const mockUpdatedPricing = {
        $id: 'pricing-123',
        amount: 250,
      }
      
      vi.mocked(databases.updateDocument).mockResolvedValue(mockUpdatedPricing as any)
      
      const updates = { amount: 250 }
      
      const result = await profileService.updatePricing('pricing-123', updates)
      
      expect(databases.updateDocument).toHaveBeenCalledWith(
        'test-db',
        'test-pricing',
        'pricing-123',
        updates
      )
      
      expect(result).toEqual(mockUpdatedPricing)
    })
  })

  describe('Media Management', () => {
    it('should upload media file', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockUploadedFile = { $id: 'file-123' }
      const mockMedia = {
        $id: 'media-123',
        profileId: 'profile-123',
        url: 'http://test.com/file-123',
        type: 'photo',
        isBlurred: false,
      }
      
      vi.mocked(storage.createFile).mockResolvedValue(mockUploadedFile as any)
      vi.mocked(storage.getFileView).mockReturnValue('http://test.com/file-123' as any)
      vi.mocked(databases.createDocument).mockResolvedValue(mockMedia as any)
      
      const result = await profileService.uploadMedia('profile-123', mockFile, { blur: false })
      
      expect(storage.createFile).toHaveBeenCalledWith(
        'test-bucket',
        expect.any(String),
        mockFile
      )
      
      expect(databases.createDocument).toHaveBeenCalledWith(
        'test-db',
        'test-media',
        expect.any(String),
        expect.objectContaining({
          profileId: 'profile-123',
          url: 'http://test.com/file-123',
          type: 'photo',
          isBlurred: false,
        })
      )
      
      expect(result).toEqual(mockMedia)
    })
  })

  describe('deleteProfile', () => {
    it('should delete profile and all related documents', async () => {
      // Mock related documents
      const mockServices = {
        documents: [
          { $id: 'service-1' },
          { $id: 'service-2' },
        ],
      }
      
      const mockPricing = {
        documents: [
          { $id: 'pricing-1' },
        ],
      }
      
      const mockMedia = {
        documents: [
          { $id: 'media-1', fileId: 'file-1' },
        ],
      }
      
      const mockCalendar = {
        documents: [
          { $id: 'event-1' },
        ],
      }
      
      vi.mocked(databases.listDocuments).mockImplementation((dbId, collectionId) => {
        switch (collectionId) {
          case 'test-services':
            return Promise.resolve(mockServices as any)
          case 'test-pricing':
            return Promise.resolve(mockPricing as any)
          case 'test-media':
            return Promise.resolve(mockMedia as any)
          case 'test-calendar':
            return Promise.resolve(mockCalendar as any)
          default:
            return Promise.resolve({ documents: [] } as any)
        }
      })
      
      vi.mocked(databases.deleteDocument).mockResolvedValue({} as any)
      vi.mocked(storage.deleteFile).mockResolvedValue({} as any)
      
      await profileService.deleteProfile('profile-123')
      
      // Verify all related documents were queried
      expect(databases.listDocuments).toHaveBeenCalledTimes(4)
      
      // Verify all documents were deleted
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-services', 'service-1')
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-services', 'service-2')
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-pricing', 'pricing-1')
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-media', 'media-1')
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-calendar', 'event-1')
      expect(databases.deleteDocument).toHaveBeenCalledWith('test-db', 'test-profiles', 'profile-123')
      
      // Verify media file was deleted from storage
      expect(storage.deleteFile).toHaveBeenCalledWith('test-bucket', 'file-1')
    })
  })
})