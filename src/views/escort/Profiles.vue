<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { useMessagingStore } from '../../stores/messaging'
import { useSubscriptionStore } from '../../stores/subscription'
import { useToast } from '../../composables/useToast'
import ErrorAlert from '../../components/ErrorAlert.vue'
import ProfileVerificationButton from '../../components/escort/ProfileVerificationButton.vue'
import DeleteProfileModal from '../../components/modals/DeleteProfileModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const messagingStore = useMessagingStore()
const subscriptionStore = useSubscriptionStore()
const { success, error: showError } = useToast()

// Delete modal state
const showDeleteModal = ref(false)
const profileToDelete = ref<any>(null)
const isDeletingProfile = ref(false)


const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const isEscort = computed(() => userRole.value === 'escort')

// Get unread message count for a specific profile
const getUnreadCountForProfile = (profileId: string) => {
  // Filter conversations by profile
  const profileConversations = messagingStore.conversations.filter(conv => {
    // Check if the conversation involves this specific profile
    // Look for conversations where the profileId is a participant with escort role
    return conv.participants.includes(profileId) && 
           conv.participantRoles[profileId] === 'escort'
  })
  
  // Count unread messages across all conversations for this profile
  let unreadCount = 0
  profileConversations.forEach(conv => {
    const messages = messagingStore.messages[conv.$id] || []
    messages.forEach(msg => {
      if (!msg.isRead && msg.senderId !== authStore.user?.$id) {
        unreadCount++
      }
    })
  })
  
  return unreadCount
}

const getProfileCompletion = (profile: any) => {
  let completedSteps = 0
  const totalSteps = 5
  
  // Step 1: Basic Information (name, age, location, description)
  const basicInfoComplete = {
    name: !!profile.name && profile.name.trim().length >= 2,
    age: !!profile.age && profile.age >= 18,
    location: !!(profile.locationCity || profile.location?.city) && 
              !!(profile.locationCountry || profile.location?.country),
    description: !!profile.description && profile.description.trim().length >= 50
  }
  const basicComplete = Object.values(basicInfoComplete).every(v => v)
  if (basicComplete) completedSteps++
  
  console.log('Profile completion debug:', {
    profileId: profile.$id || profile.id,
    basicInfoComplete,
    basicComplete,
    completedSteps
  })
  
  // Step 2: Services (at least one service with description)
  const hasServices = profile.services && profile.services.length > 0
  const servicesComplete = hasServices && profile.services.every((s: any) => 
    s.name && s.description && s.description.length >= 20
  )
  if (servicesComplete) completedSteps++
  
  // Step 3: Pricing (at least one valid pricing option)
  const hasPricing = profile.pricing && profile.pricing.length > 0
  const pricingComplete = hasPricing && profile.pricing.some((p: any) => 
    p.amount && p.amount > 0 && p.type
  )
  if (pricingComplete) completedSteps++
  
  // Step 4: Availability (at least one working day)
  let availabilityComplete = false
  if (profile.availability?.workingHours) {
    const workingHours = profile.availability.workingHours
    availabilityComplete = Object.values(workingHours).some((day: any) => day.enabled)
  } else if (profile.workingHours) {
    // Handle flat structure
    try {
      const workingHours = typeof profile.workingHours === 'string' 
        ? JSON.parse(profile.workingHours) 
        : profile.workingHours
      availabilityComplete = Object.values(workingHours).some((day: any) => day.enabled)
    } catch (e) {
      availabilityComplete = false
    }
  }
  if (availabilityComplete) completedSteps++
  
  // Step 5: Media (at least one photo)
  const hasMedia = profile.media && profile.media.length > 0
  const hasPhotos = hasMedia && profile.media.some((m: any) => 
    m.type === 'photo' || m.mediaType === 'photo' || (m.url && !m.url.includes('.mp4'))
  )
  if (hasPhotos) completedSteps++
  
  return Math.round((completedSteps / totalSteps) * 100)
}

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (!isEscort.value) {
    router.push('/')
    return
  }
  
  loadProfiles()
  
  // Initialize messaging store to get unread counts
  messagingStore.loadConversations()
  
  // Load subscription data
  subscriptionStore.loadUserSubscription()
})

