import type { EscortProfile } from '../types/profile'

export interface ProfileValidationResult {
  isComplete: boolean
  missingFields: string[]
  canActivate: boolean
  completionPercentage: number
  errors: {
    field: string
    message: string
  }[]
}

export function validateProfileCompletion(profile: Partial<EscortProfile>): ProfileValidationResult {
  const errors: { field: string; message: string }[] = []
  const missingFields: string[] = []
  let completedSteps = 0
  const totalSteps = 5

  // Step 1: Basic Information (Required)
  if (!profile.name || profile.name.trim().length < 2) {
    missingFields.push('name')
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' })
  }
  
  if (!profile.age || profile.age < 18) {
    missingFields.push('age')
    errors.push({ field: 'age', message: 'Must be 18 or older' })
  }
  
  // Handle both nested (EscortProfile) and flat (FlatEscortProfile) structures
  const locationCity = (profile as any).locationCity || profile.location?.city
  const locationCountry = (profile as any).locationCountry || profile.location?.country
  
  if (!locationCity || !locationCountry) {
    missingFields.push('location')
    errors.push({ field: 'location', message: 'City and country are required' })
  }
  
  if (!profile.description || profile.description.trim().length < 50) {
    missingFields.push('description')
    errors.push({ field: 'description', message: 'Description must be at least 50 characters' })
  }
  
  if (missingFields.length === 0) completedSteps++

  // Step 2: Services (Required - at least one)
  const hasServices = profile.services && profile.services.length > 0
  const servicesValid = hasServices && profile.services!.every(s => 
    s.name && s.description && s.description.length >= 20
  )
  
  if (!hasServices) {
    missingFields.push('services')
    errors.push({ field: 'services', message: 'At least one service is required' })
  } else if (!servicesValid) {
    missingFields.push('service_descriptions')
    errors.push({ field: 'services', message: 'All services must have descriptions (min 20 chars)' })
  } else {
    completedSteps++
  }

  // Step 3: Pricing (Required - at least one valid option)
  const hasPricing = profile.pricing && profile.pricing.length > 0
  const pricingValid = hasPricing && profile.pricing!.some(p => 
    p.amount && p.amount > 0 && p.type
  )
  
  if (!hasPricing || !pricingValid) {
    missingFields.push('pricing')
    errors.push({ field: 'pricing', message: 'At least one pricing option is required' })
  } else {
    completedSteps++
  }

  // Step 4: Availability (Required - at least one working day)
  // Handle both nested and flat structures
  console.log('validateProfileCompletion - Checking working hours:', {
    hasAvailability: !!profile.availability,
    availabilityWorkingHours: profile.availability?.workingHours,
    flatWorkingHours: (profile as any).workingHours,
    workingHoursType: typeof (profile as any).workingHours
  })
  
  let workingHours = null
  try {
    workingHours = profile.availability?.workingHours || 
      ((profile as any).workingHours ? 
        (typeof (profile as any).workingHours === 'string' ? 
          JSON.parse((profile as any).workingHours) : 
          (profile as any).workingHours) 
        : null)
  } catch (e) {
    console.error('Failed to parse workingHours:', e)
  }
  
  console.log('validateProfileCompletion - Parsed working hours:', workingHours)
  
  const hasWorkingHours = workingHours && 
    Object.values(workingHours).some((day: any) => day.enabled)
  
  console.log('validateProfileCompletion - Has working hours:', hasWorkingHours)
  
  if (!hasWorkingHours) {
    missingFields.push('availability')
    errors.push({ field: 'availability', message: 'At least one working day must be set' })
  } else {
    completedSteps++
  }

  // Step 5: Media (Required - at least one photo)
  const hasMedia = profile.media && profile.media.length > 0
  const hasPhotos = hasMedia && profile.media!.some(m => m.type === 'photo')
  
  if (!hasPhotos) {
    missingFields.push('media')
    errors.push({ field: 'media', message: 'At least one photo is required' })
  } else {
    completedSteps++
  }

  // Additional validations for activation
  // Handle both nested and flat structures
  const cancellationPolicy = profile.preferences?.cancellationPolicy || 
    (profile as any).preferencesCancellationPolicy
  const minimumNotice = profile.preferences?.minimumNotice || 
    (profile as any).preferencesMinimumNotice
  
  const hasPreferences = cancellationPolicy && 
    (minimumNotice >= 0)

  if (!hasPreferences) {
    errors.push({ field: 'preferences', message: 'Booking preferences must be configured' })
  }

  const completionPercentage = Math.round((completedSteps / totalSteps) * 100)
  const isComplete = completedSteps === totalSteps && hasPreferences
  const canActivate = isComplete && errors.length === 0

  return {
    isComplete,
    missingFields,
    canActivate,
    completionPercentage,
    errors
  }
}

export function getProfileCompletionSteps(profile: Partial<EscortProfile>) {
  const validation = validateProfileCompletion(profile)
  
  return [
    {
      name: 'Basic Information',
      completed: !validation.missingFields.some(f => 
        ['name', 'age', 'location', 'description'].includes(f)
      ),
      required: true
    },
    {
      name: 'Services',
      completed: !validation.missingFields.some(f => 
        ['services', 'service_descriptions'].includes(f)
      ),
      required: true
    },
    {
      name: 'Pricing',
      completed: !validation.missingFields.includes('pricing'),
      required: true
    },
    {
      name: 'Availability',
      completed: !validation.missingFields.includes('availability'),
      required: true
    },
    {
      name: 'Media',
      completed: !validation.missingFields.includes('media'),
      required: true
    }
  ]
}

export function canPublishProfile(profile: Partial<EscortProfile>): { 
  canPublish: boolean
  reason?: string 
} {
  console.log('canPublishProfile - Checking profile:', {
    id: (profile as any).id || (profile as any).$id,
    status: profile.status,
    hasServices: !!profile.services?.length,
    hasPricing: !!profile.pricing?.length,
    hasMedia: !!profile.media?.length,
    workingHours: (profile as any).workingHours
  })
  
  const validation = validateProfileCompletion(profile)
  console.log('canPublishProfile - Validation result:', validation)
  
  if (!validation.canActivate) {
    if (validation.errors.length > 0) {
      return { 
        canPublish: false, 
        reason: validation.errors[0].message 
      }
    }
    return { 
      canPublish: false, 
      reason: 'Please complete all required fields' 
    }
  }
  
  // Check if profile thinks it's already active (this shouldn't happen with our fix)
  if (profile.status === 'active') {
    console.error('canPublishProfile - ERROR: Profile status is active in validation!', {
      status: profile.status,
      profileKeys: Object.keys(profile)
    })
  }
  
  // Don't check status here - let the service handle status validation
  return { canPublish: true }
}