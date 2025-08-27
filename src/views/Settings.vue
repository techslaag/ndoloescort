<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ErrorAlert from '../components/ErrorAlert.vue'
import LocationDropdowns from '../components/forms/LocationDropdowns.vue'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const isSaving = ref(false)
const activeTab = ref('account')
const showDeleteConfirm = ref(false)
const showPasswordForm = ref(false)

// User role computed property
const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType || 'client'
  }
  return 'client'
})

const isEscort = computed(() => userRole.value === 'escort')

// Form data
const accountForm = reactive({
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  location: {
    city: '',
    state: '',
    country: ''
  },
  bio: '',
  website: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const preferencesForm = reactive({
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  pushNotifications: true,
  profileVisibility: 'public',
  showOnlineStatus: true,
  autoReply: false,
  autoReplyMessage: ''
})

const securityForm = reactive({
  twoFactorEnabled: false,
  loginAlerts: true,
  sessionTimeout: '30',
  allowedDevices: 'unlimited'
})

// Initialize forms with user data
onMounted(() => {
  if (authStore.user) {
    accountForm.name = authStore.user.name || ''
    accountForm.email = authStore.user.email || ''
    accountForm.phone = (authStore.user.prefs as any)?.phone || ''
    accountForm.dateOfBirth = (authStore.user.prefs as any)?.dateOfBirth || ''
    accountForm.bio = (authStore.user.prefs as any)?.bio || ''
    accountForm.website = (authStore.user.prefs as any)?.website || ''
    
    // Location
    if ((authStore.user.prefs as any)?.location) {
      accountForm.location = (authStore.user.prefs as any).location
    }
    
    // Preferences
    const prefs = authStore.user.prefs as any
    if (prefs?.preferences) {
      Object.assign(preferencesForm, prefs.preferences)
    }
    
    // Security
    if (prefs?.security) {
      Object.assign(securityForm, prefs.security)
    }
  }
})

// Tab management
const tabs = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  { id: 'privacy', label: 'Privacy', icon: '🛡️' },
  { id: 'billing', label: 'Billing', icon: '💳', escortOnly: true },
  { id: 'danger', label: 'Account', icon: '⚠️' }
]

const visibleTabs = computed(() => {
  return tabs.filter(tab => !tab.escortOnly || isEscort.value)
})

// Error handling
const handleErrorClear = () => {
  authStore.clearError()
}

// Save functions
const saveAccountInfo = async () => {
  try {
    isSaving.value = true
    authStore.clearError()
    
    // Validate required fields
    if (!accountForm.name || !accountForm.email) {
      authStore.setError('Name and email are required')
      return
    }
    
    // Update user account
    await authStore.updateAccount({
      name: accountForm.name,
      email: accountForm.email
    })
    
    // Update preferences
    await authStore.updatePreferences({
      phone: accountForm.phone,
      dateOfBirth: accountForm.dateOfBirth,
      location: accountForm.location,
      bio: accountForm.bio,
      website: accountForm.website
    })
    
    console.log('Account updated successfully')
  } catch (error) {
    console.error('Error updating account:', error)
    authStore.setError('Failed to update account information')
  } finally {
    isSaving.value = false
  }
}

const savePassword = async () => {
  try {
    isSaving.value = true
    authStore.clearError()
    
    // Validate passwords
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      authStore.setError('All password fields are required')
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      authStore.setError('New passwords do not match')
      return
    }
    
    if (passwordForm.newPassword.length < 8) {
      authStore.setError('Password must be at least 8 characters long')
      return
    }
    
    await authStore.updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
    
    // Clear form
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    showPasswordForm.value = false
    
    console.log('Password updated successfully')
  } catch (error) {
    console.error('Error updating password:', error)
    authStore.setError('Failed to update password')
  } finally {
    isSaving.value = false
  }
}

const savePreferences = async () => {
  try {
    isSaving.value = true
    authStore.clearError()
    
    await authStore.updatePreferences({
      preferences: { ...preferencesForm }
    })
    
    console.log('Preferences updated successfully')
  } catch (error) {
    console.error('Error updating preferences:', error)
    authStore.setError('Failed to update preferences')
  } finally {
    isSaving.value = false
  }
}

const saveSecurity = async () => {
  try {
    isSaving.value = true
    authStore.clearError()
    
    await authStore.updatePreferences({
      security: { ...securityForm }
    })
    
    console.log('Security settings updated successfully')
  } catch (error) {
    console.error('Error updating security settings:', error)
    authStore.setError('Failed to update security settings')
  } finally {
    isSaving.value = false
  }
}

