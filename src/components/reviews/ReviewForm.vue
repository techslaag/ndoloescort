<script setup lang="ts">
import { ref, computed } from 'vue'
import { reviewService } from '../../services/reviewService'
import { useAuthStore } from '../../stores/auth'

interface Props {
  escortId: string
  bookingId: string
  escortName?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  cancel: []
}>()

const authStore = useAuthStore()

// Form state
const rating = ref(0)
const hoverRating = ref(0)
const title = ref('')
const comment = ref('')
const categories = ref({
  communication: 0,
  punctuality: 0,
  experience: 0,
  wouldRecommend: false
})
const isAnonymous = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// Computed
const isFormValid = computed(() => {
  return (
    rating.value > 0 &&
    title.value.trim().length >= 5 &&
    comment.value.trim().length >= 20 &&
    categories.value.communication > 0 &&
    categories.value.punctuality > 0 &&
    categories.value.experience > 0
  )
})

const overallRating = computed(() => {
  if (rating.value === 0) return 0
  return rating.value
})

// Methods
const setRating = (value: number) => {
  rating.value = value
}

const setCategoryRating = (category: keyof typeof categories.value, value: number) => {
  if (category === 'wouldRecommend') {
    categories.value.wouldRecommend = Boolean(value)
  } else {
    categories.value[category] = value
  }
}

