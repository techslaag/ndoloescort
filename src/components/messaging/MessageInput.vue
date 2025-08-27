<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AutoDeletePeriod } from '../../stores/messaging'

interface Props {
  disabled?: boolean
  autoDeletePeriod: AutoDeletePeriod
}

interface Emits {
  (e: 'send', content: string, type: 'text' | 'image' | 'file'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const messageText = ref('')
const fileInput = ref<HTMLInputElement>()
const isComposing = ref(false)

const canSend = computed(() => {
  return messageText.value.trim().length > 0 && !props.disabled
})

const handleSend = () => {
  if (!canSend.value) return
  
  emit('send', messageText.value.trim(), 'text')
  messageText.value = ''
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !isComposing.value) {
    event.preventDefault()
    handleSend()
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    // In a real implementation, you'd upload the file and send a file message
    // For now, we'll just send a text message indicating a file was shared
    emit('send', `📎 Shared: ${file.name}`, 'file')
    target.value = ''
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const formatAutoDeletePeriod = (period: AutoDeletePeriod): string => {
  switch (period) {
    case 0: return 'Immediately'
    case 5: return '5 min'
    case 60: return '1 hour'
    case 1440: return '1 day'
    case 10080: return '1 week'
    case -1: return 'Never'
    default: return '1 day'
  }
}
</script>

<template>
  <div class="message-input">
    <div class="input-container">
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        accept="image/*,.pdf,.doc,.docx,.txt"
        style="display: none"
      />
      
      <button 
        @click="triggerFileInput"
        class="attachment-btn"
        title="Attach file"
        :disabled="disabled"
      >
        📎
      </button>
      
      <div class="text-input-wrapper">
        <textarea
          v-model="messageText"
          @keypress="handleKeyPress"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          placeholder="Type a message... (Messages are encrypted)"
          class="message-textarea"
          :disabled="disabled"
          rows="1"
        />
        
        <div class="input-footer">
          <span class="encryption-notice">🔒 Encrypted</span>
          <!-- Auto-delete is always "Never" so no need to show it -->
        </div>
      </div>
      
      <button 
        @click="handleSend"
        class="send-btn"
        :class="{ 'can-send': canSend }"
        :disabled="!canSend"
        title="Send message"
      >
        <span v-if="disabled">⏳</span>
        <span v-else>📤</span>
      </button>
    </div>
  </div>
</template>


<style scoped lang="scss">
.message-input {
  padding: var(--spacing-lg);
  background: #40444b;
  border-top: 1px solid #2f3136;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
  max-width: 100%;
}

.attachment-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #36393f;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: #b9bbbe;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  &:hover:not(:disabled) {
    background: #7289da;
    transform: scale(1.05);
    color: white;
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  // Touch device optimizations
  @media (pointer: coarse) {
    min-width: 44px;
    min-height: 44px;
  }
}

.text-input-wrapper {
  flex: 1;
  position: relative;
}

.message-textarea {
  width: 100%;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 12px 30px 12px;
  border: 1px solid #2f3136;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  background: #36393f;
  color: #dcddde;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #7289da;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: #72767d;
  }
  
  // Auto-resize textarea
  &:not(:focus) {
    overflow: hidden;
  }
}

.input-footer {
  position: absolute;
  bottom: 6px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: #72767d;
  pointer-events: none;
}

.encryption-notice {
  display: flex;
  align-items: center;
  gap: 2px;
}

.auto-delete-notice {
  background: rgba(114, 137, 218, 0.1);
  padding: 1px 6px;
  border-radius: 8px;
  white-space: nowrap;
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #36393f;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: #72767d;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  &.can-send {
    background: #5865f2;
    color: white;
    transform: scale(1);
    
    &:hover {
      background: #4752c4;
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    &:active {
      transform: scale(0.95);
      transition: transform 0.1s ease;
    }
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  // Touch device optimizations
  @media (pointer: coarse) {
    min-width: 44px;
    min-height: 44px;
  }
}

// Tablet breakpoint
@media (max-width: 1024px) {
  .message-input {
    padding: var(--spacing-md) var(--spacing-lg);
  }
  
  .attachment-btn,
  .send-btn {
    width: 38px;
    height: 38px;
    font-size: 1.05rem;
  }
  
  .message-textarea {
    font-size: 0.95rem;
    padding: 9px 11px 28px 11px;
  }
  
  .input-footer {
    font-size: 0.68rem;
    bottom: 5px;
    left: 11px;
    right: 11px;
  }
}

// Mobile landscape
@media (max-width: 768px) {
  .message-input {
    padding: var(--spacing-sm) var(--spacing-md);
    position: sticky;
    bottom: 0;
    z-index: 10;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  }
  
  .input-container {
    gap: var(--spacing-xs);
    align-items: center;
  }
  
  .attachment-btn,
  .send-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .text-input-wrapper {
    flex: 1;
    min-width: 0;
  }
  
  .message-textarea {
    padding: 8px 10px 24px 10px;
    font-size: 0.9rem;
    min-height: 36px;
    max-height: 100px;
    border-radius: 18px;
    
    &:focus {
      max-height: 120px;
    }
  }
  
  .input-footer {
    bottom: 3px;
    left: 10px;
    right: 10px;
    font-size: 0.65rem;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }
  
  .encryption-notice {
    order: 1;
  }
  
  .auto-delete-notice {
    order: 2;
    font-size: 0.6rem;
    padding: 0px 4px;
  }
}

// Mobile portrait
@media (max-width: 480px) {
  .message-input {
    padding: var(--spacing-xs) var(--spacing-sm);
    box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.1);
  }
  
  .input-container {
    gap: 6px;
  }
  
  .attachment-btn,
  .send-btn {
    width: 34px;
    height: 34px;
    font-size: 0.95rem;
  }
  
  .message-textarea {
    padding: 7px 9px 22px 9px;
    font-size: 0.85rem;
    min-height: 34px;
    max-height: 85px;
    border-radius: 16px;
    
    &:focus {
      max-height: 100px;
    }
    
    &::placeholder {
      font-size: 0.8rem;
    }
  }
  
  .input-footer {
    bottom: 2px;
    left: 9px;
    right: 9px;
    font-size: 0.6rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  
  .encryption-notice {
    align-self: flex-start;
    font-size: 0.55rem;
  }
  
  .auto-delete-notice {
    align-self: flex-end;
    font-size: 0.55rem;
    padding: 0px 3px;
    border-radius: 6px;
  }
}

// Large screens
@media (min-width: 1200px) {
  .message-input {
    padding: var(--spacing-xl);
  }
  
  .input-container {
    gap: var(--spacing-md);
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .attachment-btn,
  .send-btn {
    width: 44px;
    height: 44px;
    font-size: 1.2rem;
  }
  
  .message-textarea {
    padding: 12px 14px 32px 14px;
    font-size: 1rem;
    min-height: 44px;
    border-radius: 22px;
  }
  
  .input-footer {
    bottom: 8px;
    left: 14px;
    right: 14px;
    font-size: 0.75rem;
  }
  
  .auto-delete-notice {
    padding: 2px 8px;
    font-size: 0.7rem;
  }
}

// Ultra-wide screens
@media (min-width: 1600px) {
  .input-container {
    max-width: 1200px;
  }
}

// Auto-resize textarea behavior
.message-textarea {
  field-sizing: content;
}

// Fallback for browsers that don't support field-sizing
@supports not (field-sizing: content) {
  .message-textarea {
    overflow: hidden;
    resize: none;
  }
}
</style>