// Account deletion
const deleteAccount = async () => {
  try {
    isSaving.value = true
    authStore.clearError()
    
    await authStore.deleteAccount()
    router.push('/')
  } catch (error) {
    console.error('Error deleting account:', error)
    authStore.setError('Failed to delete account')
  } finally {
    isSaving.value = false
    showDeleteConfirm.value = false
  }
}

// Navigation
const goBack = () => {
  router.back()
}

const navigateToProfiles = () => {
  if (isEscort.value) {
    router.push('/escort/profiles')
  }
}
</script>

<template>
  <div class="settings-page">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <!-- Header -->
    <div class="settings-header">
      <div class="header-content">
        <button @click="goBack" class="back-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
          </svg>
          Back
        </button>
        
        <div class="header-info">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        
        <div class="header-actions">
          <div class="user-info">
            <div class="avatar">
              <span>{{ (authStore.user?.name || 'U').charAt(0).toUpperCase() }}</span>
            </div>
            <div class="user-details">
              <span class="name">{{ authStore.user?.name || 'User' }}</span>
              <span class="role">{{ userRole === 'escort' ? 'Escort' : 'Client' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="settings-container">
      <!-- Sidebar Navigation -->
      <div class="settings-sidebar">
        <nav class="settings-nav">
          <button
            v-for="tab in visibleTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['nav-item', { active: activeTab === tab.id }]"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </nav>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button v-if="isEscort" @click="navigateToProfiles" class="quick-action">
            <span class="action-icon">📝</span>
            <span class="action-label">Manage Profiles</span>
          </button>
          
          <button @click="router.push('/escort/dashboard')" v-if="isEscort" class="quick-action">
            <span class="action-icon">📊</span>
            <span class="action-label">Dashboard</span>
          </button>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="settings-content">
        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="settings-section">
          <div class="section-header">
            <h2>Account Information</h2>
            <p>Update your personal information and contact details</p>
          </div>
          
          <form @submit.prevent="saveAccountInfo" class="settings-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="name">Full Name <span class="required">*</span></label>
                <input
                  id="name"
                  v-model="accountForm.name"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="email">Email Address <span class="required">*</span></label>
                <input
                  id="email"
                  v-model="accountForm.email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="phone">Phone Number</label>
                <input
                  id="phone"
                  v-model="accountForm.phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="dateOfBirth">Date of Birth</label>
                <input
                  id="dateOfBirth"
                  v-model="accountForm.dateOfBirth"
                  type="date"
                  class="form-input"
                />
              </div>
            </div>
            
            <!-- Location -->
            <div class="form-group">
              <label>Location</label>
              <LocationDropdowns v-model="accountForm.location" />
            </div>
            
            <!-- Bio -->
            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea
                id="bio"
                v-model="accountForm.bio"
                placeholder="Tell us about yourself..."
                rows="4"
                class="form-textarea"
              ></textarea>
            </div>
            
            <!-- Website -->
            <div class="form-group">
              <label for="website">Website</label>
              <input
                id="website"
                v-model="accountForm.website"
                type="url"
                placeholder="https://your-website.com"
                class="form-input"
              />
            </div>
            
            <div class="form-actions">
              <button type="submit" :disabled="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
        
        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="settings-section">
          <div class="section-header">
            <h2>Security Settings</h2>
            <p>Manage your account security and authentication</p>
          </div>
          
          <!-- Change Password -->
          <div class="security-card">
            <div class="card-header">
              <h3>Password</h3>
              <button @click="showPasswordForm = !showPasswordForm" class="btn btn-outline">
                {{ showPasswordForm ? 'Cancel' : 'Change Password' }}
              </button>
            </div>
            
            <form v-if="showPasswordForm" @submit.prevent="savePassword" class="password-form">
              <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="newPassword">New Password</label>
                <input
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  required
                  class="form-input"
                />
              </div>
              
              <div class="form-actions">
                <button type="submit" :disabled="isSaving" class="btn btn-primary">
                  {{ isSaving ? 'Updating...' : 'Update Password' }}
                </button>
              </div>
            </form>
          </div>
          
          <!-- Security Settings Form -->
          <form @submit.prevent="saveSecurity" class="settings-form">
            <div class="security-options">
              <div class="option-group">
                <label class="toggle-label">
                  <input
                    v-model="securityForm.twoFactorEnabled"
                    type="checkbox"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Two-Factor Authentication</span>
                    <span class="toggle-description">Add an extra layer of security to your account</span>
                  </div>
                </label>
              </div>
              
              <div class="option-group">
                <label class="toggle-label">
                  <input
                    v-model="securityForm.loginAlerts"
                    type="checkbox"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Login Alert Notifications</span>
                    <span class="toggle-description">Get notified of new login attempts</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="sessionTimeout">Session Timeout (minutes)</label>
              <select id="sessionTimeout" v-model="securityForm.sessionTimeout" class="form-select">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="0">Never</option>
              </select>
            </div>
            
            <div class="form-actions">
              <button type="submit" :disabled="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving...' : 'Save Security Settings' }}
              </button>
            </div>
          </form>
        </div>
        
        <!-- Preferences Tab -->
        <div v-if="activeTab === 'preferences'" class="settings-section">
          <div class="section-header">
            <h2>Preferences</h2>
            <p>Customize your experience and notification settings</p>
          </div>
          
          <form @submit.prevent="savePreferences" class="settings-form">
            <!-- General Preferences -->
            <div class="preference-group">
              <h3>General</h3>
              
              <div class="form-grid">
                <div class="form-group">
                  <label for="language">Language</label>
                  <select id="language" v-model="preferencesForm.language" class="form-select">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="timezone">Timezone</label>
                  <select id="timezone" v-model="preferencesForm.timezone" class="form-select">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="currency">Currency</label>
                  <select id="currency" v-model="preferencesForm.currency" class="form-select">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Notification Preferences -->
            <div class="preference-group">
              <h3>Notifications</h3>
              
              <div class="notification-banner">
                <div class="banner-content">
                  <div class="banner-icon">🔔</div>
                  <div class="banner-text">
                    <h4>Advanced Notification Settings</h4>
                    <p>Customize your notification preferences for different types of alerts and events.</p>
                  </div>
                </div>
                <router-link to="/settings/notifications" class="btn btn-primary">
                  Manage Notifications
                </router-link>
              </div>
              
              <div class="notification-options">
                <div class="option-group">
                  <label class="toggle-label">
                    <input
                      v-model="preferencesForm.emailNotifications"
                      type="checkbox"
                      class="toggle-input"
                    />
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <span class="toggle-title">Email Notifications</span>
                      <span class="toggle-description">Receive important updates via email</span>
                    </div>
                  </label>
                </div>
                
                <div class="option-group">
                  <label class="toggle-label">
                    <input
                      v-model="preferencesForm.smsNotifications"
                      type="checkbox"
                      class="toggle-input"
                    />
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <span class="toggle-title">SMS Notifications</span>
                      <span class="toggle-description">Get text message alerts</span>
                    </div>
                  </label>
                </div>
                
                <div class="option-group">
                  <label class="toggle-label">
                    <input
                      v-model="preferencesForm.marketingEmails"
                      type="checkbox"
                      class="toggle-input"
                    />
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <span class="toggle-title">Marketing Emails</span>
                      <span class="toggle-description">Receive promotional content and offers</span>
                    </div>
                  </label>
                </div>
                
                <div class="option-group">
                  <label class="toggle-label">
                    <input
                      v-model="preferencesForm.pushNotifications"
                      type="checkbox"
                      class="toggle-input"
                    />
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <span class="toggle-title">Push Notifications</span>
                      <span class="toggle-description">Get browser push notifications</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" :disabled="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving...' : 'Save Preferences' }}
              </button>
            </div>
          </form>
        </div>
        
        <!-- Privacy Tab -->
        <div v-if="activeTab === 'privacy'" class="settings-section">
          <div class="section-header">
            <h2>Privacy Settings</h2>
            <p>Control your privacy and data sharing preferences</p>
          </div>
          
          <form @submit.prevent="savePreferences" class="settings-form">
            <div class="privacy-options">
              <div class="form-group">
                <label for="profileVisibility">Profile Visibility</label>
                <select id="profileVisibility" v-model="preferencesForm.profileVisibility" class="form-select">
                  <option value="public">Public - Anyone can see your profile</option>
                  <option value="registered">Registered Users Only</option>
                  <option value="private">Private - Only you can see your profile</option>
                </select>
              </div>
              
              <div class="option-group">
                <label class="toggle-label">
                  <input
                    v-model="preferencesForm.showOnlineStatus"
                    type="checkbox"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Show Online Status</span>
                    <span class="toggle-description">Let others see when you're online</span>
                  </div>
                </label>
              </div>
              
              <div class="option-group">
                <label class="toggle-label">
                  <input
                    v-model="preferencesForm.autoReply"
                    type="checkbox"
                    class="toggle-input"
                  />
                  <span class="toggle-slider"></span>
                  <div class="toggle-content">
                    <span class="toggle-title">Auto-Reply Messages</span>
                    <span class="toggle-description">Automatically respond to messages when offline</span>
                  </div>
                </label>
              </div>
              
              <div v-if="preferencesForm.autoReply" class="form-group">
                <label for="autoReplyMessage">Auto-Reply Message</label>
                <textarea
                  id="autoReplyMessage"
                  v-model="preferencesForm.autoReplyMessage"
                  placeholder="Thank you for your message. I'll get back to you soon!"
                  rows="3"
                  class="form-textarea"
                ></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" :disabled="isSaving" class="btn btn-primary">
                {{ isSaving ? 'Saving...' : 'Save Privacy Settings' }}
              </button>
            </div>
          </form>
        </div>
        
        <!-- Billing Tab (Escort Only) -->
        <div v-if="activeTab === 'billing' && isEscort" class="settings-section">
          <div class="section-header">
            <h2>Billing & Payments</h2>
            <p>Manage your payment methods and billing information</p>
          </div>
          
          <div class="billing-cards">
            <div class="billing-card">
              <div class="card-header">
                <h3>Payment Methods</h3>
                <button class="btn btn-outline">Add Payment Method</button>
              </div>
              <p class="card-description">No payment methods added yet</p>
            </div>
            
            <div class="billing-card">
              <div class="card-header">
                <h3>Billing History</h3>
                <button class="btn btn-outline">View All</button>
              </div>
              <p class="card-description">No billing history available</p>
            </div>
            
            <div class="billing-card">
              <div class="card-header">
                <h3>Tax Information</h3>
                <button class="btn btn-outline">Update</button>
              </div>
              <p class="card-description">Tax information not provided</p>
            </div>
          </div>
        </div>
        
        <!-- Danger Zone -->
        <div v-if="activeTab === 'danger'" class="settings-section">
          <div class="section-header">
            <h2>Danger Zone</h2>
            <p>Irreversible and destructive actions</p>
          </div>
          
          <div class="danger-zone">
            <div class="danger-card">
              <div class="danger-content">
                <h3>Delete Account</h3>
                <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
              <button @click="showDeleteConfirm = true" class="btn btn-danger">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delete Account Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Delete Account</h3>
          <button @click="showDeleteConfirm = false" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">⚠️</div>
          <p><strong>Are you sure you want to delete your account?</strong></p>
          <p>This will permanently delete:</p>
          <ul>
            <li>Your profile and personal information</li>
            <li>All your messages and conversations</li>
            <li v-if="isEscort">Your escort profiles and bookings</li>
            <li>Your account preferences and settings</li>
          </ul>
          <p><strong>This action cannot be undone.</strong></p>
        </div>
        
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn btn-outline">
            Cancel
          </button>
          <button @click="deleteAccount" :disabled="isSaving" class="btn btn-danger">
            {{ isSaving ? 'Deleting...' : 'Delete My Account' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
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
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-lg);
      text-align: center;
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
    }
    
    p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
  }
  
  .header-actions {
    .user-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      
      .avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: bold;
      }
      
      .user-details {
        display: flex;
        flex-direction: column;
        
        .name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .role {
          font-size: 0.9rem;
          opacity: 0.8;
        }
      }
    }
  }
}

