<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessagingStore } from '../stores/messaging'
import { useAuthStore } from '../stores/auth'
import ConversationList from '../components/messaging/ConversationList.vue'
import MessageThread from '../components/messaging/MessageThread.vue'

const route = useRoute()
const router = useRouter()
const messagingStore = useMessagingStore()
const authStore = useAuthStore()

const selectedConversationId = ref<string | null>(null)
const selectedReceiverId = ref<string | null>(null)
const selectedReceiverName = ref<string>('')
const selectedReceiverRole = ref<string>('')
const isMobileView = ref(false)
const showConversationList = ref(true)
const userRestrictions = ref<any>({})

const handleSelectConversation = (conversationId: string, receiverId: string, receiverName: string, receiverRole?: string) => {
  selectedConversationId.value = conversationId
  selectedReceiverId.value = receiverId
  selectedReceiverName.value = receiverName
  selectedReceiverRole.value = receiverRole || 'client'
  
  // On mobile, hide conversation list when selecting a conversation
  if (isMobileView.value) {
    showConversationList.value = false
  }
  
  // Update URL
  router.push({ 
    name: 'Messages', 
    query: { conversation: conversationId } 
  })
}

const handleBackFromThread = () => {
  // Show conversation list on mobile
  if (isMobileView.value) {
    showConversationList.value = true
  }
  
  // Clear selection
  selectedConversationId.value = null
  selectedReceiverId.value = null
  selectedReceiverName.value = ''
  selectedReceiverRole.value = ''
  
  // Clear query parameters
  router.push({ name: 'Messages' })
}


const checkMobileView = () => {
  const width = window.innerWidth
  isMobileView.value = width <= 768
  
  // Reset conversation list visibility on larger screens
  if (!isMobileView.value) {
    showConversationList.value = true
  }
  
  // Ensure proper layout on orientation change
  if (width <= 480 && selectedConversationId.value) {
    showConversationList.value = false
  }
}

const startNewConversation = async (receiverId: string, receiverName?: string, receiverRole?: string) => {
  // Check permissions first
  const targetRole = receiverRole || 'client'
  if (!messagingStore.canMessageUser(receiverId, targetRole)) {
    const restrictions = messagingStore.getConversationRestrictions()
    const description = 'description' in restrictions ? restrictions.description : 'You do not have permission.'
    alert(`You cannot initiate conversations with ${targetRole}s. ${description}`)
    return
  }
  
  // Create or get existing conversation
  const conversation = await messagingStore.getOrCreateConversation(receiverId, targetRole)
  
  if (conversation) {
    handleSelectConversation(
      conversation.$id!, 
      receiverId, 
      receiverName || `User ${receiverId.slice(-4)}`,
      targetRole
    )
  } else if (messagingStore.error) {
    alert(messagingStore.error)
  }
}


onMounted(async () => {
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // Load conversations
  await messagingStore.loadConversations()
  
  // Initialize cleanup interval for auto-deletion
  messagingStore.initCleanupInterval()
  
  // Get user messaging restrictions
  userRestrictions.value = messagingStore.getConversationRestrictions()
  
  // Check for mobile view and set up responsive handling
  checkMobileView()
  
  // Use ResizeObserver for better performance if available, otherwise fallback to resize event
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(checkMobileView)
    resizeObserver.observe(document.body)
  } else {
    window.addEventListener('resize', checkMobileView)
  }
  
  // Handle orientation change on mobile devices
  window.addEventListener('orientationchange', () => {
    setTimeout(checkMobileView, 100) // Small delay to ensure proper viewport calculation
  })
  
  // Handle query parameters
  const conversationId = route.query.conversation as string
  const receiverId = route.query.receiver as string
  const receiverName = route.query.receiverName as string
  
  if (conversationId) {
    // Load existing conversation
    const conversation = messagingStore.conversations.find(c => c.$id === conversationId)
    if (conversation) {
      // Use the refactored getOtherParticipant function
      const otherParticipant = messagingStore.getOtherParticipant(conversation)
      
      handleSelectConversation(
        conversationId, 
        otherParticipant.id, 
        receiverName || otherParticipant.name,
        otherParticipant.role
      )
    }
  } else if (receiverId) {
    // Start new conversation with specific user
    const receiverRole = route.query.receiverRole as string
    startNewConversation(receiverId, receiverName, receiverRole)
  }
})
</script>

