<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Test states
const testResults = ref<any[]>([])
const isRunning = ref(false)

// Test credentials
const testEscort = {
  email: 'test.escort@example.com',
  password: 'TestEscort123!',
  name: 'Test Escort'
}

const testClient = {
  email: 'test.client@example.com',
  password: 'TestClient123!',
  name: 'Test Client'
}

// Computed properties
const userInfo = computed(() => {
  if (!authStore.user) return null
  
  const prefs = authStore.user.prefs || {}
  return {
    id: authStore.user.$id,
    name: authStore.user.name,
    email: authStore.user.email,
    userType: (prefs as any).userType || 'unknown',
    isAnonymous: (prefs as any).isAnonymous || false,
    isVerified: (prefs as any).isVerified || false
  }
})

const authStatus = computed(() => {
  return {
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    hasError: !!authStore.error,
    error: authStore.error,
    is2FAEnabled: authStore.is2FAEnabled,
    requiresMFA: authStore.requiresMFA
  }
})

// Test functions
async function addTestResult(test: string, success: boolean, details: string) {
  testResults.value.push({
    test,
    success,
    details,
    timestamp: new Date().toISOString()
  })
}

async function testEscortFlow() {
  isRunning.value = true
  testResults.value = []
  
  try {
    // 1. Test Signup
    addTestResult('Escort Signup', true, 'Starting escort signup test...')
    await authStore.signout()
    
    const signupResult = await authStore.signup(
      testEscort.email,
      testEscort.password,
      testEscort.name,
      'escort'
    )
    
    addTestResult('Escort Signup', signupResult.success, signupResult.error || 'Signup successful')
    
    if (!signupResult.success) {
      // Try to login if user already exists
      const loginResult = await authStore.signin(testEscort.email, testEscort.password)
      addTestResult('Escort Login (fallback)', loginResult.success, loginResult.error || 'Login successful')
    }
    
    // 2. Check user type
    const isEscort = userInfo.value?.userType === 'escort'
    addTestResult('Escort Type Check', isEscort, `User type: ${userInfo.value?.userType}`)
    
    // 3. Test escort-only route access
    try {
      await router.push('/escort/dashboard')
      addTestResult('Escort Dashboard Access', true, 'Successfully navigated to escort dashboard')
    } catch (err) {
      addTestResult('Escort Dashboard Access', false, 'Failed to access escort dashboard')
    }
    
    // 4. Test logout
    await authStore.signout()
    addTestResult('Escort Logout', !authStore.isAuthenticated, 'Logout successful')
    
  } catch (err: any) {
    addTestResult('Escort Flow Error', false, err.message || 'Unknown error')
  } finally {
    isRunning.value = false
  }
}

async function testClientFlow() {
  isRunning.value = true
  testResults.value = []
  
  try {
    // 1. Test Signup
    addTestResult('Client Signup', true, 'Starting client signup test...')
    await authStore.signout()
    
    const signupResult = await authStore.signup(
      testClient.email,
      testClient.password,
      testClient.name,
      'client'
    )
    
    addTestResult('Client Signup', signupResult.success, signupResult.error || 'Signup successful')
    
    if (!signupResult.success) {
      // Try to login if user already exists
      const loginResult = await authStore.signin(testClient.email, testClient.password)
      addTestResult('Client Login (fallback)', loginResult.success, loginResult.error || 'Login successful')
    }
    
    // 2. Check user type
    const isClient = userInfo.value?.userType === 'client'
    addTestResult('Client Type Check', isClient, `User type: ${userInfo.value?.userType}`)
    
    // 3. Test client routes
    try {
      await router.push('/profile')
      addTestResult('Client Profile Access', true, 'Successfully navigated to profile')
    } catch (err) {
      addTestResult('Client Profile Access', false, 'Failed to access profile')
    }
    
    // 4. Test accessing escort routes (should fail)
    try {
      await router.push('/escort/dashboard')
      const currentRoute = router.currentRoute.value.path
      const blocked = currentRoute !== '/escort/dashboard'
      addTestResult('Escort Route Block', blocked, blocked ? 'Correctly blocked from escort routes' : 'ERROR: Accessed escort route as client')
    } catch (err) {
      addTestResult('Escort Route Block', true, 'Correctly blocked from escort routes')
    }
    
    // 5. Test logout
    await authStore.signout()
    addTestResult('Client Logout', !authStore.isAuthenticated, 'Logout successful')
    
  } catch (err: any) {
    addTestResult('Client Flow Error', false, err.message || 'Unknown error')
  } finally {
    isRunning.value = false
  }
}

async function testAnonymousFlow() {
  isRunning.value = true
  testResults.value = []
  
  try {
    // 1. Ensure logged out
    await authStore.signout()
    addTestResult('Anonymous Prep', !authStore.isAuthenticated, 'Starting anonymous test...')
    
    // 2. Navigate to login and click anonymous
    await router.push('/login')
    addTestResult('Anonymous Navigation', true, 'Navigated to login page')
    
    // Note: Actual anonymous login would be triggered from Login component
    // For testing purposes, we'll check route protection
    
    // 3. Test accessing protected routes
    try {
      await router.push('/messages')
      const currentRoute = router.currentRoute.value.path
      const redirected = currentRoute === '/login'
      addTestResult('Protected Route Block', redirected, redirected ? 'Correctly redirected to login' : 'ERROR: Accessed protected route')
    } catch (err) {
      addTestResult('Protected Route Block', true, 'Correctly blocked from protected routes')
    }
    
    // 4. Test public route access
    try {
      await router.push('/escorts')
      addTestResult('Public Route Access', true, 'Successfully accessed public routes')
    } catch (err) {
      addTestResult('Public Route Access', false, 'Failed to access public routes')
    }
    
  } catch (err: any) {
    addTestResult('Anonymous Flow Error', false, err.message || 'Unknown error')
  } finally {
    isRunning.value = false
  }
}

