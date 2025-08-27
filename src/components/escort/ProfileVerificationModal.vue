<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProfileStore } from '../../stores/profile'

interface Props {
  profileId: string
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'close': []
  'verification-complete': []
}>()

const profileStore = useProfileStore()

const isUploading = ref(false)
const uploadProgress = ref(0)
const idFile = ref<File | null>(null)
const selfieFile = ref<File | null>(null)
const verificationStep = ref<'intro' | 'id' | 'selfie' | 'processing' | 'complete'>('intro')
const errorMessage = ref('')

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
    formData.append('profileId', props.profileId)
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 90) {
        clearInterval(progressInterval)
      }
    }, 200)
    
    // Upload verification documents
    await profileStore.submitVerification(props.profileId, formData)
    
    clearInterval(progressInterval)
    uploadProgress.value = 100
    
    // Update profile verification status
    await profileStore.updateProfile(props.profileId, {
      verification: {
        isVerified: false, // Will be true after admin review
        idVerified: true,
        photoVerified: true,
        verifiedAt: new Date().toISOString()
      }
    })
    
    verificationStep.value = 'complete'
    
    setTimeout(() => {
      emit('verification-complete')
      closeModal()
    }, 3000)
    
  } catch (error) {
    console.error('Verification submission failed:', error)
    errorMessage.value = 'Failed to submit verification. Please try again.'
    verificationStep.value = 'selfie'
  } finally {
    isUploading.value = false
  }
}

const closeModal = () => {
  emit('close')
  // Reset state
  verificationStep.value = 'intro'
  idFile.value = null
  selfieFile.value = null
  uploadProgress.value = 0
  errorMessage.value = ''
}
</script>