<template>
  <div class="messages-page">
    <div class="messages-container">
      <!-- Conversation List -->
      <div 
        v-show="showConversationList || !isMobileView"
        class="conversation-sidebar"
        :class="{ 'mobile-full': isMobileView }"
      >
        <ConversationList 
          :selected-conversation-id="selectedConversationId"
          @select-conversation="handleSelectConversation" 
        />
      </div>
      
      <!-- Message Thread -->
      <div 
        v-show="selectedConversationId && (!isMobileView || !showConversationList)"
        class="message-content"
        :class="{ 'mobile-full': isMobileView }"
      >
        <MessageThread
          v-if="selectedConversationId && selectedReceiverId"
          :conversation-id="selectedConversationId"
          :receiver-id="selectedReceiverId"
          :receiver-name="selectedReceiverName"
          :receiver-role="selectedReceiverRole"
          @back="handleBackFromThread"
        />
        
        <div v-else class="no-conversation-selected">
          <div class="welcome-content">
            <div class="welcome-icon">💬</div>
            <h2>Discreet Communication</h2>
            
            <!-- User Role and Restrictions -->
            <div class="user-info">
              <div class="user-role">
                <span class="role-icon">👤</span>
                <span>Role: {{ messagingStore.getUserRole(authStore.user).charAt(0).toUpperCase() + messagingStore.getUserRole(authStore.user).slice(1) }}</span>
              </div>
              <p class="restrictions-info">{{ 'description' in userRestrictions ? userRestrictions.description : '' }}</p>
            </div>
            
            <!-- Support Contact Button -->
            <div class="support-section">
              <button class="support-btn" disabled>
                <span class="support-icon">🎧</span>
                <span>Contact Support</span>
              </button>
            </div>
            
            <div class="features-list">
              <div class="feature-item">
                <span class="feature-icon">🔒</span>
                <span>End-to-end encrypted messaging</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📞</span>
                <span>Secure voice and video calls</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⏰</span>
                <span>Auto-deleting messages for privacy</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🛡️</span>
                <span>Keep personal contact info private</span>
              </div>
            </div>
            <p class="welcome-subtitle">
              Select a conversation to start secure, private messaging
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Error Alert -->
    <div v-if="messagingStore.error" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span>{{ messagingStore.error }}</span>
        <button @click="messagingStore.clearError" class="error-close">×</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Root responsive setup
.messages-page {
  height: 100vh;
  height: calc(100dvh - 75px); // Dynamic viewport height for mobile browsers
  display: flex;
  flex-direction: column;
  background: #36393f;
  // padding-top: 10px; // Account for main navigation
  overflow: hidden; // Prevent body scroll on mobile
  
  // Ensure proper box sizing
  * {
    box-sizing: border-box;
  }
}


.messages-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.conversation-sidebar {
  width: 350px;
  border-right: 1px solid #40444b;
  background: #2f3136;
  
  &.mobile-full {
    width: 100%;
  }
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  &.mobile-full {
    width: 100%;
  }
}

.no-conversation-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #36393f;
  padding: var(--spacing-xxl);
}

.welcome-content {
  text-align: center;
  max-width: 500px;
  
  .welcome-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
    opacity: 0.7;
  }
  
  h2 {
    margin: 0 0 var(--spacing-lg) 0;
    color: #ffffff;
    font-size: 2rem;
  }
  
  .welcome-subtitle {
    margin: var(--spacing-xl) 0 0 0;
    color: #b9bbbe;
    font-size: 1.1rem;
    line-height: 1.5;
  }
}

