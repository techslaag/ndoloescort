<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { formatCurrency as formatCurrencyUtil } from '../utils/currency'
import ErrorAlert from '../components/ErrorAlert.vue'

const router = useRouter()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const isSaving = ref(false)
const activeTab = ref('account')
const showDeleteConfirm = ref(false)
const showPasswordForm = ref(false)
// Removed old 2FA setup modal - now using dedicated VerificationCode page
const isSendingVerification = ref(false)

// Billing related data
const billingFilter = ref('all')
const billingHistory = ref<any[]>([])

// Default preferences for all users
const DEFAULT_PREFERENCES = {
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  profileVisibility: 'public' as const,
  showOnlineStatus: true,
  allowMessages: true,
  pushNotifications: false,
  autoReply: false,
  autoReplyMessage: 'Thank you for your message. I will get back to you soon!'
}

// Default security settings
const DEFAULT_SECURITY = {
  twoFactorEnabled: false,
  loginAlerts: true,
  sessionTimeout: '30', // 30 minutes default
  allowedDevices: 'unlimited'
}

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
  bio: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const preferencesForm = reactive({
  ...DEFAULT_PREFERENCES
})

const securityForm = reactive({
  ...DEFAULT_SECURITY
})

// Initialize forms with user data
onMounted(() => {
  if (authStore.user) {
    accountForm.name = authStore.user.name || ''
    accountForm.email = authStore.user.email || ''
    accountForm.phone = (authStore.user.prefs as any)?.phone || ''
    accountForm.dateOfBirth = (authStore.user.prefs as any)?.dateOfBirth || ''
    accountForm.bio = (authStore.user.prefs as any)?.bio || ''
    
    // Preferences - merge saved preferences with defaults
    const prefs = authStore.user.prefs as any
    
    // Read preferences from the actual user data structure
    const userPrefs = {
      language: prefs?.language || DEFAULT_PREFERENCES.language,
      timezone: prefs?.timezone || DEFAULT_PREFERENCES.timezone,
      currency: prefs?.currency || DEFAULT_PREFERENCES.currency,
      emailNotifications: prefs?.emailNotifications !== undefined ? prefs.emailNotifications : DEFAULT_PREFERENCES.emailNotifications,
      smsNotifications: prefs?.smsNotifications !== undefined ? prefs.smsNotifications : DEFAULT_PREFERENCES.smsNotifications,
      marketingEmails: prefs?.marketingEmails !== undefined ? prefs.marketingEmails : DEFAULT_PREFERENCES.marketingEmails,
      profileVisibility: prefs?.profileVisibility || DEFAULT_PREFERENCES.profileVisibility,
      showOnlineStatus: prefs?.showOnlineStatus !== undefined ? prefs.showOnlineStatus : DEFAULT_PREFERENCES.showOnlineStatus,
      allowMessages: prefs?.allowMessages !== undefined ? prefs.allowMessages : DEFAULT_PREFERENCES.allowMessages,
      pushNotifications: prefs?.pushNotifications !== undefined ? prefs.pushNotifications : DEFAULT_PREFERENCES.pushNotifications,
      autoReply: prefs?.autoReply !== undefined ? prefs.autoReply : DEFAULT_PREFERENCES.autoReply,
      autoReplyMessage: prefs?.autoReplyMessage || DEFAULT_PREFERENCES.autoReplyMessage
    }
    
    Object.assign(preferencesForm, userPrefs)
    
    // Always force language and timezone to defaults (non-editable)
    preferencesForm.language = 'en'
    preferencesForm.timezone = 'UTC'
    
    // Security - merge saved security settings with defaults
    const securityPrefs = prefs?.security || {}
    
    const userSecurity = {
      twoFactorEnabled: securityPrefs.twoFactorEnabled !== undefined ? securityPrefs.twoFactorEnabled : DEFAULT_SECURITY.twoFactorEnabled,
      loginAlerts: securityPrefs.loginAlerts !== undefined ? securityPrefs.loginAlerts : DEFAULT_SECURITY.loginAlerts,
      sessionTimeout: securityPrefs.sessionTimeout || DEFAULT_SECURITY.sessionTimeout,
      allowedDevices: securityPrefs.allowedDevices || DEFAULT_SECURITY.allowedDevices
    }
    
    Object.assign(securityForm, userSecurity)
    
    // Check and sync 2FA status
    authStore.check2FAStatus().then(() => {
      securityForm.twoFactorEnabled = authStore.is2FAEnabled
    })
  }
  
  // Load billing history for escorts
  if (isEscort.value) {
    loadBillingHistory()
  }
})

