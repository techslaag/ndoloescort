<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  receiverName: string
  callType?: 'voice' | 'video'
}

interface Emits {
  (e: 'end-call'): void
}

const props = withDefaults(defineProps<Props>(), {
  callType: 'voice'
})

const emit = defineEmits<Emits>()

const callDuration = ref(0)
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const callTimer = ref<number | null>(null)

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // In a real implementation, you'd mute/unmute the microphone
}

const toggleVideo = () => {
  if (props.callType === 'video') {
    isVideoEnabled.value = !isVideoEnabled.value
    // In a real implementation, you'd enable/disable the camera
  }
}

const endCall = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
  }
  emit('end-call')
}

onMounted(() => {
  // Start call timer
  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
})

onUnmounted(() => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
  }
})
</script>

<template>
  <div class="call-controls">
    <div class="call-info">
      <div class="call-status">
        <div class="calling-indicator">
          <span class="pulse-dot"></span>
          <span class="call-type-icon">
            {{ callType === 'video' ? '📹' : '📞' }}
          </span>
        </div>
        
        <div class="call-details">
          <h4>{{ callType === 'video' ? 'Video call' : 'Voice call' }} with {{ receiverName }}</h4>
          <p class="call-duration">{{ formatDuration(callDuration) }}</p>
        </div>
      </div>
      
      <div class="privacy-notice">
        <span class="lock-icon">🔒</span>
        <span>End-to-end encrypted call</span>
      </div>
    </div>
    
    <div class="control-buttons">
      <button 
        @click="toggleMute"
        class="control-btn mute-btn"
        :class="{ 'active': isMuted }"
        :title="isMuted ? 'Unmute' : 'Mute'"
      >
        <span v-if="isMuted">🔇</span>
        <span v-else>🎤</span>
      </button>
      
      <button 
        v-if="callType === 'video'"
        @click="toggleVideo"
        class="control-btn video-btn"
        :class="{ 'active': !isVideoEnabled }"
        :title="isVideoEnabled ? 'Turn off camera' : 'Turn on camera'"
      >
        <span v-if="isVideoEnabled">📹</span>
        <span v-else>📵</span>
      </button>
      
      <button 
        @click="endCall"
        class="control-btn end-call-btn"
        title="End call"
      >
        📞
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.call-controls {
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
  margin: var(--spacing-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.call-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.call-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.calling-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  
  .pulse-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #28a745;
    animation: pulse 2s infinite;
  }
  
  .call-type-icon {
    font-size: 1.5rem;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
  }
}

.call-details {
  h4 {
    margin: 0 0 4px 0;
    font-size: 1.1rem;
    font-weight: 500;
  }
  
  .call-duration {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.8;
    font-family: 'Courier New', monospace;
  }
}

.privacy-notice {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  opacity: 0.8;
  
  .lock-icon {
    font-size: 0.8rem;
  }
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
}

.control-btn {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.mute-btn {
    background: #6c757d;
    
    &:hover {
      background: #5a6268;
    }
    
    &.active {
      background: #dc3545;
      
      &:hover {
        background: #c82333;
      }
    }
  }
  
  &.video-btn {
    background: #007bff;
    
    &:hover {
      background: #0056b3;
    }
    
    &.active {
      background: #dc3545;
      
      &:hover {
        background: #c82333;
      }
    }
  }
  
  &.end-call-btn {
    background: #dc3545;
    transform: rotate(135deg);
    
    &:hover {
      background: #c82333;
      transform: rotate(135deg) scale(1.1);
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
}

@media (max-width: 768px) {
  .call-controls {
    padding: var(--spacing-md);
    margin: var(--spacing-sm);
  }
  
  .call-info {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }
  
  .call-status {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .control-buttons {
    gap: var(--spacing-md);
  }
  
  .control-btn {
    width: 45px;
    height: 45px;
    font-size: 1.2rem;
  }
}
</style>