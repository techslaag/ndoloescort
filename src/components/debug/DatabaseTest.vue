<script setup lang="ts">
import { ref } from 'vue'
import { databases, DATABASE_ID, PROFILES_COLLECTION_ID } from '../../lib/appwrite'
import { useAuthStore } from '../../stores/auth'
import { Query } from 'appwrite'

const authStore = useAuthStore()
const testResults = ref<any[]>([])
const isRunning = ref(false)

async function testDatabaseConnection() {
  isRunning.value = true
  testResults.value = []
  
  try {
    // Test 1: Check auth
    testResults.value.push({
      test: 'Authentication Check',
      success: !!authStore.user,
      details: authStore.user ? `User: ${authStore.user.$id}` : 'Not authenticated'
    })
    
    if (!authStore.user) {
      testResults.value.push({
        test: 'Database Test Skipped',
        success: false,
        details: 'User must be authenticated to test database'
      })
      return
    }
    
    // Test 2: List profiles
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        [Query.equal('userId', authStore.user.$id)]
      )
      
      testResults.value.push({
        test: 'List Profiles',
        success: true,
        details: `Found ${response.documents.length} profiles`
      })
      
      // Log first profile if exists
      if (response.documents.length > 0) {
        console.log('Sample profile:', response.documents[0])
      }
      
    } catch (dbError: any) {
      testResults.value.push({
        test: 'List Profiles',
        success: false,
        details: `Error: ${dbError.message || dbError}`
      })
    }
    
    // Test 3: Check database configuration
    testResults.value.push({
      test: 'Database Configuration',
      success: true,
      details: `DB: ${DATABASE_ID}, Collection: ${PROFILES_COLLECTION_ID}`
    })
    
  } catch (error: any) {
    testResults.value.push({
      test: 'General Error',
      success: false,
      details: error.message || 'Unknown error'
    })
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div class="database-test">
    <h3>Database Connection Test</h3>
    
    <button 
      @click="testDatabaseConnection" 
      :disabled="isRunning"
      class="test-button"
    >
      {{ isRunning ? 'Testing...' : 'Run Test' }}
    </button>
    
    <div v-if="testResults.length > 0" class="test-results">
      <div 
        v-for="(result, index) in testResults" 
        :key="index"
        class="test-result"
        :class="result.success ? 'success' : 'error'"
      >
        <span class="test-name">{{ result.test }}:</span>
        <span class="test-status">{{ result.success ? '✓' : '✗' }}</span>
        <span class="test-details">{{ result.details }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.database-test {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-bottom: 1rem;
}

h3 {
  margin-bottom: 1rem;
}

.test-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-results {
  margin-top: 1rem;
}

.test-result {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.test-result.success {
  background: #f0fdf4;
  border: 1px solid #22c55e;
}

.test-result.error {
  background: #fef2f2;
  border: 1px solid #ef4444;
}

.test-name {
  font-weight: 600;
}

.test-status {
  font-weight: bold;
  font-size: 1.2rem;
}

.test-details {
  flex: 1;
  font-size: 0.9rem;
  color: #666;
}
</style>