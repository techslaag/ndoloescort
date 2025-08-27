<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  preferredContact: 'email'
})

const isSubmitting = ref(false)
const submitMessage = ref('')

const submitForm = async () => {
  isSubmitting.value = true
  
  // Simulate form submission
  setTimeout(() => {
    submitMessage.value = 'Thank you for your message. We will get back to you within 24 hours.'
    isSubmitting.value = false
    
    // Reset form
    form.value = {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      preferredContact: 'email'
    }
  }, 1500)
}
</script>

<template>
  <div class="contact-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Contact Us</h1>
        <p>Get in touch with our team for inquiries, bookings, or support</p>
      </div>
    </div>
    
    <div class="container">
      <div class="contact-content">
        <!-- Contact form -->
        <div class="contact-form-section">
          <h2>Send us a Message</h2>
          <p class="form-description">
            Fill out the form below and our team will respond to your inquiry within 24 hours.
          </p>
          
          <form @submit.prevent="submitForm" class="contact-form">
            <div class="form-row">
              <div class="form-group">
                <label for="name">Full Name *</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="form.name" 
                  required
                  placeholder="Enter your full name"
                >
              </div>
              
              <div class="form-group">
                <label for="email">Email Address *</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="form.email" 
                  required
                  placeholder="Enter your email address"
                >
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="phone">Phone Number</label>
                <input 
                  type="tel" 
                  id="phone" 
                  v-model="form.phone"
                  placeholder="Enter your phone number"
                >
              </div>
              
              <div class="form-group">
                <label for="subject">Subject *</label>
                <select id="subject" v-model="form.subject" required>
                  <option value="">Select a subject</option>
                  <option value="booking">Booking Inquiry</option>
                  <option value="general">General Information</option>
                  <option value="support">Customer Support</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="preferred-contact">Preferred Contact Method</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input 
                    type="radio" 
                    value="email" 
                    v-model="form.preferredContact"
                  >
                  Email
                </label>
                <label class="radio-label">
                  <input 
                    type="radio" 
                    value="phone" 
                    v-model="form.preferredContact"
                  >
                  Phone
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="message">Message *</label>
              <textarea 
                id="message" 
                v-model="form.message" 
                required
                rows="6"
                placeholder="Please provide details about your inquiry..."
              ></textarea>
            </div>
            
            <div v-if="submitMessage" class="success-message">
              {{ submitMessage }}
            </div>
            
            <button 
              type="submit" 
              class="btn btn-primary btn-lg"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting">Sending...</span>
              <span v-else>Send Message</span>
            </button>
          </form>
        </div>
        
        <!-- Contact information -->
        <div class="contact-info-section">
          <h2>Get in Touch</h2>
          
          <div class="contact-methods">
            <div class="contact-method">
              <div class="method-icon">📧</div>
              <div class="method-content">
                <h3>Email</h3>
                <p>info@elitecompanions.com</p>
                <p class="method-note">Response within 24 hours</p>
              </div>
            </div>
            
            <div class="contact-method">
              <div class="method-icon">📞</div>
              <div class="method-content">
                <h3>Phone</h3>
                <p>+1 (555) 123-4567</p>
                <p class="method-note">Available 24/7</p>
              </div>
            </div>
            
            <div class="contact-method">
              <div class="method-icon">💬</div>
              <div class="method-content">
                <h3>Live Chat</h3>
                <p>Available on our website</p>
                <p class="method-note">Mon-Sun: 9AM-11PM EST</p>
              </div>
            </div>
          </div>
          
          <div class="office-info">
            <h3>Office Hours</h3>
            <div class="hours-list">
              <div class="hours-item">
                <span class="day">Monday - Friday</span>
                <span class="time">9:00 AM - 8:00 PM</span>
              </div>
              <div class="hours-item">
                <span class="day">Saturday</span>
                <span class="time">10:00 AM - 6:00 PM</span>
              </div>
              <div class="hours-item">
                <span class="day">Sunday</span>
                <span class="time">12:00 PM - 5:00 PM</span>
              </div>
            </div>
          </div>
          
          <div class="privacy-note">
            <h3>Privacy & Discretion</h3>
            <p>
              All communications are handled with the utmost confidentiality. 
              Your privacy is our top priority, and we maintain strict security 
              protocols for all client interactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contact-page {
  padding-top: 0px;
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

.contact-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-xxl);
  margin-bottom: var(--spacing-xxl);
}

.contact-form-section {
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  .form-description {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
    line-height: 1.6;
  }
}

.contact-form {
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .radio-group {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    
    input[type="radio"] {
      width: auto;
      margin: 0;
    }
  }
  
  .btn-lg {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    margin-top: var(--spacing-md);
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.success-message {
  background-color: var(--color-success);
  color: white;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.contact-info-section {
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-lg);
  }
}

.contact-methods {
  margin-bottom: var(--spacing-xl);
}

.contact-method {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .method-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-background-alt);
    border-radius: 50%;
  }
  
  .method-content {
    flex: 1;
    
    h3 {
      margin-bottom: 0.25rem;
      color: var(--color-primary-dark);
      font-size: 1.1rem;
    }
    
    p {
      margin-bottom: 0.25rem;
      color: var(--color-text);
    }
    
    .method-note {
      font-size: 0.9rem;
      color: var(--color-text-light);
    }
  }
}

.office-info {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
  }
}

.hours-list {
  .hours-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
    
    .day {
      font-weight: 500;
    }
    
    .time {
      color: var(--color-text-light);
    }
  }
}

.privacy-note {
  padding: var(--spacing-lg);
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text);
    line-height: 1.6;
    font-size: 0.95rem;
  }
}

@media (max-width: 992px) {
  .contact-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-xl);
  }
}

@media (max-width: 768px) {
  .contact-form {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
  
  .radio-group {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
</style>