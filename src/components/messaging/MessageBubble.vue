<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessagingStore, type Message } from '../../stores/messaging'
import { useAuthStore } from '../../stores/auth'

const messagingStore = useMessagingStore()
const authStore = useAuthStore()

interface Props {
  message: Message
  isOwn: boolean
}

interface Emits {
  (e: 'reply', message: Message): void
  (e: 'react', messageId: string, emoji: string): void
  (e: 'show-context-menu', messageId: string, position: { x: number, y: number }): void
  (e: 'hide-context-menu'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Audio playback state - unique for each message
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioElement = ref<HTMLAudioElement | null>(null)
const isLoading = ref(false)

const formattedTime = computed(() => {
  if (!props.message.$createdAt) return ''
  return new Date(props.message.$createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
})

const formattedReadTime = computed(() => {
  if (!props.message.readAt) return ''
  const readDate = new Date(props.message.readAt)
  return `Read at ${readDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`
})

const formattedDeliveredTime = computed(() => {
  if (!props.message.deliveredAt) return ''
  const deliveredDate = new Date(props.message.deliveredAt)
  return `Delivered at ${deliveredDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`
})

const autoDeleteText = computed(() => {
  if (!props.message.autoDeleteAt) return ''
  if (props.message.autoDeletePeriod === 0) return 'Deletes immediately'
  
  const deleteTime = new Date(props.message.autoDeleteAt)
  const now = new Date()
  const diff = deleteTime.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `Deletes in ${days}d`
  if (hours > 0) return `Deletes in ${hours}h`
  if (minutes > 0) return `Deletes in ${minutes}m`
  return 'Deletes soon'
})

const messageIcon = computed(() => {
  switch (props.message.type) {
    case 'image':
      return '🖼️'
    case 'video':
      return '🎥'
    case 'file':
      return '📎'
    case 'call_request':
      return '📞'
    case 'system':
      return 'ℹ️'
    case 'voice':
      return '🎤'
    default:
      return null
  }
})

// Get attachment data for media messages
const attachmentData = computed(() => {
  if (props.message.attachmentUrl) {
    return {
      url: props.message.attachmentUrl,
      mimeType: props.message.attachmentType || '',
      size: props.message.attachmentSize || 0,
      fileName: props.message.content || 'Untitled' // Content field stores the filename
    }
  }
  
  // Debug log for messages without attachment URL
  if (props.message.type === 'voice' || props.message.type === 'image' || props.message.type === 'video') {
    console.log('Media message without attachmentUrl:', {
      id: props.message.$id,
      type: props.message.type,
      content: props.message.content,
      hasAttachmentUrl: !!props.message.attachmentUrl,
      attachmentUrl: props.message.attachmentUrl,
      attachmentType: props.message.attachmentType,
      attachmentSize: props.message.attachmentSize,
      allFields: props.message
    })
  }
  
  return null
})

// Extract voice duration from content
const voiceDuration = computed(() => {
  if (props.message.type === 'voice' && props.message.content) {
    const match = props.message.content.match(/\((\d+)s\)/)
    return match ? parseInt(match[1]) : 0
  }
  return 0
})

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format audio duration
const formatDuration = (seconds: number): string => {
  // Handle invalid values
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Handle image loading error
const handleImageError = (event: Event) => {
  console.error('Failed to load image:', (event.target as HTMLImageElement).src)
}

// Audio playback functions
const togglePlayback = async () => {
  if (!audioElement.value || isLoading.value) return
  
  try {
    if (isPlaying.value) {
      audioElement.value.pause()
    } else {
      isLoading.value = true
      await audioElement.value.play()
      isLoading.value = false
    }
  } catch (error) {
    console.error('Playback error:', error)
    isLoading.value = false
    isPlaying.value = false
  }
}

const onAudioPlay = () => {
  isPlaying.value = true
  isLoading.value = false
}

const onAudioPause = () => {
  isPlaying.value = false
}

const onAudioEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const onTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime
  }
}

const onLoadedMetadata = () => {
  if (audioElement.value) {
    const audioDuration = audioElement.value.duration
    // Check if duration is valid (not Infinity or NaN)
    if (isFinite(audioDuration) && audioDuration > 0) {
      duration.value = audioDuration
    } else {
      // Fallback to parsed duration from content
      duration.value = voiceDuration.value || 0
    }
  }
}

const onAudioError = (event: Event) => {
  console.error('Audio loading error:', event)
  isLoading.value = false
  isPlaying.value = false
}

// Format audio progress
const formattedProgress = computed(() => {
  const current = Math.floor(currentTime.value)
  const total = Math.floor(duration.value || voiceDuration.value || 0)
  return `${formatDuration(current)} / ${formatDuration(total)}`
})

// Progress percentage for slider
const progressPercentage = computed(() => {
  const total = duration.value || voiceDuration.value || 0
  if (total === 0) return 0
  return (currentTime.value / total) * 100
})

// Dragging state
const isDragging = ref(false)
const wasPlaying = ref(false)

// Calculate progress from mouse/touch position
const calculateProgressFromPosition = (clientX: number, progressBar: HTMLElement) => {
  const rect = progressBar.getBoundingClientRect()
  const x = clientX - rect.left
  return Math.max(0, Math.min(1, x / rect.width))
}

// Update audio position smoothly
const updateAudioPosition = (percentage: number) => {
  const totalDuration = duration.value || voiceDuration.value || 0
  if (totalDuration > 0 && audioElement.value) {
    const newTime = percentage * totalDuration
    audioElement.value.currentTime = newTime
    currentTime.value = newTime
  }
}

// Handle progress bar click/drag
const handleProgressClick = (event: MouseEvent) => {
  if (!audioElement.value || isDragging.value) return
  
  const progressBar = event.currentTarget as HTMLElement
  const percentage = calculateProgressFromPosition(event.clientX, progressBar)
  updateAudioPosition(percentage)
}

// Handle mouse down on progress bar
const handleProgressMouseDown = (event: MouseEvent) => {
  if (!audioElement.value) return
  
  event.preventDefault()
  isDragging.value = true
  wasPlaying.value = isPlaying.value
  
  // Pause audio while dragging for smoother experience
  if (isPlaying.value) {
    audioElement.value.pause()
  }
  
  const progressBar = event.currentTarget as HTMLElement
  const percentage = calculateProgressFromPosition(event.clientX, progressBar)
  updateAudioPosition(percentage)
  
  // Add listeners for drag
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
      e.preventDefault()
      const newPercentage = calculateProgressFromPosition(e.clientX, progressBar)
      updateAudioPosition(newPercentage)
    }
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    
    // Resume playback if it was playing before drag
    if (wasPlaying.value && audioElement.value) {
      audioElement.value.play().catch(console.error)
    }
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Handle touch events for mobile
const handleProgressTouchStart = (event: TouchEvent) => {
  if (!audioElement.value || event.touches.length === 0) return
  
  event.preventDefault()
  isDragging.value = true
  wasPlaying.value = isPlaying.value
  
  // Pause audio while dragging for smoother experience
  if (isPlaying.value) {
    audioElement.value.pause()
  }
  
  const progressBar = event.currentTarget as HTMLElement
  const touch = event.touches[0]
  const percentage = calculateProgressFromPosition(touch.clientX, progressBar)
  updateAudioPosition(percentage)
  
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging.value && e.touches.length > 0) {
      e.preventDefault()
      const touch = e.touches[0]
      const newPercentage = calculateProgressFromPosition(touch.clientX, progressBar)
      updateAudioPosition(newPercentage)
    }
  }
  
