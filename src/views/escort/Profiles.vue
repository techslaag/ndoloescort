<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useProfileStore } from '../../stores/profile'
import { useMessagingStore } from '../../stores/messaging'
import ErrorAlert from '../../components/ErrorAlert.vue'
import ProfileVerificationButton from '../../components/escort/ProfileVerificationButton.vue'
import DeleteProfileModal from '../../components/modals/DeleteProfileModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const messagingStore = useMessagingStore()

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
    return conv.escortId === profileId || conv.profileId === profileId
  })
  
  // Count unread messages across all conversations for this profile
  let unreadCount = 0
  profileConversations.forEach(conv => {
    const messages = messagingStore.messages[conv.id] || []
    messages.forEach(msg => {
      if (!msg.isRead && msg.senderId !== authStore.user?.$id) {
        unreadCount++
      }
    })
  })
  
  return unreadCount
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

const toggleProfileStatus = async (profile: any) => {
  try {
    const profileId = profile.$id || profile.id
    const newStatus = profile.status === 'active' ? 'paused' : 'active'
    await profileStore.updateProfile(profileId, { status: newStatus })
  } catch (error) {
    console.error('Error updating profile status:', error)
  }
}

const viewAnalytics = (profileId: string) => {
  router.push(`/escort/profiles/${profileId}/analytics`)
}

const openChat = (profile: any) => {
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

const createNewProfile = () => {
  router.push('/escort/profiles/create')
}

const showDeleteConfirmation = (profile: any) => {
  profileToDelete.value = profile
  showDeleteModal.value = true
}

const confirmDeleteProfile = async () => {
  if (!profileToDelete.value) return
  
  const profileId = profileToDelete.value.$id || profileToDelete.value.id
  const profileName = profileToDelete.value.name
  
  console.log('Attempting to delete profile:', { profileId, profileName, profile: profileToDelete.value })
  
  try {
    isDeletingProfile.value = true
    const result = await profileStore.deleteProfile(profileId)
    console.log('Delete result:', result)
    
    // Close modal and reset state
    showDeleteModal.value = false
    profileToDelete.value = null
    
    // Show success message
    if (result?.message) {
      // You could replace this with a toast notification
      alert(result.message)
    }
    
    // Reload profiles to update the list
    if (authStore.user) {
      await profileStore.fetchUserProfiles(authStore.user.$id)
    }
  } catch (error: any) {
    console.error('Error deleting profile:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response
    })
    // Show error to user
    profileStore.setError(`Failed to delete profile: ${error.message || 'Unknown error'}`)
  } finally {
    isDeletingProfile.value = false
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
      <button @click="createNewProfile" class="btn btn-primary">
        Create New Profile
      </button>
    </div>
    
    <div v-if="profileStore.isLoading" class="loading">
      Loading profiles...
    </div>
    
    <div v-else-if="profileStore.profiles.length === 0" class="empty-state">
      <h3>No profiles yet</h3>
      <p>Create your first escort profile to start receiving bookings</p>
      <button @click="createNewProfile" class="btn btn-primary">
        Create Your First Profile
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
          'is-verified': profile.verification?.isVerified
        }"
      >
        <!-- Card Background -->
        <div 
          class="card-background"
          :style="{
            backgroundImage: (profile as any).media && (profile as any).media.length > 0 && ((profile as any).media[0].url || (profile as any).media[0].thumbnailUrl) 
              ? `url('${(profile as any).media[0].url || (profile as any).media[0].thumbnailUrl}')` 
              : 'none'
          }"
        >
          <div class="background-overlay"></div>
        </div>
        <!-- Card Content -->
        <div class="profile-content">
          <!-- Profile Header -->
          <div class="profile-header">
            <div class="profile-avatar-section">
              <div v-if="(profile as any).media && (profile as any).media.length > 0" class="profile-avatar">
                <img 
                  :src="(profile as any).media[0].thumbnailUrl || (profile as any).media[0].url" 
                  :alt="profile.name"
                  loading="lazy"
                />
                <div v-if="profile.verification?.isVerified" class="verified-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
              </div>
              <div v-else class="profile-avatar placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
            
            <div class="profile-info">
              <h3 class="profile-name">
                {{ profile.name }}
              </h3>
              <div class="profile-details">
                <span class="detail-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {{ (profile as any).locationCity || 'Unknown' }}
                </span>
                <span class="detail-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                  {{ profile.age }} years
                </span>
              </div>
            </div>
            
            <div class="profile-status-section">
              <div :class="['status-indicator', profile.status]">
                <span class="status-dot"></span>
                <span class="status-text">{{ profile.status }}</span>
              </div>
            </div>
          </div>
          
          <!-- Profile Stats -->
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ (profile as any).statsViews || 0 }}</span>
              <span class="stat-label">Views</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ (profile as any).statsBookings || 0 }}</span>
              <span class="stat-label">Bookings</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ (profile as any).statsRating || 0 }}⭐</span>
              <span class="stat-label">Rating</span>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions">
            <button @click="viewAnalytics((profile as any).$id || (profile as any).id)" class="action-btn primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
            <button @click="openChat(profile)" class="action-btn" :class="{ 'has-unread': getUnreadCountForProfile((profile as any).$id || (profile as any).id) > 0 }">
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
            <button @click="toggleProfileStatus(profile)" class="toggle-status-btn" :class="profile.status">
              <svg v-if="profile.status === 'active'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
              {{ profile.status === 'active' ? 'Active' : 'Activate' }}
            </button>
            
            <ProfileVerificationButton 
              :profile="profile" 
            />
            
            <button 
              @click="showDeleteConfirmation(profile)" 
              class="delete-btn"
              title="Delete this profile"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
}