// Clear results
function clearResults() {
  testResults.value = []
}
</script>

<template>
  <div class="auth-test-panel">
    <div class="panel-header">
      <h3>Auth System Test Panel</h3>
      <p>Test authentication flows for different user types</p>
    </div>
    
    <!-- Current Auth Status -->
    <div class="status-section">
      <h4>Current Auth Status</h4>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">Authenticated:</span>
          <span class="value" :class="authStatus.isAuthenticated ? 'success' : 'error'">
            {{ authStatus.isAuthenticated ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Loading:</span>
          <span class="value">{{ authStatus.isLoading ? 'Yes' : 'No' }}</span>
        </div>
        <div class="status-item">
          <span class="label">Has Error:</span>
          <span class="value" :class="authStatus.hasError ? 'error' : 'success'">
            {{ authStatus.hasError ? 'Yes' : 'No' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">2FA Enabled:</span>
          <span class="value">{{ authStatus.is2FAEnabled ? 'Yes' : 'No' }}</span>
        </div>
      </div>
      
      <div v-if="authStatus.hasError" class="error-message">
        Error: {{ authStatus.error }}
      </div>
    </div>
    
    <!-- Current User Info -->
    <div v-if="userInfo" class="user-section">
      <h4>Current User</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">ID:</span>
          <span class="value">{{ userInfo.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">Name:</span>
          <span class="value">{{ userInfo.name || 'N/A' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Email:</span>
          <span class="value">{{ userInfo.email || 'N/A' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Type:</span>
          <span class="value" :class="`type-${userInfo.userType}`">
            {{ userInfo.userType }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">Anonymous:</span>
          <span class="value">{{ userInfo.isAnonymous ? 'Yes' : 'No' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Verified:</span>
          <span class="value">{{ userInfo.isVerified ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </div>
    
    <!-- Test Actions -->
    <div class="actions-section">
      <h4>Test Actions</h4>
      <div class="action-buttons">
        <button 
          @click="testEscortFlow" 
          :disabled="isRunning"
          class="btn btn-escort"
        >
          Test Escort Flow
        </button>
        <button 
          @click="testClientFlow" 
          :disabled="isRunning"
          class="btn btn-client"
        >
          Test Client Flow
        </button>
        <button 
          @click="testAnonymousFlow" 
          :disabled="isRunning"
          class="btn btn-anonymous"
        >
          Test Anonymous Flow
        </button>
        <button 
          @click="clearResults" 
          :disabled="isRunning"
          class="btn btn-clear"
        >
          Clear Results
        </button>
      </div>
    </div>
    
    <!-- Test Results -->
    <div v-if="testResults.length > 0" class="results-section">
      <h4>Test Results</h4>
      <div class="results-list">
        <div 
          v-for="(result, index) in testResults" 
          :key="index"
          class="result-item"
          :class="result.success ? 'success' : 'error'"
        >
          <div class="result-header">
            <span class="result-test">{{ result.test }}</span>
            <span class="result-status">
              {{ result.success ? '✓' : '✗' }}
            </span>
          </div>
          <div class="result-details">{{ result.details }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-test-panel {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.panel-header {
  margin-bottom: 2rem;
  
  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-dark);
  }
  
  p {
    margin: 0;
    color: var(--color-text-light);
  }
}

.status-section,
.user-section,
.actions-section,
.results-section {
  margin-bottom: 2rem;
  
  h4 {
    margin: 0 0 1rem 0;
    color: var(--color-text-dark);
    font-size: 1.1rem;
  }
}

.status-grid,
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-item,
.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .label {
    font-weight: 500;
    color: var(--color-text);
  }
  
  .value {
    font-weight: 600;
    
    &.success { color: #22c55e; }
    &.error { color: #ef4444; }
    &.type-escort { color: var(--color-accent); }
    &.type-client { color: #3b82f6; }
  }
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-md);
  margin-top: 1rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.btn-escort {
    background: var(--color-accent);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--color-accent-dark);
    }
  }
  
  &.btn-client {
    background: #3b82f6;
    color: white;
    
    &:hover:not(:disabled) {
      background: #2563eb;
    }
  }
  
  &.btn-anonymous {
    background: #6b7280;
    color: white;
    
    &:hover:not(:disabled) {
      background: #4b5563;
    }
  }
  
  &.btn-clear {
    background: #e5e7eb;
    color: #374151;
    
    &:hover:not(:disabled) {
      background: #d1d5db;
    }
  }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-item {
  border: 1px solid #e5e7eb;
  border-radius: var(--border-radius-md);
  padding: 1rem;
  
  &.success {
    background: #f0fdf4;
    border-color: #22c55e;
  }
  
  &.error {
    background: #fef2f2;
    border-color: #ef4444;
  }
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  .result-test {
    font-weight: 600;
    color: var(--color-text-dark);
  }
  
  .result-status {
    font-size: 1.25rem;
    font-weight: bold;
    
    .success & { color: #22c55e; }
    .error & { color: #ef4444; }
  }
}

.result-details {
  color: var(--color-text);
  font-size: 0.9rem;
}
</style>