<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const testimonials = ref([
  {
    id: 1,
    name: "James K.",
    location: "New York",
    rating: 5,
    date: "November 2024",
    title: "Absolutely Exceptional Experience",
    content: "I booked Elite Companions for a business gala, and the experience exceeded all my expectations. My companion was sophisticated, charming, and made the entire evening memorable. The professionalism and discretion were outstanding.",
    service: "Event Accompaniment",
    verified: true
  },
  {
    id: 2,
    name: "Michael T.",
    location: "Los Angeles",
    rating: 5,
    date: "October 2024",
    title: "Perfect Travel Companion",
    content: "I needed a companion for a week-long business trip to Europe. Everything was handled with utmost professionalism and discretion. My companion was well-traveled, intelligent, and made the trip both productive and enjoyable.",
    service: "Travel Companion",
    verified: true
  },
  {
    id: 3,
    name: "Robert D.",
    location: "Miami",
    rating: 5,
    date: "December 2024",
    title: "Seamless Booking Process",
    content: "The booking process was incredibly smooth and professional. The companion exceeded all my expectations with her elegance and conversation skills. I will definitely use this service again for future events.",
    service: "Dinner Date",
    verified: true
  },
  {
    id: 4,
    name: "David L.",
    location: "Chicago",
    rating: 5,
    date: "September 2024",
    title: "Outstanding Service Quality",
    content: "Elite Companions provided exactly what they promised - a sophisticated, professional companion for my corporate event. The attention to detail and customer service were impeccable throughout the entire process.",
    service: "Business Function",
    verified: true
  },
  {
    id: 5,
    name: "Alexander M.",
    location: "San Francisco",
    rating: 5,
    date: "November 2024",
    title: "Highly Recommend",
    content: "I was impressed by the level of professionalism and the quality of service. My companion was punctual, well-dressed, and engaging. The entire experience was handled with complete discretion and professionalism.",
    service: "Private Experience",
    verified: true
  },
  {
    id: 6,
    name: "William H.",
    location: "Las Vegas",
    rating: 5,
    date: "October 2024",
    title: "Exceeded Expectations",
    content: "From the initial booking to the actual experience, everything was handled professionally. My companion was charming, intelligent, and made the weekend getaway absolutely perfect. Outstanding service!",
    service: "Weekend Getaway",
    verified: true
  }
])

const stats = ref([
  { label: "Client Satisfaction", value: "99.8%", icon: "😊" },
  { label: "Repeat Clients", value: "87%", icon: "🔄" },
  { label: "Average Rating", value: "4.9/5", icon: "⭐" },
  { label: "Years of Service", value: "8+", icon: "📅" }
])

const navigateToEscorts = () => {
  router.push('/escorts')
}

const navigateToContact = () => {
  router.push('/contact')
}
</script>

