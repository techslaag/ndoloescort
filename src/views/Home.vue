<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EscortCard from '../components/escort/EscortCard.vue'
import { fetchFeaturedEscorts } from '../services/escortService'

// Import all background videos
import backg1 from '../assets/video/backgrounds/backg1.mp4'
import backg2 from '../assets/video/backgrounds/backg2.mp4'
import backg3 from '../assets/video/backgrounds/backg3.mp4'

const router = useRouter()
const featuredEscorts = ref<any[]>([])
const isLoading = ref(true)
const currentVideo = ref('')

// Array of all available background videos
const backgroundVideos = [backg1, backg2, backg3]

// Function to randomly select a video
const getRandomVideo = () => {
  const randomIndex = Math.floor(Math.random() * backgroundVideos.length)
  return backgroundVideos[randomIndex]
}

// Function to change video (can be called to refresh video)
const changeVideo = () => {
  currentVideo.value = getRandomVideo()
}

onMounted(async () => {
  // Set random video on component mount
  currentVideo.value = getRandomVideo()
  
  try {
    featuredEscorts.value = await fetchFeaturedEscorts()
  } catch (error) {
    console.error('Failed to fetch escorts:', error)
  } finally {
    isLoading.value = false
  }
})

const navigateTo = (path: string) => {
  router.push(path)
}

// Event handlers for EscortCard
const handleViewProfile = (escortId: number) => {
  router.push(`/escorts/${escortId}`)
}

const handleToggleFavorite = (escortId: number) => {
  // In a real app, you'd implement favorite functionality
  console.log('Toggle favorite for escort:', escortId)
}

const handleStartMessage = (escortId: number, escortName: string) => {
  // This will be handled by the EscortCard component itself
  console.log('Starting message with:', escortName)
}
</script>

<template>
  <div class="home-page">
    <!-- Hero section -->
    <section class="hero-section">
      <div class="hero-video-container">
        <video 
          class="hero-video" 
          autoplay 
          muted 
          loop 
          playsinline
          :key="currentVideo"
        >
          <source :src="currentVideo" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content container">
        <h1 class="hero-title">Exceptional Companion Services</h1>
        <p class="hero-subtitle">Experience unforgettable moments with our elite companions</p>
        <div class="hero-cta">
          <button @click="navigateTo('/escorts')" class="btn btn-primary btn-lg">Browse Escorts</button>
          <button @click="navigateTo('/services')" class="btn btn-outline btn-lg">Our Services</button>
        </div>
      </div>
    </section>
    
    <!-- Featured escorts -->
    <section class="featured-section section">
      <div class="container">
        <div class="section-header">
          <h2>Featured Companions</h2>
          <p>Meet our most exclusive and highly-rated companions</p>
        </div>
        
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
        </div>
        
        <div v-else class="escorts-grid">
          <EscortCard 
            v-for="(escort, index) in featuredEscorts"
            :key="index"
            :escort="escort"
            @view-profile="handleViewProfile"
            @toggle-favorite="handleToggleFavorite"
            @start-message="handleStartMessage"
          />
        </div>
        
        <div class="view-all-container">
          <button @click="navigateTo('/escorts')" class="btn btn-outline">View All Escorts</button>
        </div>
      </div>
    </section>
    
    <!-- Services section -->
    <section class="services-section section">
      <div class="container">
        <div class="section-header">
          <h2>Our Premium Services</h2>
          <p>We offer a range of exclusive services tailored to your needs</p>
        </div>
        
        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon">
              <span class="icon">🥂</span>
            </div>
            <h3>Dinner Dates</h3>
            <p>Enjoy sophisticated company during dinner at premium restaurants</p>
          </div>
          
          <div class="service-card">
            <div class="service-icon">
              <span class="icon">✈️</span>
            </div>
            <h3>Travel Companions</h3>
            <p>Experience memorable journeys with our elegant companions</p>
          </div>
          
          <div class="service-card">
            <div class="service-icon">
              <span class="icon">🎭</span>
            </div>
            <h3>Event Accompaniment</h3>
            <p>Make a lasting impression at social and business events</p>
          </div>
          
          <div class="service-card">
            <div class="service-icon">
              <span class="icon">🌙</span>
            </div>
            <h3>Private Experiences</h3>
            <p>Custom-tailored private experiences for discerning clients</p>
          </div>
        </div>
        
        <div class="view-all-container">
          <button @click="navigateTo('/services')" class="btn btn-outline">Explore All Services</button>
        </div>
      </div>
    </section>
    
    <!-- Testimonials -->
    <section class="testimonials-section section">
      <div class="container">
        <div class="section-header">
          <h2>Client Testimonials</h2>
          <p>What our satisfied clients have to say about us</p>
        </div>
        
        <div class="testimonials-container">
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"An absolutely exquisite experience. The companion was sophisticated, charming, and made our evening truly memorable."</p>
            </div>
            <div class="testimonial-author">
              <p class="author-name">James K.</p>
              <div class="rating">★★★★★</div>
            </div>
          </div>
          
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"Everything was handled with utmost professionalism and discretion. I couldn't have asked for a better companion for my business trip."</p>
            </div>
            <div class="testimonial-author">
              <p class="author-name">Michael T.</p>
              <div class="rating">★★★★★</div>
            </div>
          </div>
          
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"The booking process was seamless, and the companion exceeded all my expectations. Will definitely use this service again."</p>
            </div>
            <div class="testimonial-author">
              <p class="author-name">Robert D.</p>
              <div class="rating">★★★★★</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Why Choose Us -->
    <section class="why-us-section section">
      <div class="container">
        <div class="section-header">
          <h2>Why Choose Elite Companions</h2>
          <p>What sets us apart from other services</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">✓</div>
            <h3>Verified Profiles</h3>
            <p>All our companions are thoroughly vetted and their profiles are 100% authentic</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">✓</div>
            <h3>Discreet Service</h3>
            <p>Your privacy is our priority with secure, confidential booking processes</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">✓</div>
            <h3>Premium Selection</h3>
            <p>Only the most sophisticated and professional companions in our network</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">✓</div>
            <h3>24/7 Support</h3>
            <p>Our concierge team is available around the clock to assist you</p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- CTA section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Ready for an Unforgettable Experience?</h2>
          <p>Browse our selection of elite companions and book your perfect date today</p>
          <button @click="navigateTo('/escorts')" class="btn btn-primary btn-lg">Find Your Companion</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.hero-section {
  height: 80vh;
  min-height: 600px;
  position: relative;
  display: flex;
  align-items: center;
  color: white;
  margin-top: 0px;
  overflow: hidden;
}

