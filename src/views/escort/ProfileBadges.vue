<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBadgeStore } from '../../stores/badge'
import BadgeGallery from '../../components/badges/BadgeGallery.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const badgeStore = useBadgeStore()

const profileId = computed(() => route.params.profileId as string)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (authStore.user && profileId.value) {
    await badgeStore.loadUserBadges(authStore.user.$id, profileId.value)
  }
})

const goBack = () => {
  router.push('/escort/profiles')
}
</script>

<template>
  <div class="profile-badges-page">
    <div class="page-header">
      <button @click="goBack" class="back-btn">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
        </svg>
        Back to Profiles
      </button>
      
      <div class="header-content">
        <h1>Profile Badges</h1>
        <p>Your achievements and recognitions</p>
      </div>
    </div>
    
    <BadgeGallery 
      :profile-id="profileId"
      :show-progress="true"
      view-mode="all"
    />
  </div>
</template>

<style scoped lang="scss">
.profile-badges-page {
  padding: var(--spacing-xl);
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  margin-bottom: var(--spacing-xxl);
  
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius-md);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-primary-light);
      transform: translateX(-2px);
    }
    
    svg {
      transition: transform 0.2s ease;
    }
  }
  
  .header-content {
    text-align: center;
    
    h1 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
      font-size: 2.5rem;
      font-weight: 700;
    }
    
    p {
      color: var(--color-text-light);
      font-size: 1.2rem;
    }
  }
}

@media (max-width: 768px) {
  .profile-badges-page {
    padding: var(--spacing-md);
  }
  
  .page-header {
    .header-content {
      h1 {
        font-size: 2rem;
      }
      
      p {
        font-size: 1rem;
      }
    }
  }
}
</style>