.profiles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xxl);
  
  h1 {
    color: var(--color-text-dark);
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
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
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
  cursor: pointer;
  
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
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    
    .card-background img {
      transform: scale(1.05);
    }
    
    .quick-actions {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .card-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 180px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: 
        repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px);
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .background-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
    }
  }
  
  .profile-content {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    padding-top: 140px;
  }
  
  .profile-header {
    margin-bottom: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    
    .profile-avatar-section {
      position: relative;
      
      .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        position: relative;
        margin-top: -40px;
        background: white;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        &.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #9ca3af;
        }
        
        .verified-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 2px solid white;
        }
      }
    }
    
    .profile-info {
      flex: 1;
      min-width: 0;
      
      .profile-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 var(--spacing-xs) 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .profile-details {
        display: flex;
        gap: var(--spacing-md);
        flex-wrap: wrap;
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6b7280;
          font-size: 0.875rem;
          
          svg {
            opacity: 0.6;
          }
        }
      }
    }
    
    .profile-status-section {
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
      }
    }
  }
  
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
    padding: var(--spacing-md) 0;
    border-top: 1px solid #f3f4f6;
    border-bottom: 1px solid #f3f4f6;
    margin-bottom: var(--spacing-md);
    
    .stat-item {
      text-align: center;
      
      .stat-value {
        display: block;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 2px;
      }
      
      .stat-label {
        display: block;
        font-size: 0.75rem;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }
  }
  
  .quick-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: auto;
    opacity: 0;
    transform: translateY(10px);
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
      
      &:hover {
        background: #f9fafb;
        color: #1f2937;
        border-color: #d1d5db;
      }
      
      &.primary {
        background: #4f46e5;
        color: white;
        border-color: #4f46e5;
        
        &:hover {
          background: #4338ca;
          border-color: #4338ca;
        }
      }
      
      &.has-unread {
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
    margin: 0 calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg));
    
    .footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      
      .toggle-status-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: white;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &.active {
          border-color: #10b981;
          color: #10b981;
          
          &:hover {
            background: #f0fdf4;
          }
        }
        
        &:not(.active) {
          &:hover {
            background: #f3f4f6;
            color: #1f2937;
          }
        }
      }
      
      .delete-btn {
        padding: 6px;
        border: none;
        background: none;
        color: #ef4444;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
        
        &:hover {
          background: #fee2e2;
        }
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
      height: 140px;
    }
    
    .profile-content {
      padding: var(--spacing-md);
      padding-top: 100px;
    }
    
    .profile-header {
      .profile-avatar {
        width: 60px;
        height: 60px;
        margin-top: -30px;
      }
      
      .profile-info {
        .profile-name {
          font-size: 1.125rem;
        }
      }
    }
    
    .profile-stats {
      .stat-item {
        .stat-value {
          font-size: 1rem;
        }
        
        .stat-label {
          font-size: 0.7rem;
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
        .toggle-status-btn {
          font-size: 0.8rem;
          padding: 4px 8px;
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

// Dark Mode Support (if implemented)
@media (prefers-color-scheme: dark) {
  .profile-card {
    background: #1f2937;
    border-color: #374151;
    
    .profile-info {
      .profile-name {
        color: #f9fafb;
      }
      
      .profile-details .detail-item {
        color: #9ca3af;
      }
    }
    
    .profile-stats {
      border-color: #374151;
      
      .stat-value {
        color: #f9fafb;
      }
    }
    
    .quick-actions .action-btn {
      background: #374151;
      border-color: #4b5563;
      color: #d1d5db;
      
      &:hover {
        background: #4b5563;
        color: #f9fafb;
      }
    }
    
    .profile-footer {
      background: #111827;
      border-color: #374151;
    }
  }
}
</style> 