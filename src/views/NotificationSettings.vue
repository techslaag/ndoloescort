<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { databases, DATABASE_ID, NOTIFICATION_PREFS_COLLECTION_ID, Query, ID } from '../lib/appwrite'
import ErrorAlert from '../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')
const successMessage = ref('')
const preferencesDocId = ref<string | null>(null)

// Notification preferences form
const preferences = reactive({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  bookingAlerts: true,
  messageAlerts: true,
  paymentAlerts: true,
  marketingEmails: false,
  quietHoursStart: '',
  quietHoursEnd: ''
})

// Detailed notification settings
const detailedSettings = reactive({
  // Booking notifications
  bookingRequest: { email: true, sms: false, push: true },
  bookingConfirmed: { email: true, sms: false, push: true },
  bookingCancelled: { email: true, sms: false, push: true },
  bookingReminder: { email: true, sms: true, push: true },
  
  // Message notifications
  newMessage: { email: false, sms: false, push: true },
  messageFromNew: { email: true, sms: false, push: true },
  
  // Payment notifications
  paymentReceived: { email: true, sms: true, push: true },
  paymentFailed: { email: true, sms: false, push: true },
  payoutProcessed: { email: true, sms: true, push: true },
  
  // Review notifications
  newReview: { email: true, sms: false, push: true },
  reviewResponse: { email: true, sms: false, push: true },
  
  // Profile notifications
  profileView: { email: false, sms: false, push: false },
  profileLike: { email: false, sms: false, push: true },
  newFollower: { email: false, sms: false, push: true },
  
  // System notifications
  systemMaintenance: { email: true, sms: false, push: true },
  securityAlert: { email: true, sms: true, push: true },
  accountUpdate: { email: true, sms: false, push: true }
})

// Notification categories for better organization
const notificationCategories = [
  {
    title: 'Booking Notifications',
    icon: '📅',
    settings: [
      { key: 'bookingRequest', label: 'New Booking Request', description: 'When someone requests to book with you' },
      { key: 'bookingConfirmed', label: 'Booking Confirmed', description: 'When a booking is confirmed' },
      { key: 'bookingCancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled' },
      { key: 'bookingReminder', label: 'Booking Reminder', description: 'Reminders before upcoming bookings' }
    ]
  },
  {
    title: 'Message Notifications',
    icon: '💬',
    settings: [
      { key: 'newMessage', label: 'New Message', description: 'When you receive a new message' },
      { key: 'messageFromNew', label: 'Message from New Contact', description: 'When someone messages you for the first time' }
    ]
  },
  {
    title: 'Payment Notifications',
    icon: '💰',
    settings: [
      { key: 'paymentReceived', label: 'Payment Received', description: 'When you receive a payment' },
      { key: 'paymentFailed', label: 'Payment Failed', description: 'When a payment fails' },
      { key: 'payoutProcessed', label: 'Payout Processed', description: 'When your earnings are paid out' }
    ]
  },
  {
    title: 'Review Notifications',
    icon: '⭐',
    settings: [
      { key: 'newReview', label: 'New Review', description: 'When someone leaves you a review' },
      { key: 'reviewResponse', label: 'Review Response', description: 'When someone responds to your review' }
    ]
  },
  {
    title: 'Profile Notifications',
    icon: '👤',
    settings: [
      { key: 'profileView', label: 'Profile Views', description: 'When someone views your profile' },
      { key: 'profileLike', label: 'Profile Likes', description: 'When someone likes your profile' },
      { key: 'newFollower', label: 'New Follower', description: 'When someone follows you' }
    ]
  },
  {
    title: 'System Notifications',
    icon: '🔔',
    settings: [
      { key: 'systemMaintenance', label: 'System Maintenance', description: 'Important system updates' },
      { key: 'securityAlert', label: 'Security Alerts', description: 'Security-related notifications' },
      { key: 'accountUpdate', label: 'Account Updates', description: 'Changes to your account' }
    ]
  }
]

