<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const lastUpdated = 'December 15, 2024'

const navigateToContact = () => {
  router.push('/contact')
}
</script>

<template>
  <div class="terms-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Terms of Service</h1>
        <p>Legal terms and conditions for using Elite Companions services</p>
        <p class="last-updated">Last updated: {{ lastUpdated }}</p>
      </div>
    </div>
    
    <div class="container">
      <div class="terms-content">
        <!-- Introduction -->
        <section class="terms-section">
          <h2>Agreement to Terms</h2>
          <p>
            These Terms of Service ("Terms") govern your use of Elite Companions' website and services. By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and Elite Companions. We reserve the right to modify these Terms at any time, and such modifications will be effective immediately upon posting.
          </p>
        </section>

        <!-- Eligibility -->
        <section class="terms-section">
          <h2>Eligibility and Age Requirements</h2>
          <div class="eligibility-requirements">
            <div class="requirement-item">
              <span class="requirement-icon">🔞</span>
              <div>
                <h4>Age Requirement</h4>
                <p>You must be at least 21 years of age to use our services. By using our services, you represent and warrant that you meet this age requirement.</p>
              </div>
            </div>

            <div class="requirement-item">
              <span class="requirement-icon">📋</span>
              <div>
                <h4>Legal Capacity</h4>
                <p>You must have the legal capacity to enter into binding contracts and comply with these Terms in your jurisdiction.</p>
              </div>
            </div>

            <div class="requirement-item">
              <span class="requirement-icon">✅</span>
              <div>
                <h4>Verification</h4>
                <p>We reserve the right to request age and identity verification at any time. Failure to provide verification may result in service termination.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Services Description -->
        <section class="terms-section">
          <h2>Description of Services</h2>
          <p>
            Elite Companions provides professional companion services for social, business, and entertainment purposes. Our services include:
          </p>
          
          <div class="services-grid">
            <div class="service-item">
              <h4>Social Companionship</h4>
              <p>Dinner dates, event accompaniment, and social gatherings</p>
            </div>

            <div class="service-item">
              <h4>Business Functions</h4>
              <p>Professional accompaniment for business events and meetings</p>
            </div>

            <div class="service-item">
              <h4>Travel Companionship</h4>
              <p>Accompaniment for business or leisure travel</p>
            </div>

            <div class="service-item">
              <h4>Private Experiences</h4>
              <p>Personalized companion experiences in private settings</p>
            </div>
          </div>

          <div class="service-clarification">
            <h4>Important Clarification</h4>
            <p>
              All services provided are for companionship, social interaction, and entertainment purposes only. 
              Elite Companions does not provide, facilitate, or condone any illegal activities. 
              Any arrangements between clients and companions beyond our stated services are private matters 
              between consenting adults and are not part of our service offering.
            </p>
          </div>
        </section>

        <!-- Booking Terms -->
        <section class="terms-section">
          <h2>Booking and Payment Terms</h2>
          
          <h3>Booking Process</h3>
          <ul>
            <li>All bookings must be made through our official website or authorized representatives</li>
            <li>Bookings are subject to companion availability and our approval</li>
            <li>We reserve the right to refuse service to any client at our discretion</li>
            <li>Minimum booking duration may apply for certain services</li>
          </ul>

          <h3>Payment Terms</h3>
          <div class="payment-terms">
            <div class="payment-item">
              <h4>Payment Due</h4>
              <p>Full payment is required at the time of booking confirmation</p>
            </div>

            <div class="payment-item">
              <h4>Accepted Methods</h4>
              <p>Credit cards, bank transfers, and approved digital payment methods</p>
            </div>

            <div class="payment-item">
              <h4>Currency</h4>
              <p>All prices are quoted and charged in USD unless otherwise specified</p>
            </div>

            <div class="payment-item">
              <h4>Additional Costs</h4>
              <p>Client is responsible for companion's travel, dining, and accommodation expenses</p>
            </div>
          </div>

          <h3>Cancellation Policy</h3>
          <div class="cancellation-policy">
            <div class="policy-tier">
              <span class="tier-label">48+ Hours</span>
              <span class="tier-refund">100% Refund</span>
            </div>
            <div class="policy-tier">
              <span class="tier-label">24-48 Hours</span>
              <span class="tier-refund">50% Refund</span>
            </div>
            <div class="policy-tier">
              <span class="tier-label">Less than 24 Hours</span>
              <span class="tier-refund">No Refund</span>
            </div>
          </div>
        </section>

        <!-- Client Responsibilities -->
        <section class="terms-section">
          <h2>Client Responsibilities and Conduct</h2>
          
          <div class="responsibilities-grid">
            <div class="responsibility-category">
              <h4>Respectful Behavior</h4>
              <ul>
                <li>Treat companions with respect and courtesy</li>
                <li>Maintain appropriate boundaries</li>
                <li>Follow companion's guidelines and preferences</li>
                <li>Respect companion's right to refuse any request</li>
              </ul>
            </div>

            <div class="responsibility-category">
              <h4>Safety and Security</h4>
              <ul>
                <li>Provide accurate meeting location and contact information</li>
                <li>Ensure safe meeting environments</li>
                <li>Report any safety concerns immediately</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </div>

            <div class="responsibility-category">
              <h4>Privacy and Discretion</h4>
              <ul>
                <li>Maintain confidentiality of companion identity</li>
                <li>Do not photograph or record without explicit consent</li>
                <li>Respect companion's privacy outside of bookings</li>
                <li>Do not share personal information publicly</li>
              </ul>
            </div>

            <div class="responsibility-category">
              <h4>Prohibited Activities</h4>
              <ul>
                <li>Harassment, intimidation, or threatening behavior</li>
                <li>Illegal drug use or excessive alcohol consumption</li>
                <li>Attempting to negotiate services not offered</li>
                <li>Sharing or selling access to our services</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Companion Rights -->
        <section class="terms-section">
          <h2>Companion Rights and Protections</h2>
          <p>
            Our companions are independent contractors who have the right to:
          </p>
          
          <div class="companion-rights">
            <div class="right-item">
              <span class="right-icon">🛡️</span>
              <div>
                <h4>Personal Safety</h4>
                <p>Refuse any booking or request that makes them uncomfortable or unsafe</p>
              </div>
            </div>

            <div class="right-item">
              <span class="right-icon">⏰</span>
              <div>
                <h4>Schedule Control</h4>
                <p>Set their own availability and working hours</p>
              </div>
            </div>

            <div class="right-item">
              <span class="right-icon">🚫</span>
              <div>
                <h4>Service Boundaries</h4>
                <p>Define and enforce their service boundaries and limitations</p>
              </div>
            </div>

            <div class="right-item">
              <span class="right-icon">🔒</span>
              <div>
                <h4>Privacy Protection</h4>
                <p>Maintain privacy of personal information and off-duty time</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Liability and Disclaimers -->
        <section class="terms-section">
          <h2>Liability and Disclaimers</h2>
          
          <div class="disclaimer-box">
            <h4>Service Disclaimer</h4>
            <p>
              Elite Companions acts as an intermediary connecting clients with independent companion service providers. 
              We do not employ companions directly and are not responsible for their individual actions or decisions. 
              All interactions between clients and companions are between independent parties.
            </p>
          </div>

          <h3>Limitation of Liability</h3>
          <ul>
            <li>We are not liable for any indirect, incidental, or consequential damages</li>
            <li>Our total liability is limited to the amount paid for the specific service</li>
            <li>We are not responsible for companion availability or performance</li>
            <li>Clients assume all risks associated with meeting companions</li>
          </ul>

          <h3>Indemnification</h3>
          <p>
            You agree to indemnify and hold Elite Companions harmless from any claims, damages, or expenses 
            arising from your use of our services or violation of these Terms.
          </p>
        </section>

        <!-- Privacy and Data -->
        <section class="terms-section">
          <h2>Privacy and Data Protection</h2>
          <p>
            Your privacy is important to us. Our collection and use of personal information is governed by our 
            Privacy Policy, which is incorporated into these Terms by reference. By using our services, you 
            consent to our privacy practices as described in our Privacy Policy.
          </p>
          
          <div class="privacy-highlights">
            <div class="privacy-item">
              <h4>Data Security</h4>
              <p>We use industry-standard security measures to protect your information</p>
            </div>

            <div class="privacy-item">
              <h4>Confidentiality</h4>
              <p>All client information is kept strictly confidential</p>
            </div>

            <div class="privacy-item">
              <h4>Data Retention</h4>
              <p>We retain data only as long as necessary for service provision and legal compliance</p>
            </div>
          </div>
        </section>

        <!-- Termination -->
        <section class="terms-section">
          <h2>Termination</h2>
          <p>
            We reserve the right to terminate or suspend your access to our services at any time, 
            with or without notice, for any reason, including violation of these Terms.
          </p>
          
          <h3>Grounds for Termination</h3>
          <ul>
            <li>Violation of these Terms of Service</li>
            <li>Inappropriate or disrespectful behavior toward companions or staff</li>
            <li>Fraudulent payment or chargeback disputes</li>
            <li>Illegal activities or law enforcement requests</li>
            <li>Safety concerns or threats</li>
          </ul>
        </section>

        <!-- Governing Law -->
        <section class="terms-section">
          <h2>Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of the State of New York, without regard to conflict of law principles. 
            Any disputes arising from these Terms or your use of our services will be resolved through binding arbitration 
            in New York, NY.
          </p>
          
          <div class="dispute-resolution">
            <h4>Dispute Resolution Process</h4>
            <ol>
              <li>Direct negotiation between parties</li>
              <li>Mediation through agreed mediator</li>
              <li>Binding arbitration if mediation fails</li>
            </ol>
          </div>
        </section>

        <!-- Changes to Terms -->
        <section class="terms-section">
          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon 
            posting on our website. Your continued use of our services after changes are posted constitutes 
            acceptance of the modified Terms.
          </p>
          
          <p>
            We will notify users of material changes via email or prominent website notice. 
            It is your responsibility to review these Terms periodically.
          </p>
        </section>

        <!-- Contact Information -->
        <section class="terms-section contact-section">
          <h2>Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us:
          </p>
          
          <div class="contact-info">
            <div class="contact-method">
              <strong>Email:</strong> legal@elitecompanions.com
            </div>
            <div class="contact-method">
              <strong>Phone:</strong> +1 (555) 123-4567
            </div>
            <div class="contact-method">
              <strong>Mail:</strong> Elite Companions Legal Department<br>
              123 Legal Street, Suite 200<br>
              New York, NY 10001
            </div>
          </div>
          
          <button @click="navigateToContact" class="btn btn-primary">Contact Us</button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.terms-page {
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
    margin-bottom: 0.5rem;
  }
  
  .last-updated {
    font-size: 0.9rem;
    font-style: italic;
  }
}

