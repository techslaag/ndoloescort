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

const startVerification = () => {
  const profileId = (props.profile as any).$id || props.profile.id
  router.push({
    name: 'ProfileVerification',
    params: { profileId }
  })
}
</script>

<template>
  <div class="profile-verification-button">
    <!-- Verification Status Badge -->
    <div v-if="isVerified" class="verified-badge">
      <span class="badge-icon">✓</span>
      <span class="badge-text">Verified</span>
    </div>
    
    <!-- Start Verification Button -->
    <button 
      v-else 
      @click="startVerification" 
      class="btn btn-primary verify-btn"
    >
      <span class="btn-icon">🛡️</span>
      Get Verified
    </button>
  </div>
</template>

<style scoped lang="scss">
.profile-verification-button {
  display: inline-block;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: var(--border-radius-full);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  
  .badge-icon {
    font-size: 1rem;
  }
}

.verify-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
  }
  
  .btn-icon {
    font-size: 1.1rem;
  }
}
</style>