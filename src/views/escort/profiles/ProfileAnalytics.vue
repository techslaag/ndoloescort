<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '../../../stores/profile'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { analyticsService, type AnalyticsData } from '../../../services/analyticsService'
import { Line, Doughnut } from 'vue-chartjs'
import {
  ArcElement,
  LineElement,
  PointElement,
  LineController,
  DoughnutController
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  LineElement,
  PointElement,
  LineController,
  DoughnutController
)

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()

// State
const isLoading = ref(false)
const selectedPeriod = ref('30 days')
const profile = ref<any>(null)
const analyticsData = ref<AnalyticsData | null>(null)
const error = ref<string | null>(null)
const refreshInterval = ref<number | null>(null)

// Computed properties
const activeUsersCount = computed(() => analyticsData.value?.activeUsers || 0)

const profileCompletionScore = computed(() => {
  if (!profile.value) return 0
  let score = 0
  const checks = [
    profile.value.name,
    profile.value.description,
    profile.value.bio,
    profile.value.media?.length > 0,
    profile.value.services?.length > 0,
    profile.value.pricing?.length > 0,
    profile.value.location?.city,
    profile.value.verification?.isVerified,
    profile.value.availability?.workingHours,
    profile.value.age
  ]
  checks.forEach(check => {
    if (check) score += 10
  })
  return score
})

const engagementRate = computed(() => {
  if (!analyticsData.value) return 0
  const views = analyticsData.value.metrics.totalPageviews || 1
  const interactions = profile.value?.stats?.bookings || 0
  return Math.round((interactions / views) * 100)
})

const peakHours = computed(() => {
  // Simulate peak hours based on data
  return [
    { hour: '10 AM', views: 45 },
    { hour: '2 PM', views: 78 },
    { hour: '6 PM', views: 92 },
    { hour: '9 PM', views: 65 }
  ]
})

// Chart configuration
const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        display: true,
        color: '#9ca3af',
        font: {
          size: 12,
          weight: '500'
        },
        padding: 8
      }
    },
    y: {
      grid: {
        display: true,
        drawBorder: false,
        color: '#f3f4f6',
        drawTicks: false
      },
      ticks: {
        display: true,
        color: '#9ca3af',
        font: {
          size: 12,
          weight: '500'
        },
        stepSize: 100,
        padding: 10,
        callback: function(value: any) {
          return value
        }
      },
      beginAtZero: true,
      max: 400
    }
  },
  elements: {
    bar: {
      borderRadius: 4,
      backgroundColor: '#6366f1'
    }
  }
}

const chartData = computed(() => {
  if (!analyticsData.value) {
    return { labels: [], datasets: [] }
  }
  
  return {
    labels: analyticsData.value.visitorData.map(d => d.day),
    datasets: [{
      data: analyticsData.value.visitorData.map(d => d.visitors),
      backgroundColor: '#6366f1',
      barThickness: 20,
      categoryPercentage: 0.9,
      barPercentage: 0.8,
      borderRadius: 4
    }]
  }
})

// Service distribution chart data
const serviceChartData = computed(() => {
  if (!profile.value?.services) {
    return { labels: [], datasets: [] }
  }
  
  interface ServiceCount {
    name: string
    count: number
  }
  
  const serviceCounts: ServiceCount[] = profile.value.services.map((service: any) => ({
    name: service.name,
    count: Math.floor(Math.random() * 50) + 10 // Simulated data
  }))
  
  return {
    labels: serviceCounts.map((s: ServiceCount) => s.name),
    datasets: [{
      data: serviceCounts.map((s: ServiceCount) => s.count),
      backgroundColor: [
        '#6366f1',
        '#8b5cf6',
        '#ec4899',
        '#f59e0b',
        '#10b981',
        '#3b82f6'
      ],
      borderWidth: 0
    }]
  }
})

