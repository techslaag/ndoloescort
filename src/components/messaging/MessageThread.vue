<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useMessagingStore, AUTO_DELETE_PERIODS, type Message, type AutoDeletePeriod } from '../../stores/messaging'
import { useAuthStore } from '../../stores/auth'
import { realtimeService } from '../../services/realtimeService'
import { storage, MEDIA_BUCKET_ID } from '../../lib/appwrite'
import { ID } from 'appwrite'
import MessageBubble from './MessageBubble.vue'
import MessageInput from './MessageInput.vue'
import CallManager from './CallManager.vue'

interface Props {
  conversationId: string
  receiverId: string
  receiverName: string
  receiverRole?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  back: []
}>()

const router = useRouter()
const messagingStore = useMessagingStore()
const authStore = useAuthStore()

// Computed properties for user presence
const isReceiverOnline = computed(() => messagingStore.isUserOnline(props.receiverId))
const receiverStatus = computed(() => messagingStore.getLastSeenText(props.receiverId))
const receiverPresence = computed(() => messagingStore.getUserPresence(props.receiverId))

const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()
const autoDeletePeriod = ref<AutoDeletePeriod>(AUTO_DELETE_PERIODS.NEVER)
const messageText = ref('')
const isTyping = ref(false)
const isRecording = ref(false)
const recordingTime = ref(0)
const recordingTimer = ref<NodeJS.Timer | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const showEmojiPicker = ref(false)
const attachmentInput = ref<HTMLInputElement>()
const replyingTo = ref<Message | null>(null)
const contextMenuState = ref({
  visible: false,
  messageId: '',
  position: { x: 0, y: 0 },
  message: null as Message | null
})
const reactionPickerState = ref({
  visible: false,
  position: { x: 0, y: 0 },
  messageId: ''
})

// Quick reaction emojis (Telegram style)
const quickEmojis = ['👍', '👎', '❤️', '😂', '😍', '😢', '😡', '🔥', '👏', '🎉', '💯', '🤔']

const messages = computed(() => messagingStore.getConversationMessages(props.conversationId))

// Optimized scroll to bottom with requestAnimationFrame
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    requestAnimationFrame(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    })
  }
}

// Throttle function for performance
function throttle(func: Function, limit: number) {
  let inThrottle: boolean
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

const handleSendMessage = async (content: string, type: Message['type'] = 'text', attachmentData?: { url: string; mimeType: string; size: number }) => {
  console.log('Sending message with attachment data:', {
    type,
    hasAttachment: !!attachmentData,
    attachmentUrl: attachmentData?.url,
    replyingTo: replyingTo.value?.$id
  })
  
  const success = await messagingStore.sendMessage(
    props.receiverId,
    content,
    type,
    autoDeletePeriod.value,
    props.receiverRole,
    attachmentData,
    replyingTo.value?.$id
  )
  
  if (success) {
    replyingTo.value = null // Clear reply after sending
    scrollToBottom()
  } else if (messagingStore.error) {
    // Show error to user
    alert(messagingStore.error)
  }
}

const handleQuickSend = () => {
  if (messageText.value.trim()) {
    handleSendMessage(messageText.value.trim())
    messageText.value = ''
    adjustTextareaHeight()
  }
}

// Handle enter key for sending (shift+enter for new line)
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleQuickSend()
  }
}


// Auto-resize textarea
const adjustTextareaHeight = () => {
  if (messageInput.value) {
    // Reset to default height if empty
    if (!messageInput.value.value || messageInput.value.value.trim() === '') {
      messageInput.value.style.height = '36px' // Default height
      return
    }
    
    messageInput.value.style.height = 'auto'
    const maxHeight = 120 // Max 5 lines approximately
    const newHeight = Math.min(messageInput.value.scrollHeight, maxHeight)
    messageInput.value.style.height = `${newHeight}px`
  }
}

// Voice recording functions
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []
    
    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }
    
    mediaRecorder.value.onstop = async () => {
      const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
      await sendVoiceMessage(audioBlob)
      stream.getTracks().forEach(track => track.stop())
    }
    
    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0
    
    // Start timer
    recordingTimer.value = setInterval(() => {
      recordingTime.value++
      // Auto-stop at 5 minutes (300 seconds)
      if (recordingTime.value >= 300) {
        stopRecording()
      }
    }, 1000)
  } catch (err) {
    console.error('Failed to start recording:', err)
    alert('Could not access microphone. Please check permissions.')
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
  }
}

const cancelRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    audioChunks.value = []
    
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
    
    // Stop all tracks
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
  }
}

