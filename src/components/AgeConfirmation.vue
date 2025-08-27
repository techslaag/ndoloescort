<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits<{
  'age-confirmed': []
}>()

const isConfirmed = ref(false)
const isVisible = ref(false)

const confirmAge = () => {
  isConfirmed.value = true
  isVisible.value = false
  // Store confirmation in localStorage
  localStorage.setItem('ageConfirmed', 'true')
  // Emit event to parent
  emit('age-confirmed')
}

const declineAge = () => {
  // Redirect to a safe site or show message
  window.location.href = 'https://www.google.com'
}

onMounted(() => {
  // Check if user has already confirmed their age
  const hasConfirmed = localStorage.getItem('ageConfirmed')
  if (!hasConfirmed) {
    isVisible.value = true
  } else {
    isConfirmed.value = true
    emit('age-confirmed')
  }
})

// Watch for confirmation changes
watch(isConfirmed, (newValue) => {
  if (newValue) {
    emit('age-confirmed')
  }
})

// Expose confirmation status
defineExpose({
  isConfirmed
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="age-confirmation-overlay">
      <div class="age-confirmation-modal">
        <div class="modal-header">
          <div class="header-content">
            <div class="age-icon">🔞</div>
            <h2>Age Verification Required</h2>
          </div>
        </div>
        
        <div class="modal-body">
          <p class="age-message">
            You must be at least <strong>21 years old</strong> to access this website.
          </p>
          <p class="age-disclaimer">
            By clicking "I am 21 or older", you confirm that you meet the age requirement and agree to our Terms of Service.
          </p>
          
          <div class="age-actions">
            <button 
              @click="confirmAge" 
              class="btn btn-primary confirm-btn"
            >
              I am 21 or older
            </button>
            <button 
              @click="declineAge" 
              class="btn btn-secondary decline-btn"
            >
              I am under 21
            </button>
          </div>
        </div>
        
        <div class="modal-footer">
          <small>
            This website contains adult content and is intended for individuals 21 years of age or older.
          </small>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.age-confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--spacing-md);
}

.age-confirmation-modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: var(--spacing-xl);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-content {
  text-align: center;
}

.modal-body {
  padding: var(--spacing-xl);
  text-align: center;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-footer {
  padding: var(--spacing-xl);
  border-top: 1px solid #e5e7eb;
  text-align: center;
  
  small {
    color: #6b7280;
    font-size: 0.8rem;
    line-height: 1.4;
  }
}

.age-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.age-message {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
  
  strong {
    color: #dc2626;
    font-weight: 700;
  }
}

.age-disclaimer {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: var(--spacing-xl);
  line-height: 1.5;
}

.age-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  &.btn-primary {
    background-color: #dc2626;
    color: white;
    
    &:hover {
      background-color: #b91c1c;
    }
  }
  
  &.btn-secondary {
    background-color: #f3f4f6;
    color: #374151;
    
    &:hover {
      background-color: #e5e7eb;
    }
  }
}

@media (max-width: 640px) {
  .age-confirmation-modal {
    max-width: 90%;
    max-height: 95%;
  }
  
  .modal-header {
    padding: var(--spacing-lg);
  }
  
  .modal-body {
    padding: var(--spacing-lg);
  }
  
  h2 {
    font-size: 1.5rem;
  }
  
  .age-icon {
    font-size: 3rem;
  }
  
  .modal-footer {
    padding: var(--spacing-lg);
  }
}
</style> 