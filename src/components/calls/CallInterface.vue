<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMessagingStore } from '../../stores/messaging'
import { useAuthStore } from '../../stores/auth'
import { useSubscriptionStore } from '../../stores/subscription'
import type { CallSession } from '../../stores/messaging'
import { agoraService, type CallStats } from '../../services/agoraService'
import { featureAccessService } from '../../services/featureAccessService'
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng'

interface Props {
  call: CallSession
  channelName: string
  token?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'end-call': []
  'error': [error: Error]
}>()

const messagingStore = useMessagingStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// UI state
const isMuted = ref(false)
const isVideoOff = ref(false)
const isSpeakerOn = ref(false)
const showControls = ref(true)
const callDuration = ref('00:00')
const isConnecting = ref(true)
const networkQuality = ref<CallStats['networkQuality']>('good')

// Video elements
const localVideoContainer = ref<HTMLDivElement>()
const remoteVideoContainer = ref<HTMLDivElement>()

// Remote user
const remoteUser = ref<IAgoraRTCRemoteUser | null>(null)
const isRemoteVideoEnabled = ref(false)
const isRemoteAudioEnabled = ref(false)

// Timer
let durationInterval: NodeJS.Timeout | null = null
let controlsTimeout: NodeJS.Timeout | null = null

// Computed properties
const isIncoming = computed(() => props.call.receiverId === authStore.user?.$id)
const callerName = computed(() => {
  // In real app, fetch from user store
  return isIncoming.value ? 'Caller' : 'Receiver'
})

const callStatus = computed(() => {
  if (isConnecting.value) {
    return 'Connecting...'
  }
  
  switch (props.call.status) {
    case 'pending':
      return isIncoming.value ? 'Incoming call...' : 'Calling...'
    case 'active':
      return callDuration.value
    case 'ended':
      return 'Call ended'
    default:
      return ''
  }
})

const networkQualityIcon = computed(() => {
  switch (networkQuality.value) {
    case 'excellent':
    case 'good':
      return '📶'
    case 'poor':
      return '📵'
    case 'bad':
    case 'veryBad':
    case 'down':
      return '❌'
    default:
      return ''
  }
})