const sendVoiceMessage = async (audioBlob: Blob) => {
  try {
    // Show loading state
    messagingStore.isLoading = true
    
    // Create a File object from the blob
    const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    
    // Upload to Appwrite storage
    const uploadedFile = await storage.createFile(
      MEDIA_BUCKET_ID,
      ID.unique(),
      audioFile
    )
    
    console.log('Voice file uploaded:', {
      fileId: uploadedFile.$id,
      fileName: uploadedFile.name,
      bucketId: MEDIA_BUCKET_ID
    })
    
    // Get file URL
    const fileUrl = storage.getFileView(MEDIA_BUCKET_ID, uploadedFile.$id)
    const fileUrlString = fileUrl.href || fileUrl.toString()
    
    console.log('Voice file URL:', {
      url: fileUrlString,
      urlType: typeof fileUrl,
      urlObject: fileUrl
    })
    
    // Store duration in content field as a simple string
    const messageContent = `Voice message (${recordingTime.value}s)`
    
    // Send message with attachment data
    await handleSendMessage(
      messageContent, 
      'voice',
      {
        url: fileUrlString,
        mimeType: 'audio/webm',
        size: audioBlob.size
      }
    )
  } catch (error) {
    console.error('Voice message upload failed:', error)
    alert('Failed to send voice message. Please try again.')
  } finally {
    messagingStore.isLoading = false
  }
}

// Format recording time
const formattedRecordingTime = computed(() => {
  const minutes = Math.floor(recordingTime.value / 60)
  const seconds = recordingTime.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Handle file attachment
const handleFileAttachment = () => {
  attachmentInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    try {
      // Show loading state
      messagingStore.isLoading = true
      
      // Upload file to Appwrite storage
      const uploadedFile = await storage.createFile(
        MEDIA_BUCKET_ID,
        ID.unique(),
        file
      )
      
      // Get file URL
      const fileUrl = storage.getFileView(MEDIA_BUCKET_ID, uploadedFile.$id)
      const fileUrlString = fileUrl.href || fileUrl.toString()
      console.log('File uploaded, URL:', fileUrlString)
      console.log('File details:', {
        id: uploadedFile.$id,
        name: file.name,
        type: file.type,
        size: file.size
      })
      
      // For media messages, store the filename in the content field
      const messageContent = file.name
      
      // Determine message type based on file type
      let messageType: Message['type'] = 'file'
      if (file.type.startsWith('image/')) {
        messageType = 'image'
      } else if (file.type.startsWith('video/')) {
        messageType = 'video'
      }
      
      // Send message with attachment data
      await handleSendMessage(
        messageContent, 
        messageType,
        {
          url: fileUrlString,
          mimeType: file.type,
          size: file.size
        }
      )
      
      // Clear input
      if (attachmentInput.value) {
        attachmentInput.value.value = ''
      }
    } catch (error) {
      console.error('File upload failed:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      messagingStore.isLoading = false
    }
  }
}

// Handle emoji selection
const handleEmojiSelect = (emoji: string) => {
  messageText.value += emoji
  showEmojiPicker.value = false
  messageInput.value?.focus()
}

// Simulate typing indicator (in real app, this would come from realtime service)
const simulateTyping = () => {
  isTyping.value = true
  setTimeout(() => {
    isTyping.value = false
  }, 3000)
}

// Handle reply to message
const handleReplyTo = (message: Message) => {
  replyingTo.value = message
}

// Cancel reply
const cancelReply = () => {
  replyingTo.value = null
}

// Handle context menu from MessageBubble
const handleShowContextMenu = (messageId: string, position: { x: number, y: number }) => {
  const message = messages.value.find(m => m.$id === messageId || m.tempId === messageId)
  if (message) {
    // Improved mobile positioning
    const isMobile = window.innerWidth <= 768
    const menuWidth = isMobile ? 220 : 180
    const menuHeight = isMobile ? 250 : 200
    const margin = isMobile ? 16 : 20
    
    // Calculate centered position for mobile
    let adjustedX: number, adjustedY: number
    
    if (isMobile) {
      // Center horizontally on mobile
      adjustedX = (window.innerWidth - menuWidth) / 2
      // Position slightly above center vertically
      adjustedY = Math.min(position.y - 50, window.innerHeight - menuHeight - margin)
    } else {
      // Desktop positioning
      adjustedX = Math.min(position.x, window.innerWidth - menuWidth - margin)
      adjustedY = Math.min(position.y, window.innerHeight - menuHeight - margin)
    }
    
    contextMenuState.value = {
      visible: true,
      messageId,
      position: { 
        x: Math.max(margin, adjustedX), 
        y: Math.max(margin, adjustedY) 
      },
      message
    }
  }
}

// Hide context menu
const handleHideContextMenu = () => {
  contextMenuState.value = {
    visible: false,
    messageId: '',
    position: { x: 0, y: 0 },
    message: null
  }
  reactionPickerState.value = {
    visible: false,
    position: { x: 0, y: 0 },
    messageId: ''
  }
}

// Context menu actions
const handleContextReply = () => {
  if (contextMenuState.value.message) {
    replyingTo.value = contextMenuState.value.message
  }
  handleHideContextMenu()
}

const handleContextReact = () => {
  if (contextMenuState.value.message) {
    const isMobile = window.innerWidth <= 768
    
    // Better positioning for mobile
    let pickerX: number, pickerY: number
    
    if (isMobile) {
      // Center horizontally on mobile
      const pickerWidth = Math.min(window.innerWidth - 32, 400)
      pickerX = (window.innerWidth - pickerWidth) / 2
      // Position in lower third of screen for easy thumb access
      pickerY = window.innerHeight * 0.6
    } else {
      // Desktop positioning - above context menu
      pickerX = contextMenuState.value.position.x
      pickerY = contextMenuState.value.position.y - 60
    }
    
    reactionPickerState.value = {
      visible: true,
      position: {
        x: pickerX,
        y: pickerY
      },
      messageId: contextMenuState.value.messageId
    }
    // Hide context menu but keep reaction picker open
    contextMenuState.value.visible = false
  }
}

// Check if current user has reacted with a specific emoji on a message
const hasUserReacted = (emoji: string): boolean => {
  if (!authStore.user?.$id || !reactionPickerState.value.messageId) return false
  
  const message = messages.value.find(m => 
    m.$id === reactionPickerState.value.messageId || 
    m.tempId === reactionPickerState.value.messageId
  )
  
  if (!message || !message.reactions) return false
  
  // Use reactionsRaw if available
  if (message.reactionsRaw) {
    let reactions: Record<string, string[]> = {}
    
    if (typeof message.reactionsRaw === 'string') {
      try {
        reactions = JSON.parse(message.reactionsRaw)
      } catch {
        return false
      }
    } else if (typeof message.reactionsRaw === 'object') {
      reactions = message.reactionsRaw as Record<string, string[]>
    }
    
    return reactions[emoji]?.includes(authStore.user.$id) || false
  }
  
  return false
}

// Handle emoji reaction selection
const handleEmojiReaction = async (emoji: string) => {
  // Light haptic feedback on mobile
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
  
  const message = messages.value.find(m => 
    m.$id === reactionPickerState.value.messageId || 
    m.tempId === reactionPickerState.value.messageId
  )
  
  if (message && message.$id) {
    await messagingStore.toggleMessageReaction(message.$id, message.conversationId, emoji)
  }
  
  // Hide reaction picker
  reactionPickerState.value = {
    visible: false,
    position: { x: 0, y: 0 },
    messageId: ''
  }
}

// Add haptic feedback helper
const hapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator && window.innerWidth <= 768) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    }
    navigator.vibrate(patterns[intensity])
  }
}