// Load preferences from database
const loadPreferences = async () => {
  if (!authStore.user) return
  
  try {
    isLoading.value = true
    error.value = ''
    
    // Try to fetch existing preferences
    const response = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATION_PREFS_COLLECTION_ID,
      [Query.equal('userId', authStore.user.$id)]
    )
    
    if (response.documents.length > 0) {
      const doc = response.documents[0]
      preferencesDocId.value = doc.$id
      
      // Update preferences
      Object.assign(preferences, {
        emailNotifications: doc.emailNotifications ?? true,
        smsNotifications: doc.smsNotifications ?? false,
        pushNotifications: doc.pushNotifications ?? true,
        bookingAlerts: doc.bookingAlerts ?? true,
        messageAlerts: doc.messageAlerts ?? true,
        paymentAlerts: doc.paymentAlerts ?? true,
        marketingEmails: doc.marketingEmails ?? false,
        quietHoursStart: doc.quietHoursStart ?? '',
        quietHoursEnd: doc.quietHoursEnd ?? ''
      })
      
      // Load detailed settings if available
      if (doc.detailedSettings) {
        try {
          const detailed = typeof doc.detailedSettings === 'string' 
            ? JSON.parse(doc.detailedSettings) 
            : doc.detailedSettings
          Object.assign(detailedSettings, detailed)
        } catch (e) {
          console.error('Error parsing detailed settings:', e)
        }
      }
    }
  } catch (err) {
    console.error('Error loading notification preferences:', err)
    error.value = 'Failed to load notification preferences'
  } finally {
    isLoading.value = false
  }
}

// Save preferences
const savePreferences = async () => {
  if (!authStore.user) return
  
  try {
    isSaving.value = true
    error.value = ''
    successMessage.value = ''
    
    const prefsData = {
      userId: authStore.user.$id,
      emailNotifications: preferences.emailNotifications,
      smsNotifications: preferences.smsNotifications,
      pushNotifications: preferences.pushNotifications,
      bookingAlerts: preferences.bookingAlerts,
      messageAlerts: preferences.messageAlerts,
      paymentAlerts: preferences.paymentAlerts,
      marketingEmails: preferences.marketingEmails,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      detailedSettings: JSON.stringify(detailedSettings),
      updatedAt: new Date().toISOString()
    }
    
    if (preferencesDocId.value) {
      // Update existing document
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATION_PREFS_COLLECTION_ID,
        preferencesDocId.value,
        prefsData
      )
    } else {
      // Create new document
      const response = await databases.createDocument(
        DATABASE_ID,
        NOTIFICATION_PREFS_COLLECTION_ID,
        ID.unique(),
        prefsData
      )
      preferencesDocId.value = response.$id
    }
    
    successMessage.value = 'Notification preferences saved successfully!'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    console.error('Error saving notification preferences:', err)
    error.value = 'Failed to save notification preferences'
  } finally {
    isSaving.value = false
  }
}

// Toggle all notifications for a category
const toggleCategory = (category: any, type: 'email' | 'sms' | 'push') => {
  const allEnabled = category.settings.every((s: any) => detailedSettings[s.key][type])
  
  category.settings.forEach((setting: any) => {
    detailedSettings[setting.key][type] = !allEnabled
  })
}

// Check if all in category are enabled
const isCategoryEnabled = (category: any, type: 'email' | 'sms' | 'push') => {
  return category.settings.every((s: any) => detailedSettings[s.key][type])
}

// Check if some in category are enabled
const isCategoryPartial = (category: any, type: 'email' | 'sms' | 'push') => {
  const enabledCount = category.settings.filter((s: any) => detailedSettings[s.key][type]).length
  return enabledCount > 0 && enabledCount < category.settings.length
}

// Clear error
const clearError = () => {
  error.value = ''
}

// Initialize
onMounted(() => {
  loadPreferences()
})
</script>

