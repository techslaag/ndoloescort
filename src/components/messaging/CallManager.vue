<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMessagingStore } from '../../stores/messaging'
import { useAuthStore } from '../../stores/auth'
import CallInterface from '../calls/CallInterface.vue'
import IncomingCallModal from '../calls/IncomingCallModal.vue'

interface Props {
  receiverId: string
  receiverName: string
}

const props = defineProps<Props>()

const messagingStore = useMessagingStore()
const authStore = useAuthStore()
const showCallOptions = ref(false)

// Call state
const isInCall = ref(false)
const callError = ref<string | null>(null)

// Active call for this conversation
const activeCall = computed(() => {
  return messagingStore.activeCalls.find(call => 
    (call.callerId === props.receiverId || call.receiverId === props.receiverId) &&
    (call.callerId === authStore.user?.$id || call.receiverId === authStore.user?.$id)
  )
})

// Incoming call for this user
const incomingCall = computed(() => {
  return messagingStore.activeCalls.find(call => 
    call.receiverId === authStore.user?.$id && 
    call.status === 'pending'
  )
})

// Generate channel name for Agora
const getChannelName = (callId: string) => {
  // Use call ID as channel name to ensure uniqueness
  return `call_${callId}`
}

// Generate or get token for Agora (in production, this should come from your backend)
const getAgoraToken = async (channelName: string): Promise<string | null> => {
  // If you have a token server configured
  const tokenServer = import.meta.env.VITE_AGORA_TOKEN_SERVER
  if (tokenServer) {
    try {
      const response = await fetch(`${tokenServer}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName,
          uid: authStore.user?.$id,
          role: 'publisher'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.token
      }
    } catch (error) {
      console.error('Failed to get Agora token:', error)
    }
  }
  
  // Return null to use App ID only (less secure, only for development)
  return null
}

const startCall = async (type: 'audio' | 'video') => {
  showCallOptions.value = false
  
  try {
    // Start the call (creates call record in database)
    const callSession = await messagingStore.startCall(props.receiverId, type)
    
    if (callSession) {
      isInCall.value = true
      callError.value = null
    }
  } catch (error) {
    console.error('Failed to start call:', error)
    callError.value = 'Failed to start call. Please try again.'
  }
}

const acceptCall = async () => {
  if (!incomingCall.value) return
  
  try {
    // Accept the call (update status in database)
    const callSession = await messagingStore.acceptCall(incomingCall.value.$id!)
    
    if (callSession) {
      isInCall.value = true
      callError.value = null
    }
  } catch (error) {
    console.error('Failed to accept call:', error)
    callError.value = 'Failed to accept call. Please try again.'
    
    // Decline the call if we can't accept it
    await declineCall()
  }
}

const declineCall = async () => {
  if (!incomingCall.value) return
  
  try {
    await messagingStore.endCall(incomingCall.value.$id!)
  } catch (error) {
    console.error('Failed to decline call:', error)
  }
}

const endCall = async () => {
  if (activeCall.value) {
    try {
      await messagingStore.endCall(activeCall.value.$id!)
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }
  
  isInCall.value = false
  callError.value = null
}

const handleCallError = (error: Error) => {
  console.error('Call error:', error)
  callError.value = error.message
  
  // End call on critical errors
  if (error.message.includes('Agora') || error.message.includes('media')) {
    endCall()
  }
}

// Watch for active call changes
watch(activeCall, (newCall) => {
  if (!newCall || newCall.status === 'ended') {
    isInCall.value = false
  }
})

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.call-buttons')) {
    showCallOptions.value = false
  }
}

// Add click outside listener when dropdown is open
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
</script>

<template>
  <div class="call-manager">
    <!-- Error notification -->
    <Transition name="slide-down">
      <div v-if="callError" class="call-error">
        <span>{{ callError }}</span>
        <button @click="callError = null" class="close-btn">✕</button>
      </div>
    </Transition>
    
    <!-- Call action buttons -->
    <div class="call-buttons" v-if="!activeCall || activeCall.status === 'ended'">
      <button 
        @click.stop="showCallOptions = !showCallOptions"
        class="call-btn"
        title="Start call"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
        </svg>
      </button>
      
      <Transition name="dropdown">
        <div v-if="showCallOptions" class="call-options" @click.stop>
          <button @click="startCall('audio')" class="option-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            <span>Voice Call</span>
          </button>
          <button @click="startCall('video')" class="option-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <span>Video Call</span>
          </button>
        </div>
      </Transition>
    </div>
    
    <!-- Call Interface -->
    <Teleport to="body">
      <CallInterface
        v-if="activeCall && isInCall"
        :call="activeCall"
        :channel-name="getChannelName(activeCall.$id!)"
        :token="null"
        @end-call="endCall"
        @error="handleCallError"
      />
      
      <!-- Incoming Call Modal -->
      <IncomingCallModal
        v-if="incomingCall && !isInCall"
        :call="incomingCall"
        :caller-name="receiverName"
        @accept="acceptCall"
        @decline="declineCall"
      />
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.call-manager {
  position: relative;
}

.call-error {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #f44336;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 3000;
  
  .close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 18px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.call-buttons {
  position: relative;
  
  .call-btn {
    background: transparent;
    border: none;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    color: #99aab5;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    &:active {
      transform: scale(0.95);
    }
  }
}

.call-options {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #36393f;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 100;
  
  .option-btn {
    width: 100%;
    background: transparent;
    border: none;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    color: #dcddde;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.2s ease;
    text-align: left;
    font-size: 0.95rem;
    
    &:hover {
      background: #42454a;
      color: white;
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    svg {
      flex-shrink: 0;
    }
  }
}

// Animations
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>