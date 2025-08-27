<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProfileStore } from '../../stores/profile'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()
const authStore = useAuthStore()

// Get profile ID from route params
const profileId = computed(() => route.params.profileId as string)

// Verification state
const isUploading = ref(false)
const uploadProgress = ref(0)
const idFile = ref<File | null>(null)
const selfieFile = ref<File | null>(null)
const verificationStep = ref<'intro' | 'id' | 'selfie' | 'processing' | 'complete'>('intro')
const errorMessage = ref('')

// Get current profile
const currentProfile = computed(() => 
  profileStore.profiles.find(p => p.id === profileId.value || (p as any).$id === profileId.value)
)

const isVerified = computed(() => currentProfile.value?.verification?.isVerified || false)

onMounted(() => {
  // Redirect if already verified
  if (isVerified.value) {
    router.push('/escort/profiles')
  }
  
  // Load profiles if not loaded
  if (profileStore.profiles.length === 0 && authStore.user) {
    profileStore.fetchUserProfiles(authStore.user.$id)
  }
})

const handleFileSelect = (event: Event, type: 'id' | 'selfie') => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Please upload a valid image file (JPEG, PNG, or WebP)'
    return
  }
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'File size must be less than 10MB'
    return
  }
  
  errorMessage.value = ''
  
  if (type === 'id') {
    idFile.value = file
  } else {
    selfieFile.value = file
  }
}

const proceedToIdUpload = () => {
  verificationStep.value = 'id'
}

const proceedToSelfie = () => {
  if (!idFile.value) {
    errorMessage.value = 'Please upload your ID first'
    return
  }
  verificationStep.value = 'selfie'
}

const goBack = () => {
  if (verificationStep.value === 'selfie') {
    verificationStep.value = 'id'
  } else if (verificationStep.value === 'id') {
    verificationStep.value = 'intro'
  }
}

const submitVerification = async () => {
  if (!idFile.value || !selfieFile.value) {
    errorMessage.value = 'Please upload both ID and selfie'
    return
  }
  
  try {
    isUploading.value = true
    uploadProgress.value = 0
    verificationStep.value = 'processing'
    
    // Create form data
    const formData = new FormData()
    formData.append('idDocument', idFile.value)
    formData.append('selfie', selfieFile.value)
    formData.append('profileId', profileId.value)
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 90) {
        clearInterval(progressInterval)
      }
    }, 200)
    
    // Upload verification documents
    await profileStore.submitVerification(profileId.value, formData)
    
    clearInterval(progressInterval)
    uploadProgress.value = 100
    
    // Update profile verification status
    await profileStore.updateProfile(profileId.value, {
      verification: {
        isVerified: false, // Will be true after admin review
        idVerified: true,
        photoVerified: true,
        verifiedAt: new Date().toISOString()
      }
    })
    
    verificationStep.value = 'complete'
    
    // Redirect after 3 seconds
    setTimeout(() => {
      router.push('/escort/profiles')
    }, 3000)
    
  } catch (error) {
    console.error('Verification submission failed:', error)
    errorMessage.value = 'Failed to submit verification. Please try again.'
    verificationStep.value = 'selfie'
  } finally {
    isUploading.value = false
  }
}

const cancelVerification = () => {
  if (confirm('Are you sure you want to cancel the verification process?')) {
    router.push('/escort/profiles')
  }
}
</script>

