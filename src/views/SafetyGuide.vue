<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToContact = () => {
  router.push('/contact')
}

const emergencyNumber = '+1 (555) 911-HELP'
</script>

<template>
  <div class="safety-guide-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Safety Guide</h1>
        <p>Your safety and security are our highest priorities</p>
      </div>
    </div>
    
    <div class="container">
      <div class="safety-content">
        <!-- Emergency Contact -->
        <section class="emergency-section">
          <div class="emergency-banner">
            <div class="emergency-icon">🚨</div>
            <div class="emergency-content">
              <h2>24/7 Emergency Support</h2>
              <p>If you're in immediate danger or need urgent assistance, contact us immediately:</p>
              <a :href="`tel:${emergencyNumber}`" class="emergency-number">{{ emergencyNumber }}</a>
            </div>
          </div>
        </section>

        <!-- Before Your Meeting -->
        <section class="safety-section">
          <h2>Before Your Meeting</h2>
          <p>Preparation is key to ensuring a safe and enjoyable experience. Follow these guidelines:</p>
          
          <div class="safety-steps">
            <div class="step-item">
              <div class="step-icon">📋</div>
              <div class="step-content">
                <h3>Verify Your Booking</h3>
                <ul>
                  <li>Confirm all booking details 24 hours in advance</li>
                  <li>Verify companion identity through our official channels</li>
                  <li>Ensure you have our emergency contact information</li>
                  <li>Review the companion's profile and service boundaries</li>
                </ul>
              </div>
            </div>

            <div class="step-item">
              <div class="step-icon">📍</div>
              <div class="step-content">
                <h3>Choose Safe Meeting Locations</h3>
                <ul>
                  <li>Meet in public places for initial meetings</li>
                  <li>Choose reputable hotels, restaurants, or venues</li>
                  <li>Avoid isolated or unfamiliar locations</li>
                  <li>Inform the companion of exact meeting location and time</li>
                </ul>
              </div>
            </div>

            <div class="step-item">
              <div class="step-icon">💳</div>
              <div class="step-content">
                <h3>Secure Payment Processing</h3>
                <ul>
                  <li>Only pay through our official payment systems</li>
                  <li>Never provide payment information to companions directly</li>
                  <li>Keep receipts and confirmation emails</li>
                  <li>Report any payment irregularities immediately</li>
                </ul>
              </div>
            </div>

            <div class="step-item">
              <div class="step-icon">📱</div>
              <div class="step-content">
                <h3>Communication Guidelines</h3>
                <ul>
                  <li>Use our platform for all initial communications</li>
                  <li>Keep conversations respectful and professional</li>
                  <li>Discuss expectations and boundaries clearly</li>
                  <li>Save important messages and contact information</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- During Your Meeting -->
        <section class="safety-section">
          <h2>During Your Meeting</h2>
          <p>Maintain safety awareness throughout your experience:</p>
          
          <div class="during-meeting-grid">
            <div class="safety-card">
              <div class="card-icon">🤝</div>
              <h3>Respectful Interaction</h3>
              <ul>
                <li>Treat your companion with respect and courtesy</li>
                <li>Honor agreed-upon boundaries and limitations</li>
                <li>Communicate openly about comfort levels</li>
                <li>Accept "no" gracefully without pressure</li>
              </ul>
            </div>

            <div class="safety-card">
              <div class="card-icon">🏨</div>
              <h3>Safe Environments</h3>
              <ul>
                <li>Ensure meeting locations are safe and comfortable</li>
                <li>Maintain appropriate lighting and ventilation</li>
                <li>Keep emergency exits accessible</li>
                <li>Avoid excessive alcohol or substance use</li>
              </ul>
            </div>

            <div class="safety-card">
              <div class="card-icon">📞</div>
              <h3>Stay Connected</h3>
              <ul>
                <li>Keep your phone charged and accessible</li>
                <li>Maintain contact with our support team if needed</li>
                <li>Respect companion check-in procedures</li>
                <li>Report any concerns immediately</li>
              </ul>
            </div>

            <div class="safety-card">
              <div class="card-icon">🔒</div>
              <h3>Privacy Protection</h3>
              <ul>
                <li>Respect companion's privacy and anonymity</li>
                <li>Do not photograph or record without consent</li>
                <li>Keep personal information confidential</li>
                <li>Avoid sharing details on social media</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Red Flags -->
        <section class="safety-section">
          <h2>Warning Signs and Red Flags</h2>
          <p>Be aware of these warning signs and contact us immediately if you encounter them:</p>
          
          <div class="red-flags-container">
            <div class="red-flag-category">
              <h3>Communication Red Flags</h3>
              <div class="red-flag-list">
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Requests for payment outside our system</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Pressure to meet immediately without proper booking</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Reluctance to verify identity through official channels</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Requests for personal financial information</span>
                </div>
              </div>
            </div>

            <div class="red-flag-category">
              <h3>Meeting Red Flags</h3>
              <div class="red-flag-list">
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Companion appears different from verified photos</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Aggressive or threatening behavior</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Attempts to change agreed-upon terms</span>
                </div>
                <div class="red-flag-item">
                  <span class="flag-icon">🚩</span>
                  <span>Presence of unauthorized third parties</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Personal Safety Tips -->
        <section class="safety-section">
          <h2>Personal Safety Tips</h2>
          
          <div class="safety-tips-grid">
            <div class="tip-category">
              <h3>🏠 Accommodation Safety</h3>
              <ul>
                <li>Choose reputable hotels with good security</li>
                <li>Inform hotel staff of expected visitors</li>
                <li>Keep room keys secure and don't share room numbers</li>
                <li>Use hotel safes for valuables</li>
                <li>Know emergency exits and procedures</li>
              </ul>
            </div>

            <div class="tip-category">
              <h3>🚗 Transportation Safety</h3>
              <ul>
                <li>Use licensed taxi services or rideshare apps</li>
                <li>Share trip details with trusted contacts</li>
                <li>Avoid traveling alone in unfamiliar areas</li>
                <li>Keep transportation receipts</li>
                <li>Have backup transportation plans</li>
              </ul>
            </div>

            <div class="tip-category">
              <h3>💰 Financial Safety</h3>
              <ul>
                <li>Carry limited cash and use secure payment methods</li>
                <li>Keep credit cards and ID in secure locations</li>
                <li>Monitor bank accounts for unusual activity</li>
                <li>Never share financial information with companions</li>
                <li>Report suspicious financial requests</li>
              </ul>
            </div>

            <div class="tip-category">
              <h3>📱 Digital Safety</h3>
              <ul>
                <li>Use secure, private browsing when possible</li>
                <li>Avoid sharing personal social media profiles</li>
                <li>Be cautious with photo sharing and location tags</li>
                <li>Use strong, unique passwords for accounts</li>
                <li>Keep software and apps updated</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Health and Wellness -->
        <section class="safety-section">
          <h2>Health and Wellness</h2>
          
          <div class="health-wellness-content">
            <div class="wellness-item">
              <div class="wellness-icon">🏥</div>
              <div class="wellness-content">
                <h3>Health Precautions</h3>
                <p>All our companions undergo regular health screenings. We recommend:</p>
                <ul>
                  <li>Maintaining your own regular health checkups</li>
                  <li>Discussing any health concerns openly</li>
                  <li>Respecting health boundaries and requirements</li>
                  <li>Following current health guidelines and protocols</li>
                </ul>
              </div>
            </div>

            <div class="wellness-item">
              <div class="wellness-icon">🧠</div>
              <div class="wellness-content">
                <h3>Mental Wellness</h3>
                <p>Your emotional well-being is important. Remember to:</p>
                <ul>
                  <li>Set realistic expectations for your experience</li>
                  <li>Communicate your comfort levels clearly</li>
                  <li>Take breaks if you feel overwhelmed</li>
                  <li>Seek support if you experience any distress</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Reporting and Support -->
        <section class="safety-section">
          <h2>Reporting and Support</h2>
          
          <div class="reporting-options">
            <div class="reporting-item">
              <div class="reporting-icon">📞</div>
              <div class="reporting-content">
                <h3>Immediate Assistance</h3>
                <p>For urgent safety concerns or emergencies:</p>
                <div class="contact-details">
                  <strong>Emergency Line:</strong> {{ emergencyNumber }}<br>
                  <strong>Available:</strong> 24/7
                </div>
              </div>
            </div>

            <div class="reporting-item">
              <div class="reporting-icon">💬</div>
              <div class="reporting-content">
                <h3>Non-Emergency Support</h3>
                <p>For general concerns or questions:</p>
                <div class="contact-details">
                  <strong>Support Email:</strong> support@elitecompanions.com<br>
                  <strong>Live Chat:</strong> Available on our website<br>
                  <strong>Response Time:</strong> Within 2 hours
                </div>
              </div>
            </div>

            <div class="reporting-item">
              <div class="reporting-icon">📝</div>
              <div class="reporting-content">
                <h3>Incident Reporting</h3>
                <p>To report safety incidents or concerns:</p>
                <div class="contact-details">
                  <strong>Incident Email:</strong> incidents@elitecompanions.com<br>
                  <strong>Anonymous Tip Line:</strong> Available on website<br>
                  <strong>Follow-up:</strong> Within 24 hours
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Legal and Compliance -->
        <section class="safety-section">
          <h2>Legal Compliance and Rights</h2>
          
          <div class="legal-info">
            <div class="legal-item">
              <h3>Know Your Rights</h3>
              <ul>
                <li>You have the right to feel safe and respected at all times</li>
                <li>You can end any interaction that makes you uncomfortable</li>
                <li>You have the right to privacy and confidentiality</li>
                <li>You can request different companions if needed</li>
              </ul>
            </div>

            <div class="legal-item">
              <h3>Legal Compliance</h3>
              <ul>
                <li>All services comply with local and federal laws</li>
                <li>Age verification is strictly enforced (21+ only)</li>
                <li>We cooperate fully with law enforcement when required</li>
                <li>All activities must be legal in your jurisdiction</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Additional Resources -->
        <section class="safety-section">
          <h2>Additional Safety Resources</h2>
          
          <div class="resources-grid">
            <div class="resource-item">
              <h3>Safety Apps</h3>
              <ul>
                <li>Personal safety apps with GPS tracking</li>
                <li>Emergency contact notification systems</li>
                <li>Secure communication platforms</li>
              </ul>
            </div>

            <div class="resource-item">
              <h3>Travel Safety</h3>
              <ul>
                <li>State Department travel advisories</li>
                <li>Local emergency services information</li>
                <li>Embassy and consulate contacts</li>
              </ul>
            </div>

            <div class="resource-item">
              <h3>Support Organizations</h3>
              <ul>
                <li>Crisis hotlines and support services</li>
                <li>Legal aid organizations</li>
                <li>Mental health resources</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Contact CTA -->
        <section class="cta-section">
          <div class="cta-content">
            <h2>Questions About Safety?</h2>
            <p>Our safety team is here to help. Don't hesitate to reach out with any concerns or questions.</p>
            <div class="cta-buttons">
              <a :href="`tel:${emergencyNumber}`" class="btn btn-primary btn-lg">Emergency Contact</a>
              <button @click="navigateToContact" class="btn btn-outline btn-lg">General Support</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.safety-guide-page {
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

.safety-content {
  max-width: 1000px;
  margin: 0 auto;
}

.emergency-section {
  margin-bottom: var(--spacing-xxl);
}

.emergency-banner {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
  
  .emergency-icon {
    font-size: 3rem;
    min-width: 80px;
    text-align: center;
  }
  
  .emergency-content {
    flex: 1;
    
    h2 {
      color: white;
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      margin-bottom: var(--spacing-md);
      font-size: 1.1rem;
    }
  }
  
  .emergency-number {
    display: inline-block;
    background-color: white;
    color: #dc3545;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius-md);
    font-weight: 600;
    font-size: 1.2rem;
    text-decoration: none;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
}

.safety-section {
  margin-bottom: var(--spacing-xxl);
  
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--color-accent);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
    font-size: 1.3rem;
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-lg);
    line-height: 1.7;
  }
}