// Billing history functions
const loadBillingHistory = async () => {
  // TODO: Load actual billing history from backend
  // For now, using mock data
  billingHistory.value = [
    // Example transactions - replace with actual API call
  ]
}

const filteredBillingHistory = computed(() => {
  if (billingFilter.value === 'all') {
    return billingHistory.value
  }
  return billingHistory.value.filter(transaction => transaction.type === billingFilter.value)
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatCurrency = (amount: number, currency?: string) => {
  return formatCurrencyUtil(amount, currency)
}

const formatTransactionType = (type: string) => {
  const typeLabels: Record<string, string> = {
    subscription: 'Subscription',
    tokens: 'Token Purchase',
    gifts: 'Gift Purchase',
    withdrawal: 'Withdrawal',
    refund: 'Refund'
  }
  return typeLabels[type] || type
}

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
    // Skip phone, dateOfBirth, bio - they're not in the updatePreferences interface
    
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
    
    const result = await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    
    if (result.success) {
      // Clear form
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      showPasswordForm.value = false
      
      console.log('Password updated successfully')
      // You could add a success toast notification here
    } else {
      authStore.setError(result.error || 'Failed to update password')
    }
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
    
    // Ensure language and timezone are always set to defaults
    preferencesForm.language = 'en'
    preferencesForm.timezone = 'UTC'
    
    // Save preferences directly to the root level (matching Appwrite structure)
    const currentPrefs = authStore.user?.prefs as any || {}
    const updatedPrefs = {
      ...currentPrefs,
      // Save preferences at root level
      language: preferencesForm.language,
      timezone: preferencesForm.timezone,
      currency: preferencesForm.currency,
      emailNotifications: preferencesForm.emailNotifications,
      smsNotifications: preferencesForm.smsNotifications,
      marketingEmails: preferencesForm.marketingEmails,
      profileVisibility: preferencesForm.profileVisibility,
      showOnlineStatus: preferencesForm.showOnlineStatus,
      allowMessages: preferencesForm.allowMessages,
      pushNotifications: preferencesForm.pushNotifications,
      autoReply: preferencesForm.autoReply,
      autoReplyMessage: preferencesForm.autoReplyMessage
    }
    
    await authStore.updatePreferences(updatedPrefs)
    
    console.log('Preferences updated successfully')
    success('Preferences updated successfully')
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
    
    // Handle Two-Factor Authentication separately
    if (securityForm.twoFactorEnabled !== authStore.is2FAEnabled) {
      if (securityForm.twoFactorEnabled) {
        // Enable 2FA - show setup modal with QR code
        console.log('Starting 2FA setup...')
        
        try {
          const result = await authStore.setup2FA()
          console.log('2FA setup result:', result)
          
          if (!result.success) {
            console.error('2FA setup failed:', result.error)
            authStore.setError(result.error || 'Failed to setup Two-Factor Authentication')
            securityForm.twoFactorEnabled = false // Revert the toggle
            return
          }
          
          // Redirect to verification code page for setup
          if (result.success) {
            router.push({
              name: 'VerificationCode',
              query: {
                type: 'setup',
                email: authStore.user?.email || '',
                redirect: '/settings?tab=security'
              }
            })
            success('Verification code sent to your email')
          }
        } catch (error: any) {
          console.error('2FA setup error:', error)
          authStore.setError('Failed to setup Two-Factor Authentication: ' + error.message)
          securityForm.twoFactorEnabled = false // Revert the toggle
          return
        }
      } else {
        // Disable 2FA - require verification for security
        const confirmed = window.confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')
        if (!confirmed) {
          securityForm.twoFactorEnabled = true // Revert the toggle
          return
        }
        
        try {
          // Create disable challenge first
          const result = await authStore.setupDisable2FA()
          if (result.success) {
            // Redirect to verification page for secure disable
            router.push({
              name: 'VerificationCode',
              query: {
                type: 'disable',
                email: authStore.user?.email || '',
                redirect: '/settings?tab=security'
              }
            })
            success('Verification code sent to your email')
          } else {
            showError(result.error || 'Failed to initiate disable process')
            securityForm.twoFactorEnabled = true // Revert the toggle
          }
        } catch (error: any) {
          console.error('Error initiating disable 2FA:', error)
          showError('Failed to initiate disable process: ' + error.message)
          securityForm.twoFactorEnabled = true // Revert the toggle
        }
      }
    }
    
    // Don't need to save other preferences here as they are saved immediately on change
    console.log('2FA settings processed')
  } catch (error) {
    console.error('Error updating security settings:', error)
    authStore.setError('Failed to update security settings')
  } finally {
    isSaving.value = false
  }
}