<template>
  <div class="verification-page">
    <!-- Header -->
    <header class="verification-header">
      <div class="header-container">
        <button @click="router.push('/escort/profiles')" class="back-btn">
          <span class="back-icon">←</span>
          Back to Profiles
        </button>
        
        <div class="header-center">
          <h1 class="header-title">
            <span v-if="verificationStep === 'intro'">Profile Verification</span>
            <span v-else-if="verificationStep === 'id'">Step 1 of 2: Upload ID</span>
            <span v-else-if="verificationStep === 'selfie'">Step 2 of 2: Take Selfie</span>
            <span v-else-if="verificationStep === 'processing'">Processing Verification</span>
            <span v-else-if="verificationStep === 'complete'">Verification Complete</span>
          </h1>
          
          <!-- Progress indicator -->
          <div v-if="verificationStep === 'id' || verificationStep === 'selfie'" class="progress-indicator">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: verificationStep === 'id' ? '50%' : '100%' }"></div>
            </div>
          </div>
        </div>
        
        <div class="header-actions">
          <button @click="cancelVerification" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="verification-content">
      <div class="content-container">
        <!-- Intro Step -->
        <div v-if="verificationStep === 'intro'" class="verification-step intro-step">
          <div class="step-icon">🛡️</div>
          <h2>Get Your Profile Verified</h2>
          <p class="step-description">
            Stand out from the crowd with a verified badge. Build trust with clients 
            and unlock premium features by completing our quick verification process.
          </p>
          
          <div class="benefits-grid">
            <div class="benefit-card">
              <div class="benefit-icon">✅</div>
              <h3>Build Trust</h3>
              <p>Clients prefer verified profiles for safety and authenticity</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon">🌟</div>
              <h3>Get Priority</h3>
              <p>Appear higher in search results and get more visibility</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon">💎</div>
              <h3>Premium Badge</h3>
              <p>Display an exclusive verified badge on your profile</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon">🚀</div>
              <h3>More Bookings</h3>
              <p>Verified profiles receive 3x more booking requests</p>
            </div>
          </div>
          
          <div class="requirements-card">
            <h3>What You'll Need</h3>
            <ul class="requirements-list">
              <li>
                <span class="req-icon">📄</span>
                <span>A valid government-issued photo ID (driver's license, passport, or national ID)</span>
              </li>
              <li>
                <span class="req-icon">🤳</span>
                <span>A clear selfie showing your face (for identity verification)</span>
              </li>
              <li>
                <span class="req-icon">⏱️</span>
                <span>About 5 minutes to complete the process</span>
              </li>
            </ul>
          </div>
          
          <div class="action-buttons">
            <button @click="proceedToIdUpload" class="btn btn-primary btn-large">
              Start Verification
            </button>
            <button @click="router.push('/escort/profiles')" class="btn btn-secondary">
              Maybe Later
            </button>
          </div>
        </div>
        
        <!-- ID Upload Step -->
        <div v-if="verificationStep === 'id'" class="verification-step id-step">
          <h2>Upload Your Government ID</h2>
          <p class="step-description">
            Take a clear photo of your government-issued ID. Make sure all text is readable 
            and the entire document is visible.
          </p>
          
          <div class="upload-section">
            <div class="upload-area">
              <input 
                type="file" 
                id="id-upload" 
                @change="(e) => handleFileSelect(e, 'id')"
                accept="image/*"
                class="file-input"
              >
              <label for="id-upload" class="upload-label" :class="{ 'has-file': idFile }">
                <div v-if="!idFile" class="upload-prompt">
                  <div class="upload-icon">📷</div>
                  <h3>Upload ID Photo</h3>
                  <p>Click to upload or drag and drop</p>
                  <span class="file-types">JPEG, PNG, or WebP • Max 10MB</span>
                </div>
                <div v-else class="file-preview">
                  <div class="file-icon">✅</div>
                  <h3>{{ idFile.name }}</h3>
                  <p>Click to replace</p>
                </div>
              </label>
            </div>
            
            <div class="upload-tips">
              <h4>Tips for a good photo:</h4>
              <ul>
                <li>Place ID on a flat surface</li>
                <li>Ensure good lighting (no glare)</li>
                <li>Include all four corners</li>
                <li>Make sure text is readable</li>
              </ul>
            </div>
          </div>
          
          <div class="privacy-notice">
            <div class="notice-icon">🔒</div>
            <div class="notice-content">
              <h4>Your Privacy is Protected</h4>
              <p>Your ID is encrypted and stored securely. It's only used for verification and will never be shared with anyone.</p>
            </div>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ errorMessage }}
          </div>
          
          <div class="action-buttons">
            <button @click="goBack" class="btn btn-secondary">
              Back
            </button>
            <button 
              @click="proceedToSelfie" 
              :disabled="!idFile"
              class="btn btn-primary"
            >
              Continue
            </button>
          </div>
        </div>
        
        <!-- Selfie Upload Step -->
        <div v-if="verificationStep === 'selfie'" class="verification-step selfie-step">
          <h2>Take a Selfie</h2>
          <p class="step-description">
            Now we need a clear selfie to match with your ID. This helps us verify 
            that you are the person in the ID document.
          </p>
          
          <div class="upload-section">
            <div class="upload-area">
              <input 
                type="file" 
                id="selfie-upload" 
                @change="(e) => handleFileSelect(e, 'selfie')"
                accept="image/*"
                capture="user"
                class="file-input"
              >
              <label for="selfie-upload" class="upload-label" :class="{ 'has-file': selfieFile }">
                <div v-if="!selfieFile" class="upload-prompt">
                  <div class="upload-icon">🤳</div>
                  <h3>Take a Selfie</h3>
                  <p>Click to use camera or upload</p>
                  <span class="file-types">Make sure your face is clearly visible</span>
                </div>
                <div v-else class="file-preview">
                  <div class="file-icon">✅</div>
                  <h3>{{ selfieFile.name }}</h3>
                  <p>Click to retake</p>
                </div>
              </label>
            </div>
            
            <div class="upload-tips">
              <h4>Selfie requirements:</h4>
              <ul>
                <li>Face the camera directly</li>
                <li>Good lighting on your face</li>
                <li>Neutral expression</li>
                <li>No sunglasses or face coverings</li>
                <li>Plain background preferred</li>
              </ul>
            </div>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ errorMessage }}
          </div>
          
          <div class="action-buttons">
            <button @click="goBack" class="btn btn-secondary">
              Back
            </button>
            <button 
              @click="submitVerification" 
              :disabled="!selfieFile || isUploading"
              class="btn btn-primary"
            >
              Submit for Verification
            </button>
          </div>
        </div>
        
        <!-- Processing Step -->
        <div v-if="verificationStep === 'processing'" class="verification-step processing-step">
          <div class="processing-animation">
            <div class="spinner"></div>
          </div>
          <h2>Processing Your Verification</h2>
          <p class="step-description">
            Please wait while we securely upload and process your documents. 
            This usually takes just a moment...
          </p>
          <div class="progress-container">
            <div class="progress-bar large">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}%</span>
          </div>
          <p class="processing-note">
            Please don't close this page while we process your verification.
          </p>
        </div>
        
        <!-- Complete Step -->
        <div v-if="verificationStep === 'complete'" class="verification-step complete-step">
          <div class="success-animation">
            <div class="success-icon">✅</div>
          </div>
          <h2>Verification Submitted Successfully!</h2>
          <p class="step-description">
            Thank you for completing the verification process. Our team will review 
            your documents within 24-48 hours.
          </p>
          
          <div class="success-info">
            <div class="info-item">
              <span class="info-icon">📧</span>
              <span>You'll receive an email once your verification is complete</span>
            </div>
            <div class="info-item">
              <span class="info-icon">🛡️</span>
              <span>Your verified badge will appear automatically on your profile</span>
            </div>
            <div class="info-item">
              <span class="info-icon">🎉</span>
              <span>Get ready for increased visibility and more bookings!</span>
            </div>
          </div>
          
          <p class="redirect-note">
            Redirecting to your profiles in 3 seconds...
          </p>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="verification-footer">
      <div class="footer-container">
        <div class="security-badge">
          <span class="lock-icon">🔒</span>
          <span>Bank-level encryption • Your data is secure and private</span>
        </div>
        <div class="support-link">
          <a href="/support">Need help? Contact support</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.verification-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

