import type { AppwriteException } from 'appwrite'

/**
 * Maps Appwrite error codes to user-friendly messages
 */
const errorMessages: Record<string, string> = {
  // General errors
  'general_unknown': 'An unexpected error occurred. Please try again.',
  'general_service_disabled': 'This service is temporarily unavailable. Please try again later.',
  'general_unauthorized_scope': 'You do not have permission to perform this action.',
  'general_rate_limit_exceeded': 'Too many requests. Please wait a moment and try again.',
  
  // User errors
  'user_already_exists': 'An account with this email already exists.',
  'user_blocked': 'Your account has been blocked. Please contact support.',
  'user_invalid_token': 'Invalid or expired token. Please try again.',
  'user_unauthorized': 'Please log in to continue.',
  'user_not_found': 'User account not found.',
  'user_email_not_verified': 'Please verify your email address first.',
  'user_phone_not_verified': 'Please verify your phone number first.',
  'user_missing_id': 'User ID is required.',
  'user_oauth2_unauthorized': 'OAuth authentication failed. Please try again.',
  'user_session_not_found': 'Your session has expired. Please log in again.',
  
  // Account errors
  'account_not_found': 'Account not found. Please check your credentials.',
  'account_blocked': 'Your account has been blocked. Please contact support.',
  'account_already_exists': 'An account with this email already exists.',
  'account_invalid_credentials': 'Invalid email or password. Please try again.',
  'account_verification_failed': 'Account verification failed. Please try again.',
  
  // Team errors
  'team_invalid_secret': 'Invalid team invitation code.',
  'team_invite_already_exists': 'An invitation has already been sent to this email.',
  'team_already_exists': 'You are already a member of this team.',
  
  // Membership errors
  'membership_already_confirmed': 'Membership already confirmed.',
  
  // Avatar errors
  'avatar_set_not_found': 'Avatar not found.',
  'avatar_icon_not_found': 'Avatar icon not found.',
  
  // Storage errors
  'storage_file_not_found': 'File not found.',
  'storage_device_not_found': 'Storage device not found.',
  'storage_file_empty': 'File is empty. Please select a valid file.',
  'storage_file_type_unsupported': 'This file type is not supported.',
  'storage_invalid_file_size': 'File size exceeds the maximum allowed limit.',
  'storage_invalid_content_range': 'Invalid content range.',
  'storage_invalid_file': 'Invalid file. Please select a valid file.',
  
  // Project errors
  'project_not_found': 'Project not found.',
  'project_already_exists': 'Project already exists.',
  
  // Router errors
  'router_host_not_found': 'Host not found.',
  'router_domain_not_configured': 'Domain not configured properly.',
  
  // Platform errors
  'platform_not_found': 'Platform not found.',
  
  // Database errors
  'database_not_found': 'Database not found.',
  'database_already_exists': 'Database already exists.',
  'database_empty_name': 'Database name cannot be empty.',
  'database_invalid_name': 'Invalid database name.',
  
  // Collection errors
  'collection_not_found': 'Collection not found.',
  'collection_already_exists': 'Collection already exists.',
  'collection_limit_exceeded': 'Collection limit exceeded.',
  'collection_invalid_structure': 'Invalid collection structure.',
  
  // Document errors
  'document_not_found': 'Document not found.',
  'document_invalid_structure': 'Invalid document structure.',
  'document_missing_payload': 'Document data is missing.',
  'document_already_exists': 'Document already exists.',
  'document_update_conflict': 'Document update conflict. Please refresh and try again.',
  'document_delete_restricted': 'This document cannot be deleted.',
  
  // Attribute errors
  'attribute_not_found': 'Attribute not found.',
  'attribute_unknown': 'Unknown attribute.',
  'attribute_not_available': 'Attribute not available.',
  'attribute_format_unsupported': 'Attribute format not supported.',
  'attribute_default_unsupported': 'Default value not supported for this attribute.',
  'attribute_limit_exceeded': 'Attribute limit exceeded.',
  'attribute_value_invalid': 'Invalid attribute value.',
  'attribute_type_invalid': 'Invalid attribute type.',
  
  // Index errors
  'index_not_found': 'Index not found.',
  'index_limit_exceeded': 'Index limit exceeded.',
  'index_already_exists': 'Index already exists.',
  
  // Execution errors
  'execution_not_found': 'Execution not found.',
  
  // Function errors
  'function_not_found': 'Function not found.',
  'function_runtime_unsupported': 'Function runtime not supported.',
  'function_entrypoint_missing': 'Function entrypoint missing.',
  'function_in_progress': 'Function is already running.',
  
  // Build errors
  'build_not_found': 'Build not found.',
  'build_not_ready': 'Build is not ready yet.',
  'build_in_progress': 'Build is in progress.',
  
  // Deployment errors
  'deployment_not_found': 'Deployment not found.',
  
  // Variable errors
  'variable_not_found': 'Variable not found.',
  'variable_already_exists': 'Variable already exists.',
  
  // Provider errors
  'provider_not_found': 'Provider not found.',
  'provider_already_exists': 'Provider already exists.',
  'provider_incorrect_type': 'Incorrect provider type.',
  'provider_missing_credentials': 'Provider credentials missing.',
  
  // Topic errors
  'topic_not_found': 'Topic not found.',
  'topic_already_exists': 'Topic already exists.',
  
  // Subscriber errors
  'subscriber_not_found': 'Subscriber not found.',
  'subscriber_already_exists': 'Subscriber already exists.',
  
  // Message errors
  'message_not_found': 'Message not found.',
  'message_missing_target': 'Message target missing.',
  'message_missing_schedule': 'Message schedule missing.',
  
  // Specific to our application
  'profile_limit_exceeded': 'You have reached the maximum number of profiles for your subscription.',
  'insufficient_credits': 'Insufficient credits. Please upgrade your subscription.',
  'payment_failed': 'Payment failed. Please check your payment method.',
  'booking_conflict': 'This time slot is no longer available.',
  'verification_required': 'Profile verification is required for this action.',
  'age_verification_required': 'Age verification is required to access this feature.',
  'location_required': 'Location access is required for this feature.',
  'media_limit_exceeded': 'You have reached the maximum number of media files.',
  'message_limit_exceeded': 'You have reached your daily message limit.',
  'review_already_exists': 'You have already reviewed this profile.',
  'booking_too_soon': 'Bookings must be made at least 2 hours in advance.',
  'service_unavailable': 'This service is currently unavailable in your area.'
}

