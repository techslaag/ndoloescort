<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CallSession } from '../../stores/messaging'

interface Props {
  call: CallSession
  callerName?: string
}

const props = withDefaults(defineProps<Props>(), {
  callerName: 'Unknown Caller'
})

const emit = defineEmits<{
  'accept': []
  'decline': []
}>()

// Ringtone
const ringtoneAudio = ref<HTMLAudioElement>()
const isRinging = ref(true)

// Computed
const callTypeText = computed(() => {
  return props.call.type === 'video' ? 'Video Call' : 'Voice Call'
})

const callTypeIcon = computed(() => {
  return props.call.type === 'video' ? '📹' : '📞'
})

// Methods
const acceptCall = () => {
  stopRingtone()
  emit('accept')
}

const declineCall = () => {
  stopRingtone()
  emit('decline')
}

const stopRingtone = () => {
  isRinging.value = false
  if (ringtoneAudio.value) {
    ringtoneAudio.value.pause()
    ringtoneAudio.value.currentTime = 0
  }
}

// Lifecycle
onMounted(() => {
  // Play ringtone (only if audio source is available)
  if (ringtoneAudio.value && ringtoneAudio.value.src) {
    ringtoneAudio.value.loop = true
    ringtoneAudio.value.play().catch(err => {
      console.error('Failed to play ringtone:', err)
    })
  }
  
  // Optional: Use Web Audio API for a simple beep as fallback
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 440 // A4 note
    gainNode.gain.value = 0.1 // Low volume
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.2) // Short beep
  } catch (err) {
    // Silently fail if audio is not available
  }
})

onUnmounted(() => {
  stopRingtone()
})
</script>

<template>
  <div class="incoming-call-modal">
    <div class="call-backdrop" />
    
    <div class="call-content">
      <!-- Ripple Animation -->
      <div class="ripple-container">
        <div class="ripple"></div>
        <div class="ripple"></div>
        <div class="ripple"></div>
      </div>
      
      <!-- Caller Info -->
      <div class="caller-section">
        <div class="caller-avatar">
          {{ callerName.charAt(0).toUpperCase() }}
        </div>
        
        <h2 class="caller-name">{{ callerName }}</h2>
        
        <div class="call-type">
          <span class="call-icon">{{ callTypeIcon }}</span>
          <span>{{ callTypeText }}</span>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="actions-section">
        <button 
          @click="declineCall"
          class="action-btn decline"
          title="Decline call"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.68.28-.3 0-.56-.13-.75-.33l-2.2-2.2c-.2-.2-.33-.46-.33-.76 0-.3.13-.55.32-.74 1.34-1.34 3.02-2.48 4.87-3.32C7.19 7.66 9.53 7.24 12 7.24c2.47 0 4.81.42 6.85 1.26 1.85.84 3.53 1.98 4.87 3.32.19.19.32.44.32.74 0 .3-.13.56-.33.76l-2.2 2.2c-.19.2-.45.33-.75.33-.25 0-.5-.1-.68-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
          <span>Decline</span>
        </button>
        
        <button 
          @click="acceptCall"
          class="action-btn accept"
          title="Accept call"
        >
          <svg v-if="call.type === 'audio'" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
          <svg v-else width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
          <span>Accept</span>
        </button>
      </div>
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="quick-action-btn" title="Send message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 14H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm7 6h-5v-2h5v2zm3-3h-8V9h8v2zm0-3h-8V6h8v2z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Hidden audio element for ringtone -->
    <audio ref="ringtoneAudio" preload="auto">
      <!-- Add your own ringtone file or use a data URL -->
      <!-- <source src="/public/sounds/ringtone.mp3" type="audio/mpeg"> -->
    </audio>
  </div>
</template>

<style scoped lang="scss">
.incoming-call-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
}

.call-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// Ripple animation
.ripple-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  pointer-events: none;
}

.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  margin: -50px 0 0 -50px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: ripple 3s ease-out infinite;
  
  &:nth-child(2) {
    animation-delay: 1s;
  }
  
  &:nth-child(3) {
    animation-delay: 2s;
  }
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

// Caller section
.caller-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 3rem;
  
  .caller-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: white;
    font-weight: bold;
    margin-bottom: 1.5rem;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  }
  
  .caller-name {
    font-size: 2rem;
    color: white;
    margin-bottom: 0.5rem;
    font-weight: 300;
  }
  
  .call-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #ccc;
    font-size: 1.1rem;
    
    .call-icon {
      font-size: 1.3rem;
    }
  }
}

// Action buttons
.actions-section {
  display: flex;
  gap: 3rem;
  margin-bottom: 2rem;
  
  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.1);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    svg {
      width: 72px;
      height: 72px;
      padding: 20px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
    
    span {
      color: white;
      font-size: 0.9rem;
    }
    
    &.decline {
      svg {
        background: #f44336;
        color: white;
      }
      
      &:hover svg {
        background: #d32f2f;
      }
    }
    
    &.accept {
      svg {
        background: #4caf50;
        color: white;
      }
      
      &:hover svg {
        background: #43a047;
      }
    }
  }
}

// Quick actions
.quick-actions {
  display: flex;
  gap: 1rem;
  
  .quick-action-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }
  }
}

// Mobile adjustments
@media (max-width: 480px) {
  .call-content {
    padding: 1.5rem;
  }
  
  .caller-section {
    .caller-avatar {
      width: 100px;
      height: 100px;
      font-size: 2.5rem;
    }
    
    .caller-name {
      font-size: 1.5rem;
    }
    
    .call-type {
      font-size: 1rem;
    }
  }
  
  .actions-section {
    gap: 2rem;
    
    .action-btn {
      svg {
        width: 64px;
        height: 64px;
        padding: 16px;
      }
    }
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .call-content {
    animation: none;
  }
  
  .ripple {
    animation: none;
    opacity: 0.3;
  }
}
</style>