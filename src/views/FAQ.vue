<script setup lang="ts">
import { ref } from 'vue'

const activeQuestion = ref<number | null>(null)

const faqCategories = ref([
  {
    title: 'General Questions',
    questions: [
      {
        id: 1,
        question: 'What is Elite Companions?',
        answer: 'Elite Companions is a premium companion service that connects discerning clients with sophisticated, professional companions for various social and business occasions. We provide high-quality companionship services for dinner dates, events, travel, and private experiences.'
      },
      {
        id: 2,
        question: 'How do I book a companion?',
        answer: 'Booking is simple: browse our selection of companions, select your preferred companion and service, choose your date and time, complete the booking form with your details, and make payment. You\'ll receive confirmation within 24 hours.'
      },
      {
        id: 3,
        question: 'What areas do you serve?',
        answer: 'We currently operate in major cities including New York, Los Angeles, Miami, Chicago, Las Vegas, and San Francisco. We also provide travel companion services for domestic and international destinations.'
      },
      {
        id: 4,
        question: 'Are your companions verified?',
        answer: 'Yes, all our companions undergo a thorough verification process including background checks, identity verification, and professional interviews. We ensure all profiles are 100% authentic and up-to-date.'
      }
    ]
  },
  {
    title: 'Booking & Payment',
    questions: [
      {
        id: 5,
        question: 'What payment methods do you accept?',
        answer: 'We accept major credit cards (Visa, MasterCard, American Express), bank transfers, and cryptocurrency payments. All transactions are processed securely and discreetly.'
      },
      {
        id: 6,
        question: 'When is payment required?',
        answer: 'Payment is required at the time of booking to confirm your reservation. For extended bookings (over 8 hours), we may require a deposit with the balance due before the service begins.'
      },
      {
        id: 7,
        question: 'What is your cancellation policy?',
        answer: 'Cancellations made 48+ hours in advance receive a full refund. Cancellations made 24-48 hours in advance receive a 50% refund. Cancellations made less than 24 hours in advance are non-refundable, except in emergency situations.'
      },
      {
        id: 8,
        question: 'Can I reschedule my booking?',
        answer: 'Yes, you can reschedule your booking up to 24 hours in advance subject to companion availability. Rescheduling requests made less than 24 hours in advance may incur additional fees.'
      }
    ]
  },
  {
    title: 'Services & Expectations',
    questions: [
      {
        id: 9,
        question: 'What services do you offer?',
        answer: 'We offer dinner dates, event accompaniment, travel companionship, private experiences, weekend getaways, and business function support. Each service is customized to meet your specific needs and preferences.'
      },
      {
        id: 10,
        question: 'What should I expect during my booking?',
        answer: 'You can expect professional, courteous, and sophisticated companionship. Our companions are well-educated, well-traveled, and skilled in social etiquette. They will arrive punctually and dressed appropriately for the occasion.'
      },
      {
        id: 11,
        question: 'Can I request specific arrangements?',
        answer: 'Absolutely! We encourage you to share any special requests or preferences during the booking process. We\'ll do our best to accommodate your needs and ensure a personalized experience.'
      },
      {
        id: 12,
        question: 'What if I\'m not satisfied with the service?',
        answer: 'Client satisfaction is our top priority. If you\'re not completely satisfied, please contact us within 24 hours of your booking. We\'ll work with you to resolve any issues and may offer a partial refund or credit for future services.'
      }
    ]
  },
  {
    title: 'Privacy & Safety',
    questions: [
      {
        id: 13,
        question: 'How do you protect my privacy?',
        answer: 'We maintain strict confidentiality protocols. All personal information is encrypted and stored securely. We never share client information with third parties, and all our companions sign comprehensive non-disclosure agreements.'
      },
      {
        id: 14,
        question: 'Are your companions safe to meet?',
        answer: 'Yes, safety is our top priority. All companions undergo background checks and health screenings. We also provide safety guidelines and have 24/7 support available during all bookings.'
      },
      {
        id: 15,
        question: 'Do you offer incall or outcall services?',
        answer: 'We primarily offer outcall services where companions meet you at your preferred location (hotel, restaurant, event venue, etc.). Incall services may be available in select locations - please inquire when booking.'
      },
      {
        id: 16,
        question: 'What safety measures are in place?',
        answer: 'We have comprehensive safety protocols including companion check-ins, emergency contacts, secure communication channels, and 24/7 support. All meetings are logged and monitored for safety purposes.'
      }
    ]
  }
])

