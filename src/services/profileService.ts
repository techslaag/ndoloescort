import { 
  databases, 
  storage, 
  DATABASE_ID,
  PROFILES_COLLECTION_ID,
  SERVICES_COLLECTION_ID,
  PRICING_COLLECTION_ID,
  MEDIA_COLLECTION_ID,
  CALENDAR_COLLECTION_ID,
  MEDIA_BUCKET_ID
} from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import { handleAppwriteError } from '../utils/appwriteErrors'
import { validateProfileCompletion, canPublishProfile } from '../utils/profileValidation'
import type { EscortProfile, Service, PricingOption, MediaFile, CalendarEvent } from '../types/profile'

export class ProfileService {
  // Profile CRUD operations
  async createProfile(userId: string, profileData: any): Promise<any> {
    try {
      const documentData = {
        userId,
        ...profileData,
        // Set default values for stats
        statsViews: 0,
        statsBookings: 0,
        statsRating: 0,
        statsReviewCount: 0,
        // Set default verification status
        verificationIsVerified: false,
        verificationIdVerified: false,
        verificationPhotoVerified: false,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      console.log('ProfileService.createProfile - Creating document with data:', documentData)
      console.log('ProfileService.createProfile - Collection ID:', PROFILES_COLLECTION_ID)
      console.log('ProfileService.createProfile - Database ID:', DATABASE_ID)
      
      // Ensure we're using the correct collection ID
      const collectionId = '6890e0b10016147d8374' // PROFILES_COLLECTION_ID
      const databaseId = '6890df67000788c3e8f6' // DATABASE_ID
      
      console.log('Using explicit collection ID:', collectionId)
      
      const profile = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        documentData
      )
      return profile
    } catch (error) {
      console.error('Error creating profile:', error)
      throw new Error(handleAppwriteError(error, 'createProfile'))
    }
  }

  async updateProfile(profileId: string, updates: Partial<EscortProfile>): Promise<EscortProfile> {
    try {
      // If trying to activate profile, validate it first
      if (updates.status === 'active') {
        const currentProfile = await this.getProfile(profileId)
        // Only validate if the profile is not already active
        if (currentProfile.status !== 'active') {
          // For validation, use the current profile data but with draft status to check requirements
          const profileToValidate = { ...currentProfile, status: 'draft' }
          const { canPublish, reason } = canPublishProfile(profileToValidate)
          
          if (!canPublish) {
            throw new Error(`Cannot activate profile: ${reason}`)
          }
        }
      }
      
      const profile = await databases.updateDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        profileId,
        {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      )
      return profile as unknown as EscortProfile
    } catch (error) {
      console.error('Error updating profile:', error)
      throw new Error(handleAppwriteError(error, 'updateProfile'))
    }
  }