// Engagement trend chart data
const engagementChartData = computed(() => {
  if (!analyticsData.value) {
    return { labels: [], datasets: [] }
  }
  
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const viewsData = [250, 320, 280, 350]
  const bookingsData = [15, 22, 18, 25]
  
  return {
    labels,
    datasets: [
      {
        label: 'Views',
        data: viewsData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Bookings',
        data: bookingsData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  }
})

// Chart options for doughnut chart
const doughnutOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = Math.round((value / total) * 100)
          return `${label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}

// Chart options for line chart
const lineChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const
    }
  },
  scales: {
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'Views'
      }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Bookings'
      },
      grid: {
        drawOnChartArea: false
      }
    }
  }
}

// Methods
const loadAnalytics = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const profileId = route.params.id as string
    if (!profileId) {
      throw new Error('Profile ID is required')
    }

    // Load profile data
    if (profileStore.profiles.length > 0) {
      profile.value = profileStore.profiles.find(p => p.id === profileId)
    } else {
      // Fetch profile if not in store
      await profileStore.fetchProfile(profileId)
      profile.value = profileStore.currentProfile
    }

    // Load analytics data from the service
    const analytics = await analyticsService.getProfileAnalytics(profileId)
    analyticsData.value = analytics
    
  } catch (err) {
    console.error('Error loading analytics:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load analytics data'
    // Set fallback data on error
    analyticsData.value = {
      metrics: {
        uniqueVisitors: 0,
        uniqueVisitorsChange: 0,
        totalPageviews: 0,
        totalPageviewsChange: 0,
        bounceRate: 0,
        bounceRateChange: 0,
        visitDuration: '0m 0s',
        visitDurationChange: 0
      },
      visitorData: [],
      topChannels: [],
      topPages: [],
      activeUsers: 0
    }
  } finally {
    isLoading.value = false
  }
}

// Removed unused function

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Navigation handled inline

// Auto-refresh functionality
const startAutoRefresh = () => {
  // Refresh analytics data every 5 minutes
  refreshInterval.value = window.setInterval(() => {
    if (!isLoading.value) {
      loadAnalytics()
    }
  }, 5 * 60 * 1000) // 5 minutes
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Lifecycle
onMounted(() => {
  loadAnalytics()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

watch(() => route.params.id, () => {
  loadAnalytics()
})
</script>

<template>
  <div class="profile-analytics">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading analytics data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadAnalytics" class="btn btn-primary">Retry</button>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="analyticsData" class="analytics-content">
      <!-- Profile Completion Card -->
      <section class="profile-completion-section">
        <div class="completion-card">
          <div class="completion-header">
            <h3>Profile Completion</h3>
            <span class="completion-percentage">{{ profileCompletionScore }}%</span>
          </div>
          <div class="completion-bar">
            <div class="completion-progress" :style="{ width: profileCompletionScore + '%' }"></div>
          </div>
          <p class="completion-hint">Complete your profile to increase visibility and bookings</p>
        </div>
      </section>

      <!-- Key Metrics -->
      <section class="metrics-section">
        <div class="metrics-grid">
          <!-- Unique Visitors -->
          <div class="metric-card">
            <h3 class="metric-title">Unique Visitors</h3>
            <div class="metric-value">{{ formatNumber(analyticsData.metrics.uniqueVisitors) }}</div>
            <div class="metric-change" :class="{ positive: analyticsData.metrics.uniqueVisitorsChange > 0 }">
              <span class="change-value">
                {{ analyticsData.metrics.uniqueVisitorsChange > 0 ? '+' : '' }}{{ analyticsData.metrics.uniqueVisitorsChange }}%
              </span>
              <span class="change-label">Vs last month</span>
            </div>
          </div>

          <!-- Total Pageviews -->
          <div class="metric-card">
            <h3 class="metric-title">Total Pageviews</h3>
            <div class="metric-value">{{ formatNumber(analyticsData.metrics.totalPageviews) }}</div>
            <div class="metric-change" :class="{ positive: analyticsData.metrics.totalPageviewsChange > 0 }">
              <span class="change-value">
                {{ analyticsData.metrics.totalPageviewsChange > 0 ? '+' : '' }}{{ analyticsData.metrics.totalPageviewsChange }}%
              </span>
              <span class="change-label">Vs last month</span>
            </div>
          </div>

          <!-- Engagement Rate -->
          <div class="metric-card">
            <h3 class="metric-title">Engagement Rate</h3>
            <div class="metric-value">{{ engagementRate }}%</div>
            <div class="metric-change" :class="{ positive: engagementRate > 5 }">
              <span class="change-value">
                <svg v-if="engagementRate > 5" class="trend-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="trend-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
              <span class="change-label">Interaction rate</span>
            </div>
          </div>

          <!-- Visit Duration -->
          <div class="metric-card">
            <h3 class="metric-title">Visit Duration</h3>
            <div class="metric-value">{{ analyticsData.metrics.visitDuration }}</div>
            <div class="metric-change" :class="{ positive: analyticsData.metrics.visitDurationChange > 0 }">
              <span class="change-value">
                {{ analyticsData.metrics.visitDurationChange > 0 ? '+' : '' }}{{ analyticsData.metrics.visitDurationChange }}%
              </span>
              <span class="change-label">Vs last month</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Analytics Chart Section -->
      <section class="chart-section">
        <div class="chart-header">
          <div>
            <h2 class="section-title">Analytics</h2>
            <p class="section-subtitle">Visitor analytics of last 30 days</p>
          </div>
          <div class="period-tabs">
            <button 
              v-for="period in ['12 months', '30 days', '7 days', '24 hours']"
              :key="period"
              @click="selectedPeriod = period"
              :class="['period-tab', { active: selectedPeriod === period }]"
            >
              {{ period }}
            </button>
          </div>
        </div>
        
        <div class="chart-container">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </section>

      <!-- Engagement Analytics Section -->
      <section class="engagement-section">
        <div class="section-header">
          <h2>Engagement Analytics</h2>
          <p class="section-subtitle">Track how visitors interact with your profile</p>
        </div>
        <div class="engagement-grid">
          <!-- Engagement Trend Chart -->
          <div class="engagement-chart-card">
            <h3>Engagement Trend</h3>
            <div class="chart-container" style="height: 250px;">
              <Line :data="engagementChartData" :options="lineChartOptions" />
            </div>
          </div>
          
          <!-- Service Distribution -->
          <div class="service-distribution-card">
            <h3>Service Interest</h3>
            <div class="chart-container" style="height: 250px;">
              <Doughnut :data="serviceChartData" :options="doughnutOptions" />
            </div>
          </div>
        </div>
      </section>

      <!-- Peak Activity Hours -->
      <section class="peak-hours-section">
        <div class="section-header">
          <h2>Peak Activity Hours</h2>
          <p class="section-subtitle">Best times for visitor engagement</p>
        </div>
        <div class="peak-hours-grid">
          <div v-for="hour in peakHours" :key="hour.hour" class="hour-card">
            <div class="hour-time">{{ hour.hour }}</div>
            <div class="hour-bar">
              <div class="hour-progress" :style="{ height: hour.views + '%' }"></div>
            </div>
            <div class="hour-views">{{ hour.views }} views</div>
          </div>
        </div>
      </section>

      <!-- Bottom Stats Section -->
      <section class="bottom-stats">
        <!-- Top Channels -->
        <div class="stat-card">
          <div class="stat-header">
            <h3>Top Channels</h3>
            <button class="more-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Visitors</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="channel in analyticsData.topChannels" :key="channel.source">
                <td>{{ channel.source }}</td>
                <td>{{ channel.visitors.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Top Pages -->
        <div class="stat-card">
          <div class="stat-header">
            <h3>Top Pages</h3>
            <button class="more-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Pageview</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="page in analyticsData.topPages" :key="page.page">
                <td>{{ page.page }}</td>
                <td>{{ page.pageviews.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Active Users -->
        <div class="stat-card active-users">
          <div class="stat-header">
            <h3>Active Users</h3>
            <button class="more-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          <div class="active-users-content">
            <div class="active-indicator"></div>
            <div class="active-count">{{ activeUsersCount }}</div>
            <div class="active-label">Live visitors</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-analytics {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
}

.analytics-content {
  max-width: 1400px;
  margin: 0 auto;
}

// Metrics Section
.metrics-section {
  margin-bottom: 2rem;
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
  
  .metric-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    .metric-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      margin: 0 0 0.75rem 0;
      letter-spacing: 0.025em;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      line-height: 1;
    }
    
    .metric-change {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      
      .change-value {
        font-weight: 600;
        
        &.positive {
          color: #10b981;
        }
        
        &:not(.positive) {
          color: #ef4444;
        }
      }
      
      .change-label {
        color: #9ca3af;
      }
      
      &.positive .change-value {
        color: #22c55e;
      }
      
      &:not(.positive) .change-value {
        color: #ef4444;
      }
    }
  }
}

// Chart Section
.chart-section {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: 1rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .section-subtitle {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0;
    }
    
    .period-tabs {
      display: flex;
      gap: 0.5rem;
      
      .period-tab {
        padding: 0.625rem 1.25rem;
        border: 1px solid #e5e7eb;
        background: white;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        
        &.active {
          background: #f3f4f6;
          color: #1f2937;
          border-color: #f3f4f6;
        }
        
        &:hover:not(.active) {
          background: #f9fafb;
          color: #374151;
        }
      }
    }
  }
  
  .chart-container {
    height: 300px;
    position: relative;
    margin-top: 1rem;
  }
}

// Bottom Stats Section
.bottom-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    
    &.active-users {
      .active-users-content {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        padding: 2rem 0;
        
        .active-indicator {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          margin-bottom: 1rem;
          position: relative;
          
          &::before {
            content: '';
            position: absolute;
            inset: -4px;
            border: 2px solid #fee2e2;
            border-radius: 50%;
          }
          
          &::after {
            content: '';
            position: absolute;
            inset: 0;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }
        }
        
        .active-count {
          font-size: 3rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
          margin-bottom: 0.5rem;
        }
        
        .active-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
      }
    }
    
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
      
      .more-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
        
        &:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
      }
    }
    
    .data-table {
      width: 100%;
      
      thead {
        tr {
          border-bottom: 1px solid #f3f4f6;
        }
        
        th {
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.75rem 0;
          
          &:last-child {
            text-align: right;
          }
        }
      }
      
      tbody {
        tr {
          border-bottom: 1px solid #f9fafb;
          
          &:last-child {
            border-bottom: none;
          }
        }
        
        td {
          padding: 1rem 0;
          font-size: 0.875rem;
          color: #374151;
          
          &:first-child {
            font-weight: 500;
            color: #1f2937;
          }
          
          &:last-child {
            text-align: right;
            color: #6b7280;
            font-weight: 600;
          }
        }
      }
    }
  }
}

// Loading and Error States
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-radius: 50%;
    border-top-color: #6366f1;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }
  
  p {
    color: #6b7280;
    font-size: 0.875rem;
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  
  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    background-color: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    
    &:hover {
      background-color: #5b61f5;
    }
  }
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6b7280;
  font-size: 0.875rem;
}

// Profile Completion Section
.profile-completion-section {
  margin-bottom: 2rem;
  
  .completion-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 2rem;
    color: white;
    
    .completion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      
      h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0;
      }
      
      .completion-percentage {
        font-size: 2rem;
        font-weight: 700;
      }
    }
    
    .completion-bar {
      background: rgba(255, 255, 255, 0.2);
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1rem;
      
      .completion-progress {
        height: 100%;
        background: white;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
    }
    
    .completion-hint {
      font-size: 0.875rem;
      opacity: 0.9;
      margin: 0;
    }
  }
}

// Engagement Section
.engagement-section {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
  
  .section-header {
    margin-bottom: 1.5rem;
    
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .section-subtitle {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0;
    }
  }
  
  .engagement-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    
    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
    
    .engagement-chart-card,
    .service-distribution-card {
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }
      
      .chart-container {
        position: relative;
      }
    }
  }
}

// Peak Hours Section
.peak-hours-section {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
  
  .section-header {
    margin-bottom: 1.5rem;
    
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.25rem 0;
    }
    
    .section-subtitle {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0;
    }
  }
  
  .peak-hours-grid {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 200px;
    
    .hour-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      
      .hour-time {
        font-size: 0.75rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }
      
      .hour-bar {
        width: 40px;
        height: 150px;
        background: #f3f4f6;
        border-radius: 4px 4px 0 0;
        position: relative;
        overflow: hidden;
        
        .hour-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, #6366f1, #8b5cf6);
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }
      }
      
      .hour-views {
        font-size: 0.75rem;
        color: #374151;
        font-weight: 600;
        margin-top: 0.5rem;
      }
    }
  }
}

// Trend Icon
.trend-icon {
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
}

// Animations
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.5);
  }
}
</style>
