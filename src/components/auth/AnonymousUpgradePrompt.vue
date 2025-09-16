<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{
  feature: string
  redirectTo?: string
}>()

const router = useRouter()
const authStore = useAuthStore()
const isOpen = ref(true)

const navigateToSignup = () => {
  if (props.redirectTo) {
    router.push({ name: 'Signup', query: { redirect: props.redirectTo } })
  } else {
    router.push('/signup')
  }
}

const navigateToLogin = () => {
  if (props.redirectTo) {
    router.push({ name: 'Login', query: { redirect: props.redirectTo } })
  } else {
    router.push('/login')
  }
}

const close = () => {
  isOpen.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="upgrade-overlay">
      <div class="upgrade-modal">
        <div class="modal-header">
          <h3>Create an Account to Continue</h3>
          <button @click="close" class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="icon-container">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V12C2 16.55 4.84 20.74 9 22.35C10.14 22.75 11.2 23 12 23C12.8 23 13.86 22.75 15 22.35C19.16 20.74 22 16.55 22 12V7L12 2ZM12 11.99H19C18.47 15.11 16.72 17.78 14.32 19.02C13.56 19.36 12.8 19.5 12 19.5V11.99ZM5 12V8.3L12 5.19V11.99H5V12Z" fill="currentColor"/>
            </svg>
          </div>
          
          <p class="message">
            You're currently browsing as an anonymous user. To {{ feature }}, please create an account or sign in.
          </p>
          
          <div class="benefits">
            <h4>Benefits of creating an account:</h4>
            <ul>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Book escorts and manage appointments
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Send and receive secure messages
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Save favorite profiles
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                Access exclusive features
              </li>
            </ul>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="navigateToSignup" class="btn btn-primary">
            Create Free Account
          </button>
          <button @click="navigateToLogin" class="btn btn-outline">
            I Have an Account
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.upgrade-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.upgrade-modal {
  background: white;
  border-radius: var(--border-radius-lg);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-text-lighter);
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text-dark);
  }
  
  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-light);
    padding: 0.5rem;
    border-radius: var(--border-radius-md);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
      color: var(--color-text-dark);
    }
  }
}

.modal-content {
  padding: 2rem;
  
  .icon-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
    
    svg {
      color: var(--color-accent);
    }
  }
  
  .message {
    text-align: center;
    font-size: 1.1rem;
    color: var(--color-text-dark);
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  
  .benefits {
    background: var(--color-background-alt);
    padding: 1.5rem;
    border-radius: var(--border-radius-md);
    
    h4 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--color-text-dark);
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
        color: var(--color-text);
        
        svg {
          color: #22c55e;
          flex-shrink: 0;
        }
      }
    }
  }
}

.modal-actions {
  padding: 1.5rem;
  border-top: 1px solid var(--color-text-lighter);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  .btn {
    width: 100%;
    padding: 0.875rem 1.5rem;
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.btn-primary {
      background: var(--color-accent);
      color: white;
      border: none;
      
      &:hover {
        background: var(--color-accent-dark);
        transform: translateY(-1px);
      }
    }
    
    &.btn-outline {
      background: transparent;
      color: var(--color-accent);
      border: 1px solid var(--color-accent);
      
      &:hover {
        background: rgba(183, 110, 121, 0.1);
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .upgrade-modal {
    max-height: 100vh;
    border-radius: 0;
  }
  
  .modal-content {
    padding: 1.5rem;
  }
}
</style>