<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  email: ''
})

const isLoading = ref(false)
const success = ref(false)
const submittedEmail = ref('')

// Reset loading state when component is unmounted or route changes
onUnmounted(() => {
  isLoading.value = false
})

// Watch for route changes to reset loading state
watch(() => route.path, () => {
  isLoading.value = false
})

const handleForgotPassword = async () => {
  if (!form.value.email) {
    authStore.setError('Please enter your email address', true)
    return
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.value.email)) {
    authStore.setError('Please enter a valid email address', true)
    return
  }

  try {
    isLoading.value = true
    authStore.clearError()
    
    const result = await authStore.resetPassword(form.value.email)
    
    // Always show success message regardless of whether email exists
    // This prevents email enumeration attacks
    if (result.success) {
      submittedEmail.value = form.value.email
      success.value = true
      // Clear the form for security
      form.value.email = ''
    } else {
      // Even if there's an error, we don't reveal if the email exists
      // Show the same success message for privacy
      submittedEmail.value = form.value.email
      success.value = true
      form.value.email = ''
    }
  } catch (err) {
    console.error('Password reset error:', err)
    // For privacy, show success message even on error
    // This prevents attackers from determining if an email exists
    submittedEmail.value = form.value.email
    success.value = true
    form.value.email = ''
  } finally {
    isLoading.value = false
  }
}

const navigateToLogin = () => {
  router.push('/login')
}

const resetForm = () => {
  success.value = false
  submittedEmail.value = ''
  authStore.clearError()
}

const handleErrorClear = () => {
  authStore.clearError()
}
</script>

<template>
  <div class="forgot-password-form">
    <div v-if="success" class="success-message">
      <div class="success-icon">✓</div>
      <h2>Check Your Email</h2>
      <p>
        If an account with the email address <strong>{{ submittedEmail }}</strong> exists, 
        you will receive a password reset link shortly.
      </p>
      <div class="privacy-notice">
        <p><strong>Privacy Notice:</strong></p>
        <ul>
          <li>We don't reveal whether an email address is registered with us</li>
          <li>Reset links expire after 1 hour for security</li>
          <li>You can only request one reset link at a time</li>
          <li>If you don't receive an email, check your spam folder</li>
        </ul>
      </div>
      <div class="success-actions">
        <button @click="navigateToLogin" class="btn btn-secondary">
          Back to Login
        </button>
        <button @click="resetForm" class="btn btn-outline">
          Request Another Link
        </button>
      </div>
    </div>
    
    <form v-else @submit.prevent="handleForgotPassword" class="forgot-form">
      <ErrorAlert 
        :error="authStore.error"
        :auto-clear="false"
        :dismissible="true"
        @clear="handleErrorClear"
        @dismiss="handleErrorClear"
      />
      
      <div class="form-group">
        <label for="email">Email Address</label>
        <input 
          type="email" 
          id="email" 
          v-model="form.email"
          placeholder="Enter your email address"
          required
          autocomplete="email"
          class="form-input"
        >
      </div>
      
      <button 
        type="submit" 
        class="btn btn-primary btn-lg"
        :disabled="isLoading"
      >
        <span v-if="isLoading">Processing...</span>
        <span v-else>Send Reset Link</span>
      </button>
      
      <div class="security-info">
        <p><strong>Security & Privacy:</strong></p>
        <ul>
          <li>We never reveal if an email address is registered</li>
          <li>Reset links are time-limited and single-use</li>
          <li>Your email address is only used for password reset</li>
        </ul>
      </div>
    </form>
    
    <div class="login-link">
      <p>Remember your password? <a @click="navigateToLogin">Sign in here</a></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.forgot-password-form {
  width: 100%;
}

.success-message {
  text-align: center;
  color: var(--color-success);
  
  .success-icon {
    font-size: 3rem;
    color: var(--color-success);
    margin-bottom: var(--spacing-md);
  }
  
  h2 {
    color: var(--color-success);
    margin-bottom: var(--spacing-md);
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  p {
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-lg);
    line-height: 1.5;
  }
  
  .privacy-notice {
    background-color: rgba(40, 167, 69, 0.1);
    border: 1px solid rgba(40, 167, 69, 0.3);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    text-align: left;
    
    p {
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      
      li {
        margin-bottom: var(--spacing-xs);
        color: var(--color-text-dark);
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }
  }
  
  .success-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;
    
    .btn {
      min-width: 140px;
    }
  }
}

.forgot-form {
  .form-group {
    margin-bottom: var(--spacing-lg);
    
    label {
      display: block;
      margin-bottom: var(--spacing-sm);
      font-weight: 500;
      color: var(--color-text-dark);
      font-size: 0.9rem;
    }
  }
  
  .form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    background-color: var(--color-background-alt);
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-accent);
      background-color: var(--color-background);
      box-shadow: 0 0 0 3px rgba(183, 110, 121, 0.1);
    }
    
    &::placeholder {
      color: var(--color-text-lighter);
    }
  }
  
  .btn {
    width: 100%;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.btn-primary {
      background-color: var(--color-accent);
      color: white;
      
      &:hover:not(:disabled) {
        background-color: var(--color-accent-dark);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
    
    &.btn-lg {
      padding: 14px 16px;
      font-size: 1rem;
    }
    
    &.btn-secondary {
      background-color: var(--color-text-light);
      color: white;
      
      &:hover {
        background-color: var(--color-text-dark);
      }
    }
    
    &.btn-outline {
      background-color: transparent;
      color: var(--color-text-dark);
      border: 1px solid var(--color-text-lighter);
      
      &:hover {
        background-color: var(--color-background-alt);
        border-color: var(--color-accent);
      }
    }
  }
  
  .security-info {
    background-color: var(--color-background-alt);
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-lg);
    margin-top: var(--spacing-lg);
    text-align: left;
    
    p {
      margin-bottom: var(--spacing-sm);
      font-weight: 600;
      color: var(--color-text-dark);
    }
    
    ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      
      li {
        margin-bottom: var(--spacing-xs);
        color: var(--color-text-light);
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }
  }
}

.login-link {
  text-align: center;
  margin-top: var(--spacing-lg);
  
  p {
    color: var(--color-text-light);
    font-size: 0.9rem;
    margin: 0;
  }
  
  a {
    color: var(--color-accent);
    cursor: pointer;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 480px) {
  .success-actions {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style> 