<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useSubscriptionStore } from '../../stores/subscription'
import { featureAccessService } from '../../services/featureAccessService'

interface Props {
  roomId: string
  hostId: string
  hostName: string
}

interface Participant {
  id: string
  name: string
  isHost: boolean
  joinedAt: Date
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'room-end': []
  'participant-join': [participant: Participant]
  'participant-leave': [participant: Participant]
}>()

const router = useRouter()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// State
const isInRoom = ref(false)
const isInitializing = ref(false)
const participants = ref<Participant[]>([])
const roomDuration = ref('00:00')
const isMuted = ref(false)
const isVideoOff = ref(false)
const showChat = ref(true)

// Access control
const hasAccess = ref(false)
const accessError = ref<string | null>(null)
const upgradeRequired = ref<string | null>(null)

// Video elements
const localVideoContainer = ref<HTMLDivElement>()
const remoteVideosContainer = ref<HTMLDivElement>()

// Timer
let durationInterval: NodeJS.Timeout | null = null
let roomStartTime: number | null = null

// Check if current user is the host
const isHost = computed(() => authStore.user?.$id === props.hostId)

// Update room duration
const updateRoomDuration = () => {
  if (!isInRoom.value || !roomStartTime) return
  
  const duration = Math.floor((Date.now() - roomStartTime) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  roomDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Check access permissions
const checkAccess = async () => {
  try {
    const access = await featureAccessService.canAccessPrivateRoom()
    hasAccess.value = access.canAccessFeature
    
    if (!access.canAccessFeature) {
      accessError.value = access.reason || 'Private rooms not available'
      upgradeRequired.value = access.upgradeRequired || null
    }
  } catch (error) {
    console.error('Failed to check access:', error)
    hasAccess.value = false
    accessError.value = 'Failed to verify access permissions'
  }
}

// Join room
const joinRoom = async () => {
  try {
    isInitializing.value = true
    
    // Double-check access
    if (!hasAccess.value) {
      throw new Error('Private room access denied')
    }

    // Initialize room service here
    // This would connect to your WebRTC/room backend
    
    // Add self as participant
    const selfParticipant: Participant = {
      id: authStore.user!.$id,
      name: authStore.user!.name || 'You',
      isHost: isHost.value,
      joinedAt: new Date()
    }
    participants.value.push(selfParticipant)
    
    // If not host, add host as participant
    if (!isHost.value) {
      const hostParticipant: Participant = {
        id: props.hostId,
        name: props.hostName,
        isHost: true,
        joinedAt: new Date()
      }
      participants.value.push(hostParticipant)
    }
    
    isInRoom.value = true
    roomStartTime = Date.now()
    
    // Start duration timer
    durationInterval = setInterval(updateRoomDuration, 1000)
    
  } catch (error: any) {
    console.error('Failed to join room:', error)
    accessError.value = error.message || 'Failed to join room'
  } finally {
    isInitializing.value = false
  }
}

// Leave room
const leaveRoom = async () => {
  try {
    // Cleanup room connection
    
    isInRoom.value = false
    participants.value = []
    
    // Clear timer
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    
    emit('room-end')
    
  } catch (error: any) {
    console.error('Failed to leave room:', error)
  }
}

// Toggle mute
const toggleMute = () => {
  isMuted.value = !isMuted.value
  // Update audio track
}

// Toggle video
const toggleVideo = () => {
  isVideoOff.value = !isVideoOff.value
  // Update video track
}

// Toggle chat
const toggleChat = () => {
  showChat.value = !showChat.value
}

// Navigate to subscription
const navigateToSubscription = () => {
  router.push({
    name: 'Subscription',
    query: { feature: 'privateRoom' }
  })
}

// Handle participant events
const handleParticipantJoin = (participant: Participant) => {
  participants.value.push(participant)
  emit('participant-join', participant)
}

const handleParticipantLeave = (participantId: string) => {
  const index = participants.value.findIndex(p => p.id === participantId)
  if (index !== -1) {
    const participant = participants.value[index]
    participants.value.splice(index, 1)
    emit('participant-leave', participant)
  }
}

onMounted(async () => {
  await checkAccess()
})

onUnmounted(() => {
  if (isInRoom.value) {
    leaveRoom()
  }
  
  if (durationInterval) {
    clearInterval(durationInterval)
  }
})
</script>

<template>
  <div class="private-room-interface">
    <!-- Access Denied State -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="access-denied-content">
        <svg class="icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
        
        <h2>Private Rooms Require Pro or Agency Plan</h2>
        <p>{{ accessError }}</p>
        
        <div class="upgrade-info">
          <h3>Unlock Private Rooms</h3>
          <ul>
            <li>Host exclusive sessions with selected viewers</li>
            <li>Set your own rates per minute</li>
            <li>Private chat and interactions</li>
            <li>Screen sharing capabilities</li>
            <li>Recording options (with consent)</li>
          </ul>
        </div>
        
        <button @click="navigateToSubscription" class="upgrade-btn">
          Upgrade Your Plan
        </button>
      </div>
    </div>

    <!-- Room Interface -->
    <div v-else class="room-container">
      <!-- Room Header -->
      <div class="room-header">
        <div class="room-info">
          <h2>Private Room</h2>
          <div class="room-stats">
            <span class="participants">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              {{ participants.length }}
            </span>
            <span class="duration" v-if="isInRoom">{{ roomDuration }}</span>
          </div>
        </div>
        
        <div class="room-controls">
          <button @click="toggleChat" class="control-btn" :class="{ active: showChat }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
          
          <button @click="leaveRoom" class="leave-btn" v-if="isInRoom">
            Leave Room
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="room-content">
        <!-- Video Grid -->
        <div class="video-section">
          <!-- Not in room state -->
          <div v-if="!isInRoom" class="join-prompt">
            <div class="host-info">
              <h3>{{ isHost ? 'Your Private Room' : `${hostName}'s Private Room` }}</h3>
              <p>{{ isHost ? 'Start your private session' : 'Join the private session' }}</p>
            </div>
            
            <button 
              @click="joinRoom" 
              class="join-btn"
              :disabled="isInitializing"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              {{ isInitializing ? 'Joining...' : (isHost ? 'Start Room' : 'Join Room') }}
            </button>
          </div>

          <!-- In room state -->
          <div v-else class="videos-grid">
            <!-- Local video -->
            <div class="video-container local-video">
              <div ref="localVideoContainer" class="video-element">
                <!-- Local video stream -->
              </div>
              <div class="video-label">You {{ isHost ? '(Host)' : '' }}</div>
              <div class="video-controls">
                <button @click="toggleMute" class="video-control-btn" :class="{ active: !isMuted }">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path v-if="!isMuted" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    <path v-else d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  </svg>
                </button>
                <button @click="toggleVideo" class="video-control-btn" :class="{ active: !isVideoOff }">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path v-if="!isVideoOff" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    <path v-else d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Remote videos -->
            <div 
              v-for="participant in participants.filter(p => p.id !== authStore.user?.$id)"
              :key="participant.id"
              class="video-container"
            >
              <div class="video-element">
                <!-- Remote video stream -->
              </div>
              <div class="video-label">
                {{ participant.name }} {{ participant.isHost ? '(Host)' : '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="chat-section" v-if="showChat && isInRoom">
          <div class="chat-header">
            <h3>Private Chat</h3>
            <button @click="toggleChat" class="close-chat-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="chat-messages">
            <!-- Chat messages -->
            <div class="empty-chat">
              <p>Start a conversation</p>
            </div>
          </div>
          
          <div class="chat-input">
            <input 
              type="text" 
              placeholder="Type a message..."
              class="message-input"
            />
            <button class="send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.private-room-interface {
  height: 100vh;
  background: #0f0f0f;
  color: white;
  overflow: hidden;
}

// Access Denied State
.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  
  .access-denied-content {
    text-align: center;
    max-width: 500px;
    
    .icon {
      color: #f59e0b;
      margin-bottom: 1.5rem;
    }
    
    h2 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }
    
    p {
      color: #9ca3af;
      margin-bottom: 2rem;
    }
    
    .upgrade-info {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
      
      h3 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
        text-align: center;
      }
      
      ul {
        list-style: none;
        padding: 0;
        
        li {
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
          
          &:before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #10b981;
          }
        }
      }
    }
    
    .upgrade-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
      }
    }
  }
}