// Handle back button click
const handleBackClick = () => {
  // Emit back event for parent to handle
  emit('back')
  
  // Also navigate using router
  router.push({ name: 'Messages' })
}

const handleContextResend = async () => {
  if (contextMenuState.value.message && contextMenuState.value.message.sendingState === 'failed') {
    await messagingStore.resendMessage(contextMenuState.value.message)
  }
  handleHideContextMenu()
}

const handleContextDelete = async () => {
  if (contextMenuState.value.message) {
    const messageId = contextMenuState.value.message.$id || contextMenuState.value.message.tempId
    if (messageId) {
      await messagingStore.deleteMessage(messageId, contextMenuState.value.message.conversationId)
    }
  }
  handleHideContextMenu()
}

// Handle keyboard events for context menu
const handleContextMenuKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && (contextMenuState.value.visible || reactionPickerState.value.visible)) {
    handleHideContextMenu()
  }
}

const formatAutoDeletePeriod = (period: AutoDeletePeriod): string => {
  switch (period) {
    case AUTO_DELETE_PERIODS.IMMEDIATE:
      return 'Immediately'
    case AUTO_DELETE_PERIODS.FIVE_MINUTES:
      return '5 minutes'
    case AUTO_DELETE_PERIODS.ONE_HOUR:
      return '1 hour'
    case AUTO_DELETE_PERIODS.ONE_DAY:
      return '1 day'
    case AUTO_DELETE_PERIODS.ONE_WEEK:
      return '1 week'
    case AUTO_DELETE_PERIODS.NEVER:
      return 'Never'
    default:
      return '1 day'
  }
}

let messageUnsubscribe: (() => void) | null = null
let isLoadingMore = false

// Watch for new messages to scroll to bottom
watch(() => messages.value.length, (newLength, oldLength) => {
  // Only auto-scroll if user sent the message or is near bottom
  if (messagesContainer.value && newLength > oldLength) {
    const isNearBottom = messagesContainer.value.scrollHeight - messagesContainer.value.scrollTop - messagesContainer.value.clientHeight < 100
    const lastMessage = messages.value[messages.value.length - 1]
    const userSentMessage = lastMessage?.senderId === authStore.user?.$id
    
    if (userSentMessage || isNearBottom) {
      nextTick(() => scrollToBottom())
    }
  }
})

