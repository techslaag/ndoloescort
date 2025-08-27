<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useLocationStore } from '../../stores/location'
import LocationModal from '../LocationModal.vue'

const router = useRouter()
const locationStore = useLocationStore()
const locationModalRef = ref<InstanceType<typeof LocationModal> | null>(null)
const currentYear = new Date().getFullYear()

const navigateTo = (path: string) => {
  router.push(path)
}

const openLocationModal = () => {
  locationModalRef.value?.openModal()
}

// Initialize location when component mounts
onMounted(() => {
  locationStore.init()
})
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-logo">
        <h2>
          <span class="logo-text">Ndolo</span>
          <span class="logo-accent">Escorts</span>
        </h2>
        <p class="tagline">Premium companion services for discerning clients</p>
      </div>
      
      <div class="footer-links">
        <div class="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a @click="navigateTo('/escorts')">Browse Escorts</a></li>
            <li><a @click="navigateTo('/services')">Our Services</a></li>
            <li><a @click="navigateTo('/locations')">Locations</a></li>
            <li><a @click="navigateTo('/faq')">FAQ</a></li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h3>Information</h3>
          <ul>
            <li><a @click="navigateTo('/about')">About Us</a></li>
            <li><a @click="navigateTo('/how-it-works')">How It Works</a></li>
            <li><a @click="navigateTo('/testimonials')">Testimonials</a></li>
            <li><a @click="navigateTo('/blog')">Blog</a></li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h3>Support</h3>
          <ul>
            <li><a @click="navigateTo('/contact')">Contact Us</a></li>
            <li><a @click="navigateTo('/privacy')">Privacy Policy</a></li>
            <li><a @click="navigateTo('/terms')">Terms of Service</a></li>
            <li><a @click="navigateTo('/safety')">Safety Guide</a></li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="container">
        <div class="footer-bottom-content">
          <div class="footer-bottom-left">
            <p>&copy; {{ currentYear }} Elite Companions. All rights reserved.</p>
            <p class="legal-disclaimer">This platform is intended for adults aged 21+ for entertainment and companion services only. All content and services comply with local laws and regulations.</p>
          </div>
          <div class="footer-bottom-right">
            <div class="location-selector" @click="openLocationModal">
              <span class="location-icon">📍</span>
              <span class="location-text">
                {{ locationStore.currentLocation ? `${locationStore.currentLocation.flag} ${locationStore.currentLocation.name}` : 'Select Location' }}
              </span>
              <span class="location-arrow">▼</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <LocationModal ref="locationModalRef" />
  </footer>
</template>

<style scoped lang="scss">
.site-footer {
  background-color: var(--color-background-dark);
  color: rgba(255, 255, 255, 0.8);
  padding-top: var(--spacing-xxl);
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-logo {
  flex: 1 1 300px;
  
  h2 {
    color: white;
    margin-bottom: var(--spacing-sm);
    font-size: 1.75rem;
    
    .logo-accent {
      color: var(--color-accent);
    }
  }
  
  .tagline {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }
}

.footer-links {
  flex: 2 1 600px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.footer-section {
  flex: 1 1 180px;
  margin-bottom: var(--spacing-lg);
  
  h3 {
    color: white;
    font-size: 1.2rem;
    margin-bottom: var(--spacing-md);
  }
  
  ul {
    list-style: none;
    
    li {
      margin-bottom: var(--spacing-sm);
      
      a {
        color: rgba(255, 255, 255, 0.7);
        transition: color 0.2s ease;
        cursor: pointer;
        
        &:hover {
          color: var(--color-accent);
        }
      }
    }
  }
}

.footer-bottom {
  padding: var(--spacing-md) 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  
  .footer-bottom-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }
  
  .footer-bottom-left {
    flex: 1;
    min-width: 300px;
    
    .legal-disclaimer {
      margin-top: var(--spacing-sm);
      font-size: 0.8rem;
    }
  }
  
  .footer-bottom-right {
    display: flex;
    align-items: center;
  }
  
  .location-selector {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .location-icon {
      font-size: 1rem;
    }
    
    .location-text {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
      white-space: nowrap;
    }
    
    .location-arrow {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      transition: transform 0.2s ease;
    }
    
    &:hover .location-arrow {
      transform: translateY(1px);
    }
  }
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .footer-logo {
    text-align: center;
  }
  
  .footer-links {
    gap: var(--spacing-lg);
  }
  
  .footer-section {
    flex: 1 1 100%;
    text-align: center;
  }
  
  .footer-bottom {
    .footer-bottom-content {
      flex-direction: column;
      text-align: center;
      gap: var(--spacing-lg);
    }
    
    .footer-bottom-left {
      min-width: auto;
    }
    
    .location-selector {
      justify-content: center;
    }
  }
}
</style>