const submitReview = async () => {
  if (!isFormValid.value || !authStore.user) return

  try {
    isSubmitting.value = true
    error.value = null

    await reviewService.createReview({
      escortId: props.escortId,
      clientId: authStore.user.$id,
      bookingId: props.bookingId,
      rating: rating.value,
      title: title.value.trim(),
      comment: comment.value.trim(),
      categories: {
        ...categories.value,
        wouldRecommend: categories.value.wouldRecommend
      },
      isAnonymous: isAnonymous.value
    })

    // Success
    emit('success')
    if (props.onSuccess) {
      props.onSuccess()
    }
  } catch (err) {
    console.error('Error submitting review:', err)
    error.value = err instanceof Error ? err.message : 'Failed to submit review'
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  emit('cancel')
  if (props.onCancel) {
    props.onCancel()
  }
}
</script>

<template>
  <div class="review-form">
    <div class="form-header">
      <h2>Leave a Review</h2>
      <p v-if="escortName" class="escort-name">for {{ escortName }}</p>
    </div>

    <!-- Overall Rating -->
    <div class="form-section">
      <label class="section-label">Overall Rating</label>
      <div class="star-rating-container">
        <div class="star-rating">
          <button
            v-for="n in 5"
            :key="n"
            @click="setRating(n)"
            @mouseenter="hoverRating = n"
            @mouseleave="hoverRating = 0"
            class="star-button"
            type="button"
          >
            <svg
              :class="['star', { filled: n <= (hoverRating || rating) }]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        </div>
        <span class="rating-text">{{ rating > 0 ? `${rating} out of 5` : 'Select rating' }}</span>
      </div>
    </div>

    <!-- Category Ratings -->
    <div class="form-section">
      <label class="section-label">Rate specific aspects</label>
      <div class="category-ratings">
        <div class="category-item">
          <span class="category-name">Communication</span>
          <div class="mini-stars">
            <button
              v-for="n in 5"
              :key="n"
              @click="setCategoryRating('communication', n)"
              class="mini-star-button"
              type="button"
            >
              <svg
                :class="['mini-star', { filled: n <= categories.communication }]"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 .25l2.09 4.26 4.673.68-3.381 3.296.798 4.65L8 10.89l-4.18 2.196.798-4.65L1.237 5.21l4.673-.68L8 .25z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="category-item">
          <span class="category-name">Punctuality</span>
          <div class="mini-stars">
            <button
              v-for="n in 5"
              :key="n"
              @click="setCategoryRating('punctuality', n)"
              class="mini-star-button"
              type="button"
            >
              <svg
                :class="['mini-star', { filled: n <= categories.punctuality }]"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 .25l2.09 4.26 4.673.68-3.381 3.296.798 4.65L8 10.89l-4.18 2.196.798-4.65L1.237 5.21l4.673-.68L8 .25z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="category-item">
          <span class="category-name">Experience</span>
          <div class="mini-stars">
            <button
              v-for="n in 5"
              :key="n"
              @click="setCategoryRating('experience', n)"
              class="mini-star-button"
              type="button"
            >
              <svg
                :class="['mini-star', { filled: n <= categories.experience }]"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 .25l2.09 4.26 4.673.68-3.381 3.296.798 4.65L8 10.89l-4.18 2.196.798-4.65L1.237 5.21l4.673-.68L8 .25z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Title -->
    <div class="form-section">
      <label for="review-title" class="section-label">Review Title</label>
      <input
        id="review-title"
        v-model="title"
        type="text"
        placeholder="Summarize your experience"
        class="form-input"
        maxlength="100"
      />
      <span class="char-count">{{ title.length }}/100</span>
    </div>

    <!-- Review Comment -->
    <div class="form-section">
      <label for="review-comment" class="section-label">Your Review</label>
      <textarea
        id="review-comment"
        v-model="comment"
        placeholder="Share details about your experience..."
        rows="5"
        class="form-textarea"
        maxlength="1000"
      ></textarea>
      <span class="char-count">{{ comment.length }}/1000</span>
    </div>

    <!-- Would Recommend -->
    <div class="form-section">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="categories.wouldRecommend"
          class="checkbox"
        />
        <span>I would recommend this escort to others</span>
      </label>
    </div>

    <!-- Anonymous Option -->
    <div class="form-section">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="isAnonymous"
          class="checkbox"
        />
        <span>Post review anonymously</span>
      </label>
      <p class="help-text">Your name will be displayed as "Anonymous Client"</p>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        @click="cancel"
        type="button"
        class="btn btn-secondary"
        :disabled="isSubmitting"
      >
        Cancel
      </button>
      <button
        @click="submitReview"
        type="button"
        class="btn btn-primary"
        :disabled="!isFormValid || isSubmitting"
      >
        <span v-if="isSubmitting" class="spinner"></span>
        <span v-else>Submit Review</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.review-form {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-header {
  text-align: center;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
  
  .escort-name {
    color: #6b7280;
    margin-top: 0.25rem;
  }
}

.form-section {
  margin-bottom: 1.5rem;
  
  .section-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }
}

.star-rating-container {
  text-align: center;
  
  .star-rating {
    display: inline-flex;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }
  
  .star-button {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.1);
    }
    
    .star {
      width: 32px;
      height: 32px;
      color: #d1d5db;
      transition: all 0.2s ease;
      
      &.filled {
        color: #fbbf24;
        fill: #fbbf24;
      }
    }
  }
  
  .rating-text {
    display: block;
    font-size: 0.875rem;
    color: #6b7280;
  }
}

.category-ratings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  .category-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .category-name {
      font-size: 0.875rem;
      color: #374151;
    }
    
    .mini-stars {
      display: flex;
      gap: 0.125rem;
    }
    
    .mini-star-button {
      background: none;
      border: none;
      padding: 0.125rem;
      cursor: pointer;
      
      .mini-star {
        width: 16px;
        height: 16px;
        color: #d1d5db;
        
        &.filled {
          color: #fbbf24;
        }
      }
    }
  }
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  
  .checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  span {
    font-size: 0.875rem;
    color: #374151;
  }
}

.help-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  margin-left: 1.625rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  
  .error-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  
  .btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    
    &.btn-secondary {
      background: #f3f4f6;
      color: #374151;
      
      &:hover:not(:disabled) {
        background: #e5e7eb;
      }
    }
    
    &.btn-primary {
      background: #6366f1;
      color: white;
      
      &:hover:not(:disabled) {
        background: #5558e3;
      }
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>