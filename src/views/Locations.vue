<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const locations = ref([
  {
    city: "New York",
    image: "https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg",
    description: "Experience luxury companionship in the city that never sleeps",
    count: 12
  },
  {
    city: "Los Angeles",
    image: "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg",
    description: "Elite companions in the entertainment capital of the world",
    count: 8
  },
  {
    city: "Miami",
    image: "https://images.pexels.com/photos/1707820/pexels-photo-1707820.jpeg",
    description: "Sophisticated company in the heart of South Beach",
    count: 10
  },
  {
    city: "Chicago",
    image: "https://images.pexels.com/photos/2226458/pexels-photo-2226458.jpeg",
    description: "Premium escort services in the Windy City",
    count: 6
  },
  {
    city: "Las Vegas",
    image: "https://images.pexels.com/photos/2837909/pexels-photo-2837909.jpeg",
    description: "Luxury companionship in the entertainment capital",
    count: 15
  },
  {
    city: "San Francisco",
    image: "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg",
    description: "Elite escorts in the City by the Bay",
    count: 7
  }
])

const navigateToEscorts = (city: string) => {
  router.push({
    path: '/escorts',
    query: { location: city }
  })
}
</script>

<template>
  <div class="locations-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Our Locations</h1>
        <p>Find elite companions in premium locations across the country</p>
      </div>
    </div>
    
    <!-- Locations grid -->
    <div class="container">
      <div class="locations-grid">
        <div 
          v-for="location in locations" 
          :key="location.city" 
          class="location-card"
          @click="navigateToEscorts(location.city)"
        >
          <div class="location-image">
            <img :src="location.image" :alt="location.city">
            <div class="location-overlay">
              <span class="escort-count">{{ location.count }} Escorts Available</span>
            </div>
          </div>
          <div class="location-content">
            <h2>{{ location.city }}</h2>
            <p>{{ location.description }}</p>
            <button class="btn btn-primary">View Escorts</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.locations-page {
  padding-top: 70px;
}

.page-header {
  background-color: var(--color-primary-dark);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
  
  h1 {
    color: white;
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
  }
}

.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xxl);
}

.location-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    
    .location-image img {
      transform: scale(1.05);
    }
    
    .btn-primary {
      background-color: var(--color-primary-light);
    }
  }
}

.location-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .location-overlay {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
  }
}

.location-content {
  padding: var(--spacing-lg);
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: var(--spacing-sm);
    color: var(--color-primary-dark);
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-md);
    line-height: 1.5;
  }
  
  .btn {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .locations-grid {
    grid-template-columns: 1fr;
  }
  
  .location-card {
    max-width: 400px;
    margin: 0 auto;
  }
}
</style>