<template>
  <div class="testimonials-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Client Testimonials</h1>
        <p>Real experiences from our satisfied clients</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Statistics section -->
      <section class="stats-section section">
        <div class="section-header">
          <h2>Our Track Record</h2>
          <p>Numbers that speak to our commitment to excellence</p>
        </div>
        
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </section>
      
      <!-- Testimonials grid -->
      <section class="testimonials-section section">
        <div class="section-header">
          <h2>What Our Clients Say</h2>
          <p>Authentic reviews from clients who have experienced our premium services</p>
        </div>
        
        <div class="testimonials-grid">
          <div v-for="testimonial in testimonials" :key="testimonial.id" class="testimonial-card">
            <div class="testimonial-header">
              <div class="client-info">
                <div class="client-avatar">
                  {{ testimonial.name.charAt(0) }}
                </div>
                <div class="client-details">
                  <h3 class="client-name">{{ testimonial.name }}</h3>
                  <p class="client-location">{{ testimonial.location }}</p>
                  <p class="testimonial-date">{{ testimonial.date }}</p>
                </div>
              </div>
              <div class="verification-badge" v-if="testimonial.verified">
                <span class="verified-icon">✓</span>
                <span class="verified-text">Verified</span>
              </div>
            </div>
            
            <div class="rating-section">
              <div class="stars">
                <span v-for="i in testimonial.rating" :key="i" class="star">★</span>
              </div>
              <span class="service-type">{{ testimonial.service }}</span>
            </div>
            
            <div class="testimonial-content">
              <h4 class="testimonial-title">{{ testimonial.title }}</h4>
              <p class="testimonial-text">{{ testimonial.content }}</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Trust indicators -->
      <section class="trust-section section">
        <div class="section-header">
          <h2>Why Clients Trust Us</h2>
          <p>The pillars of our service excellence</p>
        </div>
        
        <div class="trust-indicators">
          <div class="trust-item">
            <div class="trust-icon">🛡️</div>
            <h3>Complete Discretion</h3>
            <p>All client information is kept strictly confidential with the highest levels of privacy protection.</p>
          </div>
          
          <div class="trust-item">
            <div class="trust-icon">✅</div>
            <h3>Verified Companions</h3>
            <p>Every companion undergoes thorough background checks and verification processes.</p>
          </div>
          
          <div class="trust-item">
            <div class="trust-icon">⭐</div>
            <h3>Premium Quality</h3>
            <p>We maintain the highest standards of service quality and companion professionalism.</p>
          </div>
          
          <div class="trust-item">
            <div class="trust-icon">🤝</div>
            <h3>Professional Service</h3>
            <p>Reliable, punctual, and courteous service that exceeds client expectations every time.</p>
          </div>
        </div>
      </section>
      
      <!-- Client feedback process -->
      <section class="feedback-section section">
        <div class="section-header">
          <h2>Our Commitment to Excellence</h2>
          <p>How we ensure every experience meets our high standards</p>
        </div>
        
        <div class="feedback-process">
          <div class="process-step">
            <div class="step-number">1</div>
            <h3>Pre-Service Consultation</h3>
            <p>We discuss your expectations and preferences to ensure the perfect match.</p>
          </div>
          
          <div class="process-step">
            <div class="step-number">2</div>
            <h3>Quality Assurance</h3>
            <p>Our team monitors service quality and maintains regular communication.</p>
          </div>
          
          <div class="process-step">
            <div class="step-number">3</div>
            <h3>Post-Service Follow-up</h3>
            <p>We collect feedback to continuously improve our services and address any concerns.</p>
          </div>
          
          <div class="process-step">
            <div class="step-number">4</div>
            <h3>Continuous Improvement</h3>
            <p>Client feedback drives our service enhancements and companion training programs.</p>
          </div>
        </div>
      </section>
      
      <!-- CTA section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to Experience Excellence?</h2>
          <p>Join our satisfied clients and discover why Elite Companions is the premier choice for sophisticated companionship.</p>
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
.testimonials-page {
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

.stats-section {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.stat-item {
  background-color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .stat-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
    font-family: 'Playfair Display', serif;
  }
  
  .stat-label {
    color: var(--color-text-light);
    font-weight: 500;
  }
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-xl);
}

.testimonial-card {
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

.testimonial-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.client-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.client-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.client-details {
  .client-name {
    margin: 0 0 0.25rem 0;
    color: var(--color-text-dark);
    font-size: 1.1rem;
  }
  
  .client-location {
    margin: 0 0 0.25rem 0;
    color: var(--color-text-light);
    font-size: 0.9rem;
  }
  
  .testimonial-date {
    margin: 0;
    color: var(--color-text-lighter);
    font-size: 0.8rem;
  }
}

.verification-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--color-success);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  
  .verified-icon {
    font-weight: bold;
  }
}

.rating-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #eee;
}

.stars {
  .star {
    color: gold;
    font-size: 1.2rem;
  }
}

.service-type {
  background-color: var(--color-background-alt);
  color: var(--color-primary);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.testimonial-content {
  .testimonial-title {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.2rem;
  }
  
  .testimonial-text {
    color: var(--color-text);
    line-height: 1.7;
    font-style: italic;
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

.trust-indicators {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.trust-item {
  background-color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .trust-icon {
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

.feedback-process {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.process-step {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  position: relative;
  
  .step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .testimonials-grid {
    grid-template-columns: 1fr;
  }
  
  .trust-indicators,
  .feedback-process {
    grid-template-columns: 1fr;
  }
  
  .cta-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
  
  .stats-section,
  .cta-section {
    margin: var(--spacing-xl) calc(-50vw + 50% + var(--spacing-md));
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .testimonial-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>