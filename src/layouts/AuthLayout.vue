<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Get page title based on route
const pageTitle = computed(() => {
  switch (route.name) {
    case 'Login':
      return 'Welcome Back'
    case 'Signup':
      return 'Create Account'
    case 'ForgotPassword':
      return 'Forgot Password'
    case 'ResetPassword':
      return 'Reset Password'
    default:
      return 'Authentication'
  }
})

// Get page description based on route
const pageDescription = computed(() => {
  switch (route.name) {
    case 'Login':
      return 'Enter your email and password to access your account'
    case 'Signup':
      return 'Join us for exclusive access to premium services'
    case 'ForgotPassword':
      return 'Enter your email to receive a password reset link'
    case 'ResetPassword':
      return 'Set your new password'
    default:
      return 'Secure authentication'
  }
})

// Companions profile data
const companions = [
  {
    name: 'Sophia',
    age: 25,
    location: 'New York',
    rating: 4.9,
    reviews: 127,
    specialty: 'Professional Escort',
    photo: '/src/assets/images/escorts/fit-tanned-woman-with-perfect-body-takes-photo-selfie-phone-mirror-home.jpg'
  },
  {
    name: 'Isabella',
    age: 23,
    location: 'Los Angeles',
    rating: 4.8,
    reviews: 89,
    specialty: 'VIP Companion',
    photo: '/src/assets/images/escorts/bright-colorful-stylish-portrait-young-fit-slim-blogger-woman-leopard-bikini-warm-sunset-light-take-photo.jpg'
  },
  {
    name: 'Emma',
    age: 27,
    location: 'Miami',
    rating: 4.9,
    reviews: 156,
    specialty: 'Luxury Escort',
    photo: '/src/assets/images/escorts/close-up-woman-expressing-revolution-message.jpg'
  },
  {
    name: 'Olivia',
    age: 24,
    location: 'Las Vegas',
    rating: 4.7,
    reviews: 203,
    specialty: 'High-Class Companion',
    photo: '/src/assets/images/escorts/woman-home-bed1.jpg'
  },
  {
    name: 'Ava',
    age: 26,
    location: 'Chicago',
    rating: 4.8,
    reviews: 94,
    specialty: 'Elite Escort',
    photo: '/src/assets/images/escorts/folder/beautiful-blond-woman-posing-red-underwear.jpg'
  },
  {
    name: 'Mia',
    age: 25,
    location: 'San Francisco',
    rating: 4.9,
    reviews: 178,
    specialty: 'Premium Companion',
    photo: '/src/assets/images/escorts/folder/model-with-dark-hair-white-swimwear-coming-out-swimming-pool.jpg'
  }
]
</script>

<template>
  <div class="auth-layout">
    <!-- Left Section - Login Form -->
    <div class="auth-left">
      <div class="auth-content">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo">
            <img src="/src/assets/images/logo/logo.svg" alt="Elite Companions Logo" class="logo-image">
            <span class="logo-text">Elite Companions</span>
          </div>
        </div>
        
        <!-- Page Title and Description -->
        <div class="page-header">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-description">{{ pageDescription }}</p>
        </div>
        
        <!-- Content area -->
        <div class="auth-form-container">
          <slot />
        </div>
        
        <!-- Back to Home Button -->
        <div class="back-to-home">
          <button @click="$router.push('/')" class="back-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
    
    <!-- Right Section - Companions -->
    <div class="auth-right">
      <div class="companions-container">
        <div class="companions-grid">
          <div 
            v-for="(companion, index) in companions" 
            :key="index"
            class="companion-card"
            :style="{ backgroundImage: `url(${companion.photo})` }"
          >
            <div class="companion-overlay"></div>
            <div class="companion-content">
              <div class="companion-rating">
                <span class="rating-star">★</span>
                <span class="rating-value">{{ companion.rating }}</span>
              </div>
              <div class="companion-info">
                <h3 class="companion-name">{{ companion.name }}</h3>
                <p class="companion-age">{{ companion.age }} years old</p>
                <p class="companion-location">{{ companion.location }}</p>
                <p class="companion-specialty">{{ companion.specialty }}</p>
                <p class="companion-reviews">{{ companion.reviews }} reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100vh;
  display: flex;
  background-color: var(--color-background);
}

.auth-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  background-color: var(--color-background);
  max-width: 50%;
}

.auth-content {
  width: 100%;
  max-width: 400px;
}

.logo-section {
  margin-bottom: var(--spacing-xxl);
  
  .logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    
    .logo-image {
      width: 40px;
      height: 40px;
      object-fit: contain;
    }
    
    .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
    }
  }
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-dark);
    margin: 0 0 var(--spacing-sm);
  }
  
  .page-description {
    color: var(--color-text-light);
    font-size: 1rem;
    line-height: 1.5;
    margin: 0;
  }
}

.auth-form-container {
  width: 100%;
}

.back-to-home {
  margin-top: var(--spacing-xl);
  text-align: center;
  
  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background-color: transparent;
    color: var(--color-text-lighter);
    border: 1px solid var(--color-text-lighter);
    border-radius: var(--border-radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    
    &:hover {
      background-color: var(--color-background-alt);
      color: var(--color-text-dark);
      border-color: var(--color-accent);
      transform: translateY(-1px);
    }
    
    svg {
      transition: transform 0.2s ease;
    }
    
    &:hover svg {
      transform: translateX(-2px);
    }
  }
}

.auth-right {
  flex: 1;
  background-color: var(--color-background-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  max-width: 50%;
}

.companions-container {
  width: 100%;
  max-width: 600px;
}

.companions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.companion-card {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
}

.companion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    rgba(0, 0, 0, 0.8) 100%
  );
  z-index: 1;
}

.companion-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  z-index: 2;
  
  .companion-rating {
    align-self: flex-end;
    background-color: var(--color-accent);
    color: white;
    border-radius: var(--border-radius-lg);
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: auto;
    
    .rating-star {
      color: white;
      font-size: 0.8rem;
    }
    
    .rating-value {
      color: white;
    }
  }
  
  .companion-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .companion-name {
      color: #ffffff;
      font-weight: 600;
      font-size: 1rem;
      margin: 0;
    }
    
    .companion-age {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.8rem;
      margin: 0;
    }
    
    .companion-location {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.8rem;
      margin: 0;
    }
    
    .companion-specialty {
      color: var(--color-accent-light);
      font-size: 0.8rem;
      font-weight: 500;
      margin: 0;
    }
    
    .companion-reviews {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
      margin: 0;
    }
  }
}

// Responsive design
@media (max-width: 1024px) {
  .auth-layout {
    flex-direction: column;
  }
  
  .auth-left,
  .auth-right {
    max-width: 100%;
  }
  
  .auth-right {
    order: 1;
    min-height: 300px;
  }
  
  .companions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .auth-left,
  .auth-right {
    padding: var(--spacing-lg);
  }
  
  .companions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
  
  .companion-card {
    padding: var(--spacing-md);
  }
  
  .page-title {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .auth-left,
  .auth-right {
    padding: var(--spacing-md);
  }
  
  .companions-grid {
    grid-template-columns: 1fr;
  }
  
  .auth-content {
    max-width: 100%;
  }
  
  .logo .logo-text {
    font-size: 1.25rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
}
</style>