.user-info {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-md);
  background: rgba(114, 137, 218, 0.1);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(114, 137, 218, 0.2);
  
  .user-role {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    font-weight: 600;
    color: #7289da;
    margin-bottom: var(--spacing-xs);
    
    .role-icon {
      font-size: 1.2rem;
    }
  }
  
  .restrictions-info {
    margin: 0;
    font-size: 0.9rem;
    color: #b9bbbe;
    line-height: 1.4;
  }
}

.support-section {
  margin-bottom: var(--spacing-xl);
  
  .support-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, #43b581, #5865f2);
    color: white;
    border: none;
    border-radius: var(--border-radius-lg);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(67, 181, 129, 0.3);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(67, 181, 129, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    .support-icon {
      font-size: 1.2rem;
    }
    
    // Touch device optimizations
    @media (pointer: coarse) {
      min-height: 44px;
      padding: var(--spacing-sm) var(--spacing-md);
    }
  }
}

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: #40444b;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  text-align: left;
  
  .feature-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  span:last-child {
    color: #dcddde;
    font-weight: 500;
  }
}

.error-alert {
  position: fixed;
  bottom: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  
  .error-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: #dc3545;
    color: white;
    border-radius: var(--border-radius-lg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
    
    .error-icon {
      font-size: 1.2rem;
    }
    
    .error-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      margin-left: var(--spacing-md);
      
      &:hover {
        opacity: 0.8;
      }
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

// Tablet breakpoint
@media (max-width: 1024px) {
  .conversation-sidebar {
    width: 300px;
  }
  
  .welcome-content {
    max-width: 400px;
    
    h2 {
      font-size: 1.8rem;
    }
  }
  
  .features-list {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

// Mobile landscape
@media (max-width: 768px) {
  .messages-container {
    flex-direction: column;
    height: calc(100vh - 60px);
  }
  
  .conversation-sidebar {
    border-right: none;
    border-bottom: 1px solid #40444b;
    height: auto;
    min-height: 0;
    
    &.mobile-full {
      width: 100%;
      height: calc(100vh - 60px);
    }
  }
  
  .message-content {
    height: calc(100vh - 60px);
    
    &.mobile-full {
      width: 100%;
      height: calc(100dvh - 80px);
      // height: 100%;
    }
  }
  
  
  .welcome-content {
    padding: var(--spacing-md);
    
    .welcome-icon {
      font-size: 2.5rem;
    }
    
    h2 {
      font-size: 1.4rem;
    }
  }
  
  .features-list {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .feature-item {
    padding: var(--spacing-sm);
    
    .feature-icon {
      font-size: 1.2rem;
    }
    
    span:last-child {
      font-size: 0.85rem;
    }
  }
}

// Mobile portrait
@media (max-width: 480px) {
  
  
  .welcome-content {
    padding: var(--spacing-sm);
    
    .welcome-icon {
      font-size: 2rem;
    }
    
    h2 {
      font-size: 1.2rem;
    }
    
    .welcome-subtitle {
      font-size: 1rem;
    }
  }
  
  .feature-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    gap: var(--spacing-sm);
    
    .feature-icon {
      font-size: 1rem;
    }
    
    span:last-child {
      font-size: 0.8rem;
    }
  }
}

// Large screens
@media (min-width: 1200px) {
  .conversation-sidebar {
    width: 400px;
  }
  
  .welcome-content {
    max-width: 600px;
    
    h2 {
      font-size: 2.2rem;
    }
    
    .welcome-subtitle {
      font-size: 1.2rem;
    }
  }
  
  .features-list {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xl);
  }
}

// Error alert responsive
@media (max-width: 480px) {
  .error-alert {
    left: var(--spacing-sm);
    right: var(--spacing-sm);
    transform: none;
    bottom: var(--spacing-sm);
    
    .error-content {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.85rem;
      
      .error-close {
        font-size: 1.2rem;
        margin-left: var(--spacing-xs);
      }
    }
  }
}

// Ultra-wide screens
@media (min-width: 1600px) {
  .messages-page {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .conversation-sidebar {
    width: 450px;
  }
}
</style>