.terms-content {
  max-width: 900px;
  margin: 0 auto;
  line-height: 1.7;
}

.terms-section {
  margin-bottom: var(--spacing-xxl);
  
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--color-accent);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin: var(--spacing-lg) 0 var(--spacing-md);
    font-size: 1.3rem;
  }
  
  h4 {
    color: var(--color-primary-dark);
    margin: var(--spacing-md) 0 var(--spacing-sm);
    font-size: 1.1rem;
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-md);
  }
  
  ul, ol {
    margin-bottom: var(--spacing-md);
    padding-left: var(--spacing-lg);
    
    li {
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
  }
}

.eligibility-requirements {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.requirement-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .requirement-icon {
    font-size: 2rem;
    min-width: 50px;
  }
  
  h4 {
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin: var(--spacing-lg) 0;
}

.service-item {
  background-color: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
}

.service-clarification {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-lg);
  
  h4 {
    color: #856404;
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: #856404;
    margin: 0;
    font-weight: 500;
  }
}

.payment-terms {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.payment-item {
  background-color: white;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
    font-size: 1rem;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.cancellation-policy {
  display: flex;
  justify-content: space-around;
  background-color: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-md);
}

.policy-tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .tier-label {
    font-weight: 600;
    color: var(--color-text-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  .tier-refund {
    color: var(--color-primary);
    font-weight: 600;
    font-size: 1.1rem;
  }
}

.responsibilities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.responsibility-category {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-md);
  }
  
  ul {
    margin: 0;
    padding-left: var(--spacing-md);
    
    li {
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }
  }
}

.companion-rights {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.right-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .right-icon {
    font-size: 2rem;
    min-width: 50px;
  }
  
  h4 {
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
}

.disclaimer-box {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  
  h4 {
    color: #721c24;
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: #721c24;
    margin: 0;
    font-weight: 500;
  }
}

.privacy-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.privacy-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
}

.dispute-resolution {
  background-color: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  margin-top: var(--spacing-md);
  
  h4 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
  }
  
  ol {
    margin: 0;
    padding-left: var(--spacing-lg);
  }
}

.contact-section {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-md);
  text-align: center;
}

.contact-info {
  margin: var(--spacing-lg) 0;
  text-align: left;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.contact-method {
  margin-bottom: var(--spacing-md);
  
  strong {
    color: var(--color-primary-dark);
  }
}

@media (max-width: 768px) {
  .services-grid,
  .payment-terms,
  .responsibilities-grid,
  .privacy-highlights {
    grid-template-columns: 1fr;
  }
  
  .cancellation-policy {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .requirement-item,
  .right-item {
    flex-direction: column;
    text-align: center;
  }
}
</style>