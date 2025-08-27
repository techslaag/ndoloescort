import { account, databases, DATABASE_ID, AUTH_SESSIONS_COLLECTION_ID, LOGIN_ATTEMPTS_COLLECTION_ID, SECURITY_EVENTS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'
import { encryptedStorageAdapter } from '../lib/encryption'
import CryptoJS from 'crypto-js'

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
  private sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours

  // Enhanced login with security tracking
  async enhancedLogin(email: string, password: string, rememberMe = false): Promise<{
    success: boolean
    user?: any
    requiresMFA?: boolean
    error?: string
    securityWarnings?: string[]
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

      // Attempt login
      const session = await account.createEmailPasswordSession(email, password)
      const user = await account.get()

      // Log successful login
      await this.logLoginAttempt(email, ipAddress, userAgent, true)
      await this.logSecurityEvent(user.$id, 'login', ipAddress, userAgent)

      // Create session record
      await this.createSessionRecord(user.$id, deviceInfo, ipAddress, rememberMe, userAgent)

      // Check for suspicious activity
      const securityWarnings = await this.checkSuspiciousActivity(user.$id, ipAddress, userAgent)

      // Clear failed attempts on successful login
      await this.clearFailedAttempts(email)

      return {
        success: true,
        user,
        securityWarnings
      }
    } catch (error: any) {
      // Log failed login attempt
      await this.logLoginAttempt(email, ipAddress, userAgent, false, error.message)

      return {
        success: false,
        error: this.sanitizeErrorMessage(error.message)
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

  // Two-Factor Authentication setup
  async setupTwoFactorAuth(userId: string): Promise<{ 
    success: boolean
    qrCode?: string
    backupCodes?: string[]
    error?: string 
  }> {
    try {
      // Generate TOTP secret
      const secret = this.generateTOTPSecret()
      const qrCode = this.generateQRCode(userId, secret)
      const backupCodes = this.generateBackupCodes()

      // Store encrypted 2FA data
      await this.store2FAData(userId, secret, backupCodes)

      return {
        success: true,
        qrCode,
        backupCodes
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Verify 2FA token
  async verifyTwoFactorAuth(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const secret = await this.get2FASecret(userId)
      if (!secret) {
        return { success: false, error: '2FA not set up' }
      }

      const isValid = this.verifyTOTPToken(secret, token)
      if (!isValid) {
        // Check if it's a backup code
        const isBackupCode = await this.verifyBackupCode(userId, token)
        if (!isBackupCode) {
          return { success: false, error: 'Invalid token' }
        }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
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
  private async logSecurityEvent(
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
  private async getClientIP(): Promise<string> {
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
      'User not found': 'Invalid email or password' // Don't reveal if user exists
    }

    return sanitizedMessages[message] || 'Authentication failed. Please try again.'
  }

  // TOTP-related methods (simplified implementations)
  private generateTOTPSecret(): string {
    return CryptoJS.lib.WordArray.random(20).toString()
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

  private generateQRCode(userId: string, secret: string): string {
    const issuer = 'Elite Escorts'
    const label = `${issuer}:${userId}`
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )
  }

  private async store2FAData(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    // Store encrypted 2FA data
    const encryptedData = encryptedStorageAdapter.encrypt(JSON.stringify({
      secret,
      backupCodes,
      enabled: true
    }))

    // Store in user preferences or separate collection
    await account.updatePrefs({
      twoFactorAuth: encryptedData
    })
  }

  private async get2FASecret(userId: string): Promise<string | null> {
    try {
      const user = await account.get()
      const twoFactorData = user.prefs?.twoFactorAuth
      if (!twoFactorData) return null

      const decrypted = encryptedStorageAdapter.decrypt(twoFactorData)
      const data = JSON.parse(decrypted)
      return data.secret
    } catch (error) {
      return null
    }
  }

  private verifyTOTPToken(secret: string, token: string): boolean {
    // Simplified TOTP verification - in production use a proper TOTP library
    // This is just a placeholder
    return token.length === 6 && /^\d+$/.test(token)
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await account.get()
      const twoFactorData = user.prefs?.twoFactorAuth
      if (!twoFactorData) return false

      const decrypted = encryptedStorageAdapter.decrypt(twoFactorData)
      const data = JSON.parse(decrypted)
      
      const codeIndex = data.backupCodes.indexOf(code)
      if (codeIndex === -1) return false

      // Remove used backup code
      data.backupCodes.splice(codeIndex, 1)
      const encryptedData = encryptedStorageAdapter.encrypt(JSON.stringify(data))
      await account.updatePrefs({ twoFactorAuth: encryptedData })

      return true
    } catch (error) {
      return false
    }
  }

  private async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const user = await account.get()
      const twoFactorData = user.prefs?.twoFactorAuth
      if (!twoFactorData) return false

      const decrypted = encryptedStorageAdapter.decrypt(twoFactorData)
      const data = JSON.parse(decrypted)
      return data.enabled === true
    } catch (error) {
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
}

export const authEnhancementService = new AuthEnhancementService()