const loadProfiles = async () => {
  try {
    if (authStore.user) {
      await profileStore.fetchUserProfiles(authStore.user.$id)
    }
  } catch (error) {
    console.error('Error loading profiles:', error)
  }
}

const editProfile = (profileId: string) => {
  router.push(`/escort/profiles/${profileId}/edit`)
}

const getProfileBackgroundImage = (profile: any) => {
  // Check if profile has media
  if (!profile.media || profile.media.length === 0) {
    return null
  }
  
  // Find the first photo (not video)
  const firstPhoto = profile.media.find((m: any) => m.type === 'photo' || !m.type)
  
  if (firstPhoto) {
    return firstPhoto.url || firstPhoto.thumbnailUrl
  }
  
  // If only videos, return null (will show placeholder)
  return null
}

const hasOnlyVideos = (profile: any) => {
  if (!profile.media || profile.media.length === 0) return false
  return profile.media.every((m: any) => m.type === 'video')
}

const canCreateNewProfile = computed(() => {
  // Free plan users can only have 1 profile
  if (subscriptionStore.isFreeTier && profileStore.profiles.length >= 1) {
    return false
  }
  // Check general subscription limits
  return subscriptionStore.canCreateProfile
})

const createProfileButtonText = computed(() => {
  if (!canCreateNewProfile.value) {
    if (subscriptionStore.isFreeTier) {
      return 'Upgrade to Create More'
    }
    return 'Profile Limit Reached'
  }
  return profileStore.profiles.length === 0 ? 'Create Your First Profile' : 'Create New Profile'
})


const viewAnalytics = (profileId: string) => {
  // This is just a safety check since the button should be disabled
  const profile = profileStore.profiles.find(p => ((p as any).$id || p.id) === profileId)
  if (profile && profile.status !== 'active') {
    profileStore.setError('Analytics are only available for active profiles')
    return
  }
  router.push(`/escort/profiles/${profileId}/analytics`)
}

const openChat = (profile: any) => {
  // Safety check since the button should be disabled
  if (profile.status !== 'active') {
    profileStore.setError('Chat is only available for active profiles')
    return
  }
  
  const profileId = profile.$id || profile.id
  const profileName = profile.name
  
  // Navigate to messages with profile context
  // This will show conversations related to this profile
  router.push({
    name: 'Messages',
    query: {
      profileId: profileId,
      profileName: profileName,
      filter: 'profile' // Filter to show only messages for this profile
    }
  })
}

const handleErrorClear = () => {
  authStore.clearError()
  profileStore.clearError()
}

const createNewProfile = async () => {
  try {
    // If user cannot create profile, go to subscription page
    if (!canCreateNewProfile.value) {
      router.push('/subscription')
      return
    }
    
    // Load subscription data first
    await subscriptionStore.loadUserSubscription()
    
    // Double-check if user is on free plan and already has profiles
    if (subscriptionStore.isFreeTier && profileStore.profiles.length >= 1) {
      showError('Free plan allows only 1 profile. Please upgrade to create more profiles.')
      router.push('/subscription')
      return
    }
    
    // Check general profile creation limits
    if (!subscriptionStore.canCreateProfile) {
      showError(`You have reached your profile limit. ${subscriptionStore.profilesRemaining} profiles remaining this month.`)
      router.push('/subscription')
      return
    }
    
    router.push('/escort/profiles/create')
  } catch (error) {
    console.error('Error checking profile limits:', error)
    showError('Unable to verify profile limits. Please try again.')
  }
}

