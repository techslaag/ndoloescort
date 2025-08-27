<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { account } from '../lib/appwrite'
import ErrorAlert from '../components/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  password: '',
  confirmPassword: ''
})

const isLoading = ref(false)
const success = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Reset loading state when component is unmounted or route changes
onUnmounted(() => {
  isLoading.value = false
})

// Watch for route changes to reset loading state
watch(() => route.path, () => {
  isLoading.value = false
})

const userId = ref('')
const secret = ref('')

onMounted(() => {
  userId.value = route.query.userId as string || ''
  secret.value = route.query.secret as string || ''
  
  if (!userId.value || !secret.value) {
    authStore.setError('Invalid reset link. Please request a new password reset.', false)
  }
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
  const passwordInput = document.getElementById('password') as HTMLInputElement
  if (passwordInput) {
    passwordInput.type = showPassword.value ? 'text' : 'password'
  }
}

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value
  const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement
  if (confirmPasswordInput) {
    confirmPasswordInput.type = showConfirmPassword.value ? 'text' : 'password'
  }
}

const handleResetPassword = async () => {
  if (!form.value.password || !form.value.confirmPassword) {
    authStore.setError('Please fill in all fields', true)
    return
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    authStore.setError('Passwords do not match', true)
    return
  }
  
  if (form.value.password.length < 8) {
    authStore.setError('Password must be at least 8 characters long', true)
    return
  }
  
  try {
    isLoading.value = true
    authStore.clearError()
    
    await account.updateRecovery(
      userId.value,
      secret.value,
      form.value.password,
      form.value.confirmPassword
    )
    
    success.value = true
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login')
    }, 3000)
    
  } catch (err: any) {
    authStore.setError(err.message || 'Failed to reset password', false)
  } finally {
    isLoading.value = false
  }
}

const handleErrorClear = () => {
  authStore.clearError()
}
</script>

<template>
  <div class="reset-password-form">
    <div v-if="success" class="success-message">
      <h2>Password Reset Successful!</h2>
      <p>Your password has been updated. You will be redirected to the login page shortly.</p>
    </div>
    
    <form v-else @submit.prevent="handleResetPassword" class="reset-form">
      <ErrorAlert 
        :error="authStore.error"
        :auto-clear="false"
        :dismissible="true"
        @clear="handleErrorClear"
        @dismiss="handleErrorClear"
      />
      
      <div class="form-group">
        <label for="password">New Password</label>
        <div class="password-input-wrapper">
          <input 
            type="password" 
            id="password" 
            v-model="form.password"
            placeholder="Enter your new password"
            required
            minlength="8"
            class="form-input"
          >
          <button type="button" class="password-toggle" @click="togglePassword">
            <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <div class="password-input-wrapper">
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="form.confirmPassword"
            placeholder="Confirm your new password"
            required
            class="form-input"
          >
          <button type="button" class="password-toggle" @click="toggleConfirmPassword">
            <svg v-if="showConfirmPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-primary btn-lg"
        :disabled="isLoading"
      >
        <span v-if="isLoading">Resetting Password...</span>
        <span v-else>Reset Password</span>
      </button>
    </form>
    
    <div class="login-link">
      <p>Remember your password? <a @click="$router.push('/login')">Sign in here</a></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.reset-password-form {
  width: 100%;
}

.success-message {
  text-align: center;
  color: var(--color-success);
  
  h2 {
    color: var(--color-success);
    margin-bottom: var(--spacing-md);
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  p {
    color: var(--color-text-dark);
  }
}

.reset-form {
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
  
  .password-input-wrapper {
    position: relative;
    
    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--color-text-lighter);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--border-radius-sm);
      transition: color 0.2s ease;
      
      &:hover {
        color: var(--color-text-dark);
      }
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
</style>