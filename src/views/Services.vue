<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const services = ref([
  {
    id: 'dinner-dates',
    title: 'Dinner Dates',
    icon: '🥂',
    description: 'Enjoy sophisticated company during dinner at premium restaurants',
    features: [
      'Fine dining experiences at top restaurants',
      'Engaging conversation and companionship',
      'Professional etiquette and social grace',
      'Customized dining preferences'
    ],
    duration: '2-4 hours',
    pricing: 'Starting from $400/hr'
  },
  {
    id: 'travel-companion',
    title: 'Travel Companions',
    icon: '✈️',
    description: 'Experience memorable journeys with our elegant companions',
    features: [
      'Domestic and international travel',
      'Cultural exploration and sightseeing',
      'Business trip accompaniment',
      'Vacation and leisure travel'
    ],
    duration: '1-7 days',
    pricing: 'Custom packages available'
  },
  {
    id: 'event-accompaniment',
    title: 'Event Accompaniment',
    icon: '🎭',
    description: 'Make a lasting impression at social and business events',
    features: [
      'Corporate events and galas',
      'Social gatherings and parties',
      'Award ceremonies and premieres',
      'Networking events'
    ],
    duration: '3-8 hours',
    pricing: 'Starting from $500/hr'
  },
  {
    id: 'private-experiences',
    title: 'Private Experiences',
    icon: '🌙',
    description: 'Custom-tailored private experiences for discerning clients',
    features: [
      'Personalized one-on-one time',
      'Intimate conversations and connection',
      'Relaxation and stress relief',
      'Completely confidential settings'
    ],
    duration: '1-12 hours',
    pricing: 'Starting from $350/hr'
  },
  {
    id: 'weekend-getaways',
    title: 'Weekend Getaways',
    icon: '🏖️',
    description: 'Escape with sophisticated companionship for weekend retreats',
    features: [
      'Luxury resort accommodations',
      'Spa and wellness experiences',
      'Adventure and outdoor activities',
      'Cultural and entertainment venues'
    ],
    duration: '2-3 days',
    pricing: 'Weekend packages from $2,500'
  },
  {
    id: 'business-functions',
    title: 'Business Functions',
    icon: '💼',
    description: 'Professional accompaniment for business-related events',
    features: [
      'Conference and convention support',
      'Client entertainment',
      'Business dinner meetings',
      'Professional networking events'
    ],
    duration: '2-6 hours',
    pricing: 'Starting from $450/hr'
  }
])

const navigateToEscorts = () => {
  router.push('/escorts')
}

const navigateToContact = () => {
  router.push('/contact')
}
</script>

<template>
  <div class="services-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Our Premium Services</h1>
        <p>Discover our range of exclusive companion services tailored to your needs</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Services overview -->
      <section class="services-overview section">
        <div class="section-header">
          <h2>What We Offer</h2>
          <p>Each service is designed to provide you with exceptional companionship and unforgettable experiences</p>
        </div>
        
        <div class="services-grid">
          <div v-for="service in services" :key="service.id" class="service-card">
            <div class="service-header">
              <div class="service-icon">{{ service.icon }}</div>
              <h3>{{ service.title }}</h3>
            </div>
            
            <p class="service-description">{{ service.description }}</p>
            
            <div class="service-features">
              <h4>What's Included:</h4>
              <ul>
                <li v-for="feature in service.features" :key="feature">
                  <span class="checkmark">✓</span> {{ feature }}
                </li>
              </ul>
            </div>
            
            <div class="service-details">
              <div class="detail-item">
                <span class="label">Duration:</span>
                <span class="value">{{ service.duration }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Pricing:</span>
                <span class="value">{{ service.pricing }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- How it works -->
      <section class="how-it-works section">
        <div class="section-header">
          <h2>How Our Services Work</h2>
          <p>Simple steps to book your perfect companion experience</p>
        </div>
        
        <div class="steps-container">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Browse & Select</h3>
            <p>Browse our selection of elite companions and choose the perfect match for your needs</p>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <h3>Book Your Service</h3>
            <p>Select your preferred service, date, and time. Complete the secure booking process</p>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <h3>Confirmation</h3>
            <p>Receive confirmation details and any special arrangements for your booking</p>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <h3>Enjoy Your Experience</h3>
            <p>Meet your companion and enjoy a sophisticated, memorable experience</p>
          </div>
        </div>
      </section>
      
      <!-- Service standards -->
      <section class="service-standards section">
        <div class="section-header">
          <h2>Our Service Standards</h2>
          <p>What you can expect from every Elite Companions experience</p>
        </div>
        
        <div class="standards-grid">
          <div class="standard-item">
            <div class="standard-icon">🛡️</div>
            <h3>Complete Discretion</h3>
            <p>All interactions are handled with the utmost confidentiality and privacy</p>
          </div>
          
          <div class="standard-item">
            <div class="standard-icon">⭐</div>
            <h3>Premium Quality</h3>
            <p>Only the most sophisticated and professional companions in our network</p>
          </div>
          
          <div class="standard-item">
            <div class="standard-icon">🤝</div>
            <h3>Professional Service</h3>
            <p>Punctual, reliable, and courteous service every time</p>
          </div>
          
          <div class="standard-item">
            <div class="standard-icon">💎</div>
            <h3>Luxury Experience</h3>
            <p>Attention to detail and premium experiences that exceed expectations</p>
          </div>
        </div>
      </section>
      
      <!-- CTA section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to Book Your Experience?</h2>
          <p>Browse our selection of elite companions and find your perfect match</p>
          <div class="cta-buttons">
            <button @click="navigateToEscorts" class="btn btn-primary btn-lg">Browse Companions</button>
            <button @click="navigateToContact" class="btn btn-outline btn-lg">Contact Us</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.services-page {
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

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-xl);
}

.service-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
}

.service-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  
  .service-icon {
    font-size: 2.5rem;
    margin-right: var(--spacing-md);
  }
  
  h3 {
    margin: 0;
    color: var(--color-primary-dark);
  }
}

.service-description {
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  line-height: 1.6;
}

.service-features {
  margin-bottom: var(--spacing-lg);
  
  h4 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1rem;
  }
  
  ul {
    list-style: none;
    
    li {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      
      .checkmark {
        color: var(--color-primary);
        margin-right: 0.5rem;
        font-weight: bold;
      }
    }
  }
}

.service-details {
  border-top: 1px solid #eee;
  padding-top: var(--spacing-md);
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    
    .label {
      color: var(--color-text-light);
      font-weight: 500;
    }
    
    .value {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}

.how-it-works {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
}

.steps-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
}

.step {
  text-align: center;
  
  .step-number {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 auto var(--spacing-md);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    line-height: 1.6;
  }
}

.standards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.standard-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  .standard-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    line-height: 1.6;
  }
}

.cta-section {
  background-image: linear-gradient(to right, rgba(106, 13, 173, 0.9), rgba(150, 74, 84, 0.9)), url('https://images.pexels.com/photos/2117256/pexels-photo-2117256.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  background-size: cover;
  background-position: center;
  color: white;
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
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
}

.cta-buttons {
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

@media (max-width: 768px) {
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .steps-container {
    grid-template-columns: 1fr;
  }
  
  .standards-grid {
    grid-template-columns: 1fr;
  }
  
  .cta-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
  
  .how-it-works,
  .cta-section {
    margin: var(--spacing-xl) calc(-50vw + 50% + var(--spacing-md));
  }
}
</style>