<template>
  <!-- Verification Modal -->
  <div v-if="show" class="verification-modal" @click.self="closeModal">
    <div class="modal-content">
      <!-- Fixed Header -->
      <div class="modal-header">
        <div class="header-content">
          <h2 class="modal-title">
            <span v-if="verificationStep === 'intro'">Profile Verification</span>
            <span v-else-if="verificationStep === 'id'">Step 1: Upload ID</span>
            <span v-else-if="verificationStep === 'selfie'">Step 2: Take Selfie</span>
            <span v-else-if="verificationStep === 'processing'">Processing</span>
            <span v-else-if="verificationStep === 'complete'">Complete!</span>
          </h2>
          <div v-if="verificationStep === 'id' || verificationStep === 'selfie'" class="header-progress">
            <div class="progress-dots">
              <div :class="['dot', { active: verificationStep === 'id', completed: verificationStep === 'selfie' }]"></div>
              <div :class="['dot', { active: verificationStep === 'selfie' }]"></div>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <!-- Scrollable Content -->
      <div class="modal-body">
      
      <!-- Intro Step -->
      <div v-if="verificationStep === 'intro'" class="verification-step">
        <div class="step-icon">🛡️</div>
        <h2>Get Your Profile Verified</h2>
        <p class="step-description">
          Verified profiles get a special badge and are more trusted by clients.
          The verification process is quick and secure.
        </p>
        
        <div class="benefits">
          <div class="benefit">
            <span class="benefit-icon">✅</span>
            <span>Increased trust and credibility</span>
          </div>
          <div class="benefit">
            <span class="benefit-icon">🌟</span>
            <span>Priority in search results</span>
          </div>
          <div class="benefit">
            <span class="benefit-icon">💎</span>
            <span>Exclusive verified badge</span>
          </div>
        </div>
        
        <div class="requirements">
          <h3>What you'll need:</h3>
          <ul>
            <li>A valid government-issued ID</li>
            <li>A clear selfie for verification</li>
            <li>5 minutes of your time</li>
          </ul>
        </div>
        
        <button @click="proceedToIdUpload" class="btn btn-primary">
          Start Verification
        </button>
      </div>
      
      <!-- ID Upload Step -->
      <div v-if="verificationStep === 'id'" class="verification-step">
        <div class="step-indicator">
          <div class="step active">1</div>
          <div class="step-line"></div>
          <div class="step">2</div>
        </div>
        
        <h2>Upload Your ID</h2>
        <p class="step-description">
          Please upload a clear photo of your government-issued ID.
          This can be a driver's license, passport, or national ID card.
        </p>
        
        <div class="upload-area">
          <input 
            type="file" 
            id="id-upload" 
            @change="(e) => handleFileSelect(e, 'id')"
            accept="image/*"
            style="display: none"
          >
          <label for="id-upload" class="upload-label">
            <div v-if="!idFile" class="upload-prompt">
              <span class="upload-icon">📄</span>
              <span>Click to upload ID</span>
              <span class="upload-hint">JPEG, PNG or WebP • Max 10MB</span>
            </div>
            <div v-else class="upload-preview">
              <span class="file-icon">✅</span>
              <span class="file-name">{{ idFile.name }}</span>
              <span class="change-file">Click to change</span>
            </div>
          </label>
        </div>
        
        <div class="privacy-notice">
          <span class="privacy-icon">🔒</span>
          <span>Your ID is encrypted and stored securely. It will never be shared with anyone.</span>
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          @click="proceedToSelfie" 
          :disabled="!idFile"
          class="btn btn-primary"
        >
          Continue
        </button>
      </div>
      
      <!-- Selfie Upload Step -->
      <div v-if="verificationStep === 'selfie'" class="verification-step">
        <div class="step-indicator">
          <div class="step completed">✓</div>
          <div class="step-line active"></div>
          <div class="step active">2</div>
        </div>
        
        <h2>Take a Selfie</h2>
        <p class="step-description">
          Please upload a clear selfie of yourself. Make sure your face is clearly visible
          and matches the photo on your ID.
        </p>
        
        <div class="upload-area">
          <input 
            type="file" 
            id="selfie-upload" 
            @change="(e) => handleFileSelect(e, 'selfie')"
            accept="image/*"
            capture="user"
            style="display: none"
          >
          <label for="selfie-upload" class="upload-label">
            <div v-if="!selfieFile" class="upload-prompt">
              <span class="upload-icon">🤳</span>
              <span>Click to take selfie</span>
              <span class="upload-hint">Make sure your face is clearly visible</span>
            </div>
            <div v-else class="upload-preview">
              <span class="file-icon">✅</span>
              <span class="file-name">{{ selfieFile.name }}</span>
              <span class="change-file">Click to retake</span>
            </div>
          </label>
        </div>
        
        <div class="selfie-tips">
          <h4>Tips for a good selfie:</h4>
          <ul>
            <li>Good lighting on your face</li>
            <li>Plain background</li>
            <li>No sunglasses or face coverings</li>
            <li>Look directly at the camera</li>
          </ul>
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          @click="submitVerification" 
          :disabled="!selfieFile || isUploading"
          class="btn btn-primary"
        >
          Submit Verification
        </button>
      </div>
      
      <!-- Processing Step -->
      <div v-if="verificationStep === 'processing'" class="verification-step">
        <div class="processing-animation">
          <div class="spinner"></div>
        </div>
        <h2>Processing Your Verification</h2>
        <p class="step-description">
          Please wait while we securely upload and process your documents...
        </p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
      
      <!-- Complete Step -->
      <div v-if="verificationStep === 'complete'" class="verification-step">
        <div class="success-icon">✅</div>
        <h2>Verification Submitted!</h2>
        <p class="step-description">
          Your verification documents have been submitted successfully.
          We'll review them within 24-48 hours and update your profile.
        </p>
        <p class="success-note">
          You'll receive a notification once your verification is complete.
        </p>
      </div>
      </div>
      
      <!-- Fixed Footer -->
      <div class="modal-footer">
        <div class="footer-content">
          <span class="security-note">
            <span class="lock-icon">🔒</span>
            Your documents are encrypted and stored securely
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.verification-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-xl);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
  
  .header-content {
    flex: 1;
    
    .modal-title {
      margin: 0;
      font-size: 1.5rem;
      color: var(--color-text-dark);
    }
    
    .header-progress {
      margin-top: var(--spacing-xs);
      
      .progress-dots {
        display: flex;
        gap: var(--spacing-sm);
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-text-lighter);
          transition: all 0.3s ease;
          
          &.active {
            background: var(--color-primary);
            transform: scale(1.2);
          }
          
          &.completed {
            background: var(--color-success);
          }
        }
      }
    }
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-text-light);
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-full);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
      color: var(--color-text-dark);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-background-alt);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-text-lighter);
    border-radius: 4px;
    
    &:hover {
      background: var(--color-text-light);
    }
  }
}

