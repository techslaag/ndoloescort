<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)

const handleSignout = async () => {
  try {
    isLoading.value = true
    const result = await authStore.signout()
    if (result.success) {
      router.push('/')
    }
  } catch (err) {
    console.error('Signout error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <div class="container">
      <div class="profile-header">
        <h1>User Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>
      
      <div class="profile-content">
        <div class="profile-card">
          <div class="profile-info">
            <div class="avatar">
              <span>{{ authStore.user?.name?.charAt(0) || 'U' }}</span>
            </div>
            
            <div class="user-details">
              <h2>{{ authStore.user?.name || 'User' }}</h2>
              <p class="email">{{ authStore.user?.email || 'No email' }}</p>
              <p class="member-since">Member since {{ new Date(authStore.user?.$createdAt || Date.now()).toLocaleDateString() }}</p>
            </div>
          </div>
          
          <div class="profile-actions">
            <button 
              @click="handleSignout" 
              class="btn btn-danger"
              :disabled="isLoading"
            >
              <span v-if="isLoading">Signing out...</span>
              <span v-else>Sign Out</span>
            </button>
          </div>
        </div>
        
        <div class="profile-sections">
          <div class="section-card">
            <h3>Account Settings</h3>
            <p>Update your profile information and preferences</p>
            <button class="btn btn-outline">Edit Profile</button>
          </div>
          
          <div class="section-card">
            <h3>Security</h3>
            <p>Change your password and manage security settings</p>
            <button class="btn btn-outline">Change Password</button>
          </div>
          
          <div class="section-card">
            <h3>Bookings</h3>
            <p>View your booking history and upcoming appointments</p>
            <button class="btn btn-outline">View Bookings</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-page {
  padding-top: 120px;
  min-height: 100vh;
  background-color: var(--color-background);
}

.profile-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
  
  h1 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 2.5rem;
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
  }
}

.profile-content {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xxl);
  margin-bottom: var(--spacing-xl);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex: 1;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: white;
}

.user-details {
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.5rem;
  }
  
  .email {
    color: var(--color-text);
    margin-bottom: var(--spacing-xs);
  }
  
  .member-since {
    color: var(--color-text-light);
    font-size: 0.9rem;
  }
}

.profile-actions {
  .btn-danger {
    background-color: #dc3545;
    color: white;
    
    &:hover {
      background-color: #c82333;
    }
  }
}

.profile-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.section-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.25rem;
  }
  
  p {
    color: var(--color-text-light);
    margin-bottom: var(--spacing-lg);
    line-height: 1.5;
  }
  
  .btn {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-info {
    flex-direction: column;
  }
  
  .profile-sections {
    grid-template-columns: 1fr;
  }
  
  .profile-header h1 {
    font-size: 2rem;
  }
}
</style>