<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="close">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>
              <i class="fas fa-exclamation-triangle text-warning"></i>
              Profile Activation
            </h3>
            <button @click="close" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <!-- Validation Status -->
            <div v-if="!validation.canActivate" class="validation-warning">
              <h4>Cannot Activate Profile</h4>
              <p>Your profile is incomplete. Please complete all required sections before activation.</p>
              
              <!-- Completion Progress -->
              <div class="completion-summary">
                <div class="progress-circle" :class="progressClass">
                  <svg viewBox="0 0 36 36">
                    <path class="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path class="circle"
                      :stroke-dasharray="`${validation.completionPercentage}, 100`"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" class="percentage">{{ validation.completionPercentage }}%</text>
                  </svg>
                </div>
                
                <div class="completion-details">
                  <h5>Missing Requirements:</h5>
                  <ul>
                    <li v-for="error in validation.errors" :key="error.field">
                      <i class="fas fa-times-circle"></i>
                      {{ error.message }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="modal-actions">
                <button @click="goToEdit" class="btn btn-primary">
                  <i class="fas fa-edit"></i> Complete Profile
                </button>
                <button @click="close" class="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>

            <!-- Confirmation for Complete Profile -->
            <div v-else class="activation-confirm">
              <div class="success-icon">
                <i class="fas fa-check-circle"></i>
              </div>
              
              <h4>Profile Ready for Activation</h4>
              <p>Your profile is complete and ready to be activated. Once activated:</p>
              
              <ul class="activation-info">
                <li><i class="fas fa-check"></i> Your profile will be visible to clients</li>
                <li><i class="fas fa-check"></i> You can receive booking requests</li>
                <li><i class="fas fa-check"></i> Your availability calendar will be active</li>
                <li><i class="fas fa-check"></i> You'll appear in search results</li>
              </ul>

              <div class="terms-notice">
                <i class="fas fa-info-circle"></i>
                <p>By activating your profile, you confirm that all information is accurate and you agree to our terms of service.</p>
              </div>

              <!-- Action Buttons -->
              <div class="modal-actions">
                <button @click="confirmActivation" class="btn btn-primary" :disabled="isActivating">
                  <span v-if="isActivating">
                    <i class="fas fa-spinner fa-spin"></i> Activating...
                  </span>
                  <span v-else>
                    <i class="fas fa-check"></i> Activate Profile
                  </span>
                </button>
                <button @click="close" class="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { validateProfileCompletion } from '../../utils/profileValidation'
import type { EscortProfile } from '../../types/profile'

interface Props {
  show: boolean
  profile: Partial<EscortProfile>
  profileId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  activated: []
}>()

const router = useRouter()
const isActivating = ref(false)

const validation = computed(() => validateProfileCompletion(props.profile))

const progressClass = computed(() => {
  const percentage = validation.value.completionPercentage
  if (percentage === 100) return 'complete'
  if (percentage >= 80) return 'almost-complete'
  if (percentage >= 50) return 'partial'
  return 'incomplete'
})

const close = () => {
  emit('close')
}

const goToEdit = () => {
  emit('close')
  router.push(`/escort/profiles/${props.profileId}/edit`)
}

const confirmActivation = async () => {
  isActivating.value = true
  emit('activated')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--surface-color);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 2rem;
}

.validation-warning h4,
.activation-confirm h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.completion-summary {
  display: flex;
  gap: 2rem;
  align-items: center;
  margin: 2rem 0;
}

.progress-circle {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
}

.progress-circle svg {
  transform: rotate(-90deg);
}

.circle-bg {
  fill: none;
  stroke: var(--gray-200);
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.progress-circle.complete .circle {
  stroke: var(--success-color);
}

.progress-circle.almost-complete .circle {
  stroke: var(--primary-color);
}

.progress-circle.partial .circle {
  stroke: var(--warning-color);
}

.progress-circle.incomplete .circle {
  stroke: var(--danger-color);
}

.percentage {
  fill: var(--text-primary);
  font-size: 0.5em;
  text-anchor: middle;
  font-weight: 600;
  transform: rotate(90deg);
  transform-origin: center;
}

.completion-details {
  flex: 1;
}

.completion-details h5 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.completion-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.completion-details li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: var(--danger-color);
}

.activation-confirm {
  text-align: center;
}

.success-icon {
  font-size: 4rem;
  color: var(--success-color);
  margin-bottom: 1rem;
}

.activation-info {
  list-style: none;
  padding: 0;
  margin: 2rem 0;
  text-align: left;
}

.activation-info li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: var(--text-primary);
}

.activation-info i {
  color: var(--success-color);
}

.terms-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--info-bg);
  color: var(--info-color);
  border-radius: 8px;
  margin: 1.5rem 0;
  text-align: left;
}

.terms-notice i {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.terms-notice p {
  margin: 0;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .completion-summary {
    flex-direction: column;
    text-align: center;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
  
  .modal-actions button {
    width: 100%;
  }
}
</style>