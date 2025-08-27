<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { account } from '../../lib/appwrite'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
  rememberMe: false
})

const isLoading = ref(false)
const isAnonymousLoading = ref(false)
const showPassword = ref(false)

// Initialize remembered credentials
onMounted(() => {
  const { rememberMe, userEmail } = authStore.getRememberedCredentials()
  if (rememberMe && userEmail) {
    form.value.rememberMe = true
    form.value.email = userEmail
  }
})

// Reset loading state when component is unmounted or route changes
onUnmounted(() => {
  isLoading.value = false
  isAnonymousLoading.value = false
})

// Watch for route changes to reset loading state
watch(() => route.path, () => {
  isLoading.value = false
  isAnonymousLoading.value = false
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
  const passwordInput = document.getElementById('password') as HTMLInputElement
  if (passwordInput) {
    passwordInput.type = showPassword.value ? 'text' : 'password'
  }
}

const handleLogin = async () => {
  if (!form.value.email || !form.value.password) {
    authStore.setError('Please fill in all required fields', true)
    return
  }

  try {
    isLoading.value = true
    authStore.clearError()
    
    const result = await authStore.signin(form.value.email, form.value.password, form.value.rememberMe)
    
    if (result.success) {
      // Check if user is an escort and redirect to dashboard
      const userType = authStore.user?.prefs?.userType
      const redirectTo = route.query.redirect as string
      
      if (userType === 'escort') {
        // Escorts always go to dashboard, unless redirecting to another escort route
        if (redirectTo && redirectTo.startsWith('/escort/')) {
          router.push(redirectTo)
        } else {
          router.push('/escort/dashboard')
        }
      } else {
        // Clients go to redirect path or home
        router.push(redirectTo || '/')
      }
    }
  } catch (err) {
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleAnonymousLogin = async () => {
  try {
    isAnonymousLoading.value = true
    authStore.clearError()
    
    // Create anonymous session using Appwrite
    const session = await account.createAnonymousSession()
    
    if (session) {
      // Set user as anonymous client in store
      authStore.setAnonymousUser({
        $id: session.userId,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Anonymous Client',
        email: '',
        phone: '',
        registration: new Date().toISOString(),
        status: true,
        labels: ['anonymous', 'client'],
        passwordUpdate: new Date().toISOString(),
        emailVerification: false,
        phoneVerification: false,
        mfa: false,
        accessedAt: new Date().toISOString(),
        prefs: {},
        targets: []
      })
      
      router.push('/')
    }
  } catch (err) {
    console.error('Anonymous login error:', err)
    authStore.setError('Failed to login anonymously. Please try again.', true)
  } finally {
    isAnonymousLoading.value = false
  }
}

const navigateToSignup = () => {
  router.push('/signup')
}

const navigateToForgotPassword = () => {
  router.push('/forgot-password')
}

const handleErrorClear = () => {
  authStore.clearError()
}
</script>

<template>
  <div class="login-form">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="form-group">
      <label for="email">Email</label>
      <input 
        type="email" 
        id="email" 
        v-model="form.email"
        placeholder="Enter your email"
        required
        class="form-input"
      >
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <div class="password-input-wrapper">
        <input 
          type="password" 
          id="password" 
          v-model="form.password"
          placeholder="Enter your password"
          required
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
    
    <div class="form-options">
      <label class="checkbox-label">
        <input type="checkbox" v-model="form.rememberMe">
        <span class="checkmark"></span>
        Remember me
      </label>
      <a @click="navigateToForgotPassword" class="forgot-password">Forgot Password</a>
    </div>
    
    <button 
      type="submit" 
      class="btn btn-primary btn-lg"
      :disabled="isLoading || authStore.isLoading"
      @click="handleLogin"
    >
      <span v-if="isLoading || authStore.isLoading">Signing in...</span>
      <span v-else>Sign In</span>
    </button>
    
    <div class="anonymous-login">
      <div class="divider">
        <span>or</span>
      </div>
      
      <button 
        type="button" 
        class="btn btn-anonymous"
        :disabled="isAnonymousLoading"
        @click="handleAnonymousLogin"
      >
        <img src="/src/assets/images/icon/anonymous.svg" alt="Anonymous" width="20" height="20" />
        <span v-if="isAnonymousLoading">Logging in...</span>
        <span v-else>Login Anonymously as Client</span>
      </button>
    </div>
    
    <div class="signup-link">
      <p>Don't have an account? <a @click="navigateToSignup">Sign Up</a></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-form {
  width: 100%;
}

.form-group {
  margin-bottom: var(--spacing-lg);
  
  label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
    color: #374151;
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

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text-dark);
    
    input[type="checkbox"] {
      display: none;
    }
    
    .checkmark {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-text-lighter);
      border-radius: var(--border-radius-sm);
      position: relative;
      transition: all 0.2s ease;
    }
    
    input[type="checkbox"]:checked + .checkmark {
      background-color: var(--color-accent);
      border-color: var(--color-accent);
      
      &::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }
  
  .forgot-password {
    color: var(--color-accent);
    font-size: 0.9rem;
    text-decoration: none;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
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
  
  &.btn-social {
    background-color: white;
    color: #374151;
    border: 1px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    &:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }
  }
}

.anonymous-login {
  margin-top: var(--spacing-lg);
  
  .divider {
    text-align: center;
    margin-bottom: var(--spacing-lg);
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background-color: #e5e7eb;
    }
    
    span {
      background-color: white;
      padding: 0 16px;
      color: #6b7280;
      font-size: 0.9rem;
    }
  }
  
  .btn-anonymous {
    width: 100%;
    background-color: var(--color-text-light);
    color: white;
    border: 1px solid var(--color-text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    &:hover:not(:disabled) {
      background-color: var(--color-text-dark);
      border-color: var(--color-text-dark);
      
      img {
        filter: brightness(0) invert(1);
      }
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.signup-link {
  text-align: center;
  margin-top: var(--spacing-lg);
  
  p {
    color: #6b7280;
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
  .social-buttons {
    grid-template-columns: 1fr;
  }
  
  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
}
</style>