.safety-steps {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
  background-color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  
  .step-icon {
    font-size: 2.5rem;
    min-width: 80px;
    text-align: center;
    background-color: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: 50%;
  }
  
  .step-content {
    flex: 1;
    
    h3 {
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
          content: '✓';
          color: var(--color-primary);
          margin-right: 0.5rem;
          font-weight: bold;
        }
      }
    }
  }
}

.during-meeting-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.safety-card {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  .card-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    margin-bottom: var(--spacing-md);
  }
  
  ul {
    list-style: none;
    text-align: left;
    
    li {
      padding: 0.5rem 0;
      color: var(--color-text);
      font-size: 0.95rem;
      
      &::before {
        content: '•';
        color: var(--color-primary);
        margin-right: 0.5rem;
      }
    }
  }
}

.red-flags-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-xl);
}

.red-flag-category {
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  
  h3 {
    color: #c53030;
    margin-bottom: var(--spacing-md);
  }
}

.red-flag-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.red-flag-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  
  .flag-icon {
    font-size: 1.2rem;
  }
  
  span:last-child {
    color: var(--color-text);
    font-size: 0.95rem;
  }
}

.safety-tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.tip-category {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    margin-bottom: var(--spacing-md);
    font-size: 1.2rem;
  }
  
  ul {
    list-style: none;
    
    li {
      padding: 0.5rem 0;
      color: var(--color-text);
      font-size: 0.95rem;
      
      &::before {
        content: '✓';
        color: var(--color-primary);
        margin-right: 0.5rem;
        font-weight: bold;
      }
    }
  }
}