/* Container */
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-xl);
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}

/* Sidebar */
.settings-sidebar {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  height: fit-content;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 968px) {
    order: 2;
  }
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  
  @media (max-width: 968px) {
    flex-direction: row;
    overflow-x: auto;
    gap: var(--spacing-sm);
    padding-bottom: var(--spacing-sm);
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  
  @media (max-width: 968px) {
    flex-shrink: 0;
    min-width: 120px;
    justify-content: center;
    text-align: center;
  }
  
  &:hover {
    background: var(--color-background-alt);
  }
  
  &.active {
    background: var(--color-accent-light);
    color: var(--color-accent);
    
    .nav-icon {
      filter: saturate(1.5);
    }
  }
  
  .nav-icon {
    font-size: 1.2rem;
  }
  
  .nav-label {
    font-weight: 500;
    
    @media (max-width: 968px) {
      font-size: 0.9rem;
    }
  }
}

.quick-actions {
  border-top: 1px solid var(--color-text-lighter);
  padding-top: var(--spacing-lg);
  
  @media (max-width: 968px) {
    display: none;
  }
}

.quick-action {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  margin-bottom: var(--spacing-xs);
  
  &:hover {
    background: var(--color-background-alt);
  }
  
  .action-icon {
    font-size: 1.1rem;
  }
  
  .action-label {
    font-weight: 500;
    color: var(--color-text-dark);
  }
}

