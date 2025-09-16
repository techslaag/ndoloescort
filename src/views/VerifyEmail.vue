<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isVerifying = ref(true)
const verificationStatus = ref<'pending' | 'success' | 'error'>('pending')
const errorMessage = ref('')

onMounted(async () => {
  // Get verification parameters from URL
  const userId = route.query.userId as string
  const secret = route.query.secret as string
  
  console.log('Verification params:', { userId, secret })
  
  if (!userId || !secret) {
    verificationStatus.value = 'error'
    errorMessage.value = 'Invalid verification link. Missing required parameters.'
    isVerifying.value = false
    return
  }
  
  try {
    // Complete email verification
    const result = await authStore.completeEmailVerification(userId, secret)
    
    if (result.success) {
      verificationStatus.value = 'success'
      // Redirect to dashboard or settings after 3 seconds
      setTimeout(() => {
        if (authStore.isAuthenticated) {
          router.push('/settings')
        } else {
          router.push('/login')
        }
      }, 3000)
    } else {
      verificationStatus.value = 'error'
      errorMessage.value = result.error || 'Failed to verify email. The link may be expired or invalid.'
    }
  } catch (error) {
    console.error('Email verification error:', error)
    verificationStatus.value = 'error'
    errorMessage.value = 'An error occurred while verifying your email. Please try again.'
  } finally {
    isVerifying.value = false
  }
})

const goToLogin = () => {
  router.push('/login')
}

const goToSettings = () => {
  router.push('/settings')
}
</script>

<template>
  <div class="verify-email-page">
    <div class="verify-container">
      <!-- Loading State -->
      <div v-if="isVerifying" class="verify-content">
        <div class="loader">
          <div class="spinner"></div>
        </div>
        <h1>Verifying Your Email</h1>
        <p>Please wait while we verify your email address...</p>
      </div>
      
      <!-- Success State -->
      <div v-else-if="verificationStatus === 'success'" class="verify-content success">
        <div class="success-icon">✅</div>
        <h1>Email Verified Successfully!</h1>
        <p>Your email address has been verified. You can now access all features.</p>
        <p class="redirect-message">Redirecting you in a few seconds...</p>
        <button @click="goToSettings" class="btn btn-primary">
          Go to Settings
        </button>
      </div>
      
      <!-- Error State -->
      <div v-else-if="verificationStatus === 'error'" class="verify-content error">
        <div class="error-icon">❌</div>
        <h1>Verification Failed</h1>
        <p>{{ errorMessage }}</p>
        <div class="error-actions">
          <button @click="goToLogin" class="btn btn-primary">
            Go to Login
          </button>
          <button @click="goToSettings" v-if="authStore.isAuthenticated" class="btn btn-outline">
            Go to Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.verify-email-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--spacing-lg);
}

.verify-container {
  background: white;
  border-radius: var(--border-radius-xl);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  overflow: hidden;
}

.verify-content {
  padding: var(--spacing-xxl);
  text-align: center;
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-dark);
    margin: var(--spacing-lg) 0 var(--spacing-md);
  }
  
  p {
    font-size: 1.1rem;
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
    line-height: 1.6;
  }
  
  &.success {
    .success-icon {
      font-size: 4rem;
      animation: scaleIn 0.5s ease-out;
    }
    
    h1 {
      color: #10b981;
    }
    
    .redirect-message {
      font-size: 0.9rem;
      font-style: italic;
      margin-top: var(--spacing-md);
    }
  }
  
  &.error {
    .error-icon {
      font-size: 4rem;
      animation: shake 0.5s ease-out;
    }
    
    h1 {
      color: #ef4444;
    }
  }
}

/* Loader */
.loader {
  margin-bottom: var(--spacing-lg);
  
  .spinner {
    width: 60px;
    height: 60px;
    margin: 0 auto;
    border: 4px solid rgba(102, 126, 234, 0.2);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

/* Buttons */
.btn {
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--border-radius-md);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  text-decoration: none;
  display: inline-block;
  margin: var(--spacing-sm);
  
  &.btn-primary {
    background: var(--color-primary);
    color: white;
    
    &:hover {
      background: var(--color-primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  }
  
  &.btn-outline {
    background: transparent;
    border: 2px solid var(--color-primary);
    color: var(--color-primary);
    
    &:hover {
      background: var(--color-primary);
      color: white;
    }
  }
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  
  @media (max-width: 480px) {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}

/* Animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10px);
  }
}
</style>