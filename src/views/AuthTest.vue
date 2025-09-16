<script setup lang="ts">
import AuthTestPanel from '../components/auth/AuthTestPanel.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
</script>

<template>
  <DefaultLayout>
    <div class="auth-test-page">
      <div class="container">
        <div class="page-header">
          <h1>Authentication System Test</h1>
          <p>This page is for testing the authentication system with different user types.</p>
        </div>
        
        <AuthTestPanel />
        
        <div class="test-info">
          <h3>Test Information</h3>
          <div class="info-grid">
            <div class="info-card">
              <h4>Escort Test Account</h4>
              <p>Email: test.escort@example.com</p>
              <p>Password: TestEscort123!</p>
              <p>Tests escort-specific features and access controls</p>
            </div>
            
            <div class="info-card">
              <h4>Client Test Account</h4>
              <p>Email: test.client@example.com</p>
              <p>Password: TestClient123!</p>
              <p>Tests client-specific features and restrictions</p>
            </div>
            
            <div class="info-card">
              <h4>Anonymous User</h4>
              <p>No credentials required</p>
              <p>Tests public access and upgrade prompts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped lang="scss">
.auth-test-page {
  padding: 2rem 0;
  min-height: calc(100vh - 200px);
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
  
  h1 {
    color: var(--color-text-dark);
    margin-bottom: 1rem;
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
  }
}

.test-info {
  margin-top: 3rem;
  
  h3 {
    color: var(--color-text-dark);
    margin-bottom: 1.5rem;
    text-align: center;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  h4 {
    color: var(--color-accent);
    margin-bottom: 1rem;
  }
  
  p {
    color: var(--color-text);
    margin-bottom: 0.5rem;
    
    &:last-child {
      margin-bottom: 0;
      color: var(--color-text-light);
      font-style: italic;
    }
  }
}

@media (max-width: 768px) {
  .auth-test-page {
    padding: 1rem 0;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>