onMounted(async () => {
  // Set active conversation
  messagingStore.activeConversation = props.conversationId
  
  // Load initial messages
  await messagingStore.loadMessages(props.conversationId)
  scrollToBottom()
  
  // Subscribe to realtime messages for this conversation
  messageUnsubscribe = realtimeService.subscribeToMessages(props.conversationId)
  
  // Add keyboard event listener for context menu
  document.addEventListener('keydown', handleContextMenuKeyDown)
  
  // Add touch handling for mobile scroll optimization
  if (messagesContainer.value) {
    let isScrolling = false
    
    messagesContainer.value.addEventListener('touchstart', () => {
      isScrolling = true
    }, { passive: true })
    
    messagesContainer.value.addEventListener('touchend', () => {
      setTimeout(() => {
        isScrolling = false
      }, 100)
    }, { passive: true })
    
    // Optimize scroll performance on mobile
    messagesContainer.value.addEventListener('scroll', async () => {
      if (!isScrolling) return
      
      // Add momentum scrolling for iOS
      messagesContainer.value!.style.webkitOverflowScrolling = 'touch'
      
      // Load more messages when scrolling to top
      if (messagesContainer.value!.scrollTop < 100 && !isLoadingMore && messages.value.length >= 50) {
        isLoadingMore = true
        const oldScrollHeight = messagesContainer.value!.scrollHeight
        
        await messagingStore.loadMessages(props.conversationId, 50, messages.value.length)
        
        // Maintain scroll position
        nextTick(() => {
          if (messagesContainer.value) {
            const newScrollHeight = messagesContainer.value.scrollHeight
            messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight
          }
          isLoadingMore = false
        })
      }
    }, { passive: true })
  }
})

onUnmounted(() => {
  // Clear active conversation
  messagingStore.activeConversation = null
  
  // Unsubscribe from realtime messages
  if (messageUnsubscribe) {
    messageUnsubscribe()
  }
  
  // Remove keyboard event listener
  document.removeEventListener('keydown', handleContextMenuKeyDown)
})

onUnmounted(() => {
  // Mark messages as read when leaving
  messages.value.forEach(message => {
    if (!message.isRead && message.receiverId === authStore.user?.$id) {
      messagingStore.markMessageAsRead(message.$id!)
    }
  })
})
</script>