const showDeleteConfirmation = (profile: any) => {
  profileToDelete.value = profile
  showDeleteModal.value = true
}

const confirmDeleteProfile = async () => {
  if (!profileToDelete.value) return
  
  const profileId = profileToDelete.value.$id || profileToDelete.value.id
  const profileName = profileToDelete.value.name || 'Unnamed Profile'
  
  console.log('=== confirmDeleteProfile START ===')
  console.log('Attempting to delete profile:', { 
    profileId, 
    profileName, 
    profile: profileToDelete.value,
    hasId: !!profileId,
    profileData: JSON.stringify(profileToDelete.value)
  })
  
  if (!profileId) {
    console.error('No profile ID found')
    profileStore.setError('Cannot delete profile: No profile ID found')
    return
  }
  
  try {
    isDeletingProfile.value = true
    console.log('Calling profileStore.deleteProfile...')
    const result = await profileStore.deleteProfile(profileId)
    console.log('Delete result:', result)
    
    // Close modal and reset state
    showDeleteModal.value = false
    profileToDelete.value = null
    
    // Show success message
    if (result?.message) {
      success(result.message)
    }
    
    console.log('Success! Not reloading profiles - they should be updated automatically')
    // Don't reload - the store should have already updated the list
    // Commenting out the reload to see if the reactive update works
    // if (authStore.user) {
    //   await profileStore.fetchUserProfiles(authStore.user.$id)
    // }
  } catch (error: any) {
    console.error('=== confirmDeleteProfile ERROR ===')
    console.error('Error deleting profile:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response,
      stack: error.stack
    })
    // Show error to user
    const errorMessage = `Failed to delete profile: ${error.message || 'Unknown error'}`
    profileStore.setError(errorMessage)
    
    // Also show toast for immediate feedback
    showError(errorMessage)
  } finally {
    isDeletingProfile.value = false
    console.log('=== confirmDeleteProfile END ===')
  }
}

const closeDeleteModal = () => {
  if (!isDeletingProfile.value) {
    showDeleteModal.value = false
    profileToDelete.value = null
  }
}


</script>