  const handleTouchEnd = () => {
    isDragging.value = false
    
    // Resume playback if it was playing before drag
    if (wasPlaying.value && audioElement.value) {
      audioElement.value.play().catch(console.error)
    }
    
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchEnd)
  }
  
  const handleTouchCancel = () => {
    handleTouchEnd()
  }
  
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true })
}

// Handle image click
const handleImageClick = (url: string) => {
  window.open(url, '_blank')
}

// Handle message resend
const handleResend = async () => {
  if (props.message.sendingState === 'failed') {
    await messagingStore.resendMessage(props.message)
  }
  showContextMenu.value = false
  emit('hide-context-menu')
}

// Handle message deletion
const handleDelete = async () => {
  const messageId = props.message.$id || props.message.tempId
  if (messageId) {
    await messagingStore.deleteMessage(messageId, props.message.conversationId)
  }
  showContextMenu.value = false
  emit('hide-context-menu')
}

// Show context menu and reaction picker
const showContextMenu = ref(false)
const showEmojiReactions = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const isLongPressing = ref(false)

// Quick reaction emojis (Telegram style)
const quickEmojis = ['👍', '👎', '❤️', '😂', '😢', '😡', '😮', '🤔']

// Handle context menu
const handleContextMenu = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  
  let x: number, y: number
  
  if (event instanceof MouseEvent) {
    x = event.clientX
    y = event.clientY
  } else {
    // TouchEvent
    const touch = event.touches[0] || event.changedTouches[0]
    x = touch.clientX
    y = touch.clientY
  }
  
  contextMenuPosition.value = { x, y }
  showContextMenu.value = true
  emit('show-context-menu', props.message.$id || props.message.tempId || '', contextMenuPosition.value)
}

// Handle reply
const handleReply = () => {
  emit('reply', props.message)
  showContextMenu.value = false
  emit('hide-context-menu')
}

