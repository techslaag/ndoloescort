<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { flutterwaveService } from '../../services/flutterwaveService'
import { formatCurrency } from '../../utils/currency'
import type { Transaction } from '../../services/paymentService'

interface Props {
  limit?: number
  showFilters?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20,
  showFilters: true
})

const authStore = useAuthStore()
const { error: showError } = useToast()

// State
const transactions = ref<Transaction[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedFilter = ref<'all' | 'booking' | 'subscription' | 'advertising' | 'gift'>('all')
const selectedStatus = ref<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all')

// Computed
const userRole = computed(() => authStore.user?.prefs?.userType || 'client')

const filteredTransactions = computed(() => {
  let filtered = [...transactions.value]
  
  // Filter by type
  if (selectedFilter.value !== 'all') {
    filtered = filtered.filter(t => t.type === selectedFilter.value)
  }
  
  // Filter by status
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(t => t.status === selectedStatus.value)
  }
  
  // Apply limit
  if (props.limit > 0) {
    filtered = filtered.slice(0, props.limit)
  }
  
  return filtered
})

const totalSpent = computed(() => {
  return transactions.value
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
})

const totalEarned = computed(() => {
  if (userRole.value !== 'escort') return 0
  
  return transactions.value
    .filter(t => t.status === 'completed' && t.type === 'booking')
    .reduce((sum, t) => {
      // Calculate after platform fee (20%)
      return sum + (t.amount * 0.8)
    }, 0)
})

// Methods
const loadTransactions = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const userId = authStore.user?.$id
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    transactions.value = await flutterwaveService.getPaymentHistory(
      userId,
      userRole.value as 'client' | 'escort'
    )
  } catch (err: any) {
    console.error('Error loading transactions:', err)
    error.value = err.message || 'Failed to load payment history'
  } finally {
    isLoading.value = false
  }
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'booking':
      return '📅'
    case 'subscription':
      return '⭐'
    case 'advertising':
      return '📢'
    case 'gift':
      return '🎁'
    case 'withdrawal':
      return '💸'
    default:
      return '💳'
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'status-completed'
    case 'pending':
      return 'status-pending'
    case 'failed':
      return 'status-failed'
    case 'refunded':
      return 'status-refunded'
    default:
      return ''
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatAmount = (amount: number) => {
  return formatCurrency(amount)
}

const viewReceipt = (transaction: Transaction) => {
  // In production, this would open a detailed receipt view
  console.log('View receipt for:', transaction)
}

const requestRefund = async (transaction: Transaction) => {
  if (confirm('Are you sure you want to request a refund for this transaction?')) {
    try {
      await flutterwaveService.processRefund(transaction.id)
      // Reload transactions
      await loadTransactions()
    } catch (err: any) {
      console.error('Error processing refund:', err)
      showError('Failed to process refund. Please contact support.')
    }
  }
}

// Lifecycle
onMounted(() => {
  loadTransactions()
})

// Expose methods to parent
defineExpose({
  refresh: loadTransactions
})
</script>

