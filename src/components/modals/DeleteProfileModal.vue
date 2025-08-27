<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  isOpen: boolean
  profileName: string
  isDeleting?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  isDeleting: false
})

const emit = defineEmits<Emits>()

const confirmationText = ref('')
const requiredText = computed(() => `DELETE ${props.profileName}`)

const canConfirm = computed(() => {
  return confirmationText.value === requiredText.value
})

// Reset confirmation text when modal opens/closes
watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    confirmationText.value = ''
  }
})

const handleConfirm = () => {
  if (canConfirm.value) {
    emit('confirm')
  }
}

const handleClose = () => {
  if (!props.isDeleting) {
    confirmationText.value = ''
    emit('close')
  }
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <div 
    v-if="isOpen"
    class="modal-backdrop"
    @click="handleBackdropClick"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚠️ Delete Profile</h2>
        <button 
          v-if="!isDeleting"
          @click="handleClose" 
          class="close-btn"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      <div class="modal-body">
        <div class="warning-section">
          <div class="warning-icon">🚨</div>
          <div class="warning-content">
            <h3>This action cannot be undone</h3>
            <p>Deleting "<strong>{{ profileName }}</strong>" will permanently remove:</p>
          </div>
        </div>
        
        <ul class="deletion-list">
          <li>👤 Profile information and bio</li>
          <li>📸 All photos and media files (including storage)</li>
          <li>💼 All service listings</li>
          <li>💰 All pricing options</li>
          <li>📅 All calendar events and availability</li>
          <li>📊 All analytics and statistics</li>
          <li>🔗 All related data permanently</li>
        </ul>
        
        <div class="confirmation-section">
          <label for="confirmation-input" class="confirmation-label">
            To confirm deletion, type: <code>{{ requiredText }}</code>
          </label>
          <input
            id="confirmation-input"
            v-model="confirmationText"
            type="text"
            class="confirmation-input"
            :class="{ 'valid': canConfirm }"
            placeholder="Type the confirmation text..."
            :disabled="isDeleting"
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          @click="handleClose" 
          class="btn btn-outline"
          :disabled="isDeleting"
        >
          Cancel
        </button>
        <button 
          @click="handleConfirm"
          class="btn btn-danger"
          :class="{ 'loading': isDeleting }"
          :disabled="!canConfirm || isDeleting"
        >
          <span v-if="isDeleting" class="loading-spinner"></span>
          <span v-if="isDeleting">Deleting...</span>
          <span v-else>🗑️ Delete Profile</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-text-lighter);
  background: white;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  
  h2 {
    margin: 0;
    color: #dc3545;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    
    &:hover {
      background: var(--color-background-alt);
      color: var(--color-text);
    }
  }
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-lighter) var(--color-background-alt);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-background-alt);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-text-lighter);
    border-radius: 3px;
    
    &:hover {
      background: var(--color-text-light);
    }
  }
}

.warning-section {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: rgba(220, 53, 69, 0.1);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(220, 53, 69, 0.2);
  
  .warning-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .warning-content {
    h3 {
      margin: 0 0 var(--spacing-sm) 0;
      color: #dc3545;
      font-size: 1.1rem;
    }
    
    p {
      margin: 0;
      color: var(--color-text);
      line-height: 1.4;
    }
  }
}

.deletion-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-xl) 0;
  
  li {
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    background: var(--color-background-alt);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font-size: 0.9rem;
  }
}

.confirmation-section {
  .confirmation-label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-dark);
    font-weight: 500;
    
    code {
      background: var(--color-background-alt);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #dc3545;
      font-weight: bold;
    }
  }
  
  .confirmation-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 2px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    font-family: monospace;
    transition: border-color 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
    
    &.valid {
      border-color: #28a745;
      background: rgba(40, 167, 69, 0.1);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-text-lighter);
  justify-content: flex-end;
  background: white;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  
  .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--border-radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    &.btn-outline {
      background: transparent;
      border: 1px solid var(--color-text-lighter);
      color: var(--color-text);
      
      &:hover:not(:disabled) {
        background: var(--color-background-alt);
      }
    }
    
    &.btn-danger {
      background: #dc3545;
      color: white;
      
      &:hover:not(:disabled) {
        background: #c82333;
      }
      
      &.loading {
        .loading-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-backdrop {
    padding: 0;
  }
  
  .modal-content {
    max-height: 100vh;
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md);
  }
  
  .warning-section {
    flex-direction: column;
    text-align: center;
    
    .warning-icon {
      font-size: 2.5rem;
      align-self: center;
    }
  }
  
  .modal-footer {
    flex-direction: column;
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>