// 2FA functions now handled by dedicated VerificationCode page

// Handle 2FA toggle change
const handle2FAToggle = async () => {
  console.log('2FA toggle changed:', securityForm.twoFactorEnabled)
  
  if (securityForm.twoFactorEnabled && !authStore.is2FAEnabled) {
    // Enable 2FA - show setup modal with QR code
    console.log('Starting 2FA setup...')
    
    try {
      const result = await authStore.setup2FA()
      console.log('2FA setup result:', result)
      
      if (!result.success) {
        console.error('2FA setup failed:', result.error)
        authStore.setError(result.error || 'Failed to setup Two-Factor Authentication')
        securityForm.twoFactorEnabled = false // Revert the toggle
        return
      }
      
      // Redirect to verification page for setup
      if (result.success) {
        router.push({
          name: 'VerificationCode',
          query: {
            type: 'setup',
            email: authStore.user?.email || ''
          }
        })
      }
      console.log('2FA setup initiated - showing QR code')
    } catch (error: any) {
      console.error('2FA setup error:', error)
      authStore.setError('Failed to setup Two-Factor Authentication: ' + error.message)
      securityForm.twoFactorEnabled = false // Revert the toggle
    }
  } else if (!securityForm.twoFactorEnabled && authStore.is2FAEnabled) {
    // Disable 2FA - this would require confirmation and current password
    const confirmed = confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')
    if (!confirmed) {
      securityForm.twoFactorEnabled = true // Revert the toggle
      return
    }
    
    try {
      const result = await authStore.disable2FA()
      if (result.success) {
        console.log('2FA disabled successfully')
        success('Two-Factor Authentication has been disabled.')
      } else {
        console.error('Failed to disable 2FA:', result.error)
        authStore.setError(result.error || 'Failed to disable 2FA')
        securityForm.twoFactorEnabled = true // Revert
      }
    } catch (error: any) {
      console.error('Error disabling 2FA:', error)
      authStore.setError('Failed to disable 2FA: ' + error.message)
      securityForm.twoFactorEnabled = true // Revert
    }
  }
}

// Handle Login Alerts toggle
const handleLoginAlertsToggle = async () => {
  console.log('Login alerts toggle changed:', securityForm.loginAlerts)
  
  try {
    // Save the preference immediately
    const currentPrefs = authStore.user?.prefs as any || {}
    const updatedPrefs = {
      ...currentPrefs,
      security: {
        ...currentPrefs.security,
        loginAlerts: securityForm.loginAlerts,
        sessionTimeout: securityForm.sessionTimeout,
        twoFactorEnabled: securityForm.twoFactorEnabled,
        allowedDevices: securityForm.allowedDevices
      }
    }
    
    await authStore.updatePreferences(updatedPrefs)
    
    if (securityForm.loginAlerts) {
      success('Login alerts enabled. You will be notified of new login attempts.')
    } else {
      success('Login alerts disabled. You will not receive notifications for new logins.')
    }
  } catch (error) {
    console.error('Error updating login alerts preference:', error)
    showError('Failed to update login alerts preference')
    // Revert the toggle on error
    securityForm.loginAlerts = !securityForm.loginAlerts
  }
}