<template>
  <div class="notification-settings-page">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-content">
        <button @click="router.back()" class="back-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
          </svg>
          Back
        </button>
        
        <div class="header-info">
          <h1>Notification Settings</h1>
          <p>Manage how you receive notifications</p>
        </div>
        
        <div class="header-actions">
          <button @click="savePreferences" :disabled="isSaving" class="btn btn-primary">
            <svg v-if="!isSaving" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l6.5-6.5a1 1 0 00-1.414-1.414L10 12.586l-2.293-2.293z"/>
            </svg>
            <span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings-container">
      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="success-alert">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        {{ successMessage }}
      </div>
      
      <ErrorAlert 
        :error="error"
        :dismissible="true"
        @dismiss="clearError"
      />
      
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading notification preferences...</p>
      </div>
      
      <div v-else class="settings-content">
        <!-- Master Controls -->
        <div class="master-controls">
          <h2>Quick Settings</h2>
          <div class="control-grid">
            <div class="control-card">
              <div class="control-header">
                <span class="control-icon">📧</span>
                <div class="control-info">
                  <h3>Email Notifications</h3>
                  <p>Receive notifications via email</p>
                </div>
              </div>
              <label class="toggle-switch">
                <input v-model="preferences.emailNotifications" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="control-card">
              <div class="control-header">
                <span class="control-icon">💬</span>
                <div class="control-info">
                  <h3>SMS Notifications</h3>
                  <p>Receive text message alerts</p>
                </div>
              </div>
              <label class="toggle-switch">
                <input v-model="preferences.smsNotifications" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="control-card">
              <div class="control-header">
                <span class="control-icon">🔔</span>
                <div class="control-info">
                  <h3>Push Notifications</h3>
                  <p>Browser push notifications</p>
                </div>
              </div>
              <label class="toggle-switch">
                <input v-model="preferences.pushNotifications" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="control-card">
              <div class="control-header">
                <span class="control-icon">📢</span>
                <div class="control-info">
                  <h3>Marketing Emails</h3>
                  <p>Promotional content and offers</p>
                </div>
              </div>
              <label class="toggle-switch">
                <input v-model="preferences.marketingEmails" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Quiet Hours -->
        <div class="quiet-hours-section">
          <h2>Quiet Hours</h2>
          <p>Set times when you don't want to receive notifications</p>
          <div class="quiet-hours-controls">
            <div class="time-input-group">
              <label for="quietStart">Start Time</label>
              <input 
                id="quietStart"
                v-model="preferences.quietHoursStart" 
                type="time" 
                class="time-input"
              />
            </div>
            <span class="time-separator">to</span>
            <div class="time-input-group">
              <label for="quietEnd">End Time</label>
              <input 
                id="quietEnd"
                v-model="preferences.quietHoursEnd" 
                type="time" 
                class="time-input"
              />
            </div>
          </div>
        </div>
        
        <!-- Detailed Settings -->
        <div class="detailed-settings">
          <h2>Detailed Notification Settings</h2>
          <p>Fine-tune notifications for specific events</p>
          
          <div class="notification-table">
            <div class="table-header">
              <div class="header-title">Notification Type</div>
              <div class="header-channels">
                <span>Email</span>
                <span>SMS</span>
                <span>Push</span>
              </div>
            </div>
            
            <div v-for="category in notificationCategories" :key="category.title" class="notification-category">
              <div class="category-header">
                <div class="category-title">
                  <span class="category-icon">{{ category.icon }}</span>
                  <h3>{{ category.title }}</h3>
                </div>
                <div class="category-toggles">
                  <button 
                    @click="toggleCategory(category, 'email')"
                    :class="['toggle-all', { 
                      'active': isCategoryEnabled(category, 'email'),
                      'partial': isCategoryPartial(category, 'email')
                    }]"
                    title="Toggle all email notifications"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11zm-1.5.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z"/>
                      <path d="M1.922 3.578a.75.75 0 011.06-.054L8 7.871l5.018-4.347a.75.75 0 011.114 1.004l-5.5 4.764a.75.75 0 01-.983.037L8 8.796l-5.04 4.367a.75.75 0 11-.984-1.132l5.5-4.764z"/>
                    </svg>
                  </button>
                  <button 
                    @click="toggleCategory(category, 'sms')"
                    :class="['toggle-all', { 
                      'active': isCategoryEnabled(category, 'sms'),
                      'partial': isCategoryPartial(category, 'sms')
                    }]"
                    title="Toggle all SMS notifications"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a2 2 0 012 2v9.5a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-10A2 2 0 014 0h4a2 2 0 012 2zM4 1a1 1 0 00-1 1v10h6V3a1 1 0 00-1-1H4z"/>
                    </svg>
                  </button>
                  <button 
                    @click="toggleCategory(category, 'push')"
                    :class="['toggle-all', { 
                      'active': isCategoryEnabled(category, 'push'),
                      'partial': isCategoryPartial(category, 'push')
                    }]"
                    title="Toggle all push notifications"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 16a2 2 0 002-2H6a2 2 0 002 2zM8 1.918l-.797.161A4.002 4.002 0 004 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 00-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 111.99 0A5.002 5.002 0 0113 6c0 .88.32 4.2 1.22 6z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div v-for="setting in category.settings" :key="setting.key" class="notification-row">
                <div class="notification-info">
                  <h4>{{ setting.label }}</h4>
                  <p>{{ setting.description }}</p>
                </div>
                <div class="notification-toggles">
                  <label class="checkbox-label">
                    <input 
                      v-model="detailedSettings[setting.key].email" 
                      type="checkbox"
                      :disabled="!preferences.emailNotifications"
                    />
                    <span class="checkbox"></span>
                  </label>
                  <label class="checkbox-label">
                    <input 
                      v-model="detailedSettings[setting.key].sms" 
                      type="checkbox"
                      :disabled="!preferences.smsNotifications"
                    />
                    <span class="checkbox"></span>
                  </label>
                  <label class="checkbox-label">
                    <input 
                      v-model="detailedSettings[setting.key].push" 
                      type="checkbox"
                      :disabled="!preferences.pushNotifications"
                    />
                    <span class="checkbox"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Save Button -->
        <div class="form-actions">
          <button @click="savePreferences" :disabled="isSaving" class="btn btn-primary btn-large">
            {{ isSaving ? 'Saving...' : 'Save Notification Preferences' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notification-settings-page {
  min-height: 100vh;
  background: var(--color-background);
  padding-top: 70px;
}

/* Header */
.settings-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
  
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    
    @media (max-width: 768px) {
      flex-wrap: wrap;
    }
  }
  
  .back-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
  
  .header-info {
    flex: 1;
    text-align: center;
    
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
      
      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }
    
    p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
  }
}