// Methods
const updateCallDuration = () => {
  if (props.call.status !== 'active' || !props.call.startedAt) return
  
  const start = new Date(props.call.startedAt).getTime()
  const now = Date.now()
  const duration = Math.floor((now - start) / 1000)
  
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  callDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const toggleMute = async () => {
  try {
    isMuted.value = !isMuted.value
    await agoraService.muteAudio(isMuted.value)
  } catch (error) {
    console.error('Failed to toggle mute:', error)
  }
}

const toggleVideo = async () => {
  try {
    isVideoOff.value = !isVideoOff.value
    await agoraService.muteVideo(isVideoOff.value)
    
    // Update local video display
    if (localVideoContainer.value) {
      const localTrack = agoraService.getLocalVideoTrack()
      if (localTrack) {
        if (isVideoOff.value) {
          localTrack.stop()
        } else {
          localTrack.play(localVideoContainer.value)
        }
      }
    }
  } catch (error) {
    console.error('Failed to toggle video:', error)
  }
}

const toggleSpeaker = () => {
  isSpeakerOn.value = !isSpeakerOn.value
  // In a real app, you would switch audio output here
}

const endCall = () => {
  emit('end-call')
}

// Show/hide controls
const showControlsTemporarily = () => {
  showControls.value = true
  
  // Clear existing timeout
  if (controlsTimeout) {
    clearTimeout(controlsTimeout)
  }
  
  // Hide after 3 seconds of inactivity
  controlsTimeout = setTimeout(() => {
    if (props.call.type === 'video' && props.call.status === 'active') {
      showControls.value = false
    }
  }, 3000)
}

// Initialize Agora
const initializeAgora = async () => {
  try {
    isConnecting.value = true
    
    // Check feature access for call type
    if (props.call.type === 'video') {
      const videoAccess = await featureAccessService.canAccessVideoCall()
      if (!videoAccess.canAccessFeature) {
        throw new Error(videoAccess.reason || 'Video calls not available')
      }
    } else {
      const audioAccess = await featureAccessService.canAccessAudioCall()
      if (!audioAccess.canAccessFeature) {
        throw new Error(audioAccess.reason || 'Audio calls not available')
      }
    }
    
    // Set up event handlers
    agoraService.onUserJoined = (user) => {
      console.log('Remote user joined:', user.uid)
      remoteUser.value = user
    }
    
    agoraService.onUserLeft = (user) => {
      console.log('Remote user left:', user.uid)
      if (remoteUser.value?.uid === user.uid) {
        remoteUser.value = null
        isRemoteVideoEnabled.value = false
        isRemoteAudioEnabled.value = false
      }
    }
    
    agoraService.onUserPublished = async (user, mediaType) => {
      console.log('Remote user published:', user.uid, mediaType)
      
      if (mediaType === 'video') {
        isRemoteVideoEnabled.value = true
        await nextTick()
        
        if (remoteVideoContainer.value && user.videoTrack) {
          user.videoTrack.play(remoteVideoContainer.value)
        }
      }
      
      if (mediaType === 'audio') {
        isRemoteAudioEnabled.value = true
        if (user.audioTrack) {
          user.audioTrack.play()
        }
      }
    }
    
    agoraService.onUserUnpublished = (user, mediaType) => {
      console.log('Remote user unpublished:', user.uid, mediaType)
      
      if (mediaType === 'video') {
        isRemoteVideoEnabled.value = false
      }
      
      if (mediaType === 'audio') {
        isRemoteAudioEnabled.value = false
      }
    }
    
    agoraService.onConnectionStateChange = (state) => {
      console.log('Connection state:', state)
      if (state === 'CONNECTED') {
        isConnecting.value = false
      }
    }
    
    agoraService.onNetworkQuality = (stats) => {
      networkQuality.value = stats.networkQuality
    }
    
    agoraService.onError = (error) => {
      console.error('Agora error:', error)
      emit('error', error)
    }
    
    // Join channel
    const appId = import.meta.env.VITE_AGORA_APP_ID
    if (!appId) {
      throw new Error('Agora App ID not configured')
    }
    
    await agoraService.join({
      appId,
      channel: props.channelName,
      token: props.token,
      uid: authStore.user?.$id
    })
    
    // Create local tracks based on call type
    const isVideo = props.call.type === 'video'
    await agoraService.createLocalTracks(true, isVideo)
    
    // Play local video if it's a video call
    if (isVideo && localVideoContainer.value) {
      const localVideoTrack = agoraService.getLocalVideoTrack()
      if (localVideoTrack) {
        localVideoTrack.play(localVideoContainer.value)
      }
    }
    
    isConnecting.value = false
  } catch (error) {
    console.error('Failed to initialize Agora:', error)
    isConnecting.value = false
    emit('error', error as Error)
  }
}

// Watch for remote user video state changes
watch(() => remoteUser.value?.hasVideo, (hasVideo) => {
  isRemoteVideoEnabled.value = !!hasVideo
})

// Lifecycle
onMounted(async () => {
  // Initialize Agora
  await initializeAgora()
  
  // Start duration timer
  durationInterval = setInterval(updateCallDuration, 1000)
  
  // Initial controls timeout for video calls
  if (props.call.type === 'video') {
    showControlsTemporarily()
  }
})

onUnmounted(async () => {
  if (durationInterval) {
    clearInterval(durationInterval)
  }
  
  if (controlsTimeout) {
    clearTimeout(controlsTimeout)
  }
  
  // Leave Agora channel
  await agoraService.leave()
})
</script>

<template>
  <div 
    class="call-interface"
    :class="{ 
      'video-call': call.type === 'video',
      'audio-call': call.type === 'audio',
      'controls-hidden': !showControls
    }"
    @mousemove="showControlsTemporarily"
    @touchstart="showControlsTemporarily"
  >
    <!-- Loading State -->
    <div v-if="isConnecting" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Connecting...</p>
    </div>
    
    <!-- Video Call View -->
    <template v-if="call.type === 'video' && !isConnecting">
      <!-- Remote Video (Full Screen) -->
      <div class="remote-video-container">
        <div 
          ref="remoteVideoContainer"
          class="remote-video"
          v-show="isRemoteVideoEnabled"
        />
        
        <!-- Placeholder when no video -->
        <div v-if="!isRemoteVideoEnabled" class="video-placeholder">
          <div class="avatar-large">
            {{ callerName.charAt(0).toUpperCase() }}
          </div>
          <p class="no-video-text">{{ callerName }}'s camera is off</p>
        </div>
      </div>
      
      <!-- Local Video (Picture-in-Picture) -->
      <div class="local-video-container" v-if="!isVideoOff">
        <div 
          ref="localVideoContainer"
          class="local-video"
        />
      </div>
    </template>
    
    <!-- Audio Call View -->
    <template v-else-if="!isConnecting">
      <div class="audio-call-content">
        <div class="caller-info">
          <div class="avatar-extra-large">
            {{ callerName.charAt(0).toUpperCase() }}
          </div>
          <h2 class="caller-name">{{ callerName }}</h2>
          <p class="call-status">{{ callStatus }}</p>
          
          <!-- Audio Visualizer -->
          <div class="audio-visualizer" v-if="call.status === 'active'">
            <span class="bar" v-for="i in 5" :key="i"></span>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Call Header (Always Visible) -->
    <div class="call-header" :class="{ 'visible': showControls }">
      <div class="header-content">
        <div class="header-info">
          <h3>{{ callerName }}</h3>
          <p>{{ callStatus }}</p>
        </div>
        <div class="header-actions">
          <span class="network-indicator" :title="`Network: ${networkQuality}`">
            {{ networkQualityIcon }}
          </span>
          <button 
            v-if="call.type === 'video'"
            @click="toggleVideo"
            class="header-btn"
            :class="{ 'active': !isVideoOff }"
          >
            <svg v-if="!isVideoOff" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Call Controls -->
    <div class="call-controls" :class="{ 'visible': showControls }">
      <div class="controls-container">
        <!-- Secondary Controls -->
        <div class="secondary-controls">
          <button 
            @click="toggleSpeaker"
            class="control-btn secondary"
            :class="{ 'active': isSpeakerOn }"
            title="Toggle speaker"
          >
            <svg v-if="isSpeakerOn" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
            </svg>
          </button>
          
          <button 
            v-if="call.type === 'video'"
            @click="toggleVideo"
            class="control-btn secondary"
            :class="{ 'active': !isVideoOff }"
            title="Toggle video"
          >
            <svg v-if="!isVideoOff" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
            </svg>
          </button>
        </div>
        
        <!-- Primary Controls -->
        <div class="primary-controls">
          <button 
            @click="toggleMute"
            class="control-btn primary"
            :class="{ 'muted': isMuted }"
            title="Toggle mute"
          >
            <svg v-if="!isMuted" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            </svg>
          </button>
          
          <button 
            @click="endCall"
            class="control-btn end-call"
            title="End call"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.68.28-.3 0-.56-.13-.75-.33l-2.2-2.2c-.2-.2-.33-.46-.33-.76 0-.3.13-.55.32-.74 1.34-1.34 3.02-2.48 4.87-3.32C7.19 7.66 9.53 7.24 12 7.24c2.47 0 4.81.42 6.85 1.26 1.85.84 3.53 1.98 4.87 3.32.19.19.32.44.32.74 0 .3-.13.56-.33.76l-2.2 2.2c-.19.2-.45.33-.75.33-.25 0-.5-.1-.68-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.call-interface {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #212121;
  z-index: 2000;
  overflow: hidden;
  
  &.video-call {
    background: #000;
  }
  
  &.controls-hidden {
    cursor: none;
  }
}