// Handle Session Timeout change
const handleSessionTimeoutChange = async () => {
  console.log('Session timeout changed:', securityForm.sessionTimeout)
  
  try {
    // Save the preference immediately
    const currentPrefs = authStore.user?.prefs as any || {}
    const updatedPrefs = {
      ...currentPrefs,
      security: {
        ...currentPrefs.security,
        loginAlerts: securityForm.loginAlerts,
        sessionTimeout: securityForm.sessionTimeout,
        twoFactorEnabled: securityForm.twoFactorEnabled,
        allowedDevices: securityForm.allowedDevices
      }
    }
    
    await authStore.updatePreferences(updatedPrefs)
    
    const timeoutText = securityForm.sessionTimeout === '0' ? 'Never' : 
                       securityForm.sessionTimeout === '60' ? '1 hour' :
                       securityForm.sessionTimeout === '120' ? '2 hours' :
                       securityForm.sessionTimeout === '480' ? '8 hours' :
                       securityForm.sessionTimeout === '1440' ? '24 hours' :
                       `${securityForm.sessionTimeout} minutes`
    
    success(`Session timeout updated to: ${timeoutText}`)
  } catch (error) {
    console.error('Error updating session timeout:', error)
    showError('Failed to update session timeout')
  }
}

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


// Send verification email
const sendVerificationEmail = async () => {
  try {
    isSendingVerification.value = true
    const result = await authStore.sendEmailVerification()
    
    if (result.success) {
      success('Verification email sent! Please check your inbox.')
    } else {
      showError(result.error || 'Failed to send verification email')
    }
  } catch (error) {
    console.error('Error sending verification email:', error)
    showError('Failed to send verification email')
  } finally {
    isSendingVerification.value = false
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
        
        <!-- Quick Actions section removed -->
      </div>
      
      <!-- Content Area -->
      <div class="settings-content">
        <!-- Account Tab -->
        <div v-if="activeTab === 'account'" class="settings-section">
          <div class="section-header">
            <h2>Account Information</h2>
            <p>Update your personal information and contact details</p>
          </div>
          
          <!-- Email Verification Alert -->
          <div v-if="!authStore.isEmailVerified" class="verification-alert">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <h4>Email Verification Required</h4>
              <p>Please verify your email address to access all features.</p>
              <button @click="sendVerificationEmail" :disabled="isSendingVerification" class="btn btn-primary btn-sm">
                {{ isSendingVerification ? 'Sending...' : 'Send Verification Email' }}
              </button>
            </div>
          </div>
          
          <!-- Email Verified Badge -->
          <div v-else class="verification-success">
            <div class="success-icon">✅</div>
            <div class="success-content">
              <h4>Email Verified</h4>
              <p>Your email address has been verified.</p>
            </div>
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
                    @change="handle2FAToggle"
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
                    @change="handleLoginAlertsToggle"
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
              <select id="sessionTimeout" v-model="securityForm.sessionTimeout" @change="handleSessionTimeoutChange" class="form-select">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
                <option value="1440">24 hours</option>
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
                  <select id="language" v-model="preferencesForm.language" class="form-select" disabled>
                    <option value="en">English</option>
                  </select>
                  <p class="help-text">Currently only English is supported</p>
                </div>
                
                <div class="form-group">
                  <label for="timezone">Timezone</label>
                  <select id="timezone" v-model="preferencesForm.timezone" class="form-select" disabled>
                    <option value="UTC">UTC</option>
                  </select>
                  <p class="help-text">All times are displayed in UTC</p>
                </div>
                
                <div class="form-group">
                  <label for="currency">Currency</label>
                  <select id="currency" v-model="preferencesForm.currency" class="form-select">
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="XAF">XAF - CFA Franc BEAC</option>
                    <option value="XOF">XOF - CFA Franc BCEAO</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Notification Preferences -->
            <div class="preference-group">
              <h3>Notifications</h3>
              
              <div v-if="false" class="notification-banner">
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
            <h2>Billing</h2>
            <p>Manage your billing information</p>
          </div>
          
          <!-- Billing History -->
          <div class="billing-section">
            <div class="billing-header">
              <h3>Billing History</h3>
              <div class="billing-filters">
                <select v-model="billingFilter" class="filter-select">
                  <option value="all">All Transactions</option>
                  <option value="subscriptions">Subscriptions</option>
                  <option value="tokens">Token Purchases</option>
                  <option value="gifts">Gift Purchases</option>
                  <option value="withdrawals">Withdrawals</option>
                </select>
              </div>
            </div>
            
            <div v-if="billingHistory.length === 0" class="empty-state">
              <div class="empty-icon">💰</div>
              <h4>No billing history</h4>
              <p>Your transaction history will appear here</p>
            </div>
            
            <div v-else class="billing-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="transaction in filteredBillingHistory" :key="transaction.id">
                    <td>{{ formatDate(transaction.date) }}</td>
                    <td>{{ transaction.description }}</td>
                    <td>
                      <span :class="['transaction-type', transaction.type]">
                        {{ formatTransactionType(transaction.type) }}
                      </span>
                    </td>
                    <td :class="transaction.type === 'withdrawal' ? 'amount-negative' : 'amount-positive'">
                      {{ formatCurrency(transaction.amount, transaction.currency) }}
                    </td>
                    <td>
                      <span :class="['status-badge', transaction.status]">
                        {{ transaction.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Tax Information -->
          <div class="billing-card tax-info">
            <div class="card-header">
              <h3>Tax Information</h3>
            </div>
            <div class="tax-content">
              <div class="tax-status">
                <div class="status-icon">✅</div>
                <div class="status-text">
                  <h4>No Tax Charged</h4>
                  <p>This platform does not charge any taxes on transactions. You are responsible for reporting and paying taxes according to your local regulations.</p>
                </div>
              </div>
              <div class="tax-notice">
                <p><strong>Important:</strong> As an independent service provider, you may be required to:</p>
                <ul>
                  <li>Keep records of all your earnings</li>
                  <li>Report income to your local tax authority</li>
                  <li>Pay applicable taxes based on your jurisdiction</li>
                </ul>
                <p class="disclaimer">Please consult with a tax professional for guidance specific to your situation.</p>
              </div>
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

    <!-- 2FA setup now handled by dedicated VerificationCode page -->
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: var(--color-background);
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
      
      &:disabled {
        background-color: #f3f4f6;
        color: #6b7280;
        cursor: not-allowed;
        opacity: 0.7;
      }
    }
    
    .help-text {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
      font-style: italic;
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

/* Billing Section */
.billing-section {
  margin-bottom: var(--spacing-xl);
}

.billing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  
  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-dark);
  }
}

.billing-filters {
  .filter-select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    background: white;
    color: var(--color-text-dark);
    cursor: pointer;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }
  }
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl) 0;
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
  }
  
  h4 {
    font-size: 1.2rem;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
  }
}

