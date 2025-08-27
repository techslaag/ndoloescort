<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const lastUpdated = 'December 15, 2024'

const navigateToContact = () => {
  router.push('/contact')
}
</script>

<template>
  <div class="privacy-policy-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Privacy Policy</h1>
        <p>How we collect, use, and protect your personal information</p>
        <p class="last-updated">Last updated: {{ lastUpdated }}</p>
      </div>
    </div>
    
    <div class="container">
      <div class="policy-content">
        <!-- Introduction -->
        <section class="policy-section">
          <h2>Introduction</h2>
          <p>
            Elite Companions ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>
          <p>
            By using our services, you consent to the collection and use of information in accordance with this policy. We understand the sensitive nature of our services and maintain the highest standards of confidentiality and discretion.
          </p>
        </section>

        <!-- Information We Collect -->
        <section class="policy-section">
          <h2>Information We Collect</h2>
          
          <h3>Personal Information</h3>
          <p>We may collect the following types of personal information:</p>
          <ul>
            <li>Name and contact information (email, phone number, address)</li>
            <li>Age and date of birth (for verification purposes)</li>
            <li>Payment information (credit card details, billing address)</li>
            <li>Booking preferences and special requests</li>
            <li>Communication records and correspondence</li>
            <li>Identity verification documents (when required)</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>When you visit our website, we automatically collect:</p>
          <ul>
            <li>IP address and location data</li>
            <li>Browser type and version</li>
            <li>Device information and operating system</li>
            <li>Pages visited and time spent on our site</li>
            <li>Referral sources and search terms</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <!-- How We Use Your Information -->
        <section class="policy-section">
          <h2>How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          
          <div class="usage-categories">
            <div class="usage-item">
              <h4>Service Provision</h4>
              <ul>
                <li>Processing and managing bookings</li>
                <li>Matching you with suitable companions</li>
                <li>Coordinating meeting arrangements</li>
                <li>Providing customer support</li>
              </ul>
            </div>

            <div class="usage-item">
              <h4>Communication</h4>
              <ul>
                <li>Sending booking confirmations and updates</li>
                <li>Responding to inquiries and requests</li>
                <li>Providing important service notifications</li>
                <li>Marketing communications (with consent)</li>
              </ul>
            </div>

            <div class="usage-item">
              <h4>Security & Compliance</h4>
              <ul>
                <li>Verifying identity and age</li>
                <li>Preventing fraud and unauthorized access</li>
                <li>Complying with legal obligations</li>
                <li>Maintaining service security</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Information Sharing -->
        <section class="policy-section">
          <h2>Information Sharing and Disclosure</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following limited circumstances:
          </p>
          
          <div class="sharing-scenarios">
            <div class="scenario">
              <h4>With Companions</h4>
              <p>We share necessary booking details with your selected companion to facilitate the service, including meeting time, location, and any special requests.</p>
            </div>

            <div class="scenario">
              <h4>Service Providers</h4>
              <p>We may share information with trusted third-party service providers who assist us in operating our website, processing payments, or providing customer support.</p>
            </div>

            <div class="scenario">
              <h4>Legal Requirements</h4>
              <p>We may disclose information when required by law, court order, or to protect our rights, property, or safety, or that of our users or others.</p>
            </div>

            <div class="scenario">
              <h4>Business Transfers</h4>
              <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</p>
            </div>
          </div>
        </section>

        <!-- Data Security -->
        <section class="policy-section">
          <h2>Data Security</h2>
          <p>
            We implement comprehensive security measures to protect your personal information:
          </p>
          
          <div class="security-measures">
            <div class="security-item">
              <span class="security-icon">🔒</span>
              <div>
                <h4>Encryption</h4>
                <p>All sensitive data is encrypted using industry-standard SSL/TLS protocols during transmission and AES-256 encryption at rest.</p>
              </div>
            </div>

            <div class="security-item">
              <span class="security-icon">🛡️</span>
              <div>
                <h4>Access Controls</h4>
                <p>Strict access controls ensure only authorized personnel can access your information on a need-to-know basis.</p>
              </div>
            </div>

            <div class="security-item">
              <span class="security-icon">🔐</span>
              <div>
                <h4>Secure Storage</h4>
                <p>Data is stored on secure servers with regular security audits, monitoring, and backup procedures.</p>
              </div>
            </div>

            <div class="security-item">
              <span class="security-icon">👥</span>
              <div>
                <h4>Staff Training</h4>
                <p>All employees undergo privacy and security training and sign confidentiality agreements.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Your Rights -->
        <section class="policy-section">
          <h2>Your Privacy Rights</h2>
          <p>You have the following rights regarding your personal information:</p>
          
          <div class="rights-grid">
            <div class="right-item">
              <h4>Access</h4>
              <p>Request a copy of the personal information we hold about you</p>
            </div>

            <div class="right-item">
              <h4>Correction</h4>
              <p>Request correction of inaccurate or incomplete information</p>
            </div>

            <div class="right-item">
              <h4>Deletion</h4>
              <p>Request deletion of your personal information (subject to legal requirements)</p>
            </div>

            <div class="right-item">
              <h4>Portability</h4>
              <p>Request transfer of your data to another service provider</p>
            </div>

            <div class="right-item">
              <h4>Restriction</h4>
              <p>Request limitation of how we process your information</p>
            </div>

            <div class="right-item">
              <h4>Objection</h4>
              <p>Object to certain types of processing, including marketing</p>
            </div>
          </div>

          <p class="rights-note">
            To exercise any of these rights, please contact us using the information provided at the end of this policy. We will respond to your request within 30 days.
          </p>
        </section>

        <!-- Cookies -->
        <section class="policy-section">
          <h2>Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar technologies to enhance your browsing experience and analyze website usage. You can control cookie settings through your browser preferences.
          </p>
          
          <div class="cookie-types">
            <div class="cookie-type">
              <h4>Essential Cookies</h4>
              <p>Required for basic website functionality and security</p>
            </div>

            <div class="cookie-type">
              <h4>Analytics Cookies</h4>
              <p>Help us understand how visitors interact with our website</p>
            </div>

            <div class="cookie-type">
              <h4>Preference Cookies</h4>
              <p>Remember your settings and preferences for future visits</p>
            </div>
          </div>
        </section>

        <!-- Data Retention -->
        <section class="policy-section">
          <h2>Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to provide our services and comply with legal obligations:
          </p>
          <ul>
            <li><strong>Booking Information:</strong> Retained for 7 years for legal and tax purposes</li>
            <li><strong>Account Information:</strong> Retained while your account is active plus 2 years</li>
            <li><strong>Communication Records:</strong> Retained for 3 years for customer service purposes</li>
            <li><strong>Marketing Data:</strong> Retained until you opt out or withdraw consent</li>
          </ul>
        </section>

        <!-- International Transfers -->
        <section class="policy-section">
          <h2>International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy and applicable laws.
          </p>
        </section>

        <!-- Changes to Policy -->
        <section class="policy-section">
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <!-- Contact Information -->
        <section class="policy-section contact-section">
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our privacy practices, please contact us:
          </p>
          
          <div class="contact-info">
            <div class="contact-method">
              <strong>Email:</strong> privacy@elitecompanions.com
            </div>
            <div class="contact-method">
              <strong>Phone:</strong> +1 (555) 123-4567
            </div>
            <div class="contact-method">
              <strong>Mail:</strong> Elite Companions Privacy Officer<br>
              123 Privacy Street, Suite 100<br>
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
.privacy-policy-page {
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

.policy-content {
  max-width: 900px;
  margin: 0 auto;
  line-height: 1.7;
}

.policy-section {
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
  
  ul {
    margin-bottom: var(--spacing-md);
    padding-left: var(--spacing-lg);
    
    li {
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
  }
}

.usage-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.usage-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }
  
  ul {
    margin: 0;
    padding-left: var(--spacing-md);
    
    li {
      font-size: 0.95rem;
    }
  }
}

.sharing-scenarios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.scenario {
  background-color: var(--color-background-alt);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }
}

.security-measures {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.security-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .security-icon {
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

.rights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.right-item {
  background-color: var(--color-background-alt);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  text-align: center;
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.rights-note {
  background-color: white;
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  border-left: 4px solid var(--color-accent);
  font-style: italic;
}

.cookie-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.cookie-type {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  h4 {
    color: var(--color-primary);
    margin-bottom: var(--spacing-sm);
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
  .usage-categories,
  .sharing-scenarios,
  .cookie-types {
    grid-template-columns: 1fr;
  }
  
  .rights-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .security-item {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .rights-grid {
    grid-template-columns: 1fr;
  }
}
</style>