// Loading state
.loading-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  
  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  p {
    font-size: 1.2rem;
    opacity: 0.8;
  }
}

// Video containers
.remote-video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  
  .remote-video {
    width: 100%;
    height: 100%;
  }
  
  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #212121;
    
    .no-video-text {
      margin-top: 1rem;
      color: #999;
      font-size: 1.1rem;
    }
  }
}

.local-video-container {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 120px;
  height: 160px;
  background: #333;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .local-video {
    width: 100%;
    height: 100%;
    transform: scaleX(-1); // Mirror effect
  }
}

// Audio call content
.audio-call-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  
  .caller-info {
    text-align: center;
    
    .caller-name {
      margin: 1.5rem 0 0.5rem;
      font-size: 2rem;
      color: white;
      font-weight: 300;
    }
    
    .call-status {
      color: #999;
      font-size: 1.1rem;
    }
  }
}

// Audio visualizer
.audio-visualizer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: 2rem;
  height: 40px;
  
  .bar {
    width: 4px;
    height: 20px;
    background: #4caf50;
    border-radius: 2px;
    animation: pulse 0.8s ease-in-out infinite;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.1s; }
    &:nth-child(3) { animation-delay: 0.2s; }
    &:nth-child(4) { animation-delay: 0.3s; }
    &:nth-child(5) { animation-delay: 0.4s; }
  }
  
  @keyframes pulse {
    0%, 100% {
      height: 20px;
      opacity: 0.5;
    }
    50% {
      height: 40px;
      opacity: 1;
    }
  }
}

