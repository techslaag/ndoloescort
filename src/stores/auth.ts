import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { account } from '../lib/appwrite'
import { encryptedStorageAdapter } from '../lib/encryption'
import type { Models } from 'appwrite'
import { WelcomeMessageService } from '../services/welcomeMessageService'
import { authEnhancementService } from '../services/authEnhancementService'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Models.User<Models.Preferences> | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const securityWarnings = ref<string[]>([])
  const requiresMFA = ref(false)
  const loginAttempts = ref(0)
  const isAccountLocked = ref(false)
  const sessionInfo = ref<any>(null)

  const isAuthenticated = computed(() => !!user.value)
  const is2FAEnabled = computed(() => {
    return user.value?.prefs?.twoFactorAuth ? true : false
  })
  const hasSecurityWarnings = computed(() => securityWarnings.value.length > 0)

  // Initialize auth state
  const init = async () => {
    try {
      isLoading.value = true
      const currentUser = await account.get()
      user.value = currentUser
    } catch (err) {
      // User is not logged in
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Get remembered credentials
  const getRememberedCredentials = () => {
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    const userEmail = localStorage.getItem('userEmail') || ''
    return { rememberMe, userEmail }
  }

  // Clear remembered credentials
  const clearRememberedCredentials = () => {
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('userEmail')
  }

  // Sign up
  const signup = async (email: string, password: string, name: string, userType: string = 'client') => {
    try {
      isLoading.value = true
      error.value = null
      
      // Create account
      await account.create('unique()', email, password, name)
      
      // Sign in immediately after signup
      await signin(email, password)
      
      // Update user preferences with user type
      try {
        await account.updatePrefs({
          userType: userType,
          registrationDate: new Date().toISOString(),
          isVerified: false
        })
      } catch (prefsErr) {
        console.warn('Failed to update user preferences:', prefsErr)
      }
      
      // Send welcome message after successful signup
      try {
        await WelcomeMessageService.createWelcomeConversation(user.value!.$id, userType as 'client' | 'escort')
      } catch (welcomeErr) {
        console.warn('Failed to send welcome message:', welcomeErr)
      }
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to create account'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with enhanced security
  const signin = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      isLoading.value = true
      error.value = null
      securityWarnings.value = []
      requiresMFA.value = false
      
      // Use enhanced login
      const result = await authEnhancementService.enhancedLogin(email, password, rememberMe)
      
      if (!result.success) {
        error.value = result.error || 'Failed to sign in'
        if (result.error?.includes('locked')) {
          isAccountLocked.value = true
        }
        return { success: false, error: error.value }
      }
      
      // Handle 2FA requirement
      if (result.requiresMFA) {
        requiresMFA.value = true
        return { success: false, requiresMFA: true }
      }
      
      // Set user and security warnings
      user.value = result.user
      if (result.securityWarnings) {
        securityWarnings.value = result.securityWarnings
      }
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('userEmail', email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('userEmail')
      }
      
      // Check if user has received welcome message, send if not
      try {
        const hasWelcomeMessage = await WelcomeMessageService.hasReceivedWelcomeMessage(result.user.$id)
        if (!hasWelcomeMessage) {
          const userType = (result.user.prefs as any)?.userType || 'client'
          await WelcomeMessageService.createWelcomeConversation(result.user.$id, userType)
        }
      } catch (welcomeErr) {
        console.warn('Failed to check/send welcome message:', welcomeErr)
      }
      
      return { success: true, securityWarnings: securityWarnings.value }
    } catch (err: any) {
      error.value = err.message || 'Failed to sign in'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Sign out with enhanced cleanup
  const signout = async (sessionId?: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Clear user state first (optimistic update)
      const previousUser = user.value
      user.value = null
      securityWarnings.value = []
      requiresMFA.value = false
      loginAttempts.value = 0
      isAccountLocked.value = false
      sessionInfo.value = null
      
      // Use enhanced logout
      const result = await authEnhancementService.enhancedLogout(sessionId)
      
      if (!result.success) {
        // If enhanced logout fails, fallback to regular logout
        try {
          await account.deleteSession('current')
        } catch (sessionErr: any) {
          // If deletion fails, restore user state
          console.error('Failed to delete session:', sessionErr)
          user.value = previousUser
          throw sessionErr
        }
      }
      
      // Clear all local storage data
      clearRememberedCredentials()
      
      // Clear any cached data
      localStorage.removeItem('lastRoute')
      sessionStorage.clear()
      
      // Clear encrypted storage
      try {
        encryptedStorageAdapter.clear()
      } catch (clearErr) {
        console.warn('Failed to clear encrypted storage:', clearErr)
      }
      
      // Dispatch logout event for other parts of the app
      window.dispatchEvent(new CustomEvent('user-logout'))
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to sign out'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Update profile
  const updateProfile = async (name: string, phone?: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      const updatedUser = await account.updateName(name)
      
      // Update phone if provided
      if (phone) {
        await account.updatePhone(phone, '')
      }
      
      user.value = updatedUser
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update profile'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      await account.updatePassword(newPassword, currentPassword)
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to change password'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Always attempt to create recovery, regardless of whether email exists
      // This prevents email enumeration attacks
      await account.createRecovery(email, `${window.location.origin}/reset-password`)
      
      // Always return success for privacy
      return { success: true }
    } catch (err: any) {
      // Log the error for debugging but don't expose it to user
      console.error('Password reset error:', err)
      
      // For privacy, we don't reveal if the email exists or what the specific error is
      // Instead, we return success to prevent email enumeration
      return { success: true }
    } finally {
      isLoading.value = false
    }
  }

  // Update account information
  const updateAccount = async (accountData: {
    name?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    location?: {
      city: string
      state: string
      country: string
    }
    bio?: string
    website?: string
  }) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Update name if provided
      if (accountData.name) {
        await account.updateName(accountData.name)
      }
      
      // Update email if provided
      if (accountData.email && accountData.email !== user.value?.email) {
        await account.updateEmail(accountData.email, '')
      }
      
      // Update phone if provided
      if (accountData.phone) {
        await account.updatePhone(accountData.phone, '')
      }
      
      // Update preferences with additional data
      const currentPrefs = user.value?.prefs || {}
      const updatedPrefs = {
        ...currentPrefs,
        ...(accountData.dateOfBirth && { dateOfBirth: accountData.dateOfBirth }),
        ...(accountData.location && { location: accountData.location }),
        ...(accountData.bio && { bio: accountData.bio }),
        ...(accountData.website && { website: accountData.website })
      }
      
      await account.updatePrefs(updatedPrefs)
      
      // Refresh user data
      const updatedUser = await account.get()
      user.value = updatedUser
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update account'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Update user preferences
  const updatePreferences = async (preferences: {
    language?: string
    timezone?: string
    emailNotifications?: boolean
    smsNotifications?: boolean
    marketingEmails?: boolean
    profileVisibility?: 'public' | 'private' | 'members-only'
    showOnlineStatus?: boolean
    allowMessages?: boolean
  }) => {
    try {
      isLoading.value = true
      error.value = null
      
      const currentPrefs = user.value?.prefs || {}
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences
      }
      
      await account.updatePrefs(updatedPrefs)
      
      // Refresh user data
      const updatedUser = await account.get()
      user.value = updatedUser
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update preferences'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Delete account
  const deleteAccount = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Delete the account
      await account.deleteIdentity('current')
      
      // Clear local state
      user.value = null
      clearRememberedCredentials()
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete account'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Clear error and security warnings
  const clearError = () => {
    error.value = null
    securityWarnings.value = []
  }

  // Set error with optional auto-clear
  const setError = (message: string, autoClear = false) => {
    error.value = message
    if (autoClear) {
      setTimeout(() => {
        clearError()
      }, 5000) // Auto-clear after 5 seconds
    }
  }

  // Set anonymous user
  const setAnonymousUser = (anonymousUser: Models.User<Models.Preferences>) => {
    user.value = anonymousUser
  }

  // Verify 2FA token
  const verify2FA = async (token: string) => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      const result = await authEnhancementService.verifyTwoFactorAuth(user.value.$id, token)
      
      if (result.success) {
        requiresMFA.value = false
      }
      
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify 2FA token' }
    }
  }
  
  // Setup 2FA
  const setup2FA = async () => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      return await authEnhancementService.setupTwoFactorAuth(user.value.$id)
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup 2FA' }
    }
  }
  
  // Get security audit
  const getSecurityAudit = async () => {
    try {
      if (!user.value) {
        return null
      }
      
      return await authEnhancementService.getSecurityAudit(user.value.$id)
    } catch (err: any) {
      console.error('Failed to get security audit:', err)
      return null
    }
  }
  
  // Validate password strength
  const validatePasswordStrength = (password: string) => {
    return authEnhancementService.validatePasswordStrength(password)
  }

  return {
    user,
    isLoading,
    error,
    securityWarnings,
    requiresMFA,
    loginAttempts,
    isAccountLocked,
    sessionInfo,
    isAuthenticated,
    is2FAEnabled,
    hasSecurityWarnings,
    init,
    signup,
    signin,
    signout,
    verify2FA,
    setup2FA,
    updateProfile,
    updateAccount,
    updatePreferences,
    changePassword,
    resetPassword,
    deleteAccount,
    getSecurityAudit,
    validatePasswordStrength,
    clearError,
    setError,
    setAnonymousUser,
    getRememberedCredentials,
    clearRememberedCredentials
  }
}, {
  persist: {
    key: 'auth-store',
    storage: encryptedStorageAdapter
  }
})