// Header
.verification-header {
  background: white;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  
  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
  }
  
  .back-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    color: var(--color-text);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    
    .back-icon {
      font-size: 1.2rem;
    }
  }
  
  .header-center {
    flex: 1;
    text-align: center;
    
    .header-title {
      margin: 0;
      font-size: 1.5rem;
      color: var(--color-text-dark);
    }
    
    .progress-indicator {
      margin-top: var(--spacing-sm);
      
      .progress-bar {
        max-width: 300px;
        height: 4px;
        background: var(--color-background-alt);
        border-radius: 2px;
        margin: 0 auto;
        overflow: hidden;
        
        .progress-fill {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.3s ease;
        }
      }
    }
  }
  
  .cancel-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background: none;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    font-weight: 500;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--color-danger);
    }
  }
}

// Main Content
.verification-content {
  flex: 1;
  padding: var(--spacing-xxl) var(--spacing-lg);
  
  .content-container {
    max-width: 800px;
    margin: 0 auto;
  }
}

// Verification Steps
.verification-step {
  animation: fadeIn 0.3s ease;
  
  .step-icon {
    font-size: 5rem;
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }
  
  h2 {
    text-align: center;
    margin-bottom: var(--spacing-md);
    font-size: 2rem;
    color: var(--color-text-dark);
  }
  
  .step-description {
    text-align: center;
    color: var(--color-text-light);
    font-size: 1.1rem;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto var(--spacing-xl);
  }
}

// Intro Step
.intro-step {
  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    
    .benefit-card {
      background: white;
      padding: var(--spacing-lg);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      
      .benefit-icon {
        font-size: 2.5rem;
        margin-bottom: var(--spacing-md);
      }
      
      h3 {
        margin-bottom: var(--spacing-sm);
        color: var(--color-text-dark);
      }
      
      p {
        color: var(--color-text-light);
        font-size: 0.95rem;
      }
    }
  }
  
  .requirements-card {
    background: var(--color-info-light);
    padding: var(--spacing-xl);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-xl);
    
    h3 {
      margin-bottom: var(--spacing-md);
      color: var(--color-text-dark);
    }
    
    .requirements-list {
      list-style: none;
      padding: 0;
      margin: 0;
      
      li {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .req-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        span:last-child {
          color: var(--color-text);
          line-height: 1.5;
        }
      }
    }
  }
}