// Avatars
.avatar-large,
.avatar-extra-large {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
}

.avatar-large {
  width: 120px;
  height: 120px;
  font-size: 3rem;
}

.avatar-extra-large {
  width: 160px;
  height: 160px;
  font-size: 4rem;
}

// Call header
.call-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
  padding: 20px;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
  
  &.visible {
    transform: translateY(0);
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 800px;
    margin: 0 auto;
    
    .header-info {
      h3 {
        color: white;
        font-size: 1.2rem;
        margin-bottom: 0.25rem;
      }
      
      p {
        color: #ccc;
        font-size: 0.9rem;
      }
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .network-indicator {
        font-size: 1.2rem;
      }
    }
    
    .header-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      &.active {
        background: rgba(255, 255, 255, 0.9);
        color: #333;
      }
    }
  }
}

// Call controls
.call-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
  padding: 40px 20px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  
  &.visible {
    transform: translateY(0);
  }
  
  .controls-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .secondary-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 30px;
  }
  
  .primary-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40px;
  }
}

// Control buttons
.control-btn {
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  
  &.secondary {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    &.active {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }
  }
  
  &.primary {
    width: 72px;
    height: 72px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    
    &:hover {
      transform: scale(1.1);
    }
    
    &.muted {
      background: #f44336;
      color: white;
    }
  }
  
  &.end-call {
    width: 72px;
    height: 72px;
    background: #f44336;
    
    &:hover {
      background: #d32f2f;
      transform: scale(1.1);
    }
  }
}

// Mobile responsiveness
@media (max-width: 768px) {
  .local-video-container {
    width: 90px;
    height: 120px;
    top: 60px;
    right: 16px;
  }
  
  .call-controls {
    padding: 20px 16px;
  }
  
  .primary-controls {
    gap: 30px;
  }
  
  .control-btn {
    &.secondary {
      width: 48px;
      height: 48px;
    }
    
    &.primary,
    &.end-call {
      width: 64px;
      height: 64px;
    }
  }
}

// Landscape mode
@media (max-height: 500px) {
  .audio-call-content {
    .avatar-extra-large {
      width: 100px;
      height: 100px;
      font-size: 2.5rem;
    }
    
    .caller-name {
      font-size: 1.5rem;
      margin: 1rem 0 0.5rem;
    }
  }
  
  .call-controls {
    padding: 20px;
  }
  
  .secondary-controls {
    margin-bottom: 20px;
  }
}
</style>