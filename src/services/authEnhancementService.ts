import { account, databases, DATABASE_ID, AUTH_SESSIONS_COLLECTION_ID, LOGIN_ATTEMPTS_COLLECTION_ID, SECURITY_EVENTS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query, AuthenticationFactor, AuthenticatorType } from 'appwrite'
import { encryptedStorageAdapter } from '../lib/encryption'
import * as CryptoJS from 'crypto-js'
import { notificationService } from './notificationService'

export interface SecurityEvent {
  id: string
  userId: string
  eventType: 'login' | 'logout' | 'password_change' | 'email_change' | 'failed_login' | 'account_locked' | 'suspicious_activity'
  description: string
  ipAddress: string
  userAgent: string
  location?: {
    country: string
    city: string
    latitude: number
    longitude: number
  }
  metadata?: Record<string, any>
  createdAt: string
}

export interface LoginAttempt {
  id: string
  email: string
  ipAddress: string
  userAgent: string
  success: boolean
  failureReason?: string
  attemptedAt: string
}

export interface SessionInfo {
  id: string
  userId: string
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet'
    os: string
    browser: string
  }
  ipAddress: string
  userAgent: string
  sessionToken: string
  location?: {
    country: string
    city: string
  }
  isActive: boolean
  lastActivityAt: string
  createdAt: string
  expiresAt: string
}

export class AuthEnhancementService {
  private maxLoginAttempts = 5
  private lockoutDuration = 15 * 60 * 1000 // 15 minutes