// Room Container
.room-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// Room Header
.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  .room-info {
    h2 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem 0;
    }
    
    .room-stats {
      display: flex;
      gap: 1rem;
      color: #9ca3af;
      font-size: 0.875rem;
      
      .participants {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
  }
  
  .room-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    
    .control-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      &.active {
        background: rgba(99, 102, 241, 0.5);
      }
    }
    
    .leave-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #dc2626;
      }
    }
  }
}

// Room Content
.room-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// Video Section
.video-section {
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .join-prompt {
    text-align: center;
    
    .host-info {
      margin-bottom: 2rem;
      
      h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }
      
      p {
        color: #9ca3af;
      }
    }
    
    .join-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 1.1rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      
      &:hover:not(:disabled) {
        background: #059669;
        transform: scale(1.05);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  
  .videos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1rem;
    width: 100%;
    height: 100%;
    align-content: center;
  }
  
  .video-container {
    position: relative;
    background: #1a1a1a;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 16/9;
    
    &.local-video {
      border: 2px solid #6366f1;
    }
    
    .video-element {
      width: 100%;
      height: 100%;
      background: #2a2a2a;
    }
    
    .video-label {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
      background: rgba(0, 0, 0, 0.7);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    
    .video-controls {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      display: flex;
      gap: 0.5rem;
      
      .video-control-btn {
        background: rgba(0, 0, 0, 0.7);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(0, 0, 0, 0.9);
        }
        
        &.active {
          color: #10b981;
        }
      }
    }
  }
}

// Chat Section
.chat-section {
  width: 320px;
  background: rgba(0, 0, 0, 0.8);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  
  .chat-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 1.1rem;
    }
    
    .close-chat-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.25rem;
      
      &:hover {
        color: white;
      }
    }
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    
    .empty-chat {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6b7280;
    }
  }
  
  .chat-input {
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    gap: 0.5rem;
    
    .message-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      padding: 0.5rem 1rem;
      color: white;
      
      &::placeholder {
        color: #9ca3af;
      }
      
      &:focus {
        outline: none;
        border-color: #6366f1;
      }
    }
    
    .send-btn {
      background: #6366f1;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: #4f46e5;
      }
    }
  }
}

// Mobile Responsiveness
@media (max-width: 768px) {
  .chat-section {
    display: none;
  }
  
  .videos-grid {
    grid-template-columns: 1fr;
  }
  
  .room-header {
    padding: 1rem;
    
    .room-info h2 {
      font-size: 1.25rem;
    }
  }
}
</style>