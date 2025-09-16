import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import './assets/styles/main.scss'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import { realtimeService } from './services/realtimeService'
import { initSessionMiddleware, destroySessionMiddleware } from './middleware/sessionMiddleware'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)

// Initialize auth state
const authStore = useAuthStore()
authStore.init().then(() => {
  // Initialize realtime service after auth is ready
  realtimeService.initStores()
  
  // Start realtime subscriptions if user is authenticated
  if (authStore.isAuthenticated) {
    realtimeService.subscribeToConversations()
    realtimeService.subscribeToCalls()
    
    // Initialize session monitoring
    initSessionMiddleware()
  }
})

// Clean up on app unmount
window.addEventListener('beforeunload', () => {
  realtimeService.unsubscribeAll()
  destroySessionMiddleware()
})

// Listen for auth state changes
window.addEventListener('user-logout', () => {
  destroySessionMiddleware()
})

app.mount('#app')