/* Content */
.settings-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 968px) {
    order: 1;
    padding: var(--spacing-lg);
  }
}

.settings-section {
  .section-header {
    margin-bottom: var(--spacing-xl);
    
    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      font-size: 1.1rem;
      color: var(--color-text-light);
    }
  }
}

/* Forms */
.settings-form {
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }
  
  .form-group {
    margin-bottom: var(--spacing-lg);
    
    label {
      display: block;
      font-weight: 600;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      
      .required {
        color: var(--color-danger);
      }
    }
    
    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: var(--spacing-md);
      border: 2px solid var(--color-text-lighter);
      border-radius: var(--border-radius-md);
      font-size: 1rem;
      transition: all 0.3s ease;
      
      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-light);
      }
    }
    
    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }
  }
  
  .form-actions {
    display: flex;
    gap: var(--spacing-md);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--color-text-lighter);
  }
}

/* Security Card */
.security-card {
  background: var(--color-background-alt);
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    h3 {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
  
  .password-form {
    margin-top: var(--spacing-lg);
  }
}

/* Toggle Controls */
.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: var(--spacing-md);
  
  .toggle-input {
    display: none;
  }
  
  .toggle-slider {
    position: relative;
    width: 50px;
    height: 26px;
    background: var(--color-text-light);
    border-radius: 26px;
    transition: all 0.3s ease;
    margin-right: var(--spacing-md);
    
    &::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
  }
  
  .toggle-input:checked + .toggle-slider {
    background: var(--color-accent);
    
    &::before {
      transform: translateX(24px);
    }
  }
  
  .toggle-content {
    display: flex;
    flex-direction: column;
    
    .toggle-title {
      font-weight: 600;
      color: var(--color-text-dark);
      margin-bottom: 2px;
    }
    
    .toggle-description {
      font-size: 0.9rem;
      color: var(--color-text-light);
    }
  }
}