<template>
  <div class="message-thread">
    <!-- Thread Header -->
    <div class="thread-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBackClick" title="Back to chats">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div class="user-info">
          <div class="user-avatar" :class="`role-${receiverRole || 'client'}`">
            <span class="avatar-text">{{ receiverName.charAt(0).toUpperCase() }}</span>
            <span class="online-indicator" :class="{ 
              'online': receiverPresence?.isOnline && receiverPresence?.status === 'online',
              'busy': receiverPresence?.isOnline && receiverPresence?.status === 'busy',
              'away': receiverPresence?.isOnline && receiverPresence?.status === 'away'
            }"></span>
          </div>
          
          <div class="user-details">
            <h3 class="user-name">{{ receiverName }}</h3>
            <p class="user-status">{{ receiverStatus }}</p>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <button class="action-btn" @click="startCall('voice')" title="Voice call">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
          </svg>
        </button>
        
        <button class="action-btn" @click="startCall('video')" title="Video call">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
          </svg>
        </button>
        
        <button class="action-btn more-btn" title="More options">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2" fill="currentColor"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <circle cx="12" cy="19" r="2" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>


    <!-- Messages Container -->
    <div class="chat-content">
      <div 
        ref="messagesContainer"
        class="messages-container"
      >
        <div class="channel-intro">
          <div class="channel-icon-large">#</div>
          <h1>Welcome to #{{ receiverName }}!</h1>
          <p>This is the start of your conversation with {{ receiverName }}</p>
        </div>

        <MessageBubble
          v-for="message in messages"
          :key="message.$id"
          :message="message"
          :is-own="message.senderId === authStore.user?.$id"
          :class="{ 'blurred': contextMenuState.visible && (contextMenuState.messageId !== message.$id && contextMenuState.messageId !== message.tempId) }"
          @reply="handleReplyTo"
          @show-context-menu="handleShowContextMenu"
          @hide-context-menu="handleHideContextMenu"
        />
        
        <!-- Typing Indicator -->
        <div v-if="isTyping" class="typing-indicator">
          <div class="typing-avatar">
            <span>{{ receiverName.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="typing-content">
            <span class="typing-user">{{ receiverName }}</span> is typing...
          </div>
        </div>
      </div>
    </div>

    <!-- Reply Preview - WhatsApp Style -->
    <div v-if="replyingTo" class="reply-preview-container">
      <div class="reply-preview-wrapper">
        <div class="reply-left">
          <div class="reply-bar"></div>
          <div class="reply-content">
            <div class="reply-sender">{{ replyingTo.senderId === authStore.user?.$id ? 'You' : receiverName }}</div>
            <div class="reply-message">
              <!-- Text message -->
              <span v-if="replyingTo.type === 'text'" class="reply-text">{{ replyingTo.content }}</span>
              
              <!-- Image message -->
              <div v-else-if="replyingTo.type === 'image'" class="reply-media-content">
                <div class="reply-media-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span class="reply-media-text">Photo</span>
              </div>
              
              <!-- Video message -->
              <div v-else-if="replyingTo.type === 'video'" class="reply-media-content">
                <div class="reply-media-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" stroke-width="2"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span class="reply-media-text">Video</span>
              </div>
              
              <!-- Voice message -->
              <div v-else-if="replyingTo.type === 'voice'" class="reply-media-content">
                <div class="reply-media-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span class="reply-media-text">Voice message</span>
              </div>
              
              <!-- File message -->
              <div v-else-if="replyingTo.type === 'file'" class="reply-media-content">
                <div class="reply-media-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                    <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span class="reply-media-text">{{ replyingTo.content || 'Document' }}</span>
              </div>
              
              <!-- Other message types -->
              <span v-else class="reply-text">{{ replyingTo.content }}</span>
            </div>
          </div>
        </div>
        
        <button class="reply-close-btn" @click="cancelReply" title="Cancel reply">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <!-- Recording UI -->
      <div v-if="isRecording" class="recording-wrapper">
        <button class="input-btn cancel-recording-btn" @click="cancelRecording" title="Cancel recording">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="recording-indicator">
          <span class="recording-dot"></span>
          <span class="recording-time">{{ formattedRecordingTime }}</span>
          <span class="recording-text">Recording voice message...</span>
        </div>
        <button class="send-btn" @click="stopRecording" title="Send voice message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <!-- Normal Input UI -->
      <div v-else class="input-wrapper">
        <!-- Emoji Picker -->
        <div class="emoji-picker-wrapper" v-if="showEmojiPicker">
          <div class="emoji-picker">
            <div class="emoji-grid">
              <button 
                v-for="emoji in ['😀', '😂', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '❤️', '💔', '🎉', '🔥', '💯', '🙏']"
                :key="emoji"
                @click="handleEmojiSelect(emoji)"
                class="emoji-btn"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
        
        <button class="input-btn emoji-btn" @click="showEmojiPicker = !showEmojiPicker" title="Emoji">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <textarea
          ref="messageInput"
          v-model="messageText"
          @input="adjustTextareaHeight"
          @keydown="handleKeyDown"
          placeholder="Message"
          class="message-input"
          :disabled="messagingStore.isLoading"
          rows="1"
        ></textarea>
        
        <!-- Hidden file input -->
        <input 
          ref="attachmentInput"
          type="file" 
          @change="handleFileSelect" 
          style="display: none"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        >
        
        <button class="input-btn attachment-btn" @click="handleFileAttachment" title="Attach file">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <button 
          v-if="messageText.trim()" 
          class="send-btn" 
          @click="handleQuickSend"
          title="Send message"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button 
          v-else 
          class="input-btn voice-btn" 
          @click="startRecording"
          title="Voice message"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Telegram-style Context Menu Overlay -->
    <div 
      v-if="contextMenuState.visible || reactionPickerState.visible" 
      class="context-menu-overlay"
      @click="handleHideContextMenu"
      @contextmenu.prevent="handleHideContextMenu"
    >
      <!-- Global Context Menu -->
      <div 
        v-if="contextMenuState.visible"
        class="telegram-context-menu" 
        :style="{
          left: contextMenuState.position.x + 'px',
          top: contextMenuState.position.y + 'px'
        }"
        @click.stop
      >
        <button @click="() => { hapticFeedback('light'); handleContextReply(); }" class="context-menu-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor"/>
          </svg>
          Reply
        </button>
        <button @click="() => { hapticFeedback('light'); handleContextReact(); }" class="context-menu-item">
          <span class="emoji-icon">😊</span>
          React
        </button>
        <button 
          v-if="contextMenuState.message?.sendingState === 'failed'" 
          @click="() => { hapticFeedback('medium'); handleContextResend(); }" 
          class="context-menu-item"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
          </svg>
          Resend
        </button>
        <button 
          v-if="contextMenuState.message?.senderId === authStore.user?.$id && contextMenuState.message?.type !== 'system'" 
          @click="() => { hapticFeedback('heavy'); handleContextDelete(); }" 
          class="context-menu-item delete"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
          </svg>
          Delete
        </button>
      </div>
      
      <!-- Emoji Reaction Picker -->
      <div 
        v-if="reactionPickerState.visible"
        class="telegram-reaction-picker" 
        :style="{
          left: reactionPickerState.position.x + 'px',
          top: reactionPickerState.position.y + 'px'
        }"
        @click.stop
      >
        <div class="reaction-emojis">
          <button
            v-for="emoji in quickEmojis"
            :key="emoji"
            class="reaction-emoji-btn"
            :class="{ 'selected': hasUserReacted(emoji) }"
            @click="handleEmojiReaction(emoji)"
            :title="hasUserReacted(emoji) ? 'Remove reaction' : `React with ${emoji}`"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.message-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2b2d31;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #313338;
  border-bottom: 1px solid #1e1f22;
  min-height: 56px;
  box-shadow: 0 1px 0 rgba(4, 4, 5, 0.2), 0 1.5px 0 rgba(6, 6, 7, 0.05), 0 2px 0 rgba(4, 4, 5, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.back-btn {
  background: none;
  border: none;
  color: #b5bac1;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  // Hide on desktop by default
  @media (min-width: 769px) {
    display: none;
  }
  
  &:hover {
    color: #dbdee1;
    background: #404249;
  }
  
  &:active {
    transform: scale(0.95);
    background: #404249;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.user-avatar {
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
  flex-shrink: 0;
  
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

.online-indicator {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #949ba4;
  border: 2px solid #313338;
  transition: all 0.3s ease;
  
  &.online {
    background: #23a559;
    box-shadow: 0 0 6px rgba(35, 165, 89, 0.6);
  }
  
  &.busy {
    background: #f84b4b;
    box-shadow: 0 0 6px rgba(248, 75, 75, 0.6);
  }
  
  &.away {
    background: #faa61a;
    box-shadow: 0 0 6px rgba(250, 166, 26, 0.6);
  }
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f2f3f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.user-status {
  margin: 0;
  font-size: 0.75rem;
  color: #949ba4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  color: #b5bac1;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: #dbdee1;
    background: #404249;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  background: #313338;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    &:active {
      background: rgba(255, 255, 255, 0.4);
    }
  }
  
  // Mobile optimizations
  @media (max-width: 768px) {
    padding: 12px;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
  }
}

.channel-intro {
  text-align: center;
  padding: 32px 0;
  margin-bottom: 16px;
  
  .channel-icon-large {
    width: 68px;
    height: 68px;
    background: #404249;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    color: #80848e;
    margin: 0 auto 16px;
  }
  
  h1 {
    margin: 0 0 8px 0;
    font-size: 2rem;
    font-weight: 700;
    color: #f2f3f5;
  }
  
  p {
    margin: 0;
    color: #949ba4;
    font-size: 1rem;
  }
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 16px;
  margin-bottom: 8px;
  
  .typing-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e85d75;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: white;
  }
  
  .typing-content {
    color: #949ba4;
    font-size: 0.875rem;
    font-style: italic;
    
    .typing-user {
      font-weight: 600;
      color: #dbdee1;
      font-style: normal;
    }
  }
}

// Reply preview styles - WhatsApp Style
.reply-preview-container {
  background: #313338;
  border-top: 1px solid #1e1f22;
  padding: 0;
  
  .reply-preview-wrapper {
    display: flex;
    align-items: stretch;
    background: #2a2d31;
    border-left: 4px solid #00a884;
    margin: 0;
    padding: 12px 16px;
    gap: 12px;
  }
  
  .reply-left {
    flex: 1;
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }
  
  .reply-bar {
    width: 3px;
    background: #00a884;
    border-radius: 1.5px;
    align-self: stretch;
    flex-shrink: 0;
  }
  
  .reply-content {
    flex: 1;
    min-width: 0;
    
    .reply-sender {
      font-size: 0.8rem;
      color: #00a884;
      font-weight: 600;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    
    .reply-message {
      .reply-text {
        font-size: 0.85rem;
        color: #8696a0;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }
      
      .reply-media-content {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .reply-media-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: #8696a0;
          flex-shrink: 0;
          
          svg {
            width: 16px;
            height: 16px;
          }
        }
        
        .reply-media-text {
          font-size: 0.85rem;
          color: #8696a0;
          font-style: italic;
        }
      }
    }
  }
  
  .reply-close-btn {
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    color: #8696a0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #dbdee1;
    }
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
}

.message-input-container {
  padding: 10px 16px;
  display: flex;
  background: #313338;
  border-top: 1px solid #1e1f22;
  transition: all 0.2s ease;
  
  // Remove border-top when reply preview is shown
  .reply-preview-container + & {
    border-top: none;
  }
  
  &:focus-within {
    background: #363940;
  }
}

.input-wrapper {
  flex: 1;
  background: #40444b;
  border-radius: 24px;
  display: flex;
  align-items: flex-end;
  padding: 4px;
  min-height: 48px;
  max-height: 144px;
  position: relative;
  transition: background-color 0.2s ease;
  
  &:focus-within {
    background: #4a4d54;
  }
  
  .message-input {
    flex: 1;
    background: none;
    border: none;
    color: #dcddde;
    font-size: 1rem;
    padding: 8px;
    line-height: 1.4;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    overflow-y: auto;
    font-family: inherit;
    
    &::placeholder {
      color: #72767d;
    }
    
    &:focus {
      outline: none;
    }
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #1a1b1e;
      border-radius: 2px;
    }
  }
}

.recording-wrapper {
  flex: 1;
  background: #40444b;
  border-radius: 24px;
  display: flex;
  align-items: center;
  padding: 4px;
  min-height: 48px;
  position: relative;
}

.recording-indicator {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  
  .recording-dot {
    width: 12px;
    height: 12px;
    background: #f04747;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .recording-time {
    font-weight: 600;
    color: #f04747;
    font-size: 0.95rem;
  }
  
  .recording-text {
    color: #dcddde;
    font-size: 0.95rem;
  }
}

.cancel-recording-btn {
  color: #f04747 !important;
  
  &:hover {
    background: rgba(240, 71, 71, 0.1) !important;
  }
}

.emoji-picker-wrapper {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  z-index: 1000;
}

.emoji-picker {
  background: #2b2d31;
  border: 1px solid #1e1f22;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
  
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }
  
  .emoji-btn {
    background: none;
    border: none;
    width: 36px;
    height: 36px;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s ease;
    
    &:hover {
      background: #40444b;
      transform: scale(1.2);
    }
  }
}

