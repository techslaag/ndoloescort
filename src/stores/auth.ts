import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { account } from '../lib/appwrite'
import { encryptedStorageAdapter } from '../lib/encryption'
import type { Models } from 'appwrite'
import { AuthenticationFactor } from 'appwrite'
import { WelcomeMessageService } from '../services/welcomeMessageService'
import { authEnhancementService } from '../services/authEnhancementService'
import { handleAppwriteError } from '../utils/appwriteErrors'
import { notificationService } from '../services/notificationService'

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
  const is2FAEnabled = ref(false)
  const isEmailVerified = computed(() => user.value?.emailVerification || false)
  
  // Check if 2FA is enabled
  const check2FAStatus = async () => {
    try {
      // First check if user has MFA enabled at account level
      const currentUser = await account.get()
      console.log('Current user MFA status:', currentUser.mfa)
      
      // Then check for actual MFA factors
      const factors = await account.listMfaFactors()
      console.log('MFA factors:', factors)
      
      // Check if email MFA is enabled (boolean value, not array)
      is2FAEnabled.value = currentUser.mfa && factors.email === true
      return factors
    } catch (error) {
      console.error('Error checking MFA status:', error)
      is2FAEnabled.value = false
      return null
    }
  }
  const hasSecurityWarnings = computed(() => securityWarnings.value.length > 0)

  // Initialize auth state
  const init = async () => {
    try {
      isLoading.value = true
      const currentUser = await account.get()
      user.value = currentUser
      console.log('Auth initialized with user:', currentUser)
      // Check 2FA status
      await check2FAStatus()
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
      
      // Update user preferences with user type and default preferences
      try {
        const defaultPrefs = {
          userType: userType,
          registrationDate: new Date().toISOString(),
          isVerified: false,
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          profileVisibility: 'public',
          showOnlineStatus: true,
          allowMessages: true,
          notificationSettings: {
            messages: true,
            bookingRequests: true,
            profileViews: true,
            payments: true,
            promotions: false,
            securityAlerts: true
          },
          security: {
            twoFactorEnabled: false,
            loginAlerts: true,
            sessionTimeout: '30',
            trustedDevices: []
          }
        }
        
        await account.updatePrefs(defaultPrefs)
      } catch (prefsErr) {
        console.warn('Failed to update user preferences:', prefsErr)
      }
      
      // Send welcome message after successful signup
      try {
        await WelcomeMessageService.createWelcomeConversation(user.value!.$id, userType as 'client' | 'escort')
      } catch (welcomeErr) {
        console.warn('Failed to send welcome message:', welcomeErr)
      }
      
      // Send email verification automatically
      try {
        await sendEmailVerification()
        console.log('Verification email sent to new user')
      } catch (verifyErr) {
        console.warn('Failed to send verification email:', verifyErr)
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
        // Check if MFA is required
        if (result.requiresMFA) {
          console.log('MFA required for login, redirecting to verification page')
          requiresMFA.value = true
          // Store challenge information if available
          if ('challengeId' in result && result.challengeId) {
            sessionStorage.setItem('login_mfa_challenge_id', result.challengeId)
            console.log('MFA challenge ID stored:', result.challengeId)
          }
          return { 
            success: false, 
            requiresMFA: true,
            message: 'message' in result ? (result as any).message : 'MFA verification required'
          }
        }
        
        error.value = result.error || 'Failed to sign in'
        console.error('Auth store signin failed:', result.error)
        
        if (result.error?.includes('locked')) {
          isAccountLocked.value = true
        }
        return { success: false, error: error.value }
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
      console.error('Auth store signin exception:', err)
      error.value = handleAppwriteError(err, 'signin')
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
      error.value = handleAppwriteError(err, 'signout')
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
      error.value = handleAppwriteError(err, 'updateProfile')
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
      error.value = handleAppwriteError(err, 'changePassword')
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
      error.value = handleAppwriteError(err, 'updateAccount')
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
      error.value = handleAppwriteError(err, 'updatePreferences')
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
      error.value = handleAppwriteError(err, 'deleteAccount')
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
    console.log('Set anonymous user:', anonymousUser)
  }
  
  // Refresh user data from server
  const refreshUser = async () => {
    try {
      if (user.value) {
        const currentUser = await account.get()
        user.value = currentUser
        console.log('User refreshed:', currentUser)
        return currentUser
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      return null
    }
  }

  // Verify 2FA token - matching debug panel flow
  const verify2FA = async (token: string) => {
    try {
      isLoading.value = true
      console.log('Starting MFA verification with token:', token.slice(0, 3) + '***')
      
      // For login MFA, we pass the current user ID (will be 'current' during login)
      const userId = user.value?.$id || 'current'
      
      const result = await authEnhancementService.verifyTwoFactorAuth(userId, token)
      
      if (result.success && result.user) {
        // MFA verification successful, user is now logged in
        user.value = result.user
        requiresMFA.value = false
        console.log('Login completed with MFA verification')
        
        // Log the successful MFA login and send notification
        try {
          const ipAddress = await authEnhancementService.getClientIP()
          const userAgent = navigator.userAgent
          await authEnhancementService.logSecurityEvent(
            result.user.$id, 
            'login', 
            ipAddress, 
            userAgent,
            { mfaUsed: true }
          )
          
          // Send login alert for MFA login
          const prefs = result.user.prefs as any
          const loginAlertsEnabled = prefs?.security?.loginAlerts !== false
          
          if (loginAlertsEnabled) {
            await notificationService.notifyLoginAlert(
              result.user.$id,
              ipAddress,
              userAgent,
              'Unknown Location',
              false // Not a new device since they have MFA
            )
          }
        } catch (logError) {
          console.warn('Failed to log MFA login event:', logError)
        }
        
        // Check 2FA status after login
        await check2FAStatus()
      }
      
      return result
    } catch (err: any) {
      console.error('MFA verification error in store:', err)
      return { success: false, error: err.message || 'Failed to verify 2FA token' }
    } finally {
      isLoading.value = false
    }
  }
  
  // Setup 2FA
  const setup2FA = async () => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      const result = await authEnhancementService.setupTwoFactorAuth(user.value.$id)
      
      // Store challenge ID for verification
      if (result.success && result.challengeId) {
        sessionStorage.setItem('mfa_challenge_id', result.challengeId)
      }
      
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup 2FA' }
    }
  }

  // Enable 2FA after verification
  const enable2FA = async (token: string) => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      // Get stored challenge ID
      const challengeId = sessionStorage.getItem('mfa_challenge_id')
      
      const result = await authEnhancementService.verifyAndEnableTwoFactorAuth(
        user.value.$id, 
        token,
        challengeId || undefined
      )
      
      if (result.success) {
        // Clear challenge ID
        sessionStorage.removeItem('mfa_challenge_id')
        // Refresh 2FA status
        await check2FAStatus()
      }
      
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to enable 2FA' }
    }
  }

  // Setup disable 2FA (create challenge)
  const setupDisable2FA = async () => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      // Create MFA challenge for disable operation
      const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
      sessionStorage.setItem('mfa_disable_challenge_id', challenge.$id)
      
      return { 
        success: true, 
        challengeId: challenge.$id,
        message: 'A verification code has been sent to your email address.'
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create disable challenge' }
    }
  }

  // Disable 2FA
  const disable2FA = async (token?: string) => {
    try {
      if (!user.value) {
        return { success: false, error: 'No user session found' }
      }
      
      const result = await authEnhancementService.disableTwoFactorAuth(user.value.$id, token)
      
      if (result.success) {
        // Refresh 2FA status
        await check2FAStatus()
      }
      
      return result
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable 2FA' }
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
  
  // Send email verification
  const sendEmailVerification = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Create verification with the correct redirect URL
      const redirectUrl = `${window.location.origin}/verify-email`
      await account.createVerification(redirectUrl)
      
      return { success: true, message: 'Verification email sent successfully' }
    } catch (err: any) {
      error.value = handleAppwriteError(err, 'sendEmailVerification')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }
  
  // Complete email verification (called from verification page)
  const completeEmailVerification = async (userId: string, secret: string) => {
    try {
      isLoading.value = true
      error.value = null
      
      // Update verification status
      await account.updateVerification(userId, secret)
      
      // Refresh user data to get updated verification status
      await refreshUser()
      
      return { success: true, message: 'Email verified successfully' }
    } catch (err: any) {
      error.value = handleAppwriteError(err, 'completeEmailVerification')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
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
    isEmailVerified,
    hasSecurityWarnings,
    init,
    signup,
    signin,
    signout,
    verify2FA,
    setup2FA,
    enable2FA,
    setupDisable2FA,
    disable2FA,
    check2FAStatus,
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
    refreshUser,
    getRememberedCredentials,
    clearRememberedCredentials,
    sendEmailVerification,
    completeEmailVerification
  }
}, {
  persist: {
    key: 'auth-store',
    storage: encryptedStorageAdapter
  }
})