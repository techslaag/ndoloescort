<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { EscortProfile } from '../../types/profile'

interface Props {
  profile: EscortProfile
}

const props = defineProps<Props>()
const router = useRouter()

const isVerified = computed(() => props.profile.verification?.isVerified || false)
const isDraft = computed(() => props.profile.status === 'draft')

const getProfileCompletion = (profile: any) => {
  let completedSteps = 0
  const totalSteps = 5
  
  // Step 1: Basic Information (name, age, location, description)
  const basicInfoComplete = {
    name: !!profile.name && profile.name.trim().length >= 2,
    age: !!profile.age && profile.age >= 18,
    location: !!(profile.locationCity || profile.location?.city) && 
              !!(profile.locationCountry || profile.location?.country),
    description: !!profile.description && profile.description.trim().length >= 50
  }
  const basicComplete = Object.values(basicInfoComplete).every(v => v)
  if (basicComplete) completedSteps++
  
  // Step 2: Services (at least one service with description)
  const hasServices = profile.services && profile.services.length > 0
  const servicesComplete = hasServices && profile.services.every((s: any) => 
    s.name && s.description && s.description.length >= 20
  )
  if (servicesComplete) completedSteps++
  
  // Step 3: Pricing (at least one valid pricing option)
  const hasPricing = profile.pricing && profile.pricing.length > 0
  const pricingComplete = hasPricing && profile.pricing.some((p: any) => 
    p.amount && p.amount > 0 && p.type
  )
  if (pricingComplete) completedSteps++
  
  // Step 4: Availability (at least one working day)
  let availabilityComplete = false
  if (profile.availability?.workingHours) {
    const workingHours = profile.availability.workingHours
    availabilityComplete = Object.values(workingHours).some((day: any) => day.enabled)
  } else if (profile.workingHours) {
    // Handle flat structure
    try {
      const workingHours = typeof profile.workingHours === 'string' 
        ? JSON.parse(profile.workingHours) 
        : profile.workingHours
      availabilityComplete = Object.values(workingHours).some((day: any) => day.enabled)
    } catch (e) {
      availabilityComplete = false
    }
  }
  if (availabilityComplete) completedSteps++
  
  // Step 5: Media (at least one photo)
  const hasMedia = profile.media && profile.media.length > 0
  const hasPhotos = hasMedia && profile.media.some((m: any) => 
    m.type === 'photo' || m.mediaType === 'photo' || (m.url && !m.url.includes('.mp4'))
  )
  if (hasPhotos) completedSteps++
  
  return Math.round((completedSteps / totalSteps) * 100)
}

const isProfileComplete = computed(() => getProfileCompletion(props.profile) === 100)

const getButtonTitle = () => {
  if (isVerified.value) {
    return 'Profile is verified'
  } else if (!isProfileComplete.value) {
    return `Profile is ${getProfileCompletion(props.profile)}% complete. All fields must be filled to start verification.`
  } else {
    return 'Start verification process'
  }
}

const handleClick = () => {
  if (!isVerified.value && isProfileComplete.value) {
    startVerification()
  }
}

const startVerification = () => {
  const profileId = (props.profile as any).$id || props.profile.id
  router.push({
    name: 'ProfileVerification',
    params: { profileId }
  })
}
</script>

<template>
  <button 
    class="action-btn"
    :disabled="!isProfileComplete || isVerified"
    :title="getButtonTitle()"
    @click="handleClick"
  >
    <svg v-if="isVerified" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3.5 7v6c0 5.55 3.84 10.74 8.5 12 4.66-1.26 8.5-6.45 8.5-12V7L12 2zm-2 16l-4-4 1.41-1.41L10 15.17l6.59-6.59L18 10l-8 8z"/>
    </svg>
    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 8.5 12 4.66-1.26 8.5-6.45 8.5-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
    <template v-if="isVerified">Verified</template>
    <template v-else>Get Verified</template>
  </button>
</template>

<style scoped lang="scss">
// Using the shared action-btn styles from parent component
</style>