.input-btn {
  background: none;
  border: none;
  color: #8e9297;
  cursor: pointer;
  padding: 8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  
  &:hover {
    color: #b9bbbe;
    background: rgba(78, 80, 88, 0.3);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
  
  &.emoji-btn {
    align-self: flex-end;
  }
  
  &.attachment-btn {
    align-self: flex-end;
  }
  
  &.voice-btn {
    color: #5dd6c0;
    align-self: flex-end;
    
    &:hover {
      color: #4ac7b0;
      background: rgba(93, 214, 192, 0.1);
    }
  }
}

.send-btn {
  background: #5dd6c0;
  border: none;
  color: #1a1d21;
  cursor: pointer;
  padding: 8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  align-self: flex-end;
  
  &:hover {
    background: #4ac7b0;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .thread-header {
    padding: 6px 12px;
    min-height: 52px;
  }
  
  .header-left {
    gap: 8px;
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
  
  .online-indicator {
    width: 10px;
    height: 10px;
    border-width: 1.5px;
  }
  
  .user-name {
    font-size: 0.95rem;
    max-width: 150px;
  }
  
  .user-status {
    font-size: 0.7rem;
    max-width: 150px;
  }
  
  .header-actions {
    gap: 4px;
    
    .action-btn {
      padding: 6px;
      
      svg {
        width: 18px;
        height: 18px;
      }
    }
  }
  
  .back-btn {
    padding: 8px;
    display: flex; // Ensure it's visible on mobile
    background: rgba(255, 255, 255, 0.05);
    
    &:active {
      background: rgba(255, 255, 255, 0.1);
    }
    
    svg {
      width: 22px;
      height: 22px;
    }
  }
  
  .channel-intro {
    padding: 24px 0;
    
    .channel-icon-large {
      width: 56px;
      height: 56px;
      font-size: 2rem;
    }
    
    h1 {
      font-size: 1.5rem;
    }
    
    p {
      font-size: 0.875rem;
    }
  }
  
  .message-input-container {
    padding: 8px 12px;
  }
  
  .input-wrapper,
  .recording-wrapper {
    min-height: 44px;
    padding: 3px;
    
    .message-input {
      font-size: 0.95rem;
      padding: 6px;
      min-height: 32px;
    }
  }
  
  .input-btn {
    width: 36px;
    height: 36px;
    padding: 6px;
    
    svg {
      width: 22px;
      height: 22px;
    }
  }
  
  .send-btn {
    width: 36px;
    height: 36px;
    padding: 6px;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
  
  .emoji-picker {
    padding: 8px;
    
    .emoji-grid {
      gap: 2px;
    }
    
    .emoji-btn {
      width: 32px;
      height: 32px;
      font-size: 1.3rem;
    }
  }
  
  .recording-indicator {
    gap: 8px;
    padding: 0 8px;
    
    .recording-dot {
      width: 10px;
      height: 10px;
    }
    
    .recording-time {
      font-size: 0.9rem;
    }
    
    .recording-text {
      font-size: 0.9rem;
    }
  }
}

// Telegram-style context menu overlay
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.telegram-context-menu {
  position: fixed;
  background: #2b2d31;
  border: 1px solid #404249;
  border-radius: 12px;
  padding: 8px 0;
  min-width: 180px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.3);
  transform: scale(0.95);
  animation: contextMenuIn 0.15s ease-out forwards;
  
  .context-menu-item {
    width: 100%;
    background: none;
    border: none;
    color: #dbdee1;
    padding: 12px 16px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: background-color 0.15s ease;
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:hover {
      background: #404249;
    }
    
    &.delete {
      color: #f04747;
      
      &:hover {
        background: rgba(240, 71, 71, 0.1);
      }
    }
    
    svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      opacity: 0.8;
    }
    
    .emoji-icon {
      font-size: 16px;
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }
  }
}

@keyframes contextMenuIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

// Blur effect for non-active messages when context menu is shown
.message-wrapper.blurred {
  filter: blur(1px);
  opacity: 0.6;
  transition: all 0.2s ease;
  pointer-events: none;
}

// Keep the active message crisp when context menu is shown
.message-wrapper:not(.blurred) {
  position: relative;
  z-index: 1;
}



// Telegram-style Reaction Picker
.telegram-reaction-picker {
  position: fixed;
  background: linear-gradient(135deg, #2b2d31 0%, #33363d 100%);
  border: 1px solid #404249;
  border-radius: 25px;
  padding: 8px 12px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(135, 116, 225, 0.1);
  transform: scale(0.95);
  animation: reactionPickerIn 0.2s ease-out forwards;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(135, 116, 225, 0.2);
  z-index: 10002;
  
  .reaction-emojis {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .reaction-emoji-btn {
    background: none;
    border: none;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #8774e1;
      border-radius: 50%;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease;
    }
    
    &:hover {
      transform: scale(1.25);
      
      &::before {
        opacity: 0.2;
        transform: scale(1);
      }
    }
    
    &:active {
      transform: scale(1.15);
      
      &::before {
        opacity: 0.3;
        transform: scale(1.1);
      }
    }
    
    // Ensure emoji stays on top
    span, & {
      position: relative;
      z-index: 1;
    }
    
    // Selected state when user has already reacted
    &.selected {
      background: rgba(135, 116, 225, 0.3);
      position: relative;
      
      &::before {
        opacity: 0.4;
      }
      
      &:hover {
        &::before {
          opacity: 0.5;
        }
      }
      
      // Add small indicator
      &::after {
        content: '';
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        background: #8774e1;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(135, 116, 225, 0.6);
      }
    }
  }
}

@keyframes reactionPickerIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

// Mobile optimizations for context menu
@media (max-width: 768px) {
  .context-menu-overlay {
    backdrop-filter: blur(5px);
    background: rgba(0, 0, 0, 0.6);
    -webkit-tap-highlight-color: transparent;
  }
  
  .telegram-context-menu {
    min-width: 200px;
    max-width: calc(100vw - 32px);
    border-radius: 16px;
    background: #1e1f22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    transform: none;
    animation: mobileContextMenuIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    
    // Position menu to avoid edges
    &[style*="left"] {
      left: max(16px, min(var(--menu-left), calc(100vw - var(--menu-width) - 16px))) !important;
    }
    
    &[style*="top"] {
      top: max(16px, min(var(--menu-top), calc(100vh - var(--menu-height) - 16px))) !important;
    }
    
    .context-menu-item {
      padding: 16px 20px;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 12px;
      margin: 2px 0;
      min-height: 52px;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      position: relative;
      overflow: hidden;
      
      // Add touch ripple effect
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transform: translate(-50%, -50%);
        transition: width 0.4s, height 0.4s;
      }
      
      &:active {
        background: #404249;
        transform: scale(0.98);
        transition: all 0.1s ease;
        
        &::before {
          width: 100%;
          height: 100%;
        }
      }
      
      &:hover {
        background: transparent;
      }
      
      &.delete {
        color: #ff5555;
        
        &:active {
          background: rgba(255, 85, 85, 0.15);
        }
      }
      
      svg {
        width: 22px;
        height: 22px;
        opacity: 0.9;
      }
      
      .emoji-icon {
        font-size: 20px;
        width: 22px;
      }
    }
  }
  
  .telegram-reaction-picker {
    border-radius: 24px;
    padding: 8px 12px;
    background: #1e1f22;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    max-width: calc(100vw - 32px);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    
    .reaction-emojis {
      display: flex;
      gap: 6px;
      padding: 4px 0;
    }
    
    .reaction-emoji-btn {
      font-size: 28px;
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      
      &:hover {
        transform: none;
      }
      
      &:active {
        transform: scale(0.9);
        transition: transform 0.1s ease;
        
        &::before {
          opacity: 0.4;
          transform: scale(1.2);
        }
      }
      
      &.selected {
        background: rgba(135, 116, 225, 0.25);
        
        &::after {
          width: 10px;
          height: 10px;
          bottom: 4px;
          right: 4px;
        }
      }
    }
  }
}

@keyframes mobileContextMenuIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>