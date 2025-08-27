<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToEscorts = () => {
  router.push('/escorts')
}

const navigateToContact = () => {
  router.push('/contact')
}
</script>

<template>
  <div class="how-it-works-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>How It Works</h1>
        <p>Your guide to booking the perfect companion experience</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Process steps -->
      <section class="process-section section">
        <div class="section-header">
          <h2>Simple 4-Step Process</h2>
          <p>From browsing to booking, we've made it easy to find your perfect companion</p>
        </div>
        
        <div class="process-steps">
          <div class="step-item">
            <div class="step-visual">
              <div class="step-number">1</div>
              <div class="step-icon">👀</div>
            </div>
            <div class="step-content">
              <h3>Browse & Discover</h3>
              <p>Explore our curated selection of elite companions. Use our advanced filters to find companions by location, services, or specific preferences. View detailed profiles, photos, and service offerings.</p>
              <ul class="step-features">
                <li>Verified profiles with authentic photos</li>
                <li>Detailed service descriptions</li>
                <li>Client reviews and ratings</li>
                <li>Advanced search filters</li>
              </ul>
            </div>
          </div>
          
          <div class="step-item">
            <div class="step-visual">
              <div class="step-number">2</div>
              <div class="step-icon">📅</div>
            </div>
            <div class="step-content">
              <h3>Select & Schedule</h3>
              <p>Choose your preferred companion and service type. Select your desired date, time, and duration. Provide any special requests or preferences to customize your experience.</p>
              <ul class="step-features">
                <li>Real-time availability checking</li>
                <li>Flexible scheduling options</li>
                <li>Custom service arrangements</li>
                <li>Special request accommodations</li>
              </ul>
            </div>
          </div>
          
          <div class="step-item">
            <div class="step-visual">
              <div class="step-number">3</div>
              <div class="step-icon">💳</div>
            </div>
            <div class="step-content">
              <h3>Book & Pay Securely</h3>
              <p>Complete your booking with our secure payment system. Provide your contact information and any additional details. Receive instant confirmation and booking details.</p>
              <ul class="step-features">
                <li>Secure encrypted payments</li>
                <li>Multiple payment options</li>
                <li>Instant booking confirmation</li>
                <li>Detailed booking receipt</li>
              </ul>
            </div>
          </div>
          
          <div class="step-item">
            <div class="step-visual">
              <div class="step-number">4</div>
              <div class="step-icon">✨</div>
            </div>
            <div class="step-content">
              <h3>Enjoy Your Experience</h3>
              <p>Meet your companion at the agreed location and time. Enjoy a sophisticated, memorable experience tailored to your preferences. Our 24/7 support is available if needed.</p>
              <ul class="step-features">
                <li>Punctual, professional service</li>
                <li>Personalized experience</li>
                <li>24/7 customer support</li>
                <li>Post-service follow-up</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Booking options -->
      <section class="booking-options section">
        <div class="section-header">
          <h2>Booking Options</h2>
          <p>Choose the booking method that works best for you</p>
        </div>
        
        <div class="options-grid">
          <div class="option-card">
            <div class="option-icon">🌐</div>
            <h3>Online Booking</h3>
            <p>Use our website to browse, select, and book your companion 24/7. Instant confirmation and secure payment processing.</p>
            <div class="option-benefits">
              <span class="benefit">✓ Available 24/7</span>
              <span class="benefit">✓ Instant confirmation</span>
              <span class="benefit">✓ Secure payments</span>
            </div>
            <button @click="navigateToEscorts" class="btn btn-primary">Start Browsing</button>
          </div>
          
          <div class="option-card">
            <div class="option-icon">📞</div>
            <h3>Phone Booking</h3>
            <p>Speak directly with our concierge team for personalized assistance and recommendations. Perfect for special requests.</p>
            <div class="option-benefits">
              <span class="benefit">✓ Personal assistance</span>
              <span class="benefit">✓ Custom arrangements</span>
              <span class="benefit">✓ Expert recommendations</span>
            </div>
            <button @click="navigateToContact" class="btn btn-outline">Call Now</button>
          </div>
          
          <div class="option-card">
            <div class="option-icon">💬</div>
            <h3>Live Chat</h3>
            <p>Get instant answers to your questions and receive booking assistance through our live chat feature.</p>
            <div class="option-benefits">
              <span class="benefit">✓ Instant responses</span>
              <span class="benefit">✓ Real-time assistance</span>
              <span class="benefit">✓ Booking support</span>
            </div>
            <button class="btn btn-outline">Start Chat</button>
          </div>
        </div>
      </section>
      
      <!-- What to expect -->
      <section class="expectations section">
        <div class="section-header">
          <h2>What to Expect</h2>
          <p>Understanding your companion experience from start to finish</p>
        </div>
        
        <div class="expectations-content">
          <div class="expectation-item">
            <h3>Before Your Meeting</h3>
            <ul>
              <li>Confirmation call or message 24 hours prior</li>
              <li>Final details and meeting arrangements</li>
              <li>Any last-minute special requests</li>
              <li>Emergency contact information provided</li>
            </ul>
          </div>
          
          <div class="expectation-item">
            <h3>During Your Experience</h3>
            <ul>
              <li>Punctual arrival at agreed location</li>
              <li>Professional, courteous demeanor</li>
              <li>Adherence to agreed service parameters</li>
              <li>Respectful and engaging companionship</li>
            </ul>
          </div>
          
          <div class="expectation-item">
            <h3>After Your Meeting</h3>
            <ul>
              <li>Optional feedback survey</li>
              <li>Customer service follow-up</li>
              <li>Booking history in your account</li>
              <li>Loyalty program benefits</li>
            </ul>
          </div>
        </div>
      </section>
      
      <!-- Safety and privacy -->
      <section class="safety-privacy section">
        <div class="section-header">
          <h2>Safety & Privacy</h2>
          <p>Your security and discretion are our top priorities</p>
        </div>
        
        <div class="safety-grid">
          <div class="safety-item">
            <div class="safety-icon">🛡️</div>
            <h3>Complete Discretion</h3>
            <p>All interactions are confidential. We never share client information and all companions sign NDAs.</p>
          </div>
          
          <div class="safety-item">
            <div class="safety-icon">✅</div>
            <h3>Verified Companions</h3>
            <p>All companions undergo thorough background checks, identity verification, and health screenings.</p>
          </div>
          
          <div class="safety-item">
            <div class="safety-icon">🔒</div>
            <h3>Secure Payments</h3>
            <p>All transactions are encrypted and processed through secure payment gateways with fraud protection.</p>
          </div>
          
          <div class="safety-item">
            <div class="safety-icon">📞</div>
            <h3>24/7 Support</h3>
            <p>Our support team is available around the clock for any questions or assistance during your booking.</p>
          </div>
        </div>
      </section>
      
      <!-- CTA section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of satisfied clients who trust Elite Companions for their companion needs</p>
          <div class="cta-buttons">
            <button @click="navigateToEscorts" class="btn btn-primary btn-lg">Browse Companions</button>
            <button @click="navigateToContact" class="btn btn-outline btn-lg">Ask Questions</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.how-it-works-page {
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

.process-steps {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxl);
}

