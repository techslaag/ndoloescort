import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMessagingStore } from '../stores/messaging'
import { realtimeService } from '../services/realtimeService'

export interface LogoutOptions {
  redirectTo?: string
  showMessage?: boolean
  reason?: 'user_action' | 'session_expired' | 'account_deleted' | 'security'
}

export function useLogout() {
  const router = useRouter()
  const authStore = useAuthStore()
  const messagingStore = useMessagingStore()

  const performLogout = async (options: LogoutOptions = {}) => {
    const {
      redirectTo = '/login',
      showMessage = true,
      reason = 'user_action'
    } = options

    try {
      // Show loading state
      if (showMessage && reason === 'user_action') {
        // You can add a toast/notification here
        console.log('Logging out...')
      }

      // Clear messaging data
      messagingStore.$reset()
      
      // Unsubscribe from all realtime events
      realtimeService.unsubscribeAll()

      // Perform the actual logout
      const result = await authStore.signout()

      if (result.success) {
        // Handle different logout reasons
        let message = 'You have been logged out successfully'
        let queryParams: Record<string, string> = {}

        switch (reason) {
          case 'session_expired':
            message = 'Your session has expired. Please log in again.'
            queryParams.expired = 'true'
            break
          case 'account_deleted':
            message = 'Your account has been deleted successfully.'
            queryParams.deleted = 'true'
            break
          case 'security':
            message = 'You have been logged out for security reasons.'
            queryParams.security = 'true'
            break
        }

        if (showMessage && reason !== 'user_action') {
          // You can add a toast/notification here
          console.log(message)
        }

        // Redirect to login or specified route
        await router.push({
          path: redirectTo,
          query: queryParams
        })

        return { success: true, message }
      } else {
        throw new Error(result.error || 'Logout failed')
      }
    } catch (error: any) {
      console.error('Logout error:', error)
      
      // Force redirect even if logout fails
      await router.push(redirectTo)
      
      return {
        success: false,
        message: error.message || 'An error occurred during logout'
      }
    }
  }

  // Listen for logout events
  const handleLogoutEvent = (event: Event) => {
    const customEvent = event as CustomEvent
    performLogout(customEvent.detail || {})
  }

  // Set up event listener
  window.addEventListener('user-logout', handleLogoutEvent)

  // Cleanup on unmount
  const cleanup = () => {
    window.removeEventListener('user-logout', handleLogoutEvent)
  }

  return {
    performLogout,
    cleanup
  }
}