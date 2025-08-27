<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useSubscriptionStore } from '../../stores/subscription'
import { featureAccessService } from '../../services/featureAccessService'

interface Props {
  profileId: string
  streamTitle?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'stream-start': []
  'stream-end': []
  'error': [error: Error]
}>()

const router = useRouter()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// Stream state
const isStreaming = ref(false)
const isInitializing = ref(false)
const viewerCount = ref(0)
const streamDuration = ref('00:00')
const showChat = ref(true)
const showSettings = ref(false)

// Access control
const hasAccess = ref(false)
const accessError = ref<string | null>(null)
const upgradeRequired = ref<string | null>(null)

// Video elements
const localVideoContainer = ref<HTMLDivElement>()

// Timer
let durationInterval: NodeJS.Timeout | null = null

// Update stream duration
const updateStreamDuration = () => {
  if (!isStreaming.value) return
  
  const start = performance.now()
  const duration = Math.floor((Date.now() - start) / 1000)
  
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  streamDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Check access permissions
const checkAccess = async () => {
  try {
    const access = await featureAccessService.canAccessLiveStreaming()
    hasAccess.value = access.canAccessFeature
    
    if (!access.canAccessFeature) {
      accessError.value = access.reason || 'Live streaming not available'
      upgradeRequired.value = access.upgradeRequired || null
    }
  } catch (error) {
    console.error('Failed to check access:', error)
    hasAccess.value = false
    accessError.value = 'Failed to verify access permissions'
  }
}

// Start streaming
const startStream = async () => {
  try {
    isInitializing.value = true
    
    // Double-check access
    if (!hasAccess.value) {
      throw new Error('Live streaming access denied')
    }

    // Initialize streaming service here
    // This would connect to your streaming backend
    
    isStreaming.value = true
    emit('stream-start')
    
    // Start duration timer
    durationInterval = setInterval(updateStreamDuration, 1000)
    
  } catch (error: any) {
    console.error('Failed to start stream:', error)
    emit('error', error)
  } finally {
    isInitializing.value = false
  }
}

// End streaming
const endStream = async () => {
  try {
    // Stop streaming service
    
    isStreaming.value = false
    emit('stream-end')
    
    // Clear timer
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    
  } catch (error: any) {
    console.error('Failed to end stream:', error)
    emit('error', error)
  }
}

// Navigate to subscription page
const navigateToSubscription = () => {
  router.push({
    name: 'Subscription',
    query: { feature: 'liveStreaming' }
  })
}

// Toggle chat visibility
const toggleChat = () => {
  showChat.value = !showChat.value
}

// Toggle settings
const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

onMounted(async () => {
  await checkAccess()
})

onUnmounted(() => {
  if (isStreaming.value) {
    endStream()
  }
  
  if (durationInterval) {
    clearInterval(durationInterval)
  }
})
</script>

<template>
  <div class="live-stream-interface">
    <!-- Access Denied State -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="access-denied-content">
        <svg class="icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
        
        <h2>Live Streaming Requires Upgrade</h2>
        <p>{{ accessError }}</p>
        
        <div class="upgrade-info">
          <h3>Unlock Live Streaming with Pro or Agency Plan</h3>
          <ul>
            <li>Stream to unlimited viewers</li>
            <li>Interactive chat with audience</li>
            <li>Receive virtual gifts and tips</li>
            <li>Analytics and insights</li>
          </ul>
        </div>
        
        <button @click="navigateToSubscription" class="upgrade-btn">
          View Subscription Plans
        </button>
      </div>
    </div>

    <!-- Streaming Interface -->
    <div v-else class="streaming-container">
      <!-- Header -->
      <div class="stream-header">
        <div class="stream-info">
          <span class="live-badge" v-if="isStreaming">LIVE</span>
          <h3>{{ streamTitle || 'Live Stream' }}</h3>
          <div class="stream-stats">
            <span class="viewers">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              {{ viewerCount }}
            </span>
            <span class="duration">{{ streamDuration }}</span>
          </div>
        </div>
        
        <div class="stream-controls">
          <button @click="toggleChat" class="control-btn" :class="{ active: showChat }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
          
          <button @click="toggleSettings" class="control-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="stream-content">
        <!-- Video Container -->
        <div class="video-section">
          <div ref="localVideoContainer" class="video-container">
            <!-- Video stream will be rendered here -->
          </div>
          
          <!-- Stream Controls -->
          <div class="bottom-controls" v-if="!isStreaming">
            <button 
              @click="startStream" 
              class="start-stream-btn"
              :disabled="isInitializing"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {{ isInitializing ? 'Starting...' : 'Start Streaming' }}
            </button>
          </div>
          
          <div class="bottom-controls" v-else>
            <button @click="endStream" class="end-stream-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z"/>
              </svg>
              End Stream
            </button>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="chat-section" v-if="showChat">
          <div class="chat-header">
            <h3>Live Chat</h3>
            <span class="viewer-count">{{ viewerCount }} viewers</span>
          </div>
          
          <div class="chat-messages">
            <!-- Chat messages would be rendered here -->
            <div class="empty-chat">
              <p>Chat will appear when viewers join</p>
            </div>
          </div>
          
          <div class="chat-input" v-if="isStreaming">
            <input 
              type="text" 
              placeholder="Say something..."
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

      <!-- Settings Panel -->
      <div class="settings-panel" v-if="showSettings">
        <div class="settings-header">
          <h3>Stream Settings</h3>
          <button @click="toggleSettings" class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="settings-content">
          <!-- Stream settings would go here -->
          <div class="setting-group">
            <label>Stream Quality</label>
            <select class="setting-select">
              <option>720p (Recommended)</option>
              <option>1080p</option>
              <option>480p</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" checked />
              Enable viewer chat
            </label>
          </div>
          
          <div class="setting-group">
            <label>
              <input type="checkbox" checked />
              Allow virtual gifts
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.live-stream-interface {
  height: 100vh;
  background: #0a0a0a;
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

// Streaming Container
.streaming-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

// Stream Header
.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  .stream-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    .live-badge {
      background: #ef4444;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: bold;
      animation: pulse 2s infinite;
    }
    
    h3 {
      font-size: 1.25rem;
      margin: 0;
    }
    
    .stream-stats {
      display: flex;
      gap: 1rem;
      color: #9ca3af;
      font-size: 0.875rem;
      
      .viewers {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
  }
  
  .stream-controls {
    display: flex;
    gap: 0.5rem;
    
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
  }
}

// Stream Content
.stream-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// Video Section
.video-section {
  flex: 1;
  position: relative;
  background: #000;
  
  .video-container {
    width: 100%;
    height: 100%;
  }
  
  .bottom-controls {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    
    .start-stream-btn,
    .end-stream-btn {
      padding: 1rem 2rem;
      border-radius: 50px;
      border: none;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .start-stream-btn {
      background: #10b981;
      color: white;
      
      &:hover:not(:disabled) {
        background: #059669;
        transform: scale(1.05);
      }
    }
    
    .end-stream-btn {
      background: #ef4444;
      color: white;
      
      &:hover {
        background: #dc2626;
        transform: scale(1.05);
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
    
    .viewer-count {
      font-size: 0.875rem;
      color: #9ca3af;
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
      text-align: center;
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
        transform: scale(1.1);
      }
    }
  }
}

// Settings Panel
.settings-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  
  .settings-header {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.5rem;
      
      &:hover {
        color: #ef4444;
      }
    }
  }
  
  .settings-content {
    padding: 1.5rem;
    
    .setting-group {
      margin-bottom: 1.5rem;
      
      label {
        display: block;
        margin-bottom: 0.5rem;
        color: #e5e7eb;
      }
      
      .setting-select {
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 0.5rem;
        color: white;
        
        &:focus {
          outline: none;
          border-color: #6366f1;
        }
      }
      
      input[type="checkbox"] {
        margin-right: 0.5rem;
      }
    }
  }
}

// Animation
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// Mobile Responsiveness
@media (max-width: 768px) {
  .chat-section {
    display: none;
  }
  
  .stream-header {
    padding: 1rem;
    
    .stream-info {
      h3 {
        font-size: 1rem;
      }
    }
  }
}
</style>