/* Container */
.settings-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg) var(--spacing-xl);
}

/* Alerts */
.success-alert {
  background: #10b981;
  color: white;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  
  svg {
    flex-shrink: 0;
  }
}

/* Loading */
.loading-container {
  text-align: center;
  padding: var(--spacing-xl);
  
  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--color-text-lighter);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-md);
  }
  
  p {
    color: var(--color-text-light);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.settings-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

/* Master Controls */
.master-controls {
  margin-bottom: var(--spacing-xl);
  
  h2 {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
  }
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.control-card {
  background: var(--color-background-alt);
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .control-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    
    .control-icon {
      font-size: 2rem;
    }
    
    .control-info {
      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 4px;
      }
      
      p {
        font-size: 0.9rem;
        color: var(--color-text-light);
        margin: 0;
      }
    }
  }
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-text-light);
    transition: .4s;
    border-radius: 26px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
  
  input:checked + .toggle-slider {
    background-color: var(--color-accent);
  }
  
  input:checked + .toggle-slider:before {
    transform: translateX(24px);
  }
}

/* Quiet Hours */
.quiet-hours-section {
  background: var(--color-background-alt);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  > p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
  
  .quiet-hours-controls {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-md);
    
    @media (max-width: 480px) {
      flex-direction: column;
      align-items: stretch;
    }
  }
  
  .time-input-group {
    label {
      display: block;
      font-weight: 500;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-xs);
    }
    
    .time-input {
      padding: var(--spacing-md);
      border: 2px solid var(--color-text-lighter);
      border-radius: var(--border-radius-md);
      font-size: 1rem;
      transition: all 0.3s ease;
      
      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
    }
  }
  
  .time-separator {
    font-weight: 500;
    color: var(--color-text-light);
    margin-bottom: var(--spacing-sm);
    
    @media (max-width: 480px) {
      text-align: center;
      margin: var(--spacing-sm) 0;
    }
  }
}

/* Detailed Settings */
.detailed-settings {
  h2 {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  > p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
  }
}

.notification-table {
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  
  .table-header {
    background: var(--color-background-alt);
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-text-lighter);
    
    .header-title {
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    .header-channels {
      display: flex;
      gap: var(--spacing-xl);
      
      span {
        font-weight: 500;
        color: var(--color-text-light);
        width: 50px;
        text-align: center;
      }
    }
  }
}

.notification-category {
  border-bottom: 1px solid var(--color-text-lighter);
  
  &:last-child {
    border-bottom: none;
  }
  
  .category-header {
    background: #f9fafb;
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .category-title {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      
      .category-icon {
        font-size: 1.5rem;
      }
      
      h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--color-text-dark);
      }
    }
    
    .category-toggles {
      display: flex;
      gap: var(--spacing-xl);
      
      .toggle-all {
        background: none;
        border: none;
        color: var(--color-text-light);
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--border-radius-sm);
        transition: all 0.3s ease;
        width: 50px;
        display: flex;
        justify-content: center;
        
        &:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        &.active {
          color: var(--color-accent);
        }
        
        &.partial {
          color: var(--color-warning);
        }
      }
    }
  }
}

.notification-row {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s ease;
  
  &:hover {
    background: #fafafa;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .notification-info {
    flex: 1;
    padding-right: var(--spacing-lg);
    
    h4 {
      font-weight: 500;
      color: var(--color-text-dark);
      margin-bottom: 4px;
    }
    
    p {
      font-size: 0.9rem;
      color: var(--color-text-light);
      margin: 0;
    }
  }
  
  .notification-toggles {
    display: flex;
    gap: var(--spacing-xl);
  }
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 50px;
  
  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }
  
  .checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-text-light);
    border-radius: var(--border-radius-sm);
    position: relative;
    transition: all 0.3s ease;
    
    &:after {
      content: "";
      position: absolute;
      display: none;
      left: 6px;
      top: 2px;
      width: 6px;
      height: 12px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  }
  
  input:checked ~ .checkbox {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    
    &:after {
      display: block;
    }
  }
  
  input:disabled ~ .checkbox {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Form Actions */
.form-actions {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--color-text-lighter);
  text-align: center;
}

/* Buttons */
.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-primary {
    background: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--color-accent-dark);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
  }
  
  &.btn-large {
    padding: var(--spacing-md) var(--spacing-xl);
    font-size: 1.1rem;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}
</style>