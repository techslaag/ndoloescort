import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

export function useErrorHandler() {
  const authStore = useAuthStore()
  const router = useRouter()

  const handleError = (error: any, context?: string) => {
    console.error(`Error in ${context || 'application'}:`, error)
    
    // Handle different types of errors
    if (error?.code === 'unauthorized' || error?.code === 401) {
      authStore.setError('Your session has expired. Please log in again.', false)
      router.push('/login')
      return
    }
    
    if (error?.code === 'forbidden' || error?.code === 403) {
      authStore.setError('You do not have permission to perform this action.', false)
      return
    }
    
    if (error?.code === 'not_found' || error?.code === 404) {
      authStore.setError('The requested resource was not found.', false)
      return
    }
    
    if (error?.code === 'rate_limit' || error?.code === 429) {
      authStore.setError('Too many requests. Please try again later.', true)
      return
    }
    
    // Network errors
    if (error?.message?.includes('network') || error?.code === 'NETWORK_ERROR') {
      authStore.setError('Network error. Please check your connection and try again.', true)
      return
    }
    
    // Default error handling
    const message = error?.message || 'An unexpected error occurred. Please try again.'
    authStore.setError(message, true)
  }

  const clearError = () => {
    authStore.clearError()
  }

  const setError = (message: string, autoClear = false) => {
    authStore.setError(message, autoClear)
  }

  return {
    handleError,
    clearError,
    setError
  }
} 