<template>
  <div class="payment-history">
    <!-- Header -->
    <div class="history-header">
      <h3>Payment History</h3>
      
      <div class="summary-cards">
        <div class="summary-card">
          <span class="label">Total Spent</span>
          <span class="amount">{{ formatAmount(totalSpent) }}</span>
        </div>
        
        <div v-if="userRole === 'escort'" class="summary-card">
          <span class="label">Total Earned</span>
          <span class="amount earned">{{ formatAmount(totalEarned) }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="filters">
      <div class="filter-group">
        <label>Type:</label>
        <select v-model="selectedFilter" class="filter-select">
          <option value="all">All Types</option>
          <option value="booking">Bookings</option>
          <option value="subscription">Subscriptions</option>
          <option value="advertising">Advertising</option>
          <option value="gift">Gifts</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Status:</label>
        <select v-model="selectedStatus" class="filter-select">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading transactions...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadTransactions" class="btn btn-secondary">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTransactions.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <p>No transactions found</p>
    </div>

    <!-- Transactions List -->
    <div v-else class="transactions-list">
      <div 
        v-for="transaction in filteredTransactions" 
        :key="transaction.id"
        class="transaction-item"
      >
        <div class="transaction-icon">
          {{ getTransactionIcon(transaction.type) }}
        </div>
        
        <div class="transaction-details">
          <div class="transaction-header">
            <h4>{{ transaction.description || `${transaction.type} payment` }}</h4>
            <span class="transaction-amount" :class="{ 'earned': userRole === 'escort' && transaction.type === 'booking' }">
              {{ formatAmount(transaction.amount) }}
            </span>
          </div>
          
          <div class="transaction-meta">
            <span class="transaction-date">{{ formatDate(transaction.createdAt) }}</span>
            <span class="transaction-status" :class="getStatusClass(transaction.status)">
              {{ transaction.status }}
            </span>
          </div>
          
          <div v-if="transaction.processorTransactionId" class="transaction-ref">
            Ref: {{ transaction.processorTransactionId }}
          </div>
        </div>
        
        <div class="transaction-actions">
          <button 
            @click="viewReceipt(transaction)" 
            class="action-btn"
            title="View receipt"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            </svg>
          </button>
          
          <button 
            v-if="transaction.status === 'completed' && transaction.type === 'booking'"
            @click="requestRefund(transaction)" 
            class="action-btn"
            title="Request refund"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.19 14.41L12 15.17l-1.19 1.24L7.59 13.2l1.41-1.41 1.81 1.9 3.78-3.94 1.41 1.41-4.81 5.25z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.payment-history {
  max-width: 1000px;
  margin: 0 auto;
}

// Header
.history-header {
  margin-bottom: 2rem;
  
  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: var(--color-text);
  }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  
  .label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text-light);
    font-size: 0.875rem;
  }
  
  .amount {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    
    &.earned {
      color: #10b981;
    }
  }
}

// Filters
.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    label {
      font-weight: 600;
      color: var(--color-text);
    }
  }
  
  .filter-select {
    padding: 0.5rem 1rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: white;
    color: var(--color-text);
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

// Loading state
.loading-state {
  text-align: center;
  padding: 3rem;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s ease-in-out infinite;
    margin: 0 auto 1rem;
  }
  
  p {
    color: var(--color-text-light);
  }
}

// Error state
.error-state {
  text-align: center;
  padding: 3rem;
  
  p {
    margin: 0 0 1.5rem 0;
    color: #dc3545;
  }
}

// Empty state
.empty-state {
  text-align: center;
  padding: 3rem;
  
  svg {
    color: #dee2e6;
    margin-bottom: 1rem;
  }
  
  p {
    color: var(--color-text-light);
  }
}

// Transactions list
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: #e9ecef;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.transaction-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  flex-shrink: 0;
}

.transaction-details {
  flex: 1;
  min-width: 0;
  
  .transaction-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
    gap: 1rem;
    
    h4 {
      margin: 0;
      font-size: 1rem;
      color: var(--color-text);
      font-weight: 600;
    }
    
    .transaction-amount {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text);
      white-space: nowrap;
      
      &.earned {
        color: #10b981;
      }
    }
  }
  
  .transaction-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.25rem;
    
    .transaction-date {
      font-size: 0.875rem;
      color: var(--color-text-light);
    }
    
    .transaction-status {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      text-transform: uppercase;
      
      &.status-completed {
        background: #d4edda;
        color: #155724;
      }
      
      &.status-pending {
        background: #fff3cd;
        color: #856404;
      }
      
      &.status-failed {
        background: #f8d7da;
        color: #721c24;
      }
      
      &.status-refunded {
        background: #d1ecf1;
        color: #0c5460;
      }
    }
  }
  
  .transaction-ref {
    font-size: 0.75rem;
    color: var(--color-text-light);
    font-family: monospace;
  }
}

.transaction-actions {
  display: flex;
  gap: 0.5rem;
  
  .action-btn {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-light);
    
    &:hover {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }
  }
}

// Animations
@keyframes spin {
  to { transform: rotate(360deg); }
}

// Responsive
@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }
  
  .transaction-item {
    flex-direction: column;
    text-align: center;
  }
  
  .transaction-details {
    .transaction-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .transaction-meta {
      justify-content: center;
    }
  }
  
  .transaction-actions {
    justify-content: center;
  }
}
</style>