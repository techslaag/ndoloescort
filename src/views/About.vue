<script setup lang="ts">
import { ref } from 'vue'

const teamMembers = ref([
  {
    name: "Sarah Johnson",
    role: "Founder & CEO",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
    description: "With over 10 years in luxury hospitality, Sarah founded Elite Companions to provide unparalleled companion services."
  },
  {
    name: "Michael Chen",
    role: "Operations Director",
    image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
    description: "Michael ensures our operations run smoothly and maintains our high standards of service excellence."
  },
  {
    name: "Emma Rodriguez",
    role: "Client Relations Manager",
    image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2",
    description: "Emma specializes in understanding client needs and ensuring perfect companion matches."
  }
])
</script>

<template>
  <div class="about-page">
    <!-- Hero section -->
    <div class="page-header">
      <div class="container">
        <h1>About Elite Companions</h1>
        <p>Redefining luxury companion services with elegance, discretion, and professionalism</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Our story section -->
      <section class="story-section section">
        <div class="story-content">
          <div class="story-text">
            <h2>Our Story</h2>
            <p>
              Elite Companions was founded with a vision to revolutionize the companion service industry. 
              We believe that everyone deserves access to sophisticated, intelligent, and charming companions 
              for life's most important moments.
            </p>
            <p>
              Since our inception, we have maintained the highest standards of professionalism, discretion, 
              and quality. Our carefully selected companions are not just beautiful, but also educated, 
              well-traveled, and capable of engaging in meaningful conversations on a wide range of topics.
            </p>
            <p>
              We pride ourselves on creating authentic connections and providing experiences that exceed 
              expectations, whether for business events, social gatherings, or private occasions.
            </p>
          </div>
          <div class="story-image">
            <img src="https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" alt="Elegant dinner setting">
          </div>
        </div>
      </section>
      
      <!-- Values section -->
      <section class="values-section section">
        <div class="section-header">
          <h2>Our Values</h2>
          <p>The principles that guide everything we do</p>
        </div>
        
        <div class="values-grid">
          <div class="value-card">
            <div class="value-icon">🛡️</div>
            <h3>Discretion</h3>
            <p>Complete confidentiality and privacy protection for all our clients and companions.</p>
          </div>
          
          <div class="value-card">
            <div class="value-icon">⭐</div>
            <h3>Excellence</h3>
            <p>Unwavering commitment to the highest standards of service and companion quality.</p>
          </div>
          
          <div class="value-card">
            <div class="value-icon">🤝</div>
            <h3>Integrity</h3>
            <p>Honest, transparent business practices built on trust and mutual respect.</p>
          </div>
          
          <div class="value-card">
            <div class="value-icon">💎</div>
            <h3>Luxury</h3>
            <p>Premium experiences that reflect sophistication and attention to detail.</p>
          </div>
        </div>
      </section>
      
      <!-- Team section -->
      <section class="team-section section">
        <div class="section-header">
          <h2>Meet Our Team</h2>
          <p>The dedicated professionals behind Elite Companions</p>
        </div>
        
        <div class="team-grid">
          <div v-for="member in teamMembers" :key="member.name" class="team-card">
            <div class="member-image">
              <img :src="member.image" :alt="member.name">
            </div>
            <div class="member-info">
              <h3>{{ member.name }}</h3>
              <p class="member-role">{{ member.role }}</p>
              <p class="member-description">{{ member.description }}</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Mission section -->
      <section class="mission-section section">
        <div class="mission-content">
          <h2>Our Mission</h2>
          <blockquote>
            "To provide exceptional companion services that create meaningful connections, 
            unforgettable experiences, and lasting memories while maintaining the highest 
            standards of professionalism, discretion, and client satisfaction."
          </blockquote>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.about-page {
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

.story-section {
  .story-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xl);
    align-items: center;
  }
  
  .story-text {
    h2 {
      color: var(--color-primary-dark);
      margin-bottom: var(--spacing-md);
    }
    
    p {
      margin-bottom: var(--spacing-md);
      line-height: 1.7;
      color: var(--color-text);
    }
  }
  
  .story-image {
    img {
      width: 100%;
      height: 400px;
      object-fit: cover;
      border-radius: var(--border-radius-md);
    }
  }
}

.values-section {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.value-card {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  .value-icon {
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

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-xl);
}

.team-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .member-image {
    height: 250px;
    overflow: hidden;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .member-info {
    padding: var(--spacing-lg);
    
    h3 {
      color: var(--color-primary-dark);
      margin-bottom: 0.25rem;
    }
    
    .member-role {
      color: var(--color-accent);
      font-weight: 600;
      margin-bottom: var(--spacing-sm);
    }
    
    .member-description {
      color: var(--color-text-light);
      line-height: 1.6;
    }
  }
}

.mission-section {
  text-align: center;
  
  .mission-content {
    max-width: 800px;
    margin: 0 auto;
    
    h2 {
      color: var(--color-primary-dark);
      margin-bottom: var(--spacing-lg);
    }
    
    blockquote {
      font-size: 1.2rem;
      line-height: 1.8;
      color: var(--color-text);
      font-style: italic;
      position: relative;
      padding: var(--spacing-lg);
      
      &::before, &::after {
        content: '"';
        font-size: 3rem;
        color: var(--color-accent-light);
        position: absolute;
        opacity: 0.5;
      }
      
      &::before {
        top: 0;
        left: 0;
      }
      
      &::after {
        bottom: -20px;
        right: 0;
      }
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

@media (max-width: 768px) {
  .story-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .values-grid {
    grid-template-columns: 1fr;
  }
  
  .team-grid {
    grid-template-columns: 1fr;
  }
  
  .values-section {
    margin: var(--spacing-xl) calc(-50vw + 50% + var(--spacing-md));
  }
}
</style>