<template>
  <div class="escort-profiles">
    <ErrorAlert 
      :error="authStore.error || profileStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="profiles-header">
      <h1>My Profiles</h1>
      <button 
        @click="createNewProfile" 
        class="btn btn-primary"
        :title="!canCreateNewProfile ? 'Upgrade to create more profiles' : 'Create a new escort profile'"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>{{ createProfileButtonText }}</span>
      </button>
    </div>
    
    <div v-if="profileStore.isLoading" class="loading">
      Loading profiles...
    </div>
    
    <div v-else-if="profileStore.profiles.length === 0" class="empty-state">
      <h3>No profiles yet</h3>
      <p>Create your first escort profile to start receiving bookings</p>
      <button 
        @click="createNewProfile" 
        class="btn btn-primary"
        :title="!canCreateNewProfile ? 'Upgrade to create more profiles' : 'Create your first escort profile'"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>{{ createProfileButtonText }}</span>
      </button>
    </div>
    
    <div v-else class="profiles-grid">
      <div 
        v-for="profile in profileStore.profiles" 
        :key="(profile as any).$id || (profile as any).id"
        class="profile-card"
        :class="{ 
          'has-image': (profile as any).media && (profile as any).media.length > 0,
          'is-active': profile.status === 'active',
          'video-only': hasOnlyVideos(profile),
          'is-verified': profile.verification?.isVerified,
          'is-draft': profile.status === 'draft'
        }"
      >
        <!-- Card Background -->
        <div 
          class="card-background"
          :class="{ 'video-only': hasOnlyVideos(profile) }"
          :style="{
            backgroundImage: getProfileBackgroundImage(profile) ? `url('${getProfileBackgroundImage(profile)}')` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }"
        >
          <div class="background-overlay"></div>
          <!-- Video indicator for video-only profiles -->
          <div v-if="hasOnlyVideos(profile)" class="video-indicator">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM15 16H5V8h10v8z"/>
            </svg>
            <span>Video Profile</span>
          </div>
        </div>
        <!-- Card Content -->
        <div class="profile-content">
          <!-- Profile Header -->
          <div class="profile-header">
            <div class="profile-info">
              <h3 class="profile-name">
                {{ profile.name }}
                <span v-if="profile.verification?.isVerified" class="verified-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L3.5 7v6c0 5.55 3.84 10.74 8.5 12 4.66-1.26 8.5-6.45 8.5-12V7L12 2zm-2 16l-4-4 1.41-1.41L10 15.17l6.59-6.59L18 10l-8 8z"/>
                  </svg>
                </span>
              </h3>
            </div>
            
            <div class="profile-status-section">
              <div :class="['status-indicator', profile.status]">
                <span class="status-dot"></span>
                <span class="status-text">{{ profile.status }}</span>
              </div>
            </div>
          </div>
          
          <!-- Profile Completion -->
          <div class="profile-completion">
            <div class="completion-header">
              <span class="completion-label">Profile Completion</span>
              <span class="completion-percentage">{{ getProfileCompletion(profile) }}%</span>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions">
            <button 
              @click="viewAnalytics((profile as any).$id || (profile as any).id)" 
              class="action-btn"
              :disabled="profile.status !== 'active'"
              :title="profile.status !== 'active' ? 'Analytics only available for active profiles' : 'View profile analytics'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              Analytics
            </button>
            <button @click="editProfile((profile as any).$id || (profile as any).id)" class="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Edit
            </button>
            <button 
              @click="openChat(profile)" 
              class="action-btn"
              :disabled="profile.status !== 'active'"
              :title="profile.status !== 'active' ? 'Chat only available for active profiles' : 'Open chat'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
              </svg>
              <span v-if="getUnreadCountForProfile((profile as any).$id || (profile as any).id) > 0" class="unread-count">
                {{ getUnreadCountForProfile((profile as any).$id || (profile as any).id) }}
              </span>
            </button>
          </div>
        </div>
        
        <!-- Card Footer -->
        <div class="profile-footer">
          <div class="footer-actions">
            <ProfileVerificationButton 
              :profile="profile" 
            />
            
            <button 
              @click="showDeleteConfirmation(profile)" 
              class="action-btn"
              title="Delete this profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
            
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delete Profile Modal -->
    <DeleteProfileModal
      :is-open="showDeleteModal"
      :profile-name="profileToDelete?.name || ''"
      :is-deleting="isDeletingProfile"
      @close="closeDeleteModal"
      @confirm="confirmDeleteProfile"
    />
    
    
  </div>
</template>

<style scoped lang="scss">
.escort-profiles {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: var(--spacing-lg) var(--spacing-md);
  }
  
  @media (max-width: 480px) {
    padding: var(--spacing-md);
  }
}

.profiles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xxl);
  
  @media (max-width: 768px) {
    margin-bottom: var(--spacing-xl);
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }
  
  @media (max-width: 480px) {
    margin-bottom: var(--spacing-lg);
    gap: var(--spacing-sm);
  }
  
  h1 {
    color: var(--color-text-dark);
    
    @media (max-width: 768px) {
      font-size: 2rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.75rem;
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
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    width: 100%;
    padding: 10px 20px;
    font-size: 0.95rem;
    min-height: 44px;
    justify-content: center;
  }
  
  &.btn-primary {
    background-color: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background-color: var(--color-accent-dark);
      transform: translateY(-1px);
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
  }
}

