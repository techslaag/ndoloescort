<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

interface EscortProps {
  escort: {
    id: number;
    name: string;
    age: number;
    location: string;
    rate: string;
    rating: number;
    profileImage: string;
    services: string[];
  }
}

interface Emits {
  (e: 'view-profile', escortId: number): void
  (e: 'toggle-favorite', escortId: number): void
  (e: 'start-message', escortId: number, escortName: string): void
}

const props = defineProps<EscortProps>()
const emit = defineEmits<Emits>()

const router = useRouter()
const authStore = useAuthStore()

const handleViewProfile = () => {
  emit('view-profile', props.escort.id)
}

const handleToggleFavorite = () => {
  emit('toggle-favorite', props.escort.id)
}

const handleStartMessage = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // Navigate to messages with escort info
  router.push({
    name: 'Messages',
    query: {
      receiver: props.escort.id.toString(),
      receiverName: props.escort.name
    }
  })
  
  emit('start-message', props.escort.id, props.escort.name)
}
</script>

<template>
  <div class="escort-card">
    <div class="card-image">
      <img :src="escort.profileImage" :alt="`${escort.name}, escort in ${escort.location}`">
      <div class="card-badge">{{ escort.rate }}</div>
    </div>
    <div class="card-content">
      <div class="card-header">
        <h3 class="escort-name">{{ escort.name }}, {{ escort.age }}</h3>
        <div class="escort-rating">
          <span class="stars">★★★★★</span>
          <span class="rating-value">{{ escort.rating.toFixed(1) }}</span>
        </div>
      </div>
      <p class="escort-location">
        <span class="location-icon">📍</span> {{ escort.location }}
      </p>
      <div class="escort-services">
        <span 
          v-for="(service, index) in escort.services.slice(0, 3)" 
          :key="index" 
          class="service-tag"
        >
          {{ service }}
        </span>
        <span v-if="escort.services.length > 3" class="more-tag">+{{ escort.services.length - 3 }}</span>
      </div>
      <div class="card-actions">
        <button @click="handleViewProfile" class="btn btn-primary">View Profile</button>
        <button 
          @click="handleStartMessage" 
          class="btn btn-secondary btn-message"
          title="Send encrypted message"
        >
          💬
        </button>
        <button @click="handleToggleFavorite" class="btn btn-outline btn-icon">♡</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.escort-card {
  border-radius: var(--border-radius-md);
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-7px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    
    .card-image img {
      transform: scale(1.05);
    }
  }
}

.card-image {
  height: 300px;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .card-badge {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background-color: var(--color-primary);
    color: white;
    padding: 0.3rem 0.75rem;
    border-radius: var(--border-radius-sm);
    font-weight: 600;
    font-size: 0.9rem;
  }
}

.card-content {
  padding: var(--spacing-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.escort-name {
  font-size: 1.2rem;
  margin: 0;
  color: var(--color-text-dark);
}

.escort-rating {
  display: flex;
  align-items: center;
  
  .stars {
    color: gold;
    font-size: 0.9rem;
    margin-right: 0.25rem;
  }
  
  .rating-value {
    font-weight: 600;
    font-size: 0.9rem;
  }
}

.escort-location {
  display: flex;
  align-items: center;
  color: var(--color-text-light);
  font-size: 0.95rem;
  margin-bottom: var(--spacing-sm);
  
  .location-icon {
    margin-right: 0.25rem;
  }
}

.escort-services {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: var(--spacing-md);
}

.service-tag, .more-tag {
  background-color: var(--color-background-alt);
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  color: var(--color-primary);
}

.more-tag {
  background-color: transparent;
  border: 1px dashed var(--color-primary-light);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  
  .btn {
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
  }
  
  .btn-primary {
    flex: 1;
  }
  
  .btn-message {
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 1.1rem;
    background: var(--color-text-light);
    color: white;
    border: 1px solid var(--color-text-light);
    position: relative;
    
    &:hover {
      background: var(--color-text);
      border-color: var(--color-text);
      transform: scale(1.05);
    }
    
    &::after {
      content: '🔒';
      position: absolute;
      top: -2px;
      right: -2px;
      font-size: 0.6rem;
      background: #28a745;
      border-radius: 50%;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .btn-icon {
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 1.1rem;
    color: var(--color-primary);
    
    &:hover {
      color: white;
    }
  }
}
</style>