.hero-video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(18, 0, 36, 0.7), rgba(106, 13, 173, 0.5));
  z-index: 1;
}

.hero-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
  color: white;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-xl);
  color: rgba(255, 255, 255, 0.9);
}

.hero-cta {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  
  .btn-lg {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
  }
  
  .btn-outline {
    border-color: white;
    color: white;
    
    &:hover {
      background-color: white;
      color: var(--color-primary);
    }
  }
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  
  h2 {
    color: var(--color-primary-dark);
    position: relative;
    display: inline-block;
    padding-bottom: var(--spacing-sm);
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background-color: var(--color-accent);
    }
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    max-width: 600px;
    margin: var(--spacing-md) auto 0;
  }
}

.escorts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.view-all-container {
  text-align: center;
  margin-top: var(--spacing-xl);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.service-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: center;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
  
  .service-icon {
    width: 70px;
    height: 70px;
    background-color: var(--color-background-alt);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    
    .icon {
      font-size: 2rem;
    }
  }
  
  h3 {
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
  }
}

.testimonials-section {
  background-color: var(--color-background-alt);
}

.testimonials-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.testimonial-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  
  .testimonial-content {
    margin-bottom: var(--spacing-md);
    font-style: italic;
    color: var(--color-text);
    
    p {
      position: relative;
      padding: 0 var(--spacing-md);
      
      &::before, &::after {
        content: '"';
        font-size: 2rem;
        color: var(--color-accent-light);
        position: absolute;
        opacity: 0.5;
      }
      
      &::before {
        top: -10px;
        left: 0;
      }
      
      &::after {
        bottom: -30px;
        right: 0;
      }
    }
  }
  
  .testimonial-author {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .author-name {
      font-weight: 600;
      color: var(--color-primary-dark);
    }
    
    .rating {
      color: gold;
    }
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .feature-icon {
    width: 40px;
    height: 40px;
    background-color: var(--color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-md);
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
  }
  
  h3 {
    margin-bottom: var(--spacing-sm);
    color: var(--color-primary-dark);
  }
  
  p {
    color: var(--color-text-light);
  }
}

.cta-section {
  background-image: linear-gradient(to right, rgba(106, 13, 173, 0.9), rgba(150, 74, 84, 0.9)), url('https://images.pexels.com/photos/2117256/pexels-photo-2117256.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  background-size: cover;
  background-position: center;
  color: white;
  padding: var(--spacing-xxl) 0;
  text-align: center;
}

.cta-content {
  max-width: 700px;
  margin: 0 auto;
  
  h2 {
    color: white;
    margin-bottom: var(--spacing-md);
  }
  
  p {
    margin-bottom: var(--spacing-lg);
    font-size: 1.2rem;
  }
  
  .btn-primary {
    background-color: white;
    color: var(--color-primary);
    
    &:hover {
      background-color: var(--color-accent);
      color: white;
    }
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(106, 13, 173, 0.3);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s ease-in-out infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .hero-section {
    height: 70vh;
    min-height: 500px;
  }
  
  .hero-video {
    object-position: center right; /* Better mobile framing */
  }
  
  .hero-title {
    font-size: 2.25rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-cta {
    flex-direction: column;
    gap: var(--spacing-sm);
    
    .btn {
      width: 100%;
    }
  }
  
  .services-grid,
  .testimonials-container,
  .features-grid {
    grid-template-columns: 1fr;
  }
}

/* Additional responsive video handling */
@media (max-width: 480px) {
  .hero-section {
    height: 60vh;
    min-height: 400px;
  }
  
  .hero-overlay {
    background: linear-gradient(to right, rgba(18, 0, 36, 0.8), rgba(106, 13, 173, 0.6));
  }
}
</style>