.loading {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-text-light);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xxl);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  
  @media (max-width: 768px) {
    padding: var(--spacing-xl);
  }
  
  @media (max-width: 480px) {
    padding: var(--spacing-lg);
  }
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
    
    @media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
    
    @media (max-width: 480px) {
      font-size: 0.95rem;
      margin-bottom: var(--spacing-md);
    }
  }
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.profile-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  
  &.is-active {
    box-shadow: 0 0 0 2px #10b981;
  }
  
  &.is-verified {
    .card-background::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981, #059669);
      transform: rotate(45deg);
    }
  }
  
  &.is-draft {
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      background: linear-gradient(45deg, #7c3aed, #a78bfa, #7c3aed);
      background-size: 200% 200%;
      border-radius: 18px;
      z-index: -1;
      animation: gradientShift 3s ease infinite;
      opacity: 0.6;
    }
  }
  
  
  .card-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: 
        repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px);
    }
    
    .background-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%);
    }
  }
  
  .profile-content {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    margin-top: 200px;
  }
  
  
  .profile-completion {
    margin-bottom: var(--spacing-lg);
    
    .completion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .completion-label {
        font-size: 0.813rem;
        color: #6b7280;
        font-weight: 500;
      }
      
      .completion-percentage {
        font-size: 0.813rem;
        color: #1f2937;
        font-weight: 600;
      }
    }
  }
  
  .profile-header {
    margin-bottom: var(--spacing-lg);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    
    @media (max-width: 480px) {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-sm);
    }
    
    .profile-info {
      flex: 1;
      min-width: 0;
      
      .profile-name {
        font-size: 1.35rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        
        .verified-icon {
          display: inline-flex;
          color: #10b981;
          
          svg {
            width: 20px;
            height: 20px;
          }
        }
      }
    }
    
    .profile-status-section {
      flex-shrink: 0;
      
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
        
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        
        &.active {
          background: #d1fae5;
          color: #065f46;
          
          .status-dot {
            background: #10b981;
          }
        }
        
        &.paused {
          background: #fef3c7;
          color: #92400e;
          
          .status-dot {
            background: #f59e0b;
          }
        }
        
        &.inactive {
          background: #fee2e2;
          color: #991b1b;
          
          .status-dot {
            background: #ef4444;
          }
        }
        
        &.draft {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          color: #7c3aed;
          border: 1px solid #c4b5fd;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px 14px;
          box-shadow: 0 2px 4px rgba(124, 58, 237, 0.1);
          
          .status-dot {
            background: #7c3aed;
            width: 8px;
            height: 8px;
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
          }
          
          &::after {
            content: '✨';
            margin-left: 4px;
            font-size: 0.8rem;
          }
        }
      }
    }
  }
  
  .quick-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: auto;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.3s ease;
    
    .action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      
      &:hover:not(:disabled) {
        background: #f9fafb;
        color: #1f2937;
        border-color: #d1d5db;
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f9fafb;
      }
      
      .unread-count {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }
      
      svg {
        flex-shrink: 0;
      }
    }
  }
  
  .profile-footer {
    padding: var(--spacing-md) var(--spacing-lg);
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    
    .footer-actions {
      display: flex;
      gap: var(--spacing-sm);
      
      .action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        
        &:hover:not(:disabled) {
          background: #f9fafb;
          color: #1f2937;
          border-color: #d1d5db;
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f9fafb;
        }
        
        &[title="Delete this profile"] {
          color: #ef4444;
          
          &:hover {
            background: #fee2e2;
            color: #dc2626;
            border-color: #fecaca;
          }
        }
        
        .unread-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
        
        svg {
          flex-shrink: 0;
        }
      }
    }
  }
  
  .video-indicator {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
  
  &.video-only {
    .card-background {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M20 20L0 0h20zM40 40L20 20v20zM20 20l20 20V20zM0 40l20-20v20z'/%3E%3C/g%3E%3C/svg%3E");
      }
    }
  }
}

// Animations
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

// Animate cards on load
.profile-card {
  animation: fadeIn 0.4s ease-out;
  animation-fill-mode: both;
  
  @for $i from 1 through 12 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.05}s;
    }
  }
}