  async getProfile(profileId: string): Promise<EscortProfile> {
    try {
      // Fetch the main profile document
      const profile = await databases.getDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        profileId
      )
      
      console.log('ProfileService.getProfile - Raw profile from Appwrite:', {
        id: profile.$id,
        status: profile.status,
        allKeys: Object.keys(profile).filter(k => k.includes('status')),
        fullProfile: profile
      })

      // Fetch all related collections in parallel
      const [services, pricing, media, calendar] = await Promise.allSettled([
        // Fetch services
        databases.listDocuments(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        ),
        // Fetch pricing
        databases.listDocuments(
          DATABASE_ID,
          PRICING_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        ),
        // Fetch media
        databases.listDocuments(
          DATABASE_ID,
          MEDIA_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        ),
        // Fetch calendar events
        databases.listDocuments(
          DATABASE_ID,
          CALENDAR_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        )
      ])

      // Combine the profile with related data
      const completeProfile = {
        ...profile,
        services: services.status === 'fulfilled' ? services.value.documents : [],
        pricing: pricing.status === 'fulfilled' ? pricing.value.documents : [],
        media: media.status === 'fulfilled' ? media.value.documents : [],
        availability: {
          schedule: calendar.status === 'fulfilled' ? calendar.value.documents : [],
          ...profile.availability
        }
      }

      console.log('Complete profile with all collections:', completeProfile)
      return completeProfile as unknown as EscortProfile
    } catch (error) {
      console.error('Error getting profile:', error)
      throw new Error(handleAppwriteError(error, 'getProfile'))
    }
  }

  async getUserProfiles(userId: string): Promise<EscortProfile[]> {
    try {
      const profiles = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      // For each profile, fetch related collections
      const completeProfiles = await Promise.all(
        profiles.documents.map(async (profile) => {
          const profileId = profile.$id

          const [services, pricing, media, calendar] = await Promise.allSettled([
            databases.listDocuments(DATABASE_ID, SERVICES_COLLECTION_ID, [Query.equal('profileId', profileId)]),
            databases.listDocuments(DATABASE_ID, PRICING_COLLECTION_ID, [Query.equal('profileId', profileId)]),
            databases.listDocuments(DATABASE_ID, MEDIA_COLLECTION_ID, [Query.equal('profileId', profileId)]),
            databases.listDocuments(DATABASE_ID, CALENDAR_COLLECTION_ID, [Query.equal('profileId', profileId)])
          ])

          return {
            ...profile,
            id: profile.$id,
            services: services.status === 'fulfilled' ? services.value.documents : [],
            pricing: pricing.status === 'fulfilled' ? pricing.value.documents : [],
            media: media.status === 'fulfilled' ? media.value.documents : [],
            availability: {
              schedule: calendar.status === 'fulfilled' ? calendar.value.documents : [],
              ...profile.availability
            }
          }
        })
      )

      console.log('Complete user profiles with all collections:', completeProfiles)
      return completeProfiles as unknown as EscortProfile[]
    } catch (error) {
      console.error('Error getting user profiles:', error)
      throw new Error(handleAppwriteError(error, 'getUserProfiles'))
    }
  }

  // Service management
  async createService(profileId: string, serviceData: any): Promise<any> {
    try {
      const service = await databases.createDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          ...serviceData
        }
      )
      return service
    } catch (error) {
      console.error('Error creating service:', error)
      throw error
    }
  }

  async addService(profileId: string, service: Omit<Service, 'id'>): Promise<Service> {
    try {
      const newService = await databases.createDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          ...service
        }
      )
      return newService as unknown as Service
    } catch (error) {
      console.error('Error adding service:', error)
      throw error
    }
  }

  async updateService(serviceId: string, updates: Partial<Service>): Promise<Service> {
    try {
      const service = await databases.updateDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        serviceId,
        updates
      )
      return service as unknown as Service
    } catch (error) {
      console.error('Error updating service:', error)
      throw error
    }
  }

  async deleteService(serviceId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        serviceId
      )
    } catch (error) {
      console.error('Error deleting service:', error)
      throw error
    }
  }

  // Pricing management
  async createPricing(profileId: string, pricingData: any): Promise<any> {
    try {
      const pricing = await databases.createDocument(
        DATABASE_ID,
        PRICING_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          ...pricingData
        }
      )
      return pricing
    } catch (error) {
      console.error('Error creating pricing:', error)
      throw error
    }
  }

  async addPricing(profileId: string, pricing: Omit<PricingOption, 'id'>): Promise<PricingOption> {
    try {
      const newPricing = await databases.createDocument(
        DATABASE_ID,
        PRICING_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          ...pricing
        }
      )
      return newPricing as unknown as PricingOption
    } catch (error) {
      console.error('Error adding pricing:', error)
      throw error
    }
  }

  async updatePricing(pricingId: string, updates: Partial<PricingOption>): Promise<PricingOption> {
    try {
      const pricing = await databases.updateDocument(
        DATABASE_ID,
        PRICING_COLLECTION_ID,
        pricingId,
        updates
      )
      return pricing as unknown as PricingOption
    } catch (error) {
      console.error('Error updating pricing:', error)
      throw error
    }
  }

  // Media management
  async uploadMedia(
    profileId: string, 
    file: File, 
    options: { 
      blur?: boolean, 
      caption?: string 
    } = {}
  ): Promise<MediaFile> {
    try {
      // Upload original file
      const uploadedFile = await storage.createFile(
        MEDIA_BUCKET_ID,
        ID.unique(),
        file
      )

      // Get file URL
      const fileUrl = storage.getFileView(MEDIA_BUCKET_ID, uploadedFile.$id)

      // Create media record
      const media = await databases.createDocument(
        DATABASE_ID,
        MEDIA_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          url: fileUrl,
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          isBlurred: options.blur || false,
          caption: options.caption,
          uploadedAt: new Date().toISOString()
        }
      )

      // If blur is requested, process the image
      if (options.blur) {
        // This would be handled by a server function
        // For now, we'll store both URLs
        await this.processBlurredImage(uploadedFile.$id, media.$id)
      }

      return media as unknown as MediaFile
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }

  private async processBlurredImage(fileId: string, mediaId: string): Promise<void> {
    // This would typically be handled by a server-side function
    // that uses image processing libraries to blur faces
    // For now, this is a placeholder
    console.log('Processing blur for file:', fileId)
  }

  async deleteMedia(mediaId: string): Promise<void> {
    try {
      const media = await databases.getDocument(
        DATABASE_ID,
        MEDIA_COLLECTION_ID,
        mediaId
      )
      
      // Delete from storage
      // Extract file ID from URL if needed
      
      // Delete database record
      await databases.deleteDocument(
        DATABASE_ID,
        MEDIA_COLLECTION_ID,
        mediaId
      )
    } catch (error) {
      console.error('Error deleting media:', error)
      throw error
    }
  }

  // Calendar management
  async updateAvailability(
    profileId: string, 
    date: string, 
    slots: Array<{ start: string, end: string, available: boolean }>
  ): Promise<CalendarEvent[]> {
    try {
      const events: CalendarEvent[] = []
      
      for (const slot of slots) {
        const event = await databases.createDocument(
          DATABASE_ID,
          CALENDAR_COLLECTION_ID,
          ID.unique(),
          {
            profileId,
            date,
            startTime: slot.start,
            endTime: slot.end,
            type: slot.available ? 'available' : 'blocked'
          }
        )
        events.push(event as unknown as CalendarEvent)
      }
      
      return events
    } catch (error) {
      console.error('Error updating availability:', error)
      throw error
    }
  }

  async getAvailability(profileId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const events = await databases.listDocuments(
        DATABASE_ID,
        CALENDAR_COLLECTION_ID,
        [
          Query.equal('profileId', profileId),
          Query.greaterThanEqual('date', startDate),
          Query.lessThanEqual('date', endDate)
        ]
      )
      return events.documents as unknown as CalendarEvent[]
    } catch (error) {
      console.error('Error getting availability:', error)
      throw error
    }
  }

  async syncBookingWithCalendar(
    profileId: string, 
    bookingId: string, 
    date: string, 
    startTime: string, 
    endTime: string
  ): Promise<CalendarEvent> {
    try {
      const event = await databases.createDocument(
        DATABASE_ID,
        CALENDAR_COLLECTION_ID,
        ID.unique(),
        {
          profileId,
          date,
          startTime,
          endTime,
          type: 'booked',
          bookingId
        }
      )
      return event as unknown as CalendarEvent
    } catch (error) {
      console.error('Error syncing booking with calendar:', error)
      throw error
    }
  }

  // Profile statistics
  async incrementProfileView(profileId: string): Promise<void> {
    try {
      const profile = await this.getProfile(profileId)
      await this.updateProfile(profileId, {
        stats: {
          ...profile.stats,
          views: profile.stats.views + 1
        }
      })
    } catch (error) {
      console.error('Error incrementing profile view:', error)
      throw error
    }
  }

  // Profile validation
  async validateProfile(profileId: string) {
    try {
      const profile = await this.getProfile(profileId)
      return validateProfileCompletion(profile)
    } catch (error) {
      console.error('Error validating profile:', error)
      throw new Error(handleAppwriteError(error, 'validateProfile'))
    }
  }

  // Activate profile with validation
  async activateProfile(profileId: string): Promise<EscortProfile> {
    try {
      console.log('ProfileService.activateProfile - Starting with profileId:', profileId)
      
      const profile = await this.getProfile(profileId)
      console.log('ProfileService.activateProfile - Retrieved profile:', {
        id: profile.id || profile.$id,
        status: profile.status,
        name: profile.name,
        services: profile.services?.length,
        pricing: profile.pricing?.length,
        media: profile.media?.length,
        workingHours: profile.workingHours,
        location: { city: profile.locationCity, country: profile.locationCountry }
      })
      
      // If already active, just return it
      if (profile.status === 'active') {
        console.log('ProfileService.activateProfile - Profile is already active')
        return profile
      }
      
      // Validate with draft status to check requirements
      const profileToValidate = { ...profile, status: 'draft' }
      console.log('ProfileService.activateProfile - Profile to validate:', {
        originalStatus: profile.status,
        validationStatus: profileToValidate.status,
        profileKeys: Object.keys(profileToValidate).filter(k => k.includes('status'))
      })
      
      const { canPublish, reason } = canPublishProfile(profileToValidate)
      console.log('ProfileService.activateProfile - Validation result:', { canPublish, reason })
      
      if (!canPublish) {
        console.error('ProfileService.activateProfile - Validation failed:', {
          reason,
          profileStatus: profile.status,
          validationProfileStatus: profileToValidate.status
        })
        throw new Error(reason || 'Profile cannot be activated')
      }
      
      console.log('ProfileService.activateProfile - Updating profile status to active')
      return await this.updateProfile(profileId, { status: 'active' })
    } catch (error) {
      console.error('ProfileService.activateProfile - Error:', error)
      throw error
    }
  }

  // Delete profile and all related documents
  async deleteProfile(profileId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('ProfileService.deleteProfile called with:', {
        profileId,
        DATABASE_ID,
        PROFILES_COLLECTION_ID
      })
      
      // First verify the profile exists
      try {
        const profile = await databases.getDocument(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          profileId
        )
        console.log('Profile found:', profile)
      } catch (error: any) {
        console.error('Profile not found or error accessing:', error)
        if (error.code === 404) {
          throw new Error('Profile not found')
        }
        throw error
      }
      
      // First, get all related documents before deleting the profile
      
      // 1. Delete all services
      try {
        const services = await databases.listDocuments(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        )
        
        console.log(`Found ${services.documents.length} services to delete`)
        
        for (const service of services.documents) {
          await databases.deleteDocument(
            DATABASE_ID,
            SERVICES_COLLECTION_ID,
            service.$id
          )
        }
      } catch (error) {
        console.error('Error deleting services:', error)
      }
      
      // 2. Delete all pricing options
      try {
        const pricingOptions = await databases.listDocuments(
          DATABASE_ID,
          PRICING_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        )
        
        console.log(`Found ${pricingOptions.documents.length} pricing options to delete`)
        
        for (const pricing of pricingOptions.documents) {
          await databases.deleteDocument(
            DATABASE_ID,
            PRICING_COLLECTION_ID,
            pricing.$id
          )
        }
      } catch (error) {
        console.error('Error deleting pricing options:', error)
      }
      
      // 3. Delete all media files
      try {
        const mediaFiles = await databases.listDocuments(
          DATABASE_ID,
          MEDIA_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        )
        
        console.log(`Found ${mediaFiles.documents.length} media files to delete`)
        
        for (const media of mediaFiles.documents) {
          // Delete from storage bucket first
          if (media.fileId) {
            try {
              await storage.deleteFile(MEDIA_BUCKET_ID, media.fileId)
            } catch (error) {
              console.error(`Error deleting file ${media.fileId} from storage:`, error)
            }
          }
          
          // Delete the media document
          await databases.deleteDocument(
            DATABASE_ID,
            MEDIA_COLLECTION_ID,
            media.$id
          )
        }
      } catch (error) {
        console.error('Error deleting media files:', error)
      }
      
      // 4. Delete all calendar events
      try {
        const calendarEvents = await databases.listDocuments(
          DATABASE_ID,
          CALENDAR_COLLECTION_ID,
          [Query.equal('profileId', profileId)]
        )
        
        console.log(`Found ${calendarEvents.documents.length} calendar events to delete`)
        
        for (const event of calendarEvents.documents) {
          await databases.deleteDocument(
            DATABASE_ID,
            CALENDAR_COLLECTION_ID,
            event.$id
          )
        }
      } catch (error) {
        console.error('Error deleting calendar events:', error)
      }
      
      // 5. Finally, delete the profile document itself
      console.log('Attempting to delete profile document...')
      console.log('Using:', { DATABASE_ID, PROFILES_COLLECTION_ID, profileId })
      
      try {
        const result = await databases.deleteDocument(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          profileId
        )
        console.log('Delete document result:', result)
      } catch (deleteError: any) {
        console.error('Error deleting profile document:', deleteError)
        console.error('Delete error details:', {
          message: deleteError.message,
          code: deleteError.code,
          type: deleteError.type,
          response: deleteError.response
        })
        throw deleteError
      }
      
      console.log('Profile and all related documents deleted successfully')
      
      return {
        success: true,
        message: 'Profile and all related documents deleted successfully'
      }
      
    } catch (error: any) {
      console.error('Error deleting profile:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        type: error.type,
        response: error.response
      })
      throw error
    }
  }
}

export const profileService = new ProfileService()