.step-item {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--spacing-xl);
  align-items: center;
  
  &:nth-child(even) {
    .step-visual {
      order: 2;
    }
    .step-content {
      order: 1;
    }
  }
}

.step-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .step-number {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
  }
  
  .step-icon {
    font-size: 3rem;
  }
}

.step-content {
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.5rem;
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
    line-height: 1.6;
  }
}

.step-features {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  
  li {
    color: var(--color-text-light);
    font-size: 0.9rem;
    
    &::before {
      content: '✓';
      color: var(--color-primary);
      margin-right: 0.5rem;
      font-weight: bold;
    }
  }
}

.booking-options {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
}

.option-card {
  background-color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .option-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
    line-height: 1.6;
  }
}

.option-benefits {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: var(--spacing-lg);
  
  .benefit {
    color: var(--color-primary);
    font-size: 0.9rem;
  }
}

.expectations-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
}

.expectation-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
  }
  
  ul {
    list-style: none;
    
    li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
      color: var(--color-text);
      
      &:last-child {
        border-bottom: none;
      }
      
      &::before {
        content: '•';
        color: var(--color-primary);
        margin-right: 0.5rem;
      }
    }
  }
}

.safety-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.safety-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  .safety-icon {
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

@media (max-width: 992px) {
  .step-item {
    grid-template-columns: 1fr;
    text-align: center;
    
    &:nth-child(even) {
      .step-visual,
      .step-content {
        order: initial;
      }
    }
  }
  
  .step-features {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .expectations-content {
    grid-template-columns: 1fr;
  }
  
  .safety-grid {
    grid-template-columns: 1fr;
  }
  
  .cta-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
  
  .booking-options,
  .cta-section {
    margin: var(--spacing-xl) calc(-50vw + 50% + var(--spacing-md));
  }
}
</style>