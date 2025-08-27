<script setup lang="ts">
import { computed, onMounted, watch, nextTick, ref } from 'vue'
import { useMessagingStore, type Conversation, type AutoDeletePeriod } from '../../stores/messaging'
import { useAuthStore } from '../../stores/auth'
import { SUPPORT_USER_ID } from '../../lib/appwrite'
import CryptoJS from 'crypto-js'

interface Props {
  selectedConversationId?: string | null
}

interface Emits {
  (e: 'select-conversation', conversationId: string, receiverId: string, receiverName: string, receiverRole?: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const messagingStore = useMessagingStore()
const authStore = useAuthStore()

// Get online status for conversation participant
const isParticipantOnline = (conversation: Conversation): boolean => {
  const otherParticipant = messagingStore.getOtherParticipant(conversation)
  return messagingStore.isUserOnline(otherParticipant.id)
}

const conversations = computed(() => messagingStore.conversations)
const unreadCount = computed(() => messagingStore.unreadCount)

const formatLastActivity = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

const getUnreadCount = (conversationId: string): number => {
  const messages = messagingStore.getConversationMessages(conversationId)
  return messages.filter(msg => 
    !msg.isRead && msg.receiverId === authStore.user?.$id
  ).length
}

const isOwnLastMessage = (conversation: Conversation): boolean => {
  return conversation.lastMessage?.senderId === authStore.user?.$id
}

const selectConversation = (conversation: Conversation) => {
  const otherParticipant = messagingStore.getOtherParticipant(conversation)
  emit('select-conversation', conversation.$id!, otherParticipant.id, otherParticipant.name, otherParticipant.role)
}

const deleteConversation = async (conversationId: string, event: Event) => {
  event.stopPropagation()
  
  if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
    await messagingStore.deleteConversation(conversationId)
  }
}

const formatAutoDeletePeriod = (period: AutoDeletePeriod): string => {
  switch (period) {
    case 0: return 'Immediately'
    case 5: return '5 minutes'
    case 60: return '1 hour'
    case 1440: return '1 day'
    case 10080: return '1 week'
    case -1: return 'Never'
    default: return '1 day'
  }
}

const formatLastMessage = (conversation: Conversation) => {
  const message = conversation.lastMessage
  if (!message) {
    return {
      icon: '💬',
      text: 'No messages yet',
      isSystem: false,
      senderName: '',
      imageUrl: null
    }
  }

  const isOwn = message.senderId === authStore.user?.$id
  
  // Handle encrypted messages - use local variable for content to avoid mutations
  let messageContent = message.content
  let messageIsEncrypted = message.isEncrypted
  
  // Handle placeholder encrypted messages
  if (messageIsEncrypted && messageContent === '[Encrypted Message]') {
    return {
      icon: '🔒',
      text: 'Encrypted message',
      isSystem: true,
      senderName: '',
      showSender: false,
      imageUrl: null
    }
  }
  
  // Always try to decrypt encrypted messages in preview
  if (messageIsEncrypted && conversation.encryptionKey && messagingStore.decryptMessage) {
    try {
      console.log('Attempting to decrypt message:', {
        conversationId: conversation.$id,
        messageId: message.$id,
        isEncrypted: message.isEncrypted,
        hasEncryptionKey: !!conversation.encryptionKey,
        contentPreview: messageContent.substring(0, 30) + '...',
        encryptionKeyPreview: conversation.encryptionKey.substring(0, 10) + '...'
      })
      
      const decryptedContent = messagingStore.decryptMessage(messageContent, conversation.encryptionKey)
      console.log('Decryption result:', {
        originalLength: messageContent.length,
        decryptedLength: decryptedContent?.length || 0,
        decryptedPreview: decryptedContent?.substring(0, 50) || 'null/empty',
        success: !!decryptedContent && decryptedContent !== messageContent && decryptedContent !== '[Encrypted Message]'
      })
      
      if (decryptedContent && decryptedContent !== '[Encrypted Message]' && decryptedContent.trim() !== '') {
        messageContent = decryptedContent
        messageIsEncrypted = false
        // Update the original message object to persist the decryption
        message.content = decryptedContent
        message.isEncrypted = false
        console.log('Successfully decrypted message in preview for conversation:', conversation.$id)
      } else {
        console.warn('Decryption returned invalid result, trying alternative approach...', { decryptedContent, messageContent })
        
        // Try alternative decryption approach - sometimes the content might have extra prefixes
        try {
          // Check if content has any common encryption prefixes that need to be handled
          let cleanContent = messageContent
          if (cleanContent.startsWith('U2FsdGVkX1')) {
            // This is standard AES encrypted content, try direct CryptoJS decryption
            const bytes = CryptoJS.AES.decrypt(cleanContent, conversation.encryptionKey)
            const altDecrypted = bytes.toString(CryptoJS.enc.Utf8)
            
            if (altDecrypted && altDecrypted.trim() !== '') {
              messageContent = altDecrypted
              messageIsEncrypted = false
              message.content = altDecrypted
              message.isEncrypted = false
              console.log('Successfully decrypted with alternative method for conversation:', conversation.$id)
            }
          }
        } catch (altError) {
          console.error('Alternative decryption also failed:', altError)
        }
      }
    } catch (error) {
      console.error('Failed to decrypt message in conversation preview:', error, {
        messageContent: messageContent.substring(0, 50),
        encryptionKey: conversation.encryptionKey.substring(0, 10) + '...'
      })
      return {
        icon: '🔒',
        text: 'Message could not be decrypted',
        isSystem: true,
        senderName: '',
        showSender: false,
        imageUrl: null
      }
    }
  }
  
  // Check if message content still looks encrypted (fallback detection)
  if (messageContent && typeof messageContent === 'string' && 
      (messageContent.startsWith('U2FsdGVkX1') || // AES encryption prefix
       (messageContent.includes('=') && messageContent.length > 50 && !messageContent.includes(' ')))) { // Looks like base64 encrypted
    
    console.warn('Message still appears encrypted after decryption attempt:', {
      conversationId: conversation.$id,
      messageId: message.$id,
      hasEncryptionKey: !!conversation.encryptionKey,
      contentPreview: messageContent.substring(0, 20) + '...'
    })
    
    return {
      icon: '🔒',
      text: 'Message decryption failed',
      isSystem: true,
      senderName: '',
      showSender: false,
      imageUrl: null
    }
  }
  
  // Get sender name/role for display
  let senderName = ''
  if (!isOwn) {
    // Get sender info from conversation participants
    const senderRole = conversation.participantRoles?.[message.senderId]
    if (senderRole === 'support') {
      senderName = 'Support'
    } else if (senderRole === 'escort') {
      senderName = 'Escort'
    } else if (senderRole === 'client') {
      senderName = 'Client'
    } else {
      // Fallback to showing last 4 characters of sender ID
      senderName = `User ${message.senderId.slice(-4)}`
    }
  }

  switch (message.type) {
    case 'image':
      return {
        icon: '🖼️',
        text: 'Photo',
        isSystem: false,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
    case 'video':
      return {
        icon: '🎥',
        text: 'Video',
        isSystem: false,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
    case 'voice':
      return {
        icon: '🎤',
        text: 'Voice message',
        isSystem: false,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
    case 'file':
      return {
        icon: '📎',
        text: messageContent || 'File', 
        isSystem: false,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
    case 'call_request':
      // Parse call type from message content if available
      const isVideo = messageContent?.includes('video')
      return {
        icon: isVideo ? '📹' : '📞',
        text: isVideo ? 'started a video call' : 'started a voice call',
        isSystem: true,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
    case 'system':
      // Handle different system message types with appropriate icons
      const content = messageContent.toLowerCase()
      let icon = 'ℹ️'
      
      if (content.includes('call ended')) {
        icon = '📞'
      } else if (content.includes('call missed')) {
        icon = '📵'
      } else if (content.includes('call answered')) {
        icon = content.includes('video') ? '📹' : '📞'
      } else if (content.includes('video call')) {
        icon = '📹'
      } else if (content.includes('voice call')) {
        icon = '📞'
      }
      
      return {
        icon: icon,
        text: messageContent,
        isSystem: true,
        senderName: '',  // System messages don't have a specific sender
        imageUrl: null
      }
    case 'text':
    default:
      return {
        icon: '',
        text: messageContent,
        isSystem: false,
        senderName: isOwn ? 'You' : senderName,
        showSender: true,
        imageUrl: null
      }
  }
}

const refreshConversations = async () => {
  await messagingStore.loadConversations()
}

const fixEncryptionKeys = async () => {
  console.log('Fixing encryption keys...')
  await messagingStore.fixConversationEncryptionKeys()
  console.log('Encryption keys fixed, refreshing view...')
}

// Tab navigation
const activeTab = ref('all')

const filterConversations = computed(() => {
  if (activeTab.value === 'all') return conversations.value
  if (activeTab.value === 'groups') {
    return conversations.value.filter(conv => 
      conv.conversationType?.includes('support')
    )
  }
  if (activeTab.value === 'people') {
    return conversations.value.filter(conv => 
      !conv.conversationType?.includes('support')
    )
  }
  return conversations.value
})

// Debug function to test decryption manually
const debugDecryption = () => {
  console.log('=== DECRYPTION DEBUG ===')
  console.log('Total conversations:', conversations.value.length)
  
  conversations.value.forEach((conv, index) => {
    console.log(`\n--- Conversation ${index + 1} (${conv.$id}) ---`)
    console.log('Has last message:', !!conv.lastMessage)
    console.log('Has encryption key:', !!conv.encryptionKey)
    
    if (conv.lastMessage) {
      console.log('Message details:', {
        id: conv.lastMessage.$id,
        type: conv.lastMessage.type,
        isEncrypted: conv.lastMessage.isEncrypted,
        contentLength: conv.lastMessage.content?.length || 0,
        contentPreview: conv.lastMessage.content?.substring(0, 50) + '...',
        contentStartsWithAES: conv.lastMessage.content?.startsWith('U2FsdGVkX1'),
        senderId: conv.lastMessage.senderId,
        receiverId: conv.lastMessage.receiverId
      })
      
      if (conv.encryptionKey) {
        console.log('Encryption key details:', {
          length: conv.encryptionKey.length,
          preview: conv.encryptionKey.substring(0, 20) + '...',
          type: typeof conv.encryptionKey
        })
        
        // Test if messagingStore.decryptMessage works
        if (messagingStore.decryptMessage) {
          try {
            const storeResult = messagingStore.decryptMessage(conv.lastMessage.content, conv.encryptionKey)
            console.log('Store decryptMessage result:', {
              result: storeResult,
              length: storeResult?.length || 0,
              preview: storeResult?.substring(0, 50) || 'null',
              isPlaceholder: storeResult === '[Encrypted Message]'
            })
          } catch (storeErr) {
            console.log('Store decryptMessage failed:', storeErr)
          }
        }
        
        // Also check what the encryption key looks like
        console.log('Checking encryption key format:', {
          keyLength: conv.encryptionKey.length,
          keyLooksLikeSHA256: /^[a-f0-9]{64}$/i.test(conv.encryptionKey),
          keyPreview: conv.encryptionKey.substring(0, 20) + '...'
        })
        
        // Try manual decryption with CryptoJS
        try {
          const testDecrypt = CryptoJS.AES.decrypt(conv.lastMessage.content, conv.encryptionKey)
          const testResult = testDecrypt.toString(CryptoJS.enc.Utf8)
          console.log('Manual CryptoJS result:', {
            result: testResult,
            length: testResult.length,
            isEmpty: testResult.trim() === '',
            preview: testResult.substring(0, 50) || 'empty'
          })
        } catch (err) {
          console.log('Manual CryptoJS failed:', err)
        }
        
        // Test encryption/decryption with same key
        console.log('\nTesting encryption/decryption with conversation key:')
        try {
          const testMessage = 'Test message for debugging'
          const encrypted = CryptoJS.AES.encrypt(testMessage, conv.encryptionKey).toString()
          const decrypted = CryptoJS.AES.decrypt(encrypted, conv.encryptionKey).toString(CryptoJS.enc.Utf8)
          console.log('Test encryption/decryption:', {
            original: testMessage,
            encrypted: encrypted.substring(0, 30) + '...',
            decrypted: decrypted,
            success: testMessage === decrypted
          })
        } catch (testErr) {
          console.log('Test encryption/decryption failed:', testErr)
        }
      }
    }
  })
  
  console.log('=== END DEBUG ===\n')
}

// Watch for changes in conversations to trigger re-evaluation and force decryption
watch(() => messagingStore.conversations, (newConversations) => {
  // Force reactivity by triggering a nextTick
  nextTick(() => {
    // Check if any conversation has encrypted messages that need attention
    const encryptedConversations = newConversations.filter(conv => 
      conv.lastMessage && 
      (conv.lastMessage.content === '[Encrypted Message]' || 
       (conv.lastMessage.isEncrypted && conv.lastMessage.content && 
        conv.lastMessage.content.startsWith('U2FsdGVkX1')))
    )
    
    if (encryptedConversations.length > 0) {
      console.log(`Found ${encryptedConversations.length} conversations with encrypted messages, attempting to decrypt...`)
      
      // Try to decrypt each encrypted message
      encryptedConversations.forEach(conv => {
        if (conv.lastMessage && conv.encryptionKey && messagingStore.decryptMessage) {
          try {
            const decryptedContent = messagingStore.decryptMessage(conv.lastMessage.content, conv.encryptionKey)
            if (decryptedContent && decryptedContent !== '[Encrypted Message]' && decryptedContent !== conv.lastMessage.content) {
              conv.lastMessage.content = decryptedContent
              conv.lastMessage.isEncrypted = false
              console.log(`Successfully decrypted message for conversation ${conv.$id}`)
            }
          } catch (error) {
            console.error(`Failed to decrypt message for conversation ${conv.$id}:`, error)
          }
        }
      })
    }
  })
}, { deep: true })

onMounted(async () => {
  await messagingStore.loadConversations()
  
  // Add a retry mechanism for encrypted messages
  setTimeout(() => {
    const hasEncryptedMessages = conversations.value.some(conv => 
      conv.lastMessage && 
      (conv.lastMessage.content === '[Encrypted Message]' ||
       (conv.lastMessage.isEncrypted && conv.lastMessage.content))
    )
    
    if (hasEncryptedMessages) {
      console.log('Found encrypted messages, retrying conversation load...')
      console.log('Current conversations state:', conversations.value.map(c => ({
        id: c.$id,
        hasLastMessage: !!c.lastMessage,
        lastMessageEncrypted: c.lastMessage?.isEncrypted,
        hasEncryptionKey: !!c.encryptionKey,
        lastMessagePreview: c.lastMessage?.content?.substring(0, 30)
      })))
      refreshConversations()
      
      // Also run debug after a short delay
      setTimeout(() => {
        debugDecryption()
      }, 1000)
    }
  }, 2000)
})
</script>

<template>
  <div class="conversation-list">
    <div class="list-header">
      <h2>Chats</h2>
      <div class="header-actions">
        <button class="action-btn" title="New conversation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="action-btn" title="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="action-btn more-btn" title="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="19" r="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="discover-banner">
      <div class="banner-content">
        <h3>🎯 Discover More Groups</h3>
        <p>Tingkatkan skills & networking</p>
      </div>
      <div class="banner-decoration">
        <span class="star">✨</span>
        <span class="star">⭐</span>
        <span class="star">✨</span>
      </div>
    </div>
    
    <div class="filter-tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        All
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'groups' }"
        @click="activeTab = 'groups'"
      >
        Groups
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'people' }"
        @click="activeTab = 'people'"
      >
        People
      </button>
    </div>
    
    <div class="messages-section">
      <h3 class="section-title">All Messages ({{ filterConversations.length }})</h3>
    
      <div v-if="conversations.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>No conversations yet</h3>
        <p>Start messaging for secure, encrypted communication</p>
      </div>
    
      <div v-else class="conversations">
        <div
          v-for="conversation in filterConversations"
          :key="conversation.$id"
          class="conversation-item"
          :class="{ 'selected': props.selectedConversationId === conversation.$id }"
          @click="selectConversation(conversation)"
        >
          <div class="avatar-container">
            <div class="conversation-avatar" :class="`role-${messagingStore.getOtherParticipant(conversation).role}`">
              <span class="avatar-text">{{ messagingStore.getOtherParticipant(conversation).name.charAt(0).toUpperCase() }}</span>
            </div>
            <span class="online-status" :class="{ 'online': isParticipantOnline(conversation) }"></span>
          </div>
        
          <div class="conversation-content">
            <div class="conversation-header">
              <h4 class="participant-name">
                {{ messagingStore.getOtherParticipant(conversation).name }}
              </h4>
              <div class="header-right">
                <span class="last-activity">
                  {{ formatLastActivity(conversation.lastActivity) }}
                </span>
                <span v-if="getUnreadCount(conversation.$id!) > 0" class="unread-indicator">
                  {{ getUnreadCount(conversation.$id!) }}
                </span>
              </div>
            </div>
            
            <div class="last-message" :class="{ 
              'own-message': isOwnLastMessage(conversation)
            }">
              <span v-if="formatLastMessage(conversation).icon" class="message-icon">
                {{ formatLastMessage(conversation).icon }}
              </span>
              <span class="message-text">{{ formatLastMessage(conversation).text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped lang="scss">
.conversation-list {
  height: 100%;
  background: #313338;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #313338;
  border-bottom: 1px solid #26282c;
  
  h2 {
    margin: 0;
    color: #f2f3f5;
    font-size: 1.25rem;
    font-weight: 600;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  width: 32px;
  height: 32px;
  background: #404249;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #b5bac1;
  transition: all 0.2s ease;
  
  &:hover {
    background: #4e5058;
    color: #dbdee1;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.discover-banner {
  margin: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #5865f2 0%, #7289da 100%);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  
  .banner-content {
    position: relative;
    z-index: 1;
    
    h3 {
      margin: 0 0 4px 0;
      color: white;
      font-size: 0.95rem;
      font-weight: 600;
    }
    
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.85rem;
    }
  }
  
  .banner-decoration {
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    display: flex;
    gap: 8px;
    
    .star {
      font-size: 1.2rem;
      animation: sparkle 1.5s ease-in-out infinite;
      
      &:nth-child(2) {
        animation-delay: 0.5s;
      }
      
      &:nth-child(3) {
        animation-delay: 1s;
      }
    }
  }
}

@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  margin-bottom: 8px;
  
  .tab {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #949ba4;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: #3f4147;
      color: #dbdee1;
    }
    
    &.active {
      background: #404249;
      color: #f2f3f5;
    }
  }
}

.messages-section {
  padding: 0 8px;
  
  .section-title {
    margin: 0;
    padding: 8px 12px;
    color: #949ba4;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: #949ba4;
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #dbdee1;
  }
  
  p {
    margin: 0;
    max-width: 300px;
    line-height: 1.5;
  }
}

.conversations {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #1e1f22;
    border-radius: 4px;
    border: 2px solid #313338;
  }
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin: 0 8px 2px;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  &:hover {
    background: #393c41;
  }
  
  &:active {
    background: #3f4147;
  }
  
  &.active {
    background: #404249;
  }
  
  &.selected {
    background: #5865f2;
    
    &:hover {
      background: #4752c4;
    }
    
    .participant-name {
      color: #ffffff;
    }
    
    .last-activity,
    .last-message {
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.conversation-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #5865f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  position: relative;
  overflow: hidden;
  
  &.role-support {
    background: #3ba55c;
  }
  
  &.role-escort {
    background: #faa81a;
  }
  
  &.role-client {
    background: #5865f2;
  }
  
  .avatar-text {
    text-transform: uppercase;
  }
}

.online-status {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #80848e;
  border: 3px solid #313338;
  transition: all 0.3s ease;
  
  &.online {
    background: #23a559;
    box-shadow: 0 0 4px rgba(35, 165, 89, 0.4);
  }
  
  &.busy {
    background: #f23f43;
    box-shadow: 0 0 4px rgba(242, 63, 67, 0.4);
  }
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
  
  .participant-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
    color: #f2f3f5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .last-activity {
    font-size: 0.75rem;
    color: #949ba4;
    white-space: nowrap;
  }
}

.last-message {
  font-size: 0.875rem;
  color: #949ba4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &.own-message {
    .message-text::before {
      content: 'You: ';
      color: #949ba4;
    }
  }
  
  
  .message-icon {
    font-size: 0.85rem;
    flex-shrink: 0;
  }
  
  .message-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.unread-indicator {
  background: #f23f43;
  color: white;
  border-radius: 10px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

// Responsive adjustments
@media (max-width: 768px) {
  .list-header {
    padding: 12px 16px;
    
    h2 {
      font-size: 1.1rem;
    }
  }
  
  .discover-banner {
    margin: 12px;
    padding: 12px;
    
    h3 {
      font-size: 0.9rem;
    }
    
    p {
      font-size: 0.8rem;
    }
  }
  
  .conversation-item {
    padding: 8px;
    margin: 0 4px 1px;
  }
  
  .conversation-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
  
  .online-status {
    width: 12px;
    height: 12px;
    border-width: 2px;
  }
  
  .conversation-header {
    .participant-name {
      font-size: 0.9rem;
    }
    
    .last-activity {
      font-size: 0.7rem;
    }
  }
  
  .last-message {
    font-size: 0.8rem;
  }
}
</style>