/**
 * Converts an Appwrite error to a user-friendly message
 */
export function getReadableError(error: any): string {
  // Handle Appwrite exceptions
  if (error?.code) {
    const message = errorMessages[error.code]
    if (message) {
      return message
    }
    
    // If no specific message found, try to extract from error type
    if (error.type) {
      const typeKey = error.type.toLowerCase().replace(/_/g, '_')
      const typeMessage = errorMessages[typeKey]
      if (typeMessage) {
        return typeMessage
      }
    }
  }
  
  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection.'
  }
  
  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.'
  }
  
  // Handle validation errors with field information
  if (error?.message?.includes('Invalid document structure')) {
    if (error.message.includes('email')) {
      return 'Please enter a valid email address.'
    }
    if (error.message.includes('password')) {
      return 'Password must be at least 8 characters long.'
    }
    if (error.message.includes('phone')) {
      return 'Please enter a valid phone number.'
    }
    return 'Please check your input and try again.'
  }
  
  // Handle permission errors
  if (error?.message?.includes('permissions') || error?.message?.includes('unauthorized')) {
    return 'You do not have permission to perform this action.'
  }
  
  // Handle not found errors
  if (error?.message?.includes('not found')) {
    return 'The requested resource was not found.'
  }
  
  // Return original message if it's already user-friendly
  if (error?.message && !error.message.includes('AppwriteException')) {
    return error.message
  }
  
  // Default fallback
  return 'An unexpected error occurred. Please try again later.'
}

/**
 * Error handler that formats and logs errors consistently
 */
export function handleAppwriteError(error: any, context?: string): string {
  // Log error details in development
  if (import.meta.env.DEV) {
    console.error(`[${context || 'AppwriteError'}]`, {
      code: error?.code,
      type: error?.type,
      message: error?.message,
      stack: error?.stack
    })
  }
  
  // Return user-friendly message
  return getReadableError(error)
}

/**
 * Type guard to check if error is an Appwrite exception
 */
export function isAppwriteException(error: any): error is AppwriteException {
  return error?.code !== undefined && error?.type !== undefined
}

/**
 * Common error response interface
 */
export interface ErrorResponse {
  message: string
  code?: string
  details?: any
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: any, context?: string): ErrorResponse {
  const message = handleAppwriteError(error, context)
  
  return {
    message,
    code: error?.code,
    details: import.meta.env.DEV ? error : undefined
  }
}