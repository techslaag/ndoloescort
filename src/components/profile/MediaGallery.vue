<script setup lang="ts">
import { ref, computed } from 'vue'

import type { MediaFile } from '../../types/profile'

const props = defineProps<{
  media: MediaFile[]
  editable?: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  update: [id: string, updates: Partial<MediaFile>]
}>()

const selectedMedia = ref<MediaFile | null>(null)
const isModalOpen = ref(false)

const gridMedia = computed(() => {
  return props.media.slice(0, 6)
})

const hasMoreMedia = computed(() => {
  return props.media.length > 6
})

const openModal = (mediaItem: MediaFile) => {
  selectedMedia.value = mediaItem
  isModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  isModalOpen.value = false
  selectedMedia.value = null
  document.body.style.overflow = ''
}

const removeMedia = (id: string) => {
  if (confirm('Are you sure you want to remove this media?')) {
    emit('remove', id)
  }
}

const toggleBlur = (id: string, currentBlur: boolean) => {
  emit('update', id, { isBlurred: !currentBlur })
}
</script>

<template>
  <div class="media-gallery">
    <div class="media-grid">
      <div 
        v-for="(item, index) in gridMedia" 
        :key="item.id"
        class="media-item"
        :class="{ 'span-2': index === 0 && media.length > 1 }"
        @click="openModal(item)"
      >
        <div class="media-container">
          <img 
            v-if="item.type === 'photo'" 
            :src="item.url" 
            :alt="item.caption || 'Profile media'"
            :class="{ blurred: item.isBlurred }"
          />
          <video 
            v-else-if="item.type === 'video'"
            :src="item.url"
            :class="{ blurred: item.isBlurred }"
            muted
            loop
            playsinline
          />
          
          <div v-if="item.isBlurred" class="blur-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <span>Premium Content</span>
          </div>
          
          <div class="media-overlay">
            <p v-if="item.caption" class="caption">{{ item.caption }}</p>
            <div v-if="editable" class="media-actions">
              <button @click.stop="toggleBlur(item.id, item.isBlurred || false)" class="action-btn">
                {{ item.isBlurred ? '👁️ Unblur' : '🫣 Blur' }}
              </button>
              <button @click.stop="removeMedia(item.id)" class="action-btn remove">
                🗑️ Remove
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="index === 5 && hasMoreMedia" class="more-indicator">
          +{{ media.length - 6 }} more
        </div>
      </div>
    </div>
    
    <!-- Modal for full view -->
    <Teleport to="body">
      <div v-if="isModalOpen && selectedMedia" class="media-modal" @click="closeModal">
        <div class="modal-content" @click.stop>
          <button class="close-btn" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          
          <img 
            v-if="selectedMedia.type === 'photo'"
            :src="selectedMedia.url" 
            :alt="selectedMedia.caption || 'Full view'"
            :class="{ blurred: selectedMedia.isBlurred }"
          />
          <video 
            v-else-if="selectedMedia.type === 'video'"
            :src="selectedMedia.url"
            :class="{ blurred: selectedMedia.isBlurred }"
            controls
            autoplay
          />
          
          <div v-if="selectedMedia.caption" class="modal-caption">
            {{ selectedMedia.caption }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.media-gallery {
  width: 100%;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  
  &.span-2 {
    grid-column: span 2;
    grid-row: span 2;
    
    @media (max-width: 768px) {
      grid-column: span 1;
      grid-row: span 1;
    }
  }
  
  &:hover .media-overlay {
    opacity: 1;
  }
}

.media-container {
  width: 100%;
  height: 100%;
  position: relative;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
    
    &.blurred {
      filter: blur(20px);
    }
  }
  
  &:hover img,
  &:hover video {
    transform: scale(1.05);
  }
}

.blur-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
  
  svg {
    width: 32px;
    height: 32px;
  }
  
  span {
    font-size: 0.875rem;
    font-weight: 500;
  }
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  .caption {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    line-height: 1.4;
  }
  
  .media-actions {
    display: flex;
    gap: 0.5rem;
    
    .action-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: var(--border-radius-sm);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      &.remove:hover {
        background: rgba(239, 68, 68, 0.8);
        border-color: #ef4444;
      }
    }
  }
}

.more-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  pointer-events: none;
}

// Modal styles
.media-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  animation: zoomIn 0.3s ease;
  
  @keyframes zoomIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  img, video {
    max-width: 100%;
    max-height: 80vh;
    width: auto;
    height: auto;
    border-radius: var(--border-radius-lg);
    
    &.blurred {
      filter: blur(30px);
    }
  }
  
  .close-btn {
    position: absolute;
    top: -40px;
    right: 0;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }
    
    @media (max-width: 768px) {
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
    }
  }
  
  .modal-caption {
    position: absolute;
    bottom: -40px;
    left: 0;
    right: 0;
    color: white;
    text-align: center;
    font-size: 1rem;
    padding: 0 1rem;
    
    @media (max-width: 768px) {
      position: static;
      margin-top: 1rem;
    }
  }
}
</style>