// Upload Steps
.upload-section {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.upload-area {
  .file-input {
    display: none;
  }
  
  .upload-label {
    display: block;
    background: white;
    border: 2px dashed var(--color-border);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-xxl);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
    
    &.has-file {
      border-style: solid;
      border-color: var(--color-success);
      background: var(--color-success-light);
    }
    
    .upload-prompt,
    .file-preview {
      .upload-icon,
      .file-icon {
        font-size: 3rem;
        margin-bottom: var(--spacing-md);
      }
      
      h3 {
        margin-bottom: var(--spacing-sm);
        color: var(--color-text-dark);
      }
      
      p {
        color: var(--color-text-light);
        margin-bottom: var(--spacing-sm);
      }
      
      .file-types {
        font-size: 0.85rem;
        color: var(--color-text-lighter);
      }
    }
  }
}

.upload-tips {
  background: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  
  h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-dark);
  }
  
  ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    
    li {
      color: var(--color-text-light);
      margin-bottom: var(--spacing-xs);
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.privacy-notice {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-info-light);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-xl);
  
  .notice-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .notice-content {
    h4 {
      margin-bottom: var(--spacing-xs);
      color: var(--color-text-dark);
    }
    
    p {
      margin: 0;
      color: var(--color-text);
    }
  }
}

// Processing Step
.processing-step {
  text-align: center;
  
  .processing-animation {
    margin-bottom: var(--spacing-xl);
    
    .spinner {
      width: 80px;
      height: 80px;
      border: 4px solid var(--color-background-alt);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      margin: 0 auto;
      animation: spin 1s linear infinite;
    }
  }
  
  .progress-container {
    max-width: 400px;
    margin: 0 auto var(--spacing-xl);
    
    .progress-bar.large {
      height: 8px;
      background: var(--color-background-alt);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: var(--spacing-sm);
      
      .progress-fill {
        height: 100%;
        background: var(--color-primary);
        transition: width 0.3s ease;
      }
    }
    
    .progress-text {
      color: var(--color-text-light);
      font-weight: 500;
    }
  }
  
  .processing-note {
    color: var(--color-text-lighter);
    font-size: 0.95rem;
  }
}

// Complete Step
.complete-step {
  text-align: center;
  
  .success-animation {
    margin-bottom: var(--spacing-xl);
    
    .success-icon {
      font-size: 5rem;
      animation: scaleIn 0.5s ease;
    }
  }
  
  .success-info {
    background: var(--color-success-light);
    padding: var(--spacing-xl);
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-xl);
    
    .info-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .info-icon {
        font-size: 1.5rem;
      }
      
      span:last-child {
        color: var(--color-text);
      }
    }
  }
  
  .redirect-note {
    color: var(--color-text-lighter);
    font-style: italic;
  }
}

// Action Buttons
.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-xl);
  
  .btn {
    padding: var(--spacing-md) var(--spacing-xl);
    border: none;
    border-radius: var(--border-radius-md);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.btn-primary {
      background: var(--color-primary);
      color: white;
      
      &:hover:not(:disabled) {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    &.btn-secondary {
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border);
      
      &:hover {
        background: var(--color-background-alt);
        border-color: var(--color-text-light);
      }
    }
    
    &.btn-large {
      padding: var(--spacing-lg) var(--spacing-xxl);
      font-size: 1.1rem;
    }
  }
}

// Error Message
.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-danger-light);
  color: var(--color-danger);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  
  .error-icon {
    font-size: 1.2rem;
  }
}

// Footer
.verification-footer {
  background: var(--color-background-alt);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-lg);
  
  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    
    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
    }
  }
  
  .security-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-text-light);
    font-size: 0.95rem;
    
    .lock-icon {
      font-size: 1.2rem;
    }
  }
  
  .support-link {
    a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

// Mobile Responsiveness
@media (max-width: 768px) {
  .verification-header {
    .header-container {
      padding: var(--spacing-md);
      
      .header-title {
        font-size: 1.2rem;
      }
      
      .back-btn span:not(.back-icon) {
        display: none;
      }
    }
  }
  
  .verification-content {
    padding: var(--spacing-lg);
  }
  
  .intro-step {
    .benefits-grid {
      gap: var(--spacing-md);
    }
  }
  
  .action-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>