// Handle emoji reaction
const handleReaction = async (emoji: string) => {
  // Only react to saved messages (must have $id)
  if (props.message.$id) {
    console.log('🔄 Clicking reaction:', emoji, 'hasUserReacted:', hasUserReacted(emoji))
    console.log('📋 Message reactions data:', {
      reactions: props.message.reactions,
      reactionsRaw: props.message.reactionsRaw,
      reactionsRawType: typeof props.message.reactionsRaw
    })
    await messagingStore.toggleMessageReaction(props.message.$id, props.message.conversationId, emoji)
  } else {
    console.log('Cannot react to unsaved message')
  }
  showEmojiReactions.value = false
  showContextMenu.value = false
  emit('hide-context-menu')
}

// Get reaction tooltip text showing who reacted
const getReactionTooltip = (emoji: string, count: number): string => {
  if (!props.message.reactionsRaw) {
    return `${count} ${count === 1 ? 'person' : 'people'} reacted with ${emoji}`
  }
  
  let reactions: Record<string, string[]> = {}
  if (typeof props.message.reactionsRaw === 'string') {
    try {
      reactions = JSON.parse(props.message.reactionsRaw)
    } catch {
      return `${count} ${count === 1 ? 'person' : 'people'} reacted with ${emoji}`
    }
  } else if (typeof props.message.reactionsRaw === 'object') {
    reactions = props.message.reactionsRaw as Record<string, string[]>
  }
  
  const userIds = reactions[emoji] || []
  if (userIds.length === 0) {
    return `${count} ${count === 1 ? 'person' : 'people'} reacted with ${emoji}`
  }
  
  // For now, show user IDs. In a real app, you'd fetch user names
  const names = userIds.map(id => {
    if (id === authStore.user?.$id) return 'You'
    // In real app, look up user names
    return `User ${id.slice(-4)}`
  })
  
  if (names.length <= 3) {
    return names.join(', ') + ` reacted with ${emoji}`
  } else {
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others reacted with ${emoji}`
  }
}

// Check if current user has reacted with a specific emoji
const hasUserReacted = (emoji: string): boolean => {
  if (!props.message.reactions || !authStore.user?.$id) {
    console.log('❌ hasUserReacted early return:', { hasReactions: !!props.message.reactions, hasUserId: !!authStore.user?.$id })
    return false
  }
  
  // Use reactionsRaw if available, otherwise fall back to checking from store
  if (props.message.reactionsRaw) {
    let reactions: Record<string, string[]> = {}
    
    if (typeof props.message.reactionsRaw === 'string') {
      try {
        reactions = JSON.parse(props.message.reactionsRaw)
      } catch {
        console.log('❌ Failed to parse reactionsRaw string')
        return false
      }
    } else if (typeof props.message.reactionsRaw === 'object') {
      reactions = props.message.reactionsRaw as Record<string, string[]>
    }
    
    const hasReacted = reactions[emoji]?.includes(authStore.user.$id) || false
    console.log('✅ hasUserReacted check:', { emoji, userId: authStore.user.$id, reactions, hasReacted })
    return hasReacted
  }
  
  // Fallback: Get the raw reactions data from the store
  const messages = messagingStore.getConversationMessages(props.message.conversationId)
  const currentMessage = messages.find(m => m.$id === props.message.$id)
  
  if (!currentMessage || !currentMessage.reactionsRaw) {
    console.log('❌ Fallback failed - no message or reactionsRaw')
    return false
  }
  
  // Parse reactions if it's a string
  let reactions: Record<string, string[]> = {}
  if (typeof currentMessage.reactionsRaw === 'string') {
    try {
      reactions = JSON.parse(currentMessage.reactionsRaw)
    } catch {
      console.log('❌ Failed to parse fallback reactionsRaw string')
      return false
    }
  } else if (typeof currentMessage.reactionsRaw === 'object') {
    reactions = currentMessage.reactionsRaw as Record<string, string[]>
  }
  
  // Check if current user has reacted with this emoji
  const hasReacted = reactions[emoji]?.includes(authStore.user.$id) || false
  console.log('✅ Fallback hasUserReacted:', { emoji, hasReacted, reactions })
  return hasReacted
}

// Handle double tap for quick like (mobile)
let tapCount = 0
let tapTimer: NodeJS.Timeout | null = null

const handleDoubleTap = () => {
  tapCount++
  if (tapCount === 1) {
    tapTimer = setTimeout(() => {
      tapCount = 0
    }, 300)
  } else if (tapCount === 2) {
    if (tapTimer) clearTimeout(tapTimer)
    tapCount = 0
    handleReaction('❤️') // Double tap to heart
  }
}


// Handle long press for reactions (WhatsApp style)
let longPressTimer: NodeJS.Timeout | null = null
const longPressDelay = 500 // 500ms for long press
let touchStartPosition = { x: 0, y: 0 }
let hasMoved = false

const handleTouchStart = (event: TouchEvent) => {
  // Store initial touch position
  const touch = event.touches[0]
  touchStartPosition = { x: touch.clientX, y: touch.clientY }
  hasMoved = false
  
  // Show visual feedback after 200ms
  setTimeout(() => {
    if (!hasMoved && longPressTimer) {
      isLongPressing.value = true
    }
  }, 200)
  
  longPressTimer = setTimeout(() => {
    if (!hasMoved) {
      event.preventDefault()
      isLongPressing.value = false
      // Show context menu on long press for mobile
      handleContextMenu(event)
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(20)
      }
    }
  }, longPressDelay)
}

const handleTouchMove = (event: TouchEvent) => {
  // Check if touch has moved significantly (more than 10px)
  const touch = event.touches[0]
  const moveX = Math.abs(touch.clientX - touchStartPosition.x)
  const moveY = Math.abs(touch.clientY - touchStartPosition.y)
  
  if (moveX > 10 || moveY > 10) {
    hasMoved = true
    // Cancel long press if user is scrolling
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }
}

const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  isLongPressing.value = false
}

const handleMouseDown = (event: MouseEvent) => {
  // Only for left click
  if (event.button !== 0) return
  
  longPressTimer = setTimeout(() => {
    showEmojiReactions.value = true
  }, longPressDelay)
}

const handleMouseUp = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// Get replied message data
const repliedMessage = computed(() => {
  if (!props.message.replyTo) return null
  
  // Find the replied message in the conversation
  const messages = messagingStore.getConversationMessages(props.message.conversationId)
  const replied = messages.find(m => m.$id === props.message.replyTo)
  
  if (!replied) return null
  
  // Return formatted reply data
  return {
    id: replied.$id,
    content: replied.content,
    type: replied.type,
    senderId: replied.senderId,
    senderName: replied.senderId === authStore.user?.$id ? 'You' : 'User'
  }
})

// Handle click on replied message to scroll to it
const handleReplyClick = () => {
  if (!repliedMessage.value?.id) return
  
  // Find the original message element and scroll to it
  const messageElement = document.querySelector(`[data-message-id="${repliedMessage.value.id}"]`)
  if (messageElement) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Add highlight effect
    messageElement.classList.add('highlight')
    setTimeout(() => {
      messageElement.classList.remove('highlight')
    }, 2000)
  }
}
</script>

<template>
  <div 
    class="message-wrapper"
    :class="{ 
      'system-message': message.type === 'system',
      'own-message': isOwn
    }"
  >
    <div v-if="message.type !== 'system' && !isOwn" class="message-avatar">
      <img src="https://ui-avatars.com/api/?name=Neb&background=e85d75&color=fff" alt="Neb">
    </div>
    
    <div class="message-container">
      <div 
        class="message-bubble" 
        :class="{ 
          'own-bubble': isOwn, 
          'image-bubble': message.type === 'image' || message.type === 'video',
          'long-pressing': isLongPressing
        }"
        @contextmenu.prevent="handleContextMenu"
        @click="showContextMenu = false; showEmojiReactions = false; $emit('hide-context-menu')"
        @dblclick="handleDoubleTap"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        :data-message-id="message.$id"
      >
      <!-- Reply-to message preview -->
      <div v-if="repliedMessage" class="reply-preview" @click="handleReplyClick">
        <div class="reply-bar"></div>
        <div class="reply-content">
          <div class="reply-sender">{{ repliedMessage.senderName }}</div>
          <div class="reply-text">
            <span v-if="repliedMessage.type === 'text'">{{ repliedMessage.content }}</span>
            <span v-else-if="repliedMessage.type === 'image'" class="reply-media">
              <span class="reply-icon">🖼️</span> Photo
            </span>
            <span v-else-if="repliedMessage.type === 'video'" class="reply-media">
              <span class="reply-icon">🎥</span> Video
            </span>
            <span v-else-if="repliedMessage.type === 'voice'" class="reply-media">
              <span class="reply-icon">🎤</span> Voice message
            </span>
            <span v-else-if="repliedMessage.type === 'file'" class="reply-media">
              <span class="reply-icon">📎</span> {{ repliedMessage.content || 'File' }}
            </span>
            <span v-else>{{ repliedMessage.content }}</span>
          </div>
        </div>
      </div>
      
      <!-- Image Message -->
      <div v-if="message.type === 'image'" class="image-message">
        <img 
          v-if="attachmentData?.url"
          :src="attachmentData.url" 
          :alt="attachmentData.fileName || 'Image'"
          @click="handleImageClick(attachmentData.url)"
          class="message-image"
          @error="handleImageError"
        >
        <div v-else class="image-placeholder">
          <span class="placeholder-icon">🖼️</span>
          <span class="placeholder-text">Image loading...</span>
        </div>
        <div class="image-overlay">
          <span class="overlay-time">{{ formattedTime }}</span>
          <div v-if="isOwn" class="overlay-status">
            <span v-if="message.isRead" class="read-indicator">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
                <path d="M11 8.5L7 4.5L5.5 6L11 11.5L21.5 1L20 0L11 8.5Z" fill="currentColor" transform="translate(-5.5, 0)"/>
              </svg>
            </span>
            <span v-else-if="message.deliveredAt" class="delivered-indicator">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
      
      <!-- Video Message -->
      <div v-else-if="message.type === 'video'" class="video-message">
        <div v-if="attachmentData?.url" class="video-container">
          <video 
            :src="attachmentData.url"
            controls
            preload="metadata"
            class="message-video"
            @error="handleImageError"
          >
            Your browser does not support the video tag.
          </video>
          <div class="video-overlay">
            <span class="overlay-time">{{ formattedTime }}</span>
            <div v-if="isOwn" class="overlay-status">
              <span v-if="message.isRead" class="read-indicator">
                <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                  <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
                  <path d="M11 8.5L7 4.5L5.5 6L11 11.5L21.5 1L20 0L11 8.5Z" fill="currentColor" transform="translate(-5.5, 0)"/>
                </svg>
              </span>
              <span v-else-if="message.deliveredAt" class="delivered-indicator">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="video-placeholder">
          <span class="placeholder-icon">🎥</span>
          <span class="placeholder-text">Video loading...</span>
        </div>
      </div>
      
      <!-- Voice Message -->
      <div v-else-if="message.type === 'voice'" class="voice-message" :class="{ playing: isPlaying, dragging: isDragging }">
        <template v-if="attachmentData?.url">
          <audio 
            ref="audioElement"
            :src="attachmentData.url"
            @play="onAudioPlay"
            @pause="onAudioPause"
            @ended="onAudioEnded"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMetadata"
            @error="onAudioError"
            preload="metadata"
            style="display: none"
          ></audio>
          <button class="play-button" @click="togglePlayback" :disabled="isLoading">
            <div v-if="isLoading" class="loading-spinner"></div>
            <svg v-else-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
              <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
            </svg>
          </button>
          <div class="voice-info">
            <div 
              class="voice-progress-container" 
              @click="handleProgressClick"
              @mousedown="handleProgressMouseDown"
              @touchstart="handleProgressTouchStart"
            >
              <div class="voice-progress-bar">
                <div class="voice-progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                <div 
                  class="voice-progress-handle" 
                  :style="{ left: progressPercentage + '%' }"
                  :class="{ dragging: isDragging }"
                ></div>
              </div>
            </div>
            <span class="voice-duration">{{ formattedProgress }}</span>
          </div>
        </template>
        <div v-else class="voice-placeholder">
          <span class="placeholder-icon">🎤</span>
          <span class="placeholder-text">Voice message not available</span>
        </div>
      </div>
      
      <!-- File Message -->
      <div v-else-if="message.type === 'file' && attachmentData" class="file-message">
        <div class="file-icon">📄</div>
        <div class="file-info">
          <a :href="attachmentData.url" target="_blank" class="file-name">{{ attachmentData.fileName }}</a>
          <span class="file-size">{{ formatFileSize(attachmentData.size) }}</span>
        </div>
      </div>
      
      <!-- Text Message -->
      <div v-else class="message-content">
        <span v-if="messageIcon" class="message-icon">{{ messageIcon }}</span>
        <span class="message-text">{{ message.content }}</span>
      </div>
      
      <!-- Message footer with time and status -->
      <div v-if="message.type !== 'image' && message.type !== 'video'" class="message-footer">
        <div class="message-time">{{ formattedTime }}</div>
        
        <div v-if="isOwn && message.type !== 'system'" class="message-status">
          <!-- Sending states -->
          <span v-if="message.sendingState === 'sending'" class="sending-indicator" title="Sending...">
            <div class="telegram-loader"></div>
          </span>
          <span v-else-if="message.sendingState === 'failed'" class="failed-indicator" title="Failed to send">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 0a6 6 0 1 0 6 6A6 6 0 0 0 6 0zM8.25 7.5L7.5 8.25 6 6.75 4.5 8.25 3.75 7.5 5.25 6 3.75 4.5 4.5 3.75 6 5.25 7.5 3.75 8.25 4.5 6.75 6z" fill="currentColor"/>
            </svg>
          </span>
          <!-- Regular status indicators -->
          <span v-else-if="message.isRead" class="read-indicator" :title="formattedReadTime">
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
              <path d="M11 8.5L7 4.5L5.5 6L11 11.5L21.5 1L20 0L11 8.5Z" fill="currentColor" transform="translate(-5.5, 0)"/>
            </svg>
          </span>
          <span v-else-if="message.deliveredAt" class="delivered-indicator" :title="formattedDeliveredTime">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 8.5L1.5 4.5L0 6L5.5 11.5L16 1L14.5 0L5.5 8.5Z" fill="currentColor"/>
            </svg>
          </span>
          
          <span v-if="autoDeleteText && message.autoDeletePeriod !== -1" class="auto-delete-indicator">{{ autoDeleteText }}</span>
        </div>

        <!-- Failed message actions -->
        <div v-if="message.sendingState === 'failed'" class="message-actions">
          <button @click="handleResend" class="resend-btn" title="Resend message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
            </svg>
            Retry
          </button>
        </div>
      </div>
    </div>


      <!-- Message Reactions (WhatsApp style - below bubble) -->
      <div v-if="message.reactions && Object.keys(message.reactions).length > 0" class="message-reactions-whatsapp">
        <div 
          v-for="(count, emoji) in message.reactions" 
          :key="emoji"
          class="reaction-pill"
          :class="{ 'user-reacted': hasUserReacted(emoji) }"
          @click="handleReaction(emoji)"
          :title="hasUserReacted(emoji) ? 'Click to remove your reaction' : getReactionTooltip(emoji, count)"
        >
          <span class="reaction-emoji">{{ emoji }}</span>
          <span class="reaction-count" v-if="count > 1">{{ count }}</span>
        </div>
      </div>
    </div>
    
    <!-- Encryption indicator -->
    <div v-if="message.isEncrypted" class="encryption-indicator" title="End-to-end encrypted">
      🔒
    </div>

  </div>
</template>

<style scoped lang="scss">
.message-wrapper {
  display: flex;
  gap: 8px;
  padding: 1px 16px;
  margin-bottom: 1px;
  position: relative;
  animation: messageSlideIn 0.3s ease-out;
  transition: all 0.2s ease;
  
  &.own-message {
    justify-content: flex-end;
    padding-left: 60px;
    animation: messageSlideInRight 0.3s ease-out;
    
    .message-avatar {
      display: none;
    }
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  &.system-message {
    justify-content: center;
    padding: 8px 16px;
    
    .message-bubble {
      background: transparent;
      color: #6d7885;
      font-size: 0.8rem;
      text-align: center;
      font-style: normal;
      padding: 6px 12px;
      border-radius: 12px;
      background: rgba(109, 120, 133, 0.08);
    }
  }
}

.message-container {
  display: flex;
  flex-direction: column;
  position: relative;
  max-width: 70%;
  
  .own-message & {
    align-items: flex-end;
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-top: 4px;
  align-self: flex-end;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.message-bubble {
  background: #2f3349;
  color: #ffffff;
  border-radius: 12px 18px 18px 4px;
  padding: 8px 12px 6px 12px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  margin-bottom: 2px;
  width: fit-content;
  
  &.own-bubble {
    background: #8774e1;
    color: #ffffff;
    border-radius: 18px 12px 4px 18px;
    margin-left: auto;
    
    .message-time {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .message-status {
      .read-indicator,
      .delivered-indicator {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
  
  &.image-bubble, &.video-bubble {
    padding: 4px;
    max-width: 300px;
  }
  
  &.long-pressing {
    transform: scale(0.95);
    opacity: 0.8;
    transition: all 0.2s ease;
    
    &::after {
      content: '';
      position: absolute;
      inset: -4px;
      border: 2px solid rgba(135, 116, 225, 0.5);
      border-radius: inherit;
      animation: pulse-border 0.6s ease-out infinite;
    }
  }
}

@keyframes pulse-border {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
}

.image-message {
  position: relative;
  line-height: 0;
  
  .message-image {
    width: 100%;
    max-width: 290px;
    height: auto;
    max-height: 400px;
    border-radius: 12px;
    cursor: pointer;
    display: block;
    object-fit: cover;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 0.95;
    }
  }
  
  .image-placeholder {
    width: 290px;
    height: 200px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    .placeholder-icon {
      font-size: 3rem;
      opacity: 0.5;
    }
    
    .placeholder-text {
      font-size: 0.9rem;
      opacity: 0.7;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .image-overlay {
    position: absolute;
    bottom: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    
    .overlay-time {
      color: white;
      font-size: 0.7rem;
      font-weight: 500;
    }
    
    .overlay-status {
      display: flex;
      align-items: center;
      
      .read-indicator,
      .delivered-indicator {
        color: white;
        display: flex;
        align-items: center;
        
        svg {
          width: 12px;
          height: 9px;
        }
      }
    }
  }
}

.video-message {
  position: relative;
  line-height: 0;
  
  .video-container {
    position: relative;
  }
  
  .message-video {
    width: 100%;
    max-width: 290px;
    height: auto;
    max-height: 400px;
    border-radius: 12px;
    display: block;
    object-fit: cover;
    background: #000;
  }
  
  .video-placeholder {
    width: 290px;
    height: 200px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    .placeholder-icon {
      font-size: 3rem;
      opacity: 0.5;
    }
    
    .placeholder-text {
      font-size: 0.9rem;
      opacity: 0.7;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .video-overlay {
    position: absolute;
    bottom: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    
    .overlay-time {
      color: white;
      font-size: 0.7rem;
      font-weight: 500;
    }
    
    .overlay-status {
      display: flex;
      align-items: center;
      
      .read-indicator,
      .delivered-indicator {
        color: white;
        display: flex;
        align-items: center;
        
        svg {
          width: 12px;
          height: 9px;
        }
      }
    }
  }
}

.voice-message {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  
  .play-button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    
    .own-bubble & {
      background: rgba(255, 255, 255, 0.2);
    }
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.08);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    svg {
      width: 18px;
      height: 18px;
      color: white;
    }
    
    .loading-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }
  
  .voice-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    
    .voice-progress-container {
      width: 100%;
      height: 32px;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px 0;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      position: relative;
      
      &:hover .voice-progress-handle {
        opacity: 1;
        transform: translateY(-50%) scale(1.2);
      }
      
      &:active .voice-progress-handle {
        opacity: 1;
        transform: translateY(-50%) scale(1.3);
      }
      
      .voice-message.dragging & {
        cursor: grabbing;
        
        .voice-progress-bar {
          transform: scale(1.02);
          transition: transform 0.1s ease;
        }
        
        .voice-progress-fill {
          background: rgba(26, 29, 33, 0.7);
        }
      }
    }
    
    .voice-progress-bar {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      position: relative;
      overflow: visible;
    }
    
    .voice-progress-fill {
      height: 100%;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 2px;
      transition: width 0.05s ease-out;
      position: relative;
      will-change: width;
      
      .voice-message.dragging & {
        transition: none;
        background: rgba(255, 255, 255, 0.8);
      }
    }
    
    .voice-progress-handle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 12px;
      height: 12px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      margin-left: -6px;
      opacity: 0;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      cursor: grab;
      will-change: transform, opacity;
      
      &.dragging {
        opacity: 1 !important;
        transform: translateY(-50%) scale(1.3);
        cursor: grabbing;
        transition: opacity 0.1s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }
    }
    
    &:hover .voice-progress-handle,
    .voice-message.playing & .voice-progress-handle,
    .voice-message.dragging & .voice-progress-handle {
      opacity: 1;
    }
    
    .voice-duration {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 2px;
      font-weight: 400;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  }
  
  .voice-placeholder {
    min-width: 250px;
    display: flex;
    align-items: center;
    gap: 12px;
    
    .placeholder-icon {
      font-size: 1.5rem;
      opacity: 0.5;
    }
    
    .placeholder-text {
      font-size: 0.9rem;
      opacity: 0.7;
      color: rgba(255, 255, 255, 0.7);
    }
  }
}

.file-message {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  
  .file-icon {
    font-size: 2rem;
    flex-shrink: 0;
    opacity: 0.8;
  }
  
  .file-info {
    flex: 1;
    min-width: 0;
    
    .file-name {
      display: block;
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      
      &:hover {
        text-decoration: underline;
      }
    }
    
    .file-size {
      font-size: 0.85rem;
      opacity: 0.7;
      color: rgba(255, 255, 255, 0.7);
    }
  }
}

.message-content {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .message-icon {
    font-size: 1rem;
    opacity: 0.9;
  }
  
  .message-text {
    font-size: 0.95rem;
    line-height: 1.35;
    word-wrap: break-word;
    white-space: pre-wrap;
    font-weight: 400;
    color: inherit;
  }
}

.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  gap: 8px;
}

.message-time {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
  line-height: 1;
  
  .own-bubble & {
    color: rgba(255, 255, 255, 0.7);
  }
}

.message-status {
  display: inline-flex;
  align-items: center;
  margin-top: 1px;
  gap: 3px;
  font-size: 0.7rem;
  
  .read-indicator {
    color: rgba(255, 255, 255, 0.8);
    
    .own-bubble & {
      color: rgba(255, 255, 255, 0.9);
    }
    
    svg {
      width: 12px;
      height: 8px;
    }
  }
  
  .delivered-indicator {
    color: rgba(255, 255, 255, 0.7);
    
    .own-bubble & {
      color: rgba(255, 255, 255, 0.8);
    }
    
    svg {
      width: 10px;
      height: 8px;
    }
  }
  
  .sending-indicator {
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    
    .telegram-loader {
      width: 10px;
      height: 10px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-top-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: telegram-spin 0.8s linear infinite;
    }
  }

  .failed-indicator {
    color: #ff6b6b;
    display: flex;
    align-items: center;
    
    svg {
      width: 10px;
      height: 10px;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes telegram-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.message-actions {
  margin-top: 6px;
  
  .resend-btn {
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #ff5252;
      transform: scale(1.05);
    }
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
}

// Message Reactions
.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  animation: reactionsSlideIn 0.3s ease-out;
  
  .reaction-pill {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    position: relative;
    animation: reactionPop 0.3s ease-out;
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.05);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    // Style for when current user has reacted
    &.user-reacted {
      background: rgba(135, 116, 225, 0.25);
      border-color: #8774e1;
      box-shadow: 0 0 0 1px rgba(135, 116, 225, 0.3);
      
      &:hover {
        background: rgba(135, 116, 225, 0.35);
        border-color: #9b88f5;
      }
      
      .reaction-count {
        color: #dbdee1;
        font-weight: 600;
      }
      
      // Add a subtle indicator dot
      &::before {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 6px;
        height: 6px;
        background: #8774e1;
        border-radius: 50%;
        box-shadow: 0 0 3px rgba(135, 116, 225, 0.5);
      }
    }
    
    .reaction-emoji {
      font-size: 14px;
      line-height: 1;
    }
    
    .reaction-count {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      transition: all 0.2s ease;
    }
  }
  
  .add-reaction-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 2px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.6);
    
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      transform: scale(1.05);
      color: rgba(255, 255, 255, 0.8);
      border-color: rgba(255, 255, 255, 0.25);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
}

// Quick Actions (hover buttons)
.quick-actions {
  position: absolute;
  top: -16px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 10;
  
  .own-message & {
    right: 12px;
  }
  
  &.visible {
    opacity: 1;
    visibility: visible;
  }
  
  .quick-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(40, 42, 49, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #dbdee1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    font-size: 14px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
    }
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
}

// Emoji Reactions Picker
.emoji-reactions-picker {
  position: absolute;
  top: -50px;
  right: 12px;
  background: rgba(40, 42, 49, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px;
  display: flex;
  gap: 4px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 100;
  
  .own-message & {
    right: 12px;
  }
  
  .emoji-reaction-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: scale(1.2);
    }
    
    // Selected state when user has reacted with this emoji
    &.selected {
      background: rgba(135, 116, 225, 0.2);
      position: relative;
      
      &:hover {
        background: rgba(135, 116, 225, 0.3);
      }
      
      // Add a checkmark indicator
      &::after {
        content: '✓';
        position: absolute;
        bottom: -2px;
        right: -2px;
        background: #8774e1;
        color: white;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        font-size: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
    }
    
    &:active {
      transform: scale(1.4);
    }
  }
}

// WhatsApp-style reactions below message
.message-reactions-whatsapp {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: -12px;
  margin-bottom: 8px;
  margin-left: 12px;
  transform: scale(1);
  
  .own-message & {
    justify-content: flex-end;
    margin-right: 12px;
    margin-left: 0;
  }
  
  .reaction-pill {
    background: #f0f0f0;
    border-radius: 16px;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
    font-size: 11px;
    min-width: 28px;
    justify-content: center;
    
    &:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    &.user-reacted {
      background: #e3f2fd;
      border-color: #1976d2;
      
      .reaction-count {
        color: #1976d2;
        font-weight: 600;
      }
    }
    
    .reaction-emoji {
      font-size: 16px;
      line-height: 1;
    }
    
    .reaction-count {
      font-size: 12px;
      color: #555;
      font-weight: 500;
      line-height: 1;
    }
  }
}



.auto-delete-indicator {
  font-size: 0.65rem;
  background: rgba(42, 74, 66, 0.2);
  color: #2a4a42;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  display: inline-block;
  margin-left: 6px;
}

.encryption-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  color: #2a4a42;
  opacity: 0.7;
  user-select: none;
  margin-left: 6px;
}

// Reply preview styles
.reply-preview {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.85;
  }
  
  .reply-bar {
    width: 3px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 1.5px;
    flex-shrink: 0;
    
    .own-bubble & {
      background: rgba(255, 255, 255, 0.6);
    }
  }
  
  .reply-content {
    flex: 1;
    min-width: 0;
    
    .reply-sender {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2px;
      
      .own-bubble & {
        color: rgba(255, 255, 255, 0.8);
      }
    }
    
    .reply-text {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 250px;
      
      .own-bubble & {
        color: rgba(255, 255, 255, 0.7);
      }
    }
    
    .reply-media {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      
      .reply-icon {
        font-size: 0.85rem;
      }
    }
  }
}

// Message highlight animation
.message-wrapper {
  &.highlight {
    animation: message-highlight 2s ease;
  }
}

@keyframes message-highlight {
  0% {
    background: transparent;
  }
  20% {
    background: rgba(135, 116, 225, 0.2);
  }
  80% {
    background: rgba(135, 116, 225, 0.2);
  }
  100% {
    background: transparent;
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes messageSlideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes reactionsSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes reactionPop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .message-wrapper {
    padding: 2px 12px;
    gap: 12px;
  }
  
  .message-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
  
  .message-header {
    .message-author {
      font-size: 0.9rem;
    }
    
    .message-time {
      font-size: 0.7rem;
    }
  }
  
  .message-body {
    font-size: 0.9rem;
    line-height: 1.3;
  }
  
  .message-status {
    font-size: 0.7rem;
  }
  
  .auto-delete-indicator {
    font-size: 0.65rem;
    padding: 1px 6px;
  }
  
  .encryption-indicator {
    font-size: 0.7rem;
  }
}
</style>