.health-wellness-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.wellness-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
  background-color: white;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  
  .wellness-icon {
    font-size: 2.5rem;
    min-width: 80px;
    text-align: center;
  }
  
  .wellness-content {
    flex: 1;
    
    h3 {
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      margin-bottom: var(--spacing-md);
    }
    
    ul {
      list-style: none;
      
      li {
        padding: 0.5rem 0;
        color: var(--color-text);
        
        &::before {
          content: '•';
          color: var(--color-primary);
          margin-right: 0.5rem;
        }
      }
    }
  }
}

.reporting-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.reporting-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  .reporting-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }
  
  .reporting-content {
    h3 {
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      margin-bottom: var(--spacing-md);
    }
  }
  
  .contact-details {
    background-color: var(--color-background-alt);
    padding: var(--spacing-md);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
    line-height: 1.6;
    text-align: left;
  }
}

.legal-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.legal-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    margin-bottom: var(--spacing-md);
  }
  
  ul {
    list-style: none;
    
    li {
      padding: 0.5rem 0;
      color: var(--color-text);
      
      &::before {
        content: '⚖️';
        margin-right: 0.5rem;
      }
    }
  }
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.resource-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-primary);
  }
  
  ul {
    list-style: none;
    
    li {
      padding: 0.5rem 0;
      color: var(--color-text);
      font-size: 0.95rem;
      
      &::before {
        content: '🔗';
        margin-right: 0.5rem;
      }
    }
  }
}

.cta-section {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl);
  border-radius: var(--border-radius-md);
  text-align: center;
  margin-top: var(--spacing-xxl);
  
  .cta-content {
    max-width: 600px;
    margin: 0 auto;
    
    h2 {
      color: var(--color-primary-dark);
      margin-bottom: var(--spacing-md);
    }
    
    p {
      margin-bottom: var(--spacing-lg);
      font-size: 1.1rem;
    }
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
}

@media (max-width: 992px) {
  .red-flags-container {
    grid-template-columns: 1fr;
  }
  
  .legal-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .emergency-banner {
    flex-direction: column;
    text-align: center;
  }
  
  .step-item {
    flex-direction: column;
    text-align: center;
  }
  
  .during-meeting-grid,
  .safety-tips-grid,
  .reporting-options,
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .wellness-item {
    flex-direction: column;
    text-align: center;
  }
  
  .cta-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>