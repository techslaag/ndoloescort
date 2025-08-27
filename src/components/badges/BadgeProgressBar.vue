<script setup lang="ts">
import { computed } from 'vue'
import type { BadgeProgress } from '../../types/badges'

interface Props {
  progress?: BadgeProgress | null
  showDetails?: boolean
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  size: 'medium',
  animated: true
})

const progressData = computed(() => {
  if (!props.progress) {
    return {
      current: 0,
      required: 1,
      percentage: 0,
      isEligible: false
    }
  }
  return props.progress
})

const progressClasses = computed(() => [
  'progress-bar',
  `progress-${props.size}`,
  {
    'progress-animated': props.animated,
    'progress-complete': progressData.value.percentage >= 100,
    'progress-eligible': progressData.value.isEligible
  }
])

const barHeight = computed(() => {
  switch (props.size) {
    case 'small':
      return '4px'
    case 'medium':
      return '8px'
    case 'large':
      return '12px'
    default:
      return '8px'
  }
})

const progressColor = computed(() => {
  if (progressData.value.percentage >= 100) return '#10b981'
  if (progressData.value.percentage >= 75) return '#3b82f6'
  if (progressData.value.percentage >= 50) return '#f59e0b'
  if (progressData.value.percentage >= 25) return '#ef4444'
  return '#6b7280'
})
</script>

<template>
  <div :class="progressClasses">
    <div v-if="showDetails && size !== 'small'" class="progress-header">
      <span class="progress-label">
        {{ Math.round(progressData.percentage) }}% Complete
      </span>
      <span class="progress-values">
        {{ progressData.current }}/{{ progressData.required }}
      </span>
    </div>
    
    <div class="progress-track" :style="{ height: barHeight }">
      <div 
        class="progress-fill"
        :style="{ 
          width: `${Math.min(100, progressData.percentage)}%`,
          backgroundColor: progressColor,
          height: barHeight
        }"
      >
        <div v-if="animated" class="progress-shine"></div>
      </div>
    </div>
    
    <div v-if="showDetails && progressData.nextMilestone" class="progress-footer">
      <span class="next-milestone">
        Next: {{ progressData.nextMilestone }}
      </span>
    </div>
    
    <!-- Completion indicator -->
    <div v-if="progressData.percentage >= 100" class="completion-badge">
      <span class="completion-icon">✅</span>
      <span v-if="showDetails">Ready to earn!</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.progress-bar {
  &.progress-small {
    .progress-header {
      font-size: 0.75rem;
      margin-bottom: var(--spacing-xs);
    }
  }
  
  &.progress-medium {
    .progress-header {
      font-size: 0.85rem;
      margin-bottom: var(--spacing-sm);
    }
  }
  
  &.progress-large {
    .progress-header {
      font-size: 1rem;
      margin-bottom: var(--spacing-md);
    }
  }
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .progress-label {
    font-weight: 600;
    color: var(--color-text-dark);
  }
  
  .progress-values {
    color: var(--color-text-light);
    font-size: 0.9em;
  }
}

.progress-track {
  background: var(--color-background-alt);
  border-radius: calc(var(--border-radius-full) / 2);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  transition: width 0.8s ease-out, background-color 0.3s ease;
  border-radius: calc(var(--border-radius-full) / 2);
  position: relative;
  overflow: hidden;
  
  .progress-shine {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    animation: shine 2s ease-in-out infinite;
  }
}

.progress-footer {
  margin-top: var(--spacing-xs);
  
  .next-milestone {
    color: var(--color-text-light);
    font-size: 0.8rem;
    font-style: italic;
  }
}

.completion-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-success-light);
  color: var(--color-success-dark);
  border-radius: var(--border-radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  
  .completion-icon {
    font-size: 1rem;
  }
}

// Animation variants
.progress-animated {
  .progress-fill {
    animation: fillAnimation 1s ease-out;
  }
}

.progress-complete {
  .progress-fill {
    background: linear-gradient(45deg, #10b981, #059669) !important;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 70%
      );
      animation: completePulse 2s ease-in-out infinite;
    }
  }
}

.progress-eligible {
  .progress-track {
    border: 2px solid var(--color-primary);
    background: var(--color-primary-light);
  }
}

@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes fillAnimation {
  0% {
    width: 0%;
  }
}

@keyframes completePulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
    
    .progress-values {
      align-self: flex-end;
    }
  }
  
  .completion-badge {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-xs);
  }
}
</style>