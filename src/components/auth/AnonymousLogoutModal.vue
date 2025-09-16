<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isVisible = ref(false)

const open = () => {
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
}

const handleConfirm = () => {
  emit('confirm')
  close()
}

const handleCancel = () => {
  emit('cancel')
  close()
}

defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="modal-overlay" @click="handleCancel">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>⚠️ Warning: Anonymous Session</h3>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                stroke="#EF4444" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"/>
            </svg>
          </div>
          
          <p class="warning-message">
            You're currently using an <strong>anonymous account</strong>. 
            If you logout now:
          </p>
          
          <ul class="consequences-list">
            <li>❌ Your session <strong>cannot be recovered</strong></li>
            <li>❌ All your conversations will be <strong>permanently lost</strong></li>
            <li>❌ Your preferences and settings will be <strong>deleted</strong></li>
            <li>❌ You won't be able to access this account again</li>
          </ul>
          
          <div class="recommendation">
            <p>
              <strong>Recommended:</strong> Create a free account to save your data before logging out.
            </p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="handleCancel" class="btn-secondary">
            Cancel
          </button>
          <button @click="handleConfirm" class="btn-danger">
            Logout Anyway
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;
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

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.modal-body {
  padding: 1.5rem;
  
  .warning-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
    
    svg {
      animation: pulse 2s infinite;
    }
  }
  
  .warning-message {
    text-align: center;
    color: #374151;
    margin-bottom: 1.5rem;
    font-size: 1rem;
    line-height: 1.6;
    
    strong {
      color: #dc2626;
      font-weight: 600;
    }
  }
  
  .consequences-list {
    background: #fef2f2;
    border: 1px solid #fee2e2;
    border-radius: 8px;
    padding: 1rem;
    margin: 0 0 1.5rem 0;
    list-style: none;
    
    li {
      color: #991b1b;
      padding: 0.5rem 0;
      font-size: 0.95rem;
      line-height: 1.5;
      
      strong {
        color: #dc2626;
      }
    }
  }
  
  .recommendation {
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 1rem;
    
    p {
      margin: 0;
      color: #1e40af;
      font-size: 0.95rem;
      line-height: 1.5;
      
      strong {
        color: #1d4ed8;
      }
    }
  }
}

.modal-actions {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  
  button {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    
    &.btn-secondary {
      background: #f3f4f6;
      color: #374151;
      
      &:hover {
        background: #e5e7eb;
      }
    }
    
    &.btn-danger {
      background: #dc2626;
      color: white;
      
      &:hover {
        background: #b91c1c;
      }
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-header {
    padding: 1.25rem;
    
    h3 {
      font-size: 1.125rem;
    }
  }
  
  .modal-body {
    padding: 1.25rem;
    
    .warning-icon svg {
      width: 60px;
      height: 60px;
    }
  }
  
  .modal-actions {
    padding: 1.25rem;
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }
}
</style>