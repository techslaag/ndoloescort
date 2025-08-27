<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ErrorAlert from '../../components/ErrorAlert.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  userType: 'client', // 'client' or 'escort'
  agreeToTerms: false
})

const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showTermsError = ref(false)

// Reset loading state when component is unmounted or route changes
onUnmounted(() => {
  isLoading.value = false
})

// Watch for route changes to reset loading state
watch(() => route.path, () => {
  isLoading.value = false
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

const handleSignup = async () => {
  // Validation
  if (!form.value.firstName || !form.value.lastName || !form.value.email || !form.value.password) {
    authStore.setError('Please fill in all required fields', true)
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

  if (!form.value.agreeToTerms) {
    showTermsError.value = true
    authStore.setError('You must agree to the Terms of Service and Privacy Policy to continue', true)
    return
  }
  
  showTermsError.value = false

  try {
    isLoading.value = true
    authStore.clearError()
    
    const fullName = `${form.value.firstName} ${form.value.lastName}`
    const result = await authStore.signup(form.value.email, form.value.password, fullName, form.value.userType)
    
    if (result.success) {
      // Check if user is an escort and redirect to dashboard
      const userType = authStore.user?.prefs?.userType || form.value.userType
      if (userType === 'escort') {
        router.push('/escort/dashboard')
      } else {
        router.push('/')
      }
    }
  } catch (err) {
    console.error('Signup error:', err)
  } finally {
    isLoading.value = false
  }
}

const navigateToLogin = () => {
  router.push('/login')
}

const handleErrorClear = () => {
  authStore.clearError()
}

const openTerms = () => {
  window.open('/terms', '_blank')
}

const openPrivacy = () => {
  window.open('/privacy', '_blank')
}
</script>

<template>
  <div class="signup-form">
    <ErrorAlert 
      :error="authStore.error"
      :auto-clear="false"
      :dismissible="true"
      @clear="handleErrorClear"
      @dismiss="handleErrorClear"
    />
    
    <div class="form-row">
      <div class="form-group">
        <label for="firstName">First Name</label>
        <input 
          type="text" 
          id="firstName" 
          v-model="form.firstName"
          placeholder="Enter your first name"
          required
          class="form-input"
        >
      </div>
      
      <div class="form-group">
        <label for="lastName">Last Name</label>
        <input 
          type="text" 
          id="lastName" 
          v-model="form.lastName"
          placeholder="Enter your last name"
          required
          class="form-input"
        >
      </div>
    </div>
    
    <div class="form-group">
      <label for="email">Email Address</label>
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
      <label>I want to register as</label>
      <div class="user-type-selection">
        <label class="user-type-option" :class="{ 'selected': form.userType === 'client' }">
          <input 
            type="radio" 
            name="userType" 
            value="client" 
            v-model="form.userType"
          >
          <div class="option-content">
            <div class="option-icon">👤</div>
            <div class="option-text">
              <h4>Client</h4>
              <p>I want to find and book companions</p>
            </div>
          </div>
        </label>
        
        <label class="user-type-option" :class="{ 'selected': form.userType === 'escort' }">
          <input 
            type="radio" 
            name="userType" 
            value="escort" 
            v-model="form.userType"
          >
          <div class="option-content">
            <div class="option-icon">💎</div>
            <div class="option-text">
              <h4>Escort</h4>
              <p>I want to offer companionship services</p>
            </div>
          </div>
        </label>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-wrapper">
          <input 
            type="password" 
            id="password" 
            v-model="form.password"
            placeholder="Create a password"
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
            placeholder="Confirm your password"
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
    </div>
    
    <div class="form-group">
      <label class="checkbox-label" :class="{ 'error': showTermsError }">
        <input type="checkbox" v-model="form.agreeToTerms" required>
        <span class="checkmark"></span>
        <span class="checkbox-text">
          I agree to the 
          <a href="/terms" target="_blank" class="terms-link" @click.prevent="openTerms">Terms of Service</a> 
          and 
          <a href="/privacy" target="_blank" class="terms-link" @click.prevent="openPrivacy">Privacy Policy</a>
        </span>
      </label>
      <div v-if="showTermsError" class="error-message">
        You must agree to the Terms of Service and Privacy Policy to continue
      </div>
    </div>
    
    <button 
      type="submit" 
      class="btn btn-primary btn-lg"
      :disabled="isLoading || authStore.isLoading"
      @click="handleSignup"
    >
      <span v-if="isLoading || authStore.isLoading">Creating Account...</span>
      <span v-else>Create Account</span>
    </button>
    
    <div class="login-link">
      <p>Already have an account? <a @click="navigateToLogin">Sign in here</a></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.signup-form {
  width: 100%;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
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

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--color-text-dark);
    user-select: none;
    
    &.error {
      .checkmark {
        border-color: var(--color-error);
      }
    }
  
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
      margin-top: 2px;
      flex-shrink: 0;
      
      &:hover {
        border-color: var(--color-accent);
      }
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
  
  .checkbox-text {
    flex: 1;
  }
  
  .terms-link {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
      color: var(--color-accent-dark);
    }
    
    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
}

.user-type-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

  .user-type-option {
    display: block;
    cursor: pointer;
    border: 2px solid var(--color-text-lighter);
    border-radius: var(--border-radius-lg);
    padding: 20px;
    transition: all 0.3s ease;
    background-color: var(--color-background-alt);
    
    &:hover {
      border-color: var(--color-accent);
      background-color: var(--color-background);
    }
    
    &.selected {
      border-color: var(--color-accent);
      background-color: rgba(183, 110, 121, 0.1);
      box-shadow: 0 4px 12px rgba(183, 110, 121, 0.15);
    }
  
  input[type="radio"] {
    display: none;
  }
  
  .option-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .option-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .option-text {
    flex: 1;
    
    h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    }
    
    p {
      margin: 0;
      font-size: 0.85rem;
      color: #6b7280;
      line-height: 1.4;
    }
  }
}

.error-message {
  color: var(--color-error);
  font-size: 0.8rem;
  margin-top: 4px;
  margin-left: 24px;
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

.login-link {
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

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .user-type-selection {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .user-type-option {
    padding: 16px;
    
    .option-content {
      gap: 10px;
    }
    
    .option-icon {
      width: 36px;
      height: 36px;
      font-size: 20px;
    }
  }
}
</style>