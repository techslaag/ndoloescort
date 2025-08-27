<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="not-found-page">
    <div class="container">
      <div class="not-found-content">
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        
        <div class="action-buttons">
          <button @click="goHome" class="btn btn-primary">Go Home</button>
          <button @click="goBack" class="btn btn-outline">Go Back</button>
        </div>
        
        <div class="suggestions">
          <h3>You might be looking for:</h3>
          <ul>
            <li><a @click="router.push('/escorts')">Browse Escorts</a></li>
            <li><a @click="router.push('/services')">Our Services</a></li>
            <li><a @click="router.push('/locations')">Locations</a></li>
            <li><a @click="router.push('/contact')">Contact Us</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-alt);
  padding: var(--spacing-md);
}

.not-found-content {
  text-align: center;
  max-width: 600px;
  
  .error-code {
    font-size: 8rem;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1;
    margin-bottom: var(--spacing-md);
    font-family: 'Playfair Display', serif;
  }
  
  h1 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
    font-size: 2.5rem;
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xxl);
  
  .btn {
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
  }
}

.suggestions {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
    font-size: 1.3rem;
  }
  
  ul {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    
    li {
      a {
        display: block;
        padding: var(--spacing-sm) var(--spacing-md);
        color: var(--color-primary);
        text-decoration: none;
        border-radius: var(--border-radius-sm);
        transition: all 0.2s ease;
        cursor: pointer;
        
        &:hover {
          background-color: var(--color-background-alt);
          color: var(--color-primary-dark);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .not-found-content {
    .error-code {
      font-size: 6rem;
    }
    
    h1 {
      font-size: 2rem;
    }
  }
  
  .action-buttons {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
  
  .suggestions ul {
    grid-template-columns: 1fr;
  }
}
</style>