.security-options,
.notification-options,
.privacy-options {
  .option-group {
    margin-bottom: var(--spacing-lg);
  }
}

/* Preference Groups */
.preference-group {
  margin-bottom: var(--spacing-xl);
  
  h3 {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--color-text-lighter);
  }
}

/* Notification Banner */
.notification-banner {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
  
  .banner-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    
    @media (max-width: 768px) {
      flex-direction: column;
    }
    
    .banner-icon {
      font-size: 2.5rem;
      filter: grayscale(0.2);
    }
    
    .banner-text {
      h4 {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--color-text-dark);
        margin-bottom: 4px;
      }
      
      p {
        color: var(--color-text-light);
        margin: 0;
      }
    }
  }
}

/* Billing Cards */
.billing-cards {
  display: grid;
  gap: var(--spacing-lg);
}

.billing-card {
  background: var(--color-background-alt);
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    h3 {
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--color-text-dark);
    }
  }
  
  .card-description {
    color: var(--color-text-light);
    font-style: italic;
  }
}

/* Danger Zone */
.danger-zone {
  .danger-card {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: var(--spacing-md);
      text-align: center;
    }
    
    .danger-content {
      h3 {
        color: #dc2626;
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
      }
      
      p {
        color: #7f1d1d;
      }
    }
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--color-text-lighter);
    
    h3 {
      font-size: 1.5rem;
      color: var(--color-text-dark);
    }
    
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--color-text-light);
      
      &:hover {
        color: var(--color-text-dark);
      }
    }
  }
  
  .modal-body {
    padding: var(--spacing-lg);
    text-align: center;
    
    .warning-icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-md);
    }
    
    p {
      margin-bottom: var(--spacing-md);
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    ul {
      text-align: left;
      margin: var(--spacing-md) 0;
      padding-left: var(--spacing-lg);
      
      li {
        margin-bottom: var(--spacing-xs);
      }
    }
  }
  
  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-top: 1px solid var(--color-text-lighter);
    justify-content: flex-end;
    
    @media (max-width: 480px) {
      flex-direction: column;
    }
  }
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
    }
  }
  
  &.btn-outline {
    background: transparent;
    border: 1px solid var(--color-text-lighter);
    color: var(--color-text-dark);
    
    &:hover:not(:disabled) {
      background: var(--color-background-alt);
      border-color: var(--color-accent);
    }
  }
  
  &.btn-danger {
    background: #dc2626;
    color: white;
    
    &:hover:not(:disabled) {
      background: #b91c1c;
    }
  }
}
</style>