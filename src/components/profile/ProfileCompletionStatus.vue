<template>
  <div class="profile-completion-status">
    <!-- Completion Progress -->
    <div class="completion-header">
      <h3>Profile Completion</h3>
      <span class="completion-percentage" :class="completionClass">
        {{ validation.completionPercentage }}%
      </span>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: `${validation.completionPercentage}%` }"
        :class="completionClass"
      ></div>
    </div>

    <!-- Status Message -->
    <div class="status-message" v-if="!validation.canActivate">
      <i class="fas fa-info-circle"></i>
      <span v-if="validation.errors.length > 0">
        {{ validation.errors[0].message }}
      </span>
      <span v-else>
        Complete all required sections to activate your profile
      </span>
    </div>

    <!-- Completion Steps -->
    <div class="completion-steps" v-if="showSteps">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="step-item"
        :class="{ completed: step.completed, required: step.required }"
      >
        <i class="fas" :class="step.completed ? 'fa-check-circle' : 'fa-circle'"></i>
        <span>{{ step.name }}</span>
        <span v-if="step.required" class="required-badge">Required</span>
      </div>
    </div>

    <!-- Missing Fields Alert -->
    <div v-if="showMissingFields && validation.missingFields.length > 0" class="missing-fields">
      <h4>Missing Information:</h4>
      <ul>
        <li v-for="field in validation.missingFields" :key="field">
          {{ formatFieldName(field) }}
        </li>
      </ul>
    </div>

    <!-- Action Buttons -->
    <div class="completion-actions" v-if="showActions">
      <button 
        v-if="profile.status === 'draft' && validation.canActivate"
        @click="$emit('activate')"
        class="btn btn-primary"
      >
        <i class="fas fa-check"></i> Activate Profile
      </button>
      
      <button 
        v-if="!validation.isComplete"
        @click="$emit('edit')"
        class="btn btn-secondary"
      >
        <i class="fas fa-edit"></i> Complete Profile
      </button>

      <div v-if="profile.status === 'active'" class="status-badge active">
        <i class="fas fa-check-circle"></i> Profile Active
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { validateProfileCompletion, getProfileCompletionSteps } from '../../utils/profileValidation'
import type { EscortProfile } from '../../types/profile'

interface Props {
  profile: Partial<EscortProfile>
  showSteps?: boolean
  showActions?: boolean
  showMissingFields?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSteps: true,
  showActions: true,
  showMissingFields: false
})

const emit = defineEmits<{
  activate: []
  edit: []
}>()

const validation = computed(() => validateProfileCompletion(props.profile))
const steps = computed(() => getProfileCompletionSteps(props.profile))

const completionClass = computed(() => {
  const percentage = validation.value.completionPercentage
  if (percentage === 100) return 'complete'
  if (percentage >= 80) return 'almost-complete'
  if (percentage >= 50) return 'partial'
  return 'incomplete'
})

const formatFieldName = (field: string): string => {
  const fieldNames: Record<string, string> = {
    name: 'Profile Name',
    age: 'Age',
    location: 'Location',
    description: 'Description',
    services: 'Services',
    service_descriptions: 'Service Descriptions',
    pricing: 'Pricing Options',
    availability: 'Working Hours',
    media: 'Photos/Videos',
    preferences: 'Booking Preferences'
  }
  return fieldNames[field] || field
}
</script>

<style scoped>
.profile-completion-status {
  background: var(--surface-color);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.completion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.completion-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-primary);
}

.completion-percentage {
  font-size: 1.5rem;
  font-weight: 600;
}

.completion-percentage.complete {
  color: var(--success-color);
}

.completion-percentage.almost-complete {
  color: var(--primary-color);
}

.completion-percentage.partial {
  color: var(--warning-color);
}

.completion-percentage.incomplete {
  color: var(--danger-color);
}

.progress-bar {
  height: 8px;
  background: var(--gray-200);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.complete {
  background: var(--success-color);
}

.progress-fill.almost-complete {
  background: var(--primary-color);
}

.progress-fill.partial {
  background: var(--warning-color);
}

.progress-fill.incomplete {
  background: var(--danger-color);
}

.status-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--info-bg);
  color: var(--info-color);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.completion-steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.step-item.completed {
  color: var(--success-color);
}

.step-item i {
  font-size: 1rem;
}

.required-badge {
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  background: var(--gray-100);
  color: var(--text-secondary);
  border-radius: 12px;
  font-size: 0.75rem;
}

.missing-fields {
  background: var(--warning-bg);
  color: var(--warning-color);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.missing-fields h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.missing-fields ul {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.missing-fields li {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.completion-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.active {
  background: var(--success-bg);
  color: var(--success-color);
}

/* Responsive */
@media (max-width: 768px) {
  .completion-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .completion-actions button {
    width: 100%;
  }
}
</style>