.billing-table {
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    th {
      text-align: left;
      padding: var(--spacing-md);
      border-bottom: 2px solid var(--color-text-lighter);
      color: var(--color-text-dark);
      font-weight: 600;
      white-space: nowrap;
    }
    
    td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--color-text-lighter);
      
      &.amount-positive {
        color: #10b981;
        font-weight: 500;
      }
      
      &.amount-negative {
        color: #ef4444;
        font-weight: 500;
      }
    }
    
    tr:hover {
      background-color: var(--color-background-alt);
    }
  }
}

.transaction-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  
  &.subscription {
    background-color: #dbeafe;
    color: #1e40af;
  }
  
  &.tokens {
    background-color: #e0e7ff;
    color: #3730a3;
  }
  
  &.gifts {
    background-color: #fce7f3;
    color: #be185d;
  }
  
  &.withdrawal {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  &.refund {
    background-color: #fed7aa;
    color: #c2410c;
  }
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  
  &.completed {
    background-color: #d1fae5;
    color: #065f46;
  }
  
  &.pending {
    background-color: #fef3c7;
    color: #92400e;
  }
  
  &.failed {
    background-color: #fee2e2;
    color: #dc2626;
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
  
  &.tax-info {
    .tax-content {
      .tax-status {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        
        .status-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }
        
        .status-text {
          h4 {
            font-size: 1.2rem;
            color: #10b981;
            margin-bottom: var(--spacing-sm);
          }
          
          p {
            color: var(--color-text-light);
            line-height: 1.6;
          }
        }
      }
      
      .tax-notice {
        background: #f3f4f6;
        border-radius: var(--border-radius-md);
        padding: var(--spacing-md);
        
        p {
          margin-bottom: var(--spacing-sm);
          color: var(--color-text-dark);
          
          &:last-child {
            margin-bottom: 0;
          }
        }
        
        ul {
          margin: var(--spacing-sm) 0;
          padding-left: var(--spacing-lg);
          
          li {
            margin-bottom: var(--spacing-xs);
            color: var(--color-text-dark);
          }
        }
        
        .disclaimer {
          font-style: italic;
          color: var(--color-text-light);
          font-size: 0.875rem;
          margin-top: var(--spacing-sm);
        }
      }
    }
  }
  
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

/* 2FA Setup Modal Styles */
.modal-content.large {
  max-width: 600px;
}

.setup-steps {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  .step {
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    
    h4 {
      margin: 0 0 0.5rem 0;
      color: #374151;
      font-size: 1.1rem;
    }
    
    p {
      margin: 0.5rem 0;
      color: #6b7280;
      line-height: 1.5;
    }
  }
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  
  .qr-code-text {
    text-align: center;
    width: 100%;
    
    code {
      display: block;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9rem;
      padding: 1rem;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin: 0.5rem 0;
      word-break: break-all;
      letter-spacing: 1px;
    }
  }
}

.email-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .success-icon {
    font-size: 1.5rem;
  }
}

