<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const showWarning = ref(false)
const remainingMinutes = ref(5)

const handleSessionWarning = (event: CustomEvent) => {
  remainingMinutes.value = event.detail.remainingMinutes
  showWarning.value = true
}

const extendSession = () => {
  // Update last activity to extend session
  window.dispatchEvent(new Event('mousedown'))
  showWarning.value = false
}

const logout = async () => {
  showWarning.value = false
  await authStore.signout()
}

onMounted(() => {
  window.addEventListener('session-warning', handleSessionWarning as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('session-warning', handleSessionWarning as EventListener)
})
</script>

<template>
  <transition name="modal-fade">
    <div v-if="showWarning" class="modal-overlay" @click.self="extendSession">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Session Expiring Soon</h3>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          
          <p class="warning-message">
            Your session will expire in <strong>{{ remainingMinutes }} {{ remainingMinutes === 1 ? 'minute' : 'minutes' }}</strong> due to inactivity.
          </p>
          
          <p class="warning-subtext">
            Click anywhere or press any key to continue your session.
          </p>
        </div>
        
        <div class="modal-footer">
          <button @click="extendSession" class="btn btn-primary">
            Continue Session
          </button>
          <button @click="logout" class="btn btn-outline">
            Logout Now
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 100%;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.modal-body {
  padding: 24px;
  text-align: center;
  
  .warning-icon {
    margin-bottom: 20px;
    color: #f59e0b;
  }
  
  .warning-message {
    font-size: 1rem;
    color: #4b5563;
    margin-bottom: 12px;
    
    strong {
      color: #1f2937;
      font-weight: 600;
    }
  }
  
  .warning-subtext {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: center;
  
  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    
    &.btn-primary {
      background-color: var(--color-accent);
      color: white;
      
      &:hover {
        background-color: var(--color-accent-dark);
      }
    }
    
    &.btn-outline {
      background-color: white;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      
      &:hover {
        background-color: #f9fafb;
        color: #4b5563;
      }
    }
  }
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .modal-container {
    max-width: 100%;
  }
  
  .modal-footer {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>