<script setup lang="ts">
import { computed } from 'vue'
import { BADGE_RARITIES } from '../../constants/badges'
import type { ProfileBadge } from '../../types/badges'

interface Props {
  badge: ProfileBadge
  size?: 'small' | 'medium' | 'large'
  showName?: boolean
  showDescription?: boolean
  earned?: boolean
  clickable?: boolean
  glow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showName: true,
  showDescription: false,
  earned: true,
  clickable: false,
  glow: false
})

const emit = defineEmits<{
  click: [badge: ProfileBadge]
}>()

const rarityInfo = computed(() => BADGE_RARITIES[props.badge.rarity])

const badgeClasses = computed(() => [
  'badge-display',
  `badge-${props.size}`,
  `badge-${props.badge.rarity}`,
  {
    'badge-earned': props.earned,
    'badge-unearned': !props.earned,
    'badge-clickable': props.clickable,
    'badge-glow': props.glow
  }
])

const handleClick = () => {
  if (props.clickable) {
    emit('click', props.badge)
  }
}
</script>

<template>
  <div :class="badgeClasses" @click="handleClick">
    <div class="badge-icon-container">
      <div class="badge-icon" :style="{ color: badge.color }">
        {{ badge.icon }}
      </div>
      <div 
        v-if="glow" 
        class="badge-glow" 
        :style="{ 
          backgroundColor: rarityInfo.glow,
          boxShadow: `0 0 20px ${rarityInfo.glow}` 
        }"
      ></div>
    </div>
    
    <div v-if="showName || showDescription" class="badge-info">
      <div v-if="showName" class="badge-name">
        {{ badge.name }}
      </div>
      
      <div v-if="showDescription" class="badge-description">
        {{ badge.description }}
      </div>
      
      <div class="badge-rarity" :style="{ color: rarityInfo.color }">
        {{ rarityInfo.name }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.badge-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all 0.2s ease;
  
  &.badge-clickable {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      
      .badge-icon-container {
        transform: scale(1.1);
      }
    }
  }
  
  &.badge-unearned {
    opacity: 0.4;
    filter: grayscale(1);
  }
}

.badge-icon-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  
  .badge-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    z-index: -1;
  }
}

.badge-icon {
  font-size: 2rem;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
}

// Size variants
.badge-small {
  .badge-icon {
    font-size: 1.2rem;
  }
  
  .badge-info {
    font-size: 0.8rem;
  }
  
  .badge-glow {
    width: 30px;
    height: 30px;
  }
}

.badge-medium {
  .badge-icon {
    font-size: 2rem;
  }
  
  .badge-glow {
    width: 50px;
    height: 50px;
  }
}

.badge-large {
  .badge-icon {
    font-size: 3rem;
  }
  
  .badge-info {
    font-size: 1.1rem;
  }
  
  .badge-glow {
    width: 80px;
    height: 80px;
  }
}

.badge-info {
  flex: 1;
  
  .badge-name {
    font-weight: 600;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-xs);
  }
  
  .badge-description {
    color: var(--color-text-light);
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: var(--spacing-xs);
  }
  
  .badge-rarity {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

// Rarity styles
.badge-legendary {
  .badge-icon-container::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
    border-radius: 50%;
    z-index: -2;
    opacity: 0.3;
    animation: legendary-pulse 2s ease-in-out infinite;
  }
}

.badge-epic {
  .badge-icon-container::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: linear-gradient(45deg, #9333ea, #a855f7, #9333ea);
    border-radius: 50%;
    z-index: -2;
    opacity: 0.2;
    animation: epic-pulse 3s ease-in-out infinite;
  }
}

.badge-rare {
  .badge-icon-container::after {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: linear-gradient(45deg, #3b82f6, #60a5fa, #3b82f6);
    border-radius: 50%;
    z-index: -2;
    opacity: 0.15;
    animation: rare-pulse 4s ease-in-out infinite;
  }
}

@keyframes legendary-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
}

@keyframes epic-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.4;
  }
}

@keyframes rare-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.15;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.3;
  }
}

// Responsive
@media (max-width: 768px) {
  .badge-display {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-xs);
  }
}
</style>