.resend-section {
  text-align: center;
  margin-top: 1rem;
  
  p {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
}

.info-box {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 1rem;
  border-radius: 8px;
  
  ul {
    margin-top: 0.5rem;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
      color: #4b5563;
    }
  }
}

.verification-input {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
  
  .verification-code-input {
    width: 200px;
    padding: 1rem;
    font-size: 1.5rem;
    text-align: center;
    letter-spacing: 0.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    &:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }
  }
}

.backup-codes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  
  .backup-code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    text-align: center;
    border: 1px solid #e5e7eb;
  }
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.setup-instructions {
  margin-top: 1rem;
  
  ol {
    text-align: left;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
  }
}

@media (max-width: 640px) {
  .modal-content.large {
    max-width: 95vw;
    margin: 1rem;
  }
  
  .backup-codes {
    grid-template-columns: 1fr;
  }
}

/* Email Verification Styles */
.verification-alert {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  .alert-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .alert-content {
    flex: 1;
    
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #92400e;
      margin-bottom: var(--spacing-xs);
    }
    
    p {
      color: #78350f;
      margin-bottom: var(--spacing-md);
    }
  }
}

.verification-success {
  background: #d1fae5;
  border: 1px solid #34d399;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  .success-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .success-content {
    flex: 1;
    
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #065f46;
      margin-bottom: var(--spacing-xs);
    }
    
    p {
      color: #047857;
      margin: 0;
    }
  }
}
</style>