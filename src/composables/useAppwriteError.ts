import { ref } from 'vue'
import { handleAppwriteError, createErrorResponse } from '../utils/appwriteErrors'
import type { ErrorResponse } from '../utils/appwriteErrors'

/**
 * Composable for handling Appwrite errors in Vue components
 */
export function useAppwriteError() {
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  
  /**
   * Wraps an async operation with error handling
   */
  async function withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> {
    try {
      isLoading.value = true
      error.value = null
      return await operation()
    } catch (err) {
      error.value = handleAppwriteError(err, context)
      console.error(`[${context || 'AppwriteError'}]`, err)
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Handles an error and returns a formatted response
   */
  function handleError(err: any, context?: string): ErrorResponse {
    const response = createErrorResponse(err, context)
    error.value = response.message
    return response
  }
  
  /**
   * Clears the current error
   */
  function clearError() {
    error.value = null
  }
  
  return {
    error,
    isLoading,
    withErrorHandling,
    handleError,
    clearError
  }
}