  // Test Appwrite connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to get account info without authentication - this will fail but confirm connectivity
      await account.get()
      return { success: true }
    } catch (error: any) {
      console.log('Connection test result:', error.type, error.message)
      
      // If we get a specific auth error, connection is working
      if (error.type === 'general_unauthorized_scope' || error.type === 'user_unauthorized') {
        return { success: true }
      }
      
      // Network or configuration errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return { success: false, error: 'Network connection failed. Please check your internet connection.' }
      }
      
      if (error.type === 'project_unknown') {
        return { success: false, error: 'Service configuration error. Please contact support.' }
      }
      
      return { success: false, error: `Connection test failed: ${error.message}` }
    }
  }
  private sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours

  // Enhanced login with security tracking
  async enhancedLogin(email: string, password: string, rememberMe = false): Promise<{
    success: boolean
    user?: any
    requiresMFA?: boolean
    error?: string
    securityWarnings?: string[]
    challengeId?: string
    message?: string
  }> {
    const ipAddress = await this.getClientIP()
    const userAgent = navigator.userAgent
    const deviceInfo = this.parseDeviceInfo(userAgent)

    try {
      // Check for account lockout
      const isLocked = await this.isAccountLocked(email)
      if (isLocked) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, 'Account locked')
        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts. Please try again later.'
        }
      }

      // Check rate limiting
      const recentAttempts = await this.getRecentLoginAttempts(email)
      if (recentAttempts >= this.maxLoginAttempts) {
        await this.lockAccount(email)
        return {
          success: false,
          error: 'Too many login attempts. Account temporarily locked.'
        }
      }

      // Attempt login - following the exact flow as MFA Debug Panel
      try {
        console.log('Attempting login for email:', email)
        
        // Step 1: Try to create email/password session
        const session = await account.createEmailPasswordSession(email, password)
        
        // If we reach here, MFA was not required
        console.log('Session created successfully without MFA')
        const user = await account.get()
        console.log('User retrieved:', user.email, 'MFA status:', user.mfa)

        // Log successful login
        await this.logLoginAttempt(email, ipAddress, userAgent, true)
        await this.logSecurityEvent(user.$id, 'login', ipAddress, userAgent)

        // Create session record
        await this.createSessionRecord(user.$id, deviceInfo, ipAddress, rememberMe, userAgent)

        // Check for suspicious activity
        const securityWarnings = await this.checkSuspiciousActivity(user.$id, ipAddress, userAgent)

        // Clear failed attempts on successful login
        await this.clearFailedAttempts(email)
        
        // Send login alert notification if enabled
        await this.sendLoginAlert(user.$id, ipAddress, userAgent, securityWarnings)

        return {
          success: true,
          user,
          securityWarnings
        }
      } catch (error: any) {
        console.log('Login error:', {
          message: error.message,
          type: error.type,
          code: error.code
        })
        
        // Step 2: Check if MFA is required
        if (error.type === 'user_more_factors_required') {
          console.log('MFA is required for this account, creating challenge...')
          
          try {
            // Step 3: Create MFA challenge
            const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
            sessionStorage.setItem('login_mfa_challenge_id', challenge.$id)
            console.log('MFA challenge created:', challenge.$id)
            
            return {
              success: false,
              requiresMFA: true,
              challengeId: challenge.$id,
              message: 'A verification code has been sent to your email address.'
            }
          } catch (challengeError: any) {
            console.error('Failed to create MFA challenge:', challengeError)
            return {
              success: false,
              requiresMFA: true,
              error: 'Failed to send MFA challenge. Please try again.'
            }
          }
        }
        
        // Other errors - not MFA related
        throw error
      }
    } catch (error: any) {
      // Log failed login attempt with detailed error info
      console.error('Enhanced login error:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: error.status,
        response: error.response
      })
      
      await this.logLoginAttempt(email, ipAddress, userAgent, false, error.message)

      return {
        success: false,
        error: this.sanitizeErrorMessage(error.message || error.type || 'Unknown error')
      }
    }
  }

  // Enhanced logout with session cleanup
  async enhancedLogout(sessionId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await account.get()
      const ipAddress = await this.getClientIP()
      const userAgent = navigator.userAgent

      // Delete specific session or current session
      if (sessionId) {
        await account.deleteSession(sessionId)
      } else {
        await account.deleteSession('current')
      }

      // Update session record
      await this.deactivateSession(user.$id, sessionId)

      // Log security event
      await this.logSecurityEvent(user.$id, 'logout', ipAddress, userAgent)

      // Clear local storage
      this.clearLocalData()

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Two-Factor Authentication setup using Appwrite Email MFA
  async setupTwoFactorAuth(userId: string): Promise<{ 
    success: boolean
    message?: string
    challengeId?: string
    error?: string 
  }> {
    try {
      // First enable MFA for the user
      await account.updateMFA(true)
      console.log('MFA enabled for user')
      
      // Check current MFA status
      const currentFactors = await account.listMfaFactors()
      console.log('Current MFA factors before setup:', currentFactors)
      
      // For email-based 2FA, we need to create a challenge first
      // This will send the verification code to the user's email
      const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
      console.log('MFA Email challenge created:', challenge)
      
      return {
        success: true,
        message: 'A verification code has been sent to your email address.',
        challengeId: challenge.$id
      }
    } catch (error: any) {
      console.error('MFA setup error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Verify 2FA token and complete MFA setup
  async verifyAndEnableTwoFactorAuth(userId: string, token: string, challengeId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!challengeId) {
        // If no challenge ID, we need to create one first
        const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
        challengeId = challenge.$id
        console.log('Created new challenge:', challengeId)
      }
      
      // Complete the MFA challenge with the verification code
      console.log('Completing MFA challenge with code:', token)
      const result = await account.updateMfaChallenge(challengeId, token)
      console.log('MFA challenge completion result:', result)
      
      // Check if MFA is now enabled
      const factors = await account.listMfaFactors()
      console.log('MFA factors after verification:', factors)
      
      return { success: true }
    } catch (error: any) {
      console.error('MFA verification error:', error)
      return { success: false, error: error.message }
    }
  }

  // Disable 2FA
  async disableTwoFactorAuth(userId: string, token?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (token) {
        // If token provided, verify it first
        const challengeId = sessionStorage.getItem('mfa_disable_challenge_id')
        if (challengeId) {
          await account.updateMfaChallenge(challengeId, token)
          sessionStorage.removeItem('mfa_disable_challenge_id')
        }
      }
      
      // Disable MFA
      await account.updateMFA(false)
      console.log('MFA disabled for user')
      
      return { success: true }
    } catch (error: any) {
      console.error('MFA disable error:', error)
      return { success: false, error: error.message }
    }
  }

  // List MFA factors
  async listMfaFactors(): Promise<{ success: boolean; factors?: any; error?: string }> {
    try {
      const factors = await account.listMfaFactors()
      console.log('Raw MFA factors response:', JSON.stringify(factors))
      return { success: true, factors: factors }
    } catch (error: any) {
      console.error('Error listing MFA factors:', error)
      return { success: false, error: error.message }
    }
  }

  // Create MFA challenge (for login)
  async createMfaChallenge(): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
      return { success: true, challengeId: challenge.$id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Complete MFA challenge (for login)
  async completeMfaChallenge(challengeId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      await account.updateMfaChallenge(challengeId, token)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Verify Two-Factor Authentication during login - matching debug panel flow
  async verifyTwoFactorAuth(userId: string, token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const challengeId = sessionStorage.getItem('login_mfa_challenge_id')
      
      if (!challengeId) {
        return { 
          success: false, 
          error: 'No MFA challenge found. Please try logging in again.' 
        }
      }
      
      console.log(`Verifying MFA code: ${token.slice(0, 3)}*** with challenge: ${challengeId}`)
      
      // Complete the MFA challenge - this completes the login
      await account.updateMfaChallenge(challengeId, token)
      console.log('MFA verification successful!')
      
      // Clear the challenge ID
      sessionStorage.removeItem('login_mfa_challenge_id')
      
      // Get the logged in user
      const user = await account.get()
      console.log(`Logged in as: ${user.email}`)
      console.log(`User ID: ${user.$id}`)
      console.log(`MFA enabled: ${user.mfa}`)
      
      return { success: true, user }
    } catch (error: any) {
      console.error('MFA verification failed:', error)
      return { success: false, error: error.message || 'Invalid verification code' }
    }
  }

  // Account security audit
  async getSecurityAudit(userId: string): Promise<{
    recentLogins: SecurityEvent[]
    activeSessions: SessionInfo[]
    suspiciousActivity: SecurityEvent[]
    passwordLastChanged?: string
    twoFactorEnabled: boolean
  }> {
    try {
      const [recentLogins, activeSessions, suspiciousActivity] = await Promise.all([
        this.getRecentSecurityEvents(userId, 'login', 10),
        this.getActiveSessions(userId),
        this.getSuspiciousActivity(userId)
      ])

      const twoFactorEnabled = await this.is2FAEnabled(userId)

      return {
        recentLogins,
        activeSessions,
        suspiciousActivity,
        twoFactorEnabled
      }
    } catch (error) {
      console.error('Error getting security audit:', error)
      return {
        recentLogins: [],
        activeSessions: [],
        suspiciousActivity: [],
        twoFactorEnabled: false
      }
    }
  }

  // Password strength validation
  validatePasswordStrength(password: string): {
    score: number
    feedback: string[]
    isValid: boolean
  } {
    const feedback: string[] = []
    let score = 0

    // Length check
    if (password.length >= 8) score += 1
    else feedback.push('Password should be at least 8 characters long')

    if (password.length >= 12) score += 1
    else feedback.push('Consider using 12+ characters for better security')

    // Character diversity
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Include lowercase letters')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Include uppercase letters')

    if (/\d/.test(password)) score += 1
    else feedback.push('Include numbers')

    if (/[^a-zA-Z\d]/.test(password)) score += 1
    else feedback.push('Include special characters')

    // Common password check
    if (!this.isCommonPassword(password)) score += 1
    else feedback.push('Avoid common passwords')

    return {
      score,
      feedback,
      isValid: score >= 4
    }
  }

  // Security event logging
  async logSecurityEvent(
    userId: string,
    type: SecurityEvent['eventType'],
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Generate description based on event type
      const description = this.generateEventDescription(type, metadata)
      
      await databases.createDocument(
        DATABASE_ID,
        SECURITY_EVENTS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          eventType: type,
          description,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
          createdAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  // Login attempt logging
  private async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      await databases.createDocument(
        DATABASE_ID,
        LOGIN_ATTEMPTS_COLLECTION_ID,
        ID.unique(),
        {
          email,
          ipAddress,
          userAgent,
          success,
          failureReason: failureReason || null,
          attemptedAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Failed to log login attempt:', error)
    }
  }

  // Check for account lockout
  private async isAccountLocked(email: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const attempts = await databases.listDocuments(
        DATABASE_ID,
        LOGIN_ATTEMPTS_COLLECTION_ID,
        [
          Query.equal('email', email),
          Query.equal('success', false),
          Query.greaterThan('attemptedAt', oneHourAgo)
        ]
      )

      return attempts.documents.length >= this.maxLoginAttempts
    } catch (error) {
      console.error('Error checking account lock:', error)
      return false
    }
  }

  // Get recent login attempts
  private async getRecentLoginAttempts(email: string): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - this.lockoutDuration).toISOString()
      const attempts = await databases.listDocuments(
        DATABASE_ID,
        LOGIN_ATTEMPTS_COLLECTION_ID,
        [
          Query.equal('email', email),
          Query.equal('success', false),
          Query.greaterThan('attemptedAt', fifteenMinutesAgo)
        ]
      )

      return attempts.documents.length
    } catch (error) {
      console.error('Error getting recent attempts:', error)
      return 0
    }
  }

  // Lock account
  private async lockAccount(email: string): Promise<void> {
    // In a more sophisticated system, you'd store lock information
    // For now, we rely on the attempt history
    console.log(`Account locked for email: ${email}`)
  }

  // Clear failed attempts
  private async clearFailedAttempts(email: string): Promise<void> {
    try {
      const attempts = await databases.listDocuments(
        DATABASE_ID,
        LOGIN_ATTEMPTS_COLLECTION_ID,
        [
          Query.equal('email', email),
          Query.equal('success', false)
        ]
      )

      const deletions = attempts.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, LOGIN_ATTEMPTS_COLLECTION_ID, doc.$id)
      )

      await Promise.all(deletions)
    } catch (error) {
      console.error('Error clearing failed attempts:', error)
    }
  }

  // Parse device information
  private parseDeviceInfo(userAgent: string): SessionInfo['deviceInfo'] {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
    const isTablet = /iPad|Tablet/.test(userAgent)
    
    let os = 'Unknown'
    if (/Windows/.test(userAgent)) os = 'Windows'
    else if (/Mac/.test(userAgent)) os = 'macOS'
    else if (/Linux/.test(userAgent)) os = 'Linux'
    else if (/Android/.test(userAgent)) os = 'Android'
    else if (/iPhone|iPad/.test(userAgent)) os = 'iOS'

    let browser = 'Unknown'
    if (/Chrome/.test(userAgent)) browser = 'Chrome'
    else if (/Firefox/.test(userAgent)) browser = 'Firefox'
    else if (/Safari/.test(userAgent)) browser = 'Safari'
    else if (/Edge/.test(userAgent)) browser = 'Edge'

    return {
      type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      os,
      browser
    }
  }

  // Get client IP address
  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'unknown'
    }
  }

  // Create session record
  private async createSessionRecord(
    userId: string,
    deviceInfo: SessionInfo['deviceInfo'],
    ipAddress: string,
    persistent: boolean,
    userAgent: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(
        Date.now() + (persistent ? 30 * 24 * 60 * 60 * 1000 : this.sessionTimeout)
      ).toISOString()

      // Generate a secure session token
      const sessionToken = this.generateSessionToken()

      await databases.createDocument(
        DATABASE_ID,
        AUTH_SESSIONS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          deviceInfo: JSON.stringify(deviceInfo),
          ipAddress,
          userAgent,
          sessionToken,
          isActive: true,
          lastActivityAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          expiresAt
        }
      )
    } catch (error) {
      console.error('Failed to create session record:', error)
    }
  }

  // Deactivate session
  private async deactivateSession(userId: string, sessionId?: string): Promise<void> {
    try {
      const sessions = await databases.listDocuments(
        DATABASE_ID,
        AUTH_SESSIONS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.equal('isActive', true)]
      )

      const updates = sessions.documents.map(doc =>
        databases.updateDocument(
          DATABASE_ID,
          AUTH_SESSIONS_COLLECTION_ID,
          doc.$id,
          { isActive: false }
        )
      )

      await Promise.all(updates)
    } catch (error) {
      console.error('Failed to deactivate sessions:', error)
    }
  }

  // Check for suspicious activity
  private async checkSuspiciousActivity(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string[]> {
    const warnings: string[] = []

    try {
      // Check for new device
      const recentSessions = await this.getActiveSessions(userId)
      const knownDevices = recentSessions.map(s => s.deviceInfo.type + s.deviceInfo.os)
      const currentDevice = this.parseDeviceInfo(userAgent)
      const currentDeviceId = currentDevice.type + currentDevice.os

      if (!knownDevices.includes(currentDeviceId)) {
        warnings.push('Login from new device detected')
      }

      // Check for new location (simplified)
      const recentIPs = recentSessions.map(s => s.ipAddress)
      if (!recentIPs.includes(ipAddress)) {
        warnings.push('Login from new location detected')
      }

      return warnings
    } catch (error) {
      console.error('Error checking suspicious activity:', error)
      return []
    }
  }

  // Get active sessions
  private async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await databases.listDocuments(
        DATABASE_ID,
        AUTH_SESSIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isActive', true),
          Query.greaterThan('expiresAt', new Date().toISOString())
        ]
      )

      return sessions.documents.map(doc => ({
        ...doc,
        deviceInfo: JSON.parse(doc.deviceInfo)
      })) as unknown as SessionInfo[]
    } catch (error) {
      console.error('Error getting active sessions:', error)
      return []
    }
  }

  // Clear local data
  private clearLocalData(): void {
    // Clear localStorage
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('lastRoute')

    // Clear sessionStorage
    sessionStorage.clear()

    // Clear encrypted storage
    try {
      encryptedStorageAdapter.clear()
    } catch (error) {
      console.warn('Failed to clear encrypted storage:', error)
    }
  }

  // Sanitize error messages
  private sanitizeErrorMessage(message: string): string {
    const sanitizedMessages: Record<string, string> = {
      'Invalid credentials': 'Invalid email or password',
      'User (role: guests) missing scope (account)': 'Authentication required',
      'Rate limit exceeded': 'Too many attempts. Please try again later.',
      'User not found': 'Invalid email or password', // Don't reveal if user exists
      'Network Error': 'Connection error. Please check your internet connection.',
      'Failed to fetch': 'Connection error. Please check your internet connection.',
      'user_invalid_credentials': 'Invalid email or password',
      'user_blocked': 'Your account has been blocked. Please contact support.',
      'user_not_found': 'Invalid email or password',
      'general_unknown_origin': 'Service temporarily unavailable. Please try again.',
      'project_unknown': 'Service configuration error. Please contact support.'
    }

    // Handle Appwrite error format
    if (message.includes('Invalid credentials') || message.includes('user_invalid_credentials')) {
      return 'Invalid email or password'
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection error. Please check your internet connection and try again.'
    }

    return sanitizedMessages[message] || 'Authentication failed. Please try again.'
  }

  private generateSessionToken(): string {
    // Generate a secure random session token
    return CryptoJS.lib.WordArray.random(32).toString()
  }

  private generateEventDescription(type: SecurityEvent['eventType'], metadata?: Record<string, any>): string {
    const descriptions: Record<string, string> = {
      'login': 'User successfully logged in',
      'logout': 'User logged out',
      'password_change': 'User changed their password',
      'email_change': 'User changed their email address',
      'failed_login': 'Failed login attempt',
      'account_locked': 'Account locked due to multiple failed attempts',
      'suspicious_activity': 'Suspicious activity detected'
    }

    let baseDescription = descriptions[type] || `Security event: ${type}`
    
    // Add metadata context if available
    if (metadata) {
      if (metadata.deviceType) {
        baseDescription += ` from ${metadata.deviceType}`
      }
      if (metadata.newLocation) {
        baseDescription += ` (new location detected)`
      }
      if (metadata.newDevice) {
        baseDescription += ` (new device detected)`
      }
    }

    return baseDescription
  }

  private async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const factors = await account.listMfaFactors()
      console.log('Checking 2FA status, factors:', factors)
      // Check if email MFA is enabled (not array-based)
      return factors.email === true
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      return false
    }
  }

  private async getRecentSecurityEvents(
    userId: string,
    type: SecurityEvent['eventType'],
    limit: number
  ): Promise<SecurityEvent[]> {
    try {
      const events = await databases.listDocuments(
        DATABASE_ID,
        SECURITY_EVENTS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('eventType', type),
          Query.orderDesc('createdAt'),
          Query.limit(limit)
        ]
      )

      return events.documents.map(doc => ({
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined
      })) as unknown as SecurityEvent[]
    } catch (error) {
      console.error('Error getting security events:', error)
      return []
    }
  }

  private async getSuspiciousActivity(userId: string): Promise<SecurityEvent[]> {
    try {
      const events = await databases.listDocuments(
        DATABASE_ID,
        SECURITY_EVENTS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('eventType', 'suspicious_activity'),
          Query.orderDesc('createdAt'),
          Query.limit(10)
        ]
      )

      return events.documents.map(doc => ({
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined
      })) as unknown as SecurityEvent[]
    } catch (error) {
      console.error('Error getting suspicious activity:', error)
      return []
    }
  }

  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]
    return commonPasswords.includes(password.toLowerCase())
  }

  // Send login alert notification
  private async sendLoginAlert(
    userId: string,
    ipAddress: string,
    userAgent: string,
    securityWarnings: string[]
  ): Promise<void> {
    try {
      // Check if user has login alerts enabled
      const user = await account.get()
      const prefs = user.prefs as any
      const loginAlertsEnabled = prefs?.security?.loginAlerts !== false // Default to true
      
      if (!loginAlertsEnabled) {
        console.log('Login alerts disabled for user')
        return
      }
      
      // Get location from IP (you could integrate with an IP geolocation service)
      const location = await this.getLocationFromIP(ipAddress)
      
      // Check if this is a new device
      const isNewDevice = securityWarnings.some(warning => 
        warning.toLowerCase().includes('new device')
      )
      
      // Send notification
      await notificationService.notifyLoginAlert(
        userId,
        ipAddress,
        userAgent,
        location,
        isNewDevice
      )
      
      console.log('Login alert notification sent')
    } catch (error) {
      console.error('Failed to send login alert:', error)
      // Don't throw - this is a non-critical feature
    }
  }
  
  // Get location from IP address (simplified - you'd use a real geolocation service)
  private async getLocationFromIP(ipAddress: string): Promise<string> {
    try {
      // In production, you'd use a service like ipapi.co or ipgeolocation.io
      // For now, just return a placeholder
      if (ipAddress === 'unknown' || ipAddress === '127.0.0.1') {
        return 'Local Network'
      }
      
      // You could make an API call here:
      // const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
      // const data = await response.json()
      // return `${data.city}, ${data.country_name}`
      
      return 'Unknown Location'
    } catch (error) {
      return 'Unknown Location'
    }
  }
}

export const authEnhancementService = new AuthEnhancementService()