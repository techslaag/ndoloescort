<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// Props from route query
const verificationType = ref(route.query.type as string || 'login') // 'login', 'setup', 'disable'
const email = ref(route.query.email as string || '')
const redirectTo = ref(route.query.redirect as string || '/')

// Component state
const verificationCode = ref('')
const isVerifying = ref(false)
const isResending = ref(false)
const attempts = ref(0)
const maxAttempts = 5
const timer = ref(0)
const timerInterval = ref<NodeJS.Timeout | null>(null)

// Computed properties
const pageTitle = computed(() => {
  switch (verificationType.value) {
    case 'setup': return 'Setup Two-Factor Authentication'
    case 'disable': return 'Disable Two-Factor Authentication'
    case 'login': return 'Two-Factor Authentication'
    default: return 'Verification Required'
  }
})

const pageDescription = computed(() => {
  switch (verificationType.value) {
    case 'setup': return 'Complete your 2FA setup by entering the verification code sent to your email.'
    case 'disable': return 'Enter the verification code to disable Two-Factor Authentication.'
    case 'login': return 'Enter the verification code sent to your email to complete your login.'
    default: return 'Please enter the verification code to continue.'
  }
})

const showResendButton = computed(() => timer.value === 0 && !isResending.value)
const isCodeValid = computed(() => verificationCode.value.length === 6 && /^\d{6}$/.test(verificationCode.value))
const attemptsRemaining = computed(() => Math.max(0, maxAttempts - attempts.value))

// Initialize component
onMounted(() => {
  // Check if we have the necessary session data
  const challengeId = sessionStorage.getItem('login_mfa_challenge_id') || 
                      sessionStorage.getItem('mfa_challenge_id')
  
  if (!challengeId && verificationType.value === 'login') {
    // No challenge ID found, redirect back to login
    showError('Session expired. Please login again.')
    router.push('/login')
    return
  }
  
  // Start resend cooldown timer
  startResendTimer(60) // 60 seconds
  
  // Auto-focus the input
  setTimeout(() => {
    const input = document.getElementById('verificationCode') as HTMLInputElement
    if (input) input.focus()
  }, 100)
})

// Cleanup
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

// Start resend cooldown timer
const startResendTimer = (seconds: number) => {
  timer.value = seconds
  if (timerInterval.value) clearInterval(timerInterval.value)
  
  timerInterval.value = setInterval(() => {
    timer.value--
    if (timer.value <= 0) {
      clearInterval(timerInterval.value!)
      timerInterval.value = null
    }
  }, 1000)
}

