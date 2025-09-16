import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useLogout } from './useLogout'
import { account } from '../lib/appwrite'

export function useSessionMonitor() {
  const authStore = useAuthStore()
  const { performLogout } = useLogout()
  
  const isMonitoring = ref(false)
  const lastActivity = ref(Date.now())
  const sessionCheckInterval = ref<NodeJS.Timeout | null>(null)
  const activityCheckInterval = ref<NodeJS.Timeout | null>(null)
  
  // Configuration
  const SESSION_CHECK_INTERVAL = 60000 // Check every minute
  const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000 // Warn 5 minutes before timeout
  
  // Get session timeout from user preferences
  const getInactivityTimeout = () => {
    const prefs = authStore.user?.prefs as any
    const timeoutMinutes = prefs?.security?.sessionTimeout || '30' // Default 30 minutes
    
    // Handle 'Never' option
    if (timeoutMinutes === '0' || timeoutMinutes === 'Never') {
      return Infinity // Never timeout
    }
    
    // Convert minutes to milliseconds
    return parseInt(timeoutMinutes) * 60 * 1000
  }
  
  // Update last activity timestamp
  const updateActivity = () => {
    lastActivity.value = Date.now()
  }
  
  // Check if session is still valid
  const checkSession = async () => {
    if (!authStore.isAuthenticated) return
    
    try {
      // Try to get current account to verify session
      await account.get()
    } catch (error: any) {
      // Session is invalid
      console.warn('Session expired:', error)
      await performLogout({
        reason: 'session_expired',
        showMessage: true
      })
    }
  }
  
  // Check for inactivity
  const checkInactivity = () => {
    if (!authStore.isAuthenticated) return
    
    const inactivityTimeout = getInactivityTimeout()
    
    // Skip check if timeout is disabled
    if (inactivityTimeout === Infinity) return
    
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivity.value
    
    if (timeSinceLastActivity >= inactivityTimeout) {
      // Auto logout due to inactivity
      performLogout({
        reason: 'session_expired',
        showMessage: true,
        redirectTo: '/login'
      })
    } else if (timeSinceLastActivity >= inactivityTimeout - WARNING_BEFORE_TIMEOUT) {
      // Show warning (you can emit an event or show a modal here)
      const remainingMinutes = Math.ceil((inactivityTimeout - timeSinceLastActivity) / 60000)
      console.warn(`Session will expire in ${remainingMinutes} minutes due to inactivity`)
      
      // Emit warning event for UI to handle
      window.dispatchEvent(new CustomEvent('session-warning', {
        detail: { remainingMinutes }
      }))
    }
  }
  
  // Start monitoring
  const startMonitoring = () => {
    if (isMonitoring.value) return
    
    isMonitoring.value = true
    
    // Set up activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity)
    })
    
    // Start session check interval
    sessionCheckInterval.value = setInterval(checkSession, SESSION_CHECK_INTERVAL)
    
    // Start inactivity check interval
    activityCheckInterval.value = setInterval(checkInactivity, 60000) // Check every minute
    
    // Initial check
    checkSession()
  }
  
  // Stop monitoring
  const stopMonitoring = () => {
    if (!isMonitoring.value) return
    
    isMonitoring.value = false
    
    // Remove activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.removeEventListener(event, updateActivity)
    })
    
    // Clear intervals
    if (sessionCheckInterval.value) {
      clearInterval(sessionCheckInterval.value)
      sessionCheckInterval.value = null
    }
    
    if (activityCheckInterval.value) {
      clearInterval(activityCheckInterval.value)
      activityCheckInterval.value = null
    }
  }
  
  // Auto start/stop based on auth state
  onMounted(() => {
    if (authStore.isAuthenticated) {
      startMonitoring()
    }
    
    // Watch for auth changes
    authStore.$subscribe((mutation, state) => {
      if (state.user && !isMonitoring.value) {
        startMonitoring()
      } else if (!state.user && isMonitoring.value) {
        stopMonitoring()
      }
    })
  })
  
  onUnmounted(() => {
    stopMonitoring()
  })
  
  return {
    isMonitoring,
    lastActivity,
    updateActivity,
    startMonitoring,
    stopMonitoring
  }
}