const toggleQuestion = (questionId: number) => {
  activeQuestion.value = activeQuestion.value === questionId ? null : questionId
}
</script>

<template>
  <div class="faq-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about our services and booking process</p>
      </div>
    </div>
    
    <div class="container">
      <div class="faq-content">
        <div v-for="category in faqCategories" :key="category.title" class="faq-category">
          <h2 class="category-title">{{ category.title }}</h2>
          
          <div class="questions-list">
            <div 
              v-for="question in category.questions" 
              :key="question.id" 
              class="question-item"
            >
              <button 
                class="question-button"
                :class="{ active: activeQuestion === question.id }"
                @click="toggleQuestion(question.id)"
              >
                <span class="question-text">{{ question.question }}</span>
                <span class="question-icon">
                  {{ activeQuestion === question.id ? '−' : '+' }}
                </span>
              </button>
              
              <div 
                class="answer-content"
                :class="{ active: activeQuestion === question.id }"
              >
                <p>{{ question.answer }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Contact section -->
        <div class="faq-contact">
          <h2>Still Have Questions?</h2>
          <p>If you couldn't find the answer you're looking for, our support team is here to help.</p>
          <div class="contact-options">
            <div class="contact-option">
              <div class="contact-icon">📧</div>
              <div class="contact-info">
                <h3>Email Support</h3>
                <p>info@elitecompanions.com</p>
                <span class="response-time">Response within 24 hours</span>
              </div>
            </div>
            
            <div class="contact-option">
              <div class="contact-icon">📞</div>
              <div class="contact-info">
                <h3>Phone Support</h3>
                <p>+1 (555) 123-4567</p>
                <span class="response-time">Available 24/7</span>
              </div>
            </div>
            
            <div class="contact-option">
              <div class="contact-icon">💬</div>
              <div class="contact-info">
                <h3>Live Chat</h3>
                <p>Available on our website</p>
                <span class="response-time">Mon-Sun: 9AM-11PM EST</span>
              </div>
            </div>
          </div>
          
          <button @click="$router.push('/contact')" class="btn btn-primary btn-lg">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.faq-page {
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

.faq-content {
  max-width: 800px;
  margin: 0 auto;
}

.faq-category {
  margin-bottom: var(--spacing-xxl);
}

.category-title {
  color: var(--color-primary-dark);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--color-accent);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.question-item {
  background-color: white;
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.question-button {
  width: 100%;
  padding: var(--spacing-lg);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--color-background-alt);
  }
  
  &.active {
    background-color: var(--color-background-alt);
  }
}

.question-text {
  font-weight: 600;
  color: var(--color-text-dark);
  font-size: 1.1rem;
}

.question-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
  font-weight: 300;
  min-width: 30px;
  text-align: center;
}

.answer-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  
  &.active {
    max-height: 200px;
    padding: 0 var(--spacing-lg) var(--spacing-lg);
  }
  
  p {
    color: var(--color-text);
    line-height: 1.6;
    margin: 0;
  }
}

.faq-contact {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl);
  border-radius: var(--border-radius-md);
  text-align: center;
  margin-top: var(--spacing-xxl);
  
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
  }
  
  > p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-xl);
    font-size: 1.1rem;
  }
}

.contact-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.contact-option {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  text-align: left;
  
  .contact-icon {
    font-size: 2rem;
    min-width: 50px;
  }
  
  .contact-info {
    flex: 1;
    
    h3 {
      margin-bottom: 0.25rem;
      color: var(--color-primary-dark);
      font-size: 1.1rem;
    }
    
    p {
      margin-bottom: 0.25rem;
      color: var(--color-text);
      font-weight: 500;
    }
    
    .response-time {
      font-size: 0.9rem;
      color: var(--color-text-light);
    }
  }
}

.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .question-button {
    padding: var(--spacing-md);
  }
  
  .question-text {
    font-size: 1rem;
  }
  
  .answer-content.active {
    padding: 0 var(--spacing-md) var(--spacing-md);
  }
  
  .contact-options {
    grid-template-columns: 1fr;
  }
  
  .contact-option {
    flex-direction: column;
    text-align: center;
  }
  
  .faq-contact {
    padding: var(--spacing-xl);
  }
}
</style>