// Handle verification code submission
const handleVerification = async () => {
  if (!isCodeValid.value) {
    showError('Please enter a valid 6-digit verification code')
    return
  }

  if (attempts.value >= maxAttempts) {
    showError('Maximum verification attempts exceeded. Please try again later.')
    return
  }

  try {
    isVerifying.value = true
    attempts.value++

    let result
    switch (verificationType.value) {
      case 'login':
        result = await authStore.verify2FA(verificationCode.value)
        break
      case 'setup':
        result = await authStore.enable2FA(verificationCode.value)
        break
      case 'disable':
        result = await authStore.disable2FA(verificationCode.value)
        break
      default:
        result = await authStore.verify2FA(verificationCode.value)
    }

    if (result.success) {
      success('Verification successful!')
      
      // Handle different verification types
      switch (verificationType.value) {
        case 'login':
          // Redirect based on user type
          const userType = (authStore.user?.prefs as any)?.userType
          if (userType === 'escort') {
            router.push(redirectTo.value.startsWith('/escort/') ? redirectTo.value : '/escort/dashboard')
          } else {
            router.push(redirectTo.value === '/' ? '/' : redirectTo.value)
          }
          break
        case 'setup':
          success('Two-Factor Authentication has been enabled!')
          router.push('/settings?tab=security')
          break
        case 'disable':
          success('Two-Factor Authentication has been disabled!')
          router.push('/settings?tab=security')
          break
        default:
          router.push(redirectTo.value)
      }
    } else {
      showError(result.error || 'Invalid verification code. Please try again.')
      verificationCode.value = ''
      
      if (attempts.value >= maxAttempts) {
        showError('Too many failed attempts. Redirecting to login...')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }
  } catch (error: any) {
    console.error('Verification error:', error)
    showError('Verification failed. Please try again.')
    verificationCode.value = ''
  } finally {
    isVerifying.value = false
  }
}

// Resend verification code
const resendCode = async () => {
  try {
    isResending.value = true

    let result
    switch (verificationType.value) {
      case 'login':
        // For login, we need to re-trigger the login flow
        showError('Please go back to login and try again.')
        router.push('/login')
        return
      case 'setup':
        result = await authStore.setup2FA()
        break
      case 'disable':
        result = await authStore.setupDisable2FA()
        break
      default:
        result = await authStore.setup2FA()
    }

    if (result?.success) {
      success('New verification code sent to your email!')
      startResendTimer(60)
      verificationCode.value = ''
    } else {
      showError('Failed to resend verification code. Please try again.')
    }
  } catch (error: any) {
    console.error('Resend error:', error)
    showError('Failed to resend verification code.')
  } finally {
    isResending.value = false
  }
}

// Go back to previous page
const goBack = () => {
  switch (verificationType.value) {
    case 'login':
      router.push('/login')
      break
    case 'setup':
    case 'disable':
      router.push('/settings?tab=security')
      break
    default:
      router.back()
  }
}

// Handle keyboard input
const handleKeyPress = (event: KeyboardEvent) => {
  // Only allow digits
  if (!/^\d$/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(event.key)) {
    event.preventDefault()
  }
  
  // Handle Enter key
  if (event.key === 'Enter' && isCodeValid.value) {
    handleVerification()
  }
}

// Auto-format code input (add spaces for readability)
const formatCode = () => {
  // Remove any non-digit characters
  let cleaned = verificationCode.value.replace(/\D/g, '')
  
  // Limit to 6 digits
  cleaned = cleaned.slice(0, 6)
  
  verificationCode.value = cleaned
}
</script>

<template>
  <div class="verification-form">
    <div class="form-header">
      <h2>{{ pageTitle }}</h2>
      <p class="form-description">{{ pageDescription }}</p>
      <div v-if="email" class="email-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ email }}</span>
      </div>
    </div>

    <div class="form-group">
      <label for="verificationCode">Verification Code</label>
      <input
        id="verificationCode"
        v-model="verificationCode"
        type="text"
        inputmode="numeric"
        placeholder="Enter 6-digit code"
        maxlength="6"
        class="form-input code-input"
        :disabled="isVerifying"
        @keypress="handleKeyPress"
        @input="formatCode"
        autocomplete="one-time-code"
      />
      <p class="help-text">Enter the 6-digit code sent to your email</p>
    </div>

    <button
      type="submit"
      class="btn btn-primary btn-lg"
      :disabled="!isCodeValid || isVerifying || attempts >= maxAttempts"
      @click="handleVerification"
    >
      <span v-if="isVerifying">Verifying...</span>
      <span v-else>Verify Code</span>
    </button>

    <div class="form-options">
      <button
        v-if="showResendButton"
        @click="resendCode"
        :disabled="isResending || attempts >= maxAttempts"
        class="resend-link"
      >
        <span v-if="isResending">Sending...</span>
        <span v-else>Resend Code</span>
      </button>
      <div v-else class="resend-timer">
        Resend available in {{ timer }}s
      </div>
    </div>

    <div v-if="attempts > 0" class="attempts-warning">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ attemptsRemaining }} attempts remaining</span>
    </div>

    <div class="help-section">
      <p><strong>Didn't receive the code?</strong></p>
      <p>Check your spam folder or wait a moment to resend.</p>
    </div>

    <div class="signup-link">
      <p>Need to go back? <a @click="goBack">Return to login</a></p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.verification-form {
  width: 100%;
}

.form-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  .form-description {
    color: var(--color-text-light);
    font-size: 0.95rem;
    margin-bottom: var(--spacing-md);
  }
  
  .email-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: var(--color-background-alt);
    padding: 8px 16px;
    border-radius: var(--border-radius-full);
    font-size: 0.9rem;
    color: var(--color-accent);
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
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
  
  .help-text {
    margin-top: var(--spacing-sm);
    font-size: 0.85rem;
    color: var(--color-text-light);
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
  
  &.code-input {
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 0.3rem;
    font-family: 'SF Mono', Monaco, 'Inconsolata', 'Fira Code', monospace;
    
    &:disabled {
      background-color: var(--color-text-lightest);
      cursor: not-allowed;
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

.form-options {
  text-align: center;
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  
  .resend-link {
    color: var(--color-accent);
    font-size: 0.9rem;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
    
    &:disabled {
      color: var(--color-text-light);
      cursor: not-allowed;
    }
  }
  
  .resend-timer {
    color: var(--color-text-light);
    font-size: 0.9rem;
  }
}

.attempts-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: var(--spacing-md);
  padding: 12px;
  background-color: #fef3c7;
  border-radius: var(--border-radius-md);
  color: #92400e;
  font-size: 0.9rem;
  
  svg {
    flex-shrink: 0;
  }
}

.help-section {
  text-align: center;
  margin-bottom: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-text-lightest);
  
  p {
    font-size: 0.9rem;
    color: var(--color-text-light);
    margin-bottom: var(--spacing-sm);
    
    strong {
      color: var(--color-text-dark);
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
  .form-header h2 {
    font-size: 1.25rem;
  }
  
  .form-input.code-input {
    font-size: 1.25rem;
    letter-spacing: 0.2rem;
  }
}
</style>