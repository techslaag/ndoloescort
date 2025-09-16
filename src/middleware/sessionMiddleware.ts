import { useAuthStore } from '../stores/auth'
import { securityConfig } from '../config/security'

export class SessionMiddleware {
  private lastActivity: number = Date.now()
  private checkInterval: NodeJS.Timeout | null = null
  private idleTimer: NodeJS.Timeout | null = null
  
  constructor() {
    this.setupEventListeners()
    this.startSessionCheck()
  }
  
  // Setup activity listeners
  private setupEventListeners(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true })
    })
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateActivity()
      }
    })
  }
  
  // Update last activity timestamp
  private updateActivity(): void {
    this.lastActivity = Date.now()
    
    // Reset idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
    
    // Set new idle timer
    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout()
    }, securityConfig.session.idleTimeout)
  }
  
  // Start periodic session check
  private startSessionCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkSession()
    }, securityConfig.session.checkInterval)
  }
  
  // Check session validity
  private async checkSession(): Promise<void> {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      return
    }
    
    // Check session timeout
    const sessionAge = Date.now() - (authStore.sessionInfo?.createdAt || Date.now())
    if (sessionAge > securityConfig.session.timeout) {
      await this.handleSessionTimeout()
      return
    }
    
    // Check idle timeout
    const idleTime = Date.now() - this.lastActivity
    if (idleTime > securityConfig.session.idleTimeout) {
      await this.handleIdleTimeout()
    }
  }
  
  // Handle session timeout
  private async handleSessionTimeout(): Promise<void> {
    const authStore = useAuthStore()
    
    // Show notification
    const event = new CustomEvent('session-timeout', {
      detail: { reason: 'Session expired due to timeout' }
    })
    window.dispatchEvent(event)
    
    // Sign out user
    await authStore.signout()
    
    // Redirect to login
    window.location.href = '/login?reason=session-timeout'
  }
  
  // Handle idle timeout
  private async handleIdleTimeout(): Promise<void> {
    const authStore = useAuthStore()
    
    // Show warning notification
    const event = new CustomEvent('session-idle-warning', {
      detail: { 
        reason: 'Session will expire due to inactivity',
        timeRemaining: 60000 // 1 minute warning
      }
    })
    window.dispatchEvent(event)
    
    // Set final timeout
    setTimeout(async () => {
      const currentIdleTime = Date.now() - this.lastActivity
      if (currentIdleTime >= securityConfig.session.idleTimeout) {
        await authStore.signout()
        window.location.href = '/login?reason=idle-timeout'
      }
    }, 60000)
  }
  
  // Clean up
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
  }
}

// Create singleton instance
let sessionMiddleware: SessionMiddleware | null = null

export function initSessionMiddleware(): SessionMiddleware {
  if (!sessionMiddleware) {
    sessionMiddleware = new SessionMiddleware()
  }
  return sessionMiddleware
}

export function destroySessionMiddleware(): void {
  if (sessionMiddleware) {
    sessionMiddleware.destroy()
    sessionMiddleware = null
  }
}