// Mobile Responsive Design
@media (max-width: 768px) {
  .profiles-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .profile-card {
    min-height: 380px;
    
    .card-background {
      height: 160px;
    }
    
    .profile-content {
      padding: var(--spacing-md);
      padding-top: var(--spacing-md);
      margin-top: 160px;
    }
    
    .profile-header {
      .profile-info {
        .profile-name {
          font-size: 1.125rem;
        }
      }
    }
    
    
    .profile-completion {
      margin-bottom: var(--spacing-md);
      
      .completion-header {
        .completion-label,
        .completion-percentage {
          font-size: 0.75rem;
        }
      }
    }
    
    .quick-actions {
      opacity: 1;
      transform: translateY(0);
      
      .action-btn {
        padding: 8px;
        font-size: 0.8rem;
      }
    }
    
    .profile-footer {
      padding: var(--spacing-sm) var(--spacing-md);
      
      .footer-actions {
        .action-btn {
          padding: 8px;
          font-size: 0.8rem;
        }
      }
    }
  }
}

// Small Mobile Responsive Design
@media (max-width: 480px) {
  .profiles-grid {
    gap: var(--spacing-sm);
  }
  
  .profile-card {
    min-height: 420px;
    
    .card-background {
      height: 120px;
    }
    
    .profile-content {
      padding: var(--spacing-sm);
      padding-top: 80px;
    }
    
    .profile-header {
      margin-bottom: var(--spacing-md);
      
      .profile-info {
        .profile-name {
          font-size: 1rem;
          margin-bottom: var(--spacing-xs);
          
          .verified-icon svg {
            width: 16px;
            height: 16px;
          }
        }
      }
      
      .profile-status-section {
        .status-indicator {
          font-size: 0.7rem;
          padding: 3px 8px;
          
          .status-dot {
            width: 5px;
            height: 5px;
          }
        }
      }
    }
    
    .profile-completion {
      margin-bottom: var(--spacing-sm);
      
      .completion-header {
        .completion-label,
        .completion-percentage {
          font-size: 0.7rem;
        }
      }
      
      .completion-bar {
        height: 6px;
      }
    }
    
    .quick-actions {
      flex-direction: column;
      gap: var(--spacing-xs);
      
      .action-btn {
        padding: 10px;
        font-size: 0.85rem;
        min-height: 40px;
        
        svg {
          width: 16px;
          height: 16px;
        }
        
      }
    }
    
    .profile-footer {
      padding: var(--spacing-xs) var(--spacing-sm);
      
      .footer-actions {
        flex-direction: column;
        gap: var(--spacing-xs);
        
        .action-btn {
          padding: 10px;
          font-size: 0.85rem;
          min-height: 40px;
          
          svg {
            width: 16px;
            height: 16px;
          }
        }
      }
    }
  }
}

// Tablet Responsive Design
@media (min-width: 769px) and (max-width: 1024px) {
  .profiles-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

// Large Screen Design
@media (min-width: 1440px) {
  .profiles-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: var(--spacing-xl);
  }
}

// Dark Mode Support - Disabled to keep cards white
// @media (prefers-color-scheme: dark) {
//   .profile-card {
//     background: #1f2937;
//     border-color: #374151;
//     
//     .profile-info {
//       .profile-name {
//         color: #f9fafb;
//       }
//       
//       .profile-details .detail-item {
//         color: #9ca3af;
//       }
//     }
//     
//     .profile-stats {
//       border-color: #374151;
//       
//       .stat-value {
//         color: #f9fafb;
//       }
//     }
//     
//     .quick-actions .action-btn {
//       background: #374151;
//       border-color: #4b5563;
//       color: #d1d5db;
//       
//       &:hover {
//         background: #4b5563;
//         color: #f9fafb;
//       }
//     }
//     
//     .profile-footer {
//       background: #111827;
//       border-color: #374151;
//     }
//   }
// }
</style> 