.modal-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  background: var(--color-background-alt);
  flex-shrink: 0;
  
  .footer-content {
    display: flex;
    align-items: center;
    justify-content: center;
    
    .security-note {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 0.85rem;
      color: var(--color-text-light);
      
      .lock-icon {
        font-size: 1rem;
      }
    }
  }
}

.verification-step {
  padding: var(--spacing-xl);
  text-align: center;
  
  .step-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
  }
  
  h2 {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-dark);
  }
  
  .step-description {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
    line-height: 1.6;
  }
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-xl);
  
  .step {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-background-alt);
    border: 2px solid var(--color-text-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--color-text-light);
    transition: all 0.3s ease;
    
    &.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }
    
    &.completed {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }
  }
  
  .step-line {
    width: 60px;
    height: 2px;
    background: var(--color-text-lighter);
    transition: all 0.3s ease;
    
    &.active {
      background: var(--color-primary);
    }
  }
}

.benefits {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  text-align: left;
  
  .benefit {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-md);
    
    .benefit-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
  }
}

.requirements {
  text-align: left;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  h3 {
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-dark);
  }
  
  ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--color-text-light);
    
    li {
      margin-bottom: var(--spacing-xs);
    }
  }
}

.upload-area {
  margin-bottom: var(--spacing-lg);
}

.upload-label {
  display: block;
  cursor: pointer;
  
  .upload-prompt,
  .upload-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    border: 2px dashed var(--color-text-lighter);
    border-radius: var(--border-radius-lg);
    background: var(--color-background-alt);
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
  }
  
  .upload-icon,
  .file-icon {
    font-size: 3rem;
  }
  
  .upload-hint,
  .change-file {
    font-size: 0.85rem;
    color: var(--color-text-light);
  }
  
  .file-name {
    font-weight: 500;
    color: var(--color-text-dark);
  }
}

.privacy-notice {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-info-light);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  font-size: 0.9rem;
  color: var(--color-info-dark);
  
  .privacy-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }
}

.selfie-tips {
  text-align: left;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  h4 {
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-dark);
    font-size: 0.9rem;
  }
  
  ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    font-size: 0.85rem;
    color: var(--color-text-light);
    
    li {
      margin-bottom: var(--spacing-xs);
    }
  }
}

.error-message {
  color: var(--color-danger);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--color-danger-light);
  border-radius: var(--border-radius-sm);
}

.processing-animation {
  margin-bottom: var(--spacing-lg);
  
  .spinner {
    width: 60px;
    height: 60px;
    border: 3px solid var(--color-background-alt);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    margin: 0 auto;
    animation: spin 1s linear infinite;
  }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-background-alt);
  border-radius: var(--border-radius-full);
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
  font-size: 0.9rem;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  animation: scaleIn 0.5s ease;
}

.success-note {
  color: var(--color-success);
  font-weight: 500;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
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
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
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

// Mobile optimizations
@media (max-width: 600px) {
  .verification-modal {
    padding: 0;
  }
  
  .modal-content {
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
    max-width: 100%;
  }
  
  .modal-header {
    padding: var(--spacing-md);
    
    .modal-title {
      font-size: 1.25rem;
    }
  }
  
  .modal-footer {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  
  .verification-step {
    padding: var(--spacing-lg);
  }
  
  .step-icon,
  .success-icon {
    font-size: 3rem;
  }
  
  .benefits {
    font-size: 0.9rem;
  }
}
</style>