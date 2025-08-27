<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useMessagingStore } from './stores/messaging'
import { useSessionMonitor } from './composables/useSessionMonitor'
import AgeConfirmation from './components/AgeConfirmation.vue'
import LocationConfirmation from './components/LocationConfirmation.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import DefaultLayout from './layouts/DefaultLayout.vue'

const isLoading = ref(true)
const ageConfirmed = ref(false)
const locationConfirmed = ref(false)
const route = useRoute()
const authStore = useAuthStore()
const messagingStore = useMessagingStore()

// Initialize session monitoring
useSessionMonitor()

// Determine if current route is an auth route
const isAuthRoute = computed(() => {
  const authRoutes = ['Login', 'Signup', 'ForgotPassword', 'ResetPassword']
  return authRoutes.includes(route.name as string)
})


onMounted(async () => {
  // Simulate initial loading
  setTimeout(async () => {
    isLoading.value = false
    
    // Initialize presence tracking if user is authenticated
    if (authStore.isAuthenticated) {
      try {
        await messagingStore.initializePresence()
      } catch (error) {
        console.error('Failed to initialize presence tracking:', error)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  // Cleanup presence tracking when app unmounts
  messagingStore.cleanupPresence()
})

const onAgeConfirmed = () => {
  ageConfirmed.value = true
}

const onLocationConfirmed = () => {
  locationConfirmed.value = true
}
</script>

<template>
  <div class="app-container">
    <!-- Age Confirmation Modal -->
    <AgeConfirmation @age-confirmed="onAgeConfirmed" />
    
    <!-- Location Confirmation Modal -->
    <LocationConfirmation @location-confirmed="onLocationConfirmed" />
    
    <div v-if="isLoading" class="loading-screen">
      <div class="loading-logo">
        <span>Ndolo</span>
        <span class="accent">Escorts</span>
      </div>
      <div class="loading-spinner"></div>
    </div>
    
    <template v-else-if="ageConfirmed && locationConfirmed">
      <!-- Use AuthLayout for authentication pages -->
      <AuthLayout v-if="isAuthRoute">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </AuthLayout>
      
      <!-- Use DefaultLayout for other pages -->
      <DefaultLayout v-else>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </DefaultLayout>
    </template>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #120024;
  z-index: 1000;
}

.loading-logo {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  color: #ffffff;
  margin-bottom: 2rem;
  
  .accent {
    color: #B76E79;
    font-weight: 700;
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(183, 110, 121, 0.3);
  border-radius: 50%;
  border-top-color: #B76E79;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>