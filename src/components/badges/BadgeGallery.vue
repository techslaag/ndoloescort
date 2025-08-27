<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBadgeStore } from '../../stores/badge'
import { useAuthStore } from '../../stores/auth'
import BadgeDisplay from './BadgeDisplay.vue'
import BadgeProgressBar from './BadgeProgressBar.vue'
import type { ProfileBadge } from '../../types/badges'

interface Props {
  profileId?: string
  showProgress?: boolean
  viewMode?: 'earned' | 'all' | 'progress'
  compact?: boolean
  showVisibilityControls?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: true,
  viewMode: 'earned',
  compact: false,
  showVisibilityControls: false
})

const badgeStore = useBadgeStore()
const authStore = useAuthStore()

const selectedCategory = ref<string>('all')
const selectedRarity = ref<string>('all')
const selectedBadge = ref<ProfileBadge | null>(null)
const showBadgeModal = ref(false)

const categories = computed(() => [
  { value: 'all', label: 'All Categories', count: filteredBadges.value.length },
  ...Object.entries(badgeStore.categories).map(([key, category]) => ({
    value: key,
    label: category.name,
    count: filteredBadges.value.filter(b => b.badge?.category === key).length
  }))
])

const rarities = computed(() => [
  { value: 'all', label: 'All Rarities', count: filteredBadges.value.length },
  ...Object.entries(badgeStore.rarities).map(([key, rarity]) => ({
    value: key,
    label: rarity.name,
    count: filteredBadges.value.filter(b => b.badge?.rarity === key).length
  }))
])

const filteredBadges = computed(() => {
  let badges: any[] = []
  
  switch (props.viewMode) {
    case 'earned':
      badges = badgeStore.earnedBadges
      break
    case 'all':
      badges = badgeStore.allBadges.map(badge => ({
        badge,
        earned: badgeStore.hasBadge(badge.id),
        progress: badgeStore.getBadgeProgress(badge.id)
      }))
      break
    case 'progress':
      badges = badgeStore.badgeProgress
        .filter(p => p.percentage > 0 && p.percentage < 100)
        .map(progress => ({
          badge: badgeStore.getBadgeDefinition(progress.badgeId),
          earned: false,
          progress
        }))
      break
  }

  // Apply filters
  if (selectedCategory.value !== 'all') {
    badges = badges.filter(b => b.badge?.category === selectedCategory.value)
  }
  
  if (selectedRarity.value !== 'all') {
    badges = badges.filter(b => b.badge?.rarity === selectedRarity.value)
  }

  return badges
})

const badgeStats = computed(() => badgeStore.badgeStats)

onMounted(async () => {
  if (authStore.user && props.profileId) {
    await badgeStore.loadUserBadges(authStore.user.$id, props.profileId)
  }
})

const openBadgeModal = (badge: ProfileBadge) => {
  selectedBadge.value = badge
  showBadgeModal.value = true
}

const closeBadgeModal = () => {
  showBadgeModal.value = false
  selectedBadge.value = null
}

const refreshBadges = async () => {
  if (authStore.user && props.profileId) {
    await badgeStore.loadUserBadges(authStore.user.$id, props.profileId)
  }
}

const toggleBadgeVisibility = async (badgeId: string, isVisible: boolean) => {
  await badgeStore.toggleBadgeVisibility(badgeId, isVisible)
}
</script>

<template>
  <div class="badge-gallery">
    <!-- Stats Overview -->
    <div v-if="badgeStats && !compact" class="badge-stats">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ badgeStats.earnedBadges }}</div>
          <div class="stat-label">Earned</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ badgeStats.totalBadges }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ Math.round(badgeStats.completionRate) }}%</div>
          <div class="stat-label">Complete</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ badgeStats.legendaryBadges }}</div>
          <div class="stat-label">Legendary</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="!compact" class="badge-filters">
      <div class="filter-tabs">
        <button 
          v-for="category in categories" 
          :key="category.value"
          :class="['filter-tab', { active: selectedCategory === category.value }]"
          @click="selectedCategory = category.value"
        >
          {{ category.label }}
          <span class="count">{{ category.count }}</span>
        </button>
      </div>
      
      <div class="rarity-filters">
        <select v-model="selectedRarity" class="rarity-select">
          <option v-for="rarity in rarities" :key="rarity.value" :value="rarity.value">
            {{ rarity.label }} ({{ rarity.count }})
          </option>
        </select>
      </div>
    </div>

    <!-- Next Badge Progress (if showing progress) -->
    <div v-if="showProgress && badgeStore.nextBadgeToEarn && !compact" class="next-badge">
      <h3>Next Badge to Earn</h3>
      <div class="next-badge-card">
        <BadgeDisplay 
          :badge="badgeStore.getBadgeDefinition(badgeStore.nextBadgeToEarn.badgeId)!"
          :earned="false"
          size="medium"
          :show-description="true"
        />
        <BadgeProgressBar 
          :progress="badgeStore.nextBadgeToEarn"
          :show-details="true"
        />
      </div>
    </div>

    <!-- Badge Grid -->
    <div class="badge-grid" :class="{ compact }">
      <div 
        v-for="item in filteredBadges" 
        :key="item.badge?.id || item.badgeId"
        class="badge-item"
        :class="{ 
          'earned': viewMode === 'earned' || item.earned,
          'progress': viewMode === 'progress'
        }"
      >
        <BadgeDisplay 
          :badge="item.badge"
          :earned="viewMode === 'earned' || item.earned"
          :size="compact ? 'small' : 'medium'"
          :show-name="!compact"
          :show-description="false"
          :clickable="true"
          :glow="item.earned && (item.badge?.rarity === 'legendary' || item.badge?.rarity === 'epic')"
          @click="openBadgeModal"
        />
        
        <!-- Progress bar for unearned badges -->
        <div v-if="item.progress && viewMode !== 'earned'" class="badge-item-progress">
          <BadgeProgressBar 
            :progress="item.progress"
            :show-details="!compact"
          />
        </div>
        
        <!-- Visibility controls for earned badges -->
        <div v-if="showVisibilityControls && item.earned" class="badge-visibility">
          <label class="visibility-toggle">
            <input 
              type="checkbox" 
              :checked="item.isVisible !== false"
              @change="toggleBadgeVisibility(item.badgeId, $event.target.checked)"
            />
            <span class="toggle-text">{{ item.isVisible !== false ? 'Visible' : 'Hidden' }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredBadges.length === 0" class="empty-state">
      <div class="empty-icon">🏅</div>
      <h3>No badges found</h3>
      <p v-if="viewMode === 'earned'">
        Start completing your profile and providing great service to earn badges!
      </p>
      <p v-else-if="viewMode === 'progress'">
        You're not currently working towards any badges. Keep being awesome!
      </p>
      <button @click="refreshBadges" class="btn btn-primary">
        Check for New Badges
      </button>
    </div>

    <!-- Badge Detail Modal -->
    <div v-if="showBadgeModal && selectedBadge" class="badge-modal" @click.self="closeBadgeModal">
      <div class="modal-content">
        <button class="close-btn" @click="closeBadgeModal">×</button>
        
        <div class="modal-header">
          <BadgeDisplay 
            :badge="selectedBadge"
            :earned="badgeStore.hasBadge(selectedBadge.id)"
            size="large"
            :show-name="true"
            :show-description="true"
            :glow="badgeStore.hasBadge(selectedBadge.id) && (selectedBadge.rarity === 'legendary' || selectedBadge.rarity === 'epic')"
          />
        </div>
        
        <div class="modal-body">
          <div class="requirements-section">
            <h4>Requirements</h4>
            <ul class="requirements-list">
              <li v-for="req in selectedBadge.requirements" :key="req.description">
                {{ req.description }}
              </li>
            </ul>
          </div>
          
          <div v-if="!badgeStore.hasBadge(selectedBadge.id)" class="progress-section">
            <h4>Your Progress</h4>
            <BadgeProgressBar 
              :progress="badgeStore.getBadgeProgress(selectedBadge.id)"
              :show-details="true"
            />
          </div>
          
          <div v-else class="earned-section">
            <div class="earned-badge">
              <span class="earned-icon">🎉</span>
              <span>Badge Earned!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.badge-gallery {
  .badge-stats {
    margin-bottom: var(--spacing-xl);
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--spacing-md);
      
      .stat-card {
        background: white;
        padding: var(--spacing-lg);
        border-radius: var(--border-radius-lg);
        text-align: center;
        border: 1px solid var(--color-border);
        
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: var(--color-primary);
          margin-bottom: var(--spacing-xs);
        }
        
        .stat-label {
          color: var(--color-text-light);
          font-size: 0.9rem;
        }
      }
    }
  }
  
  .badge-filters {
    margin-bottom: var(--spacing-xl);
    
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
      
      .filter-tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-background-alt);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-md);
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          border-color: var(--color-primary);
        }
        
        &.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        
        .count {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: var(--border-radius-sm);
          font-size: 0.8rem;
        }
      }
    }
    
    .rarity-filters {
      .rarity-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-md);
        background: white;
      }
    }
  }
  
  .next-badge {
    margin-bottom: var(--spacing-xl);
    
    h3 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-md);
    }
    
    .next-badge-card {
      background: white;
      padding: var(--spacing-lg);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--color-border);
    }
  }
  
  .badge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--spacing-lg);
    
    &.compact {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--spacing-md);
    }
    
    .badge-item {
      background: white;
      padding: var(--spacing-lg);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--color-border);
      transition: all 0.2s ease;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
      
      &.earned {
        border-color: var(--color-success);
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
      }
      
      .badge-item-progress {
        margin-top: var(--spacing-md);
      }
      
      .badge-visibility {
        margin-top: var(--spacing-md);
        padding-top: var(--spacing-sm);
        border-top: 1px solid var(--color-border);
        
        .visibility-toggle {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          cursor: pointer;
          font-size: 0.85rem;
          
          input[type="checkbox"] {
            margin: 0;
          }
          
          .toggle-text {
            color: var(--color-text-light);
          }
        }
      }
    }
  }
  
  .empty-state {
    text-align: center;
    padding: var(--spacing-xxl);
    
    .empty-icon {
      font-size: 4rem;
      margin-bottom: var(--spacing-lg);
      opacity: 0.5;
    }
    
    h3 {
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-sm);
    }
    
    p {
      color: var(--color-text-light);
      margin-bottom: var(--spacing-lg);
    }
  }
  
  .badge-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-lg);
    
    .modal-content {
      background: white;
      border-radius: var(--border-radius-xl);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      
      .close-btn {
        position: absolute;
        top: var(--spacing-md);
        right: var(--spacing-md);
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: var(--color-text-light);
        
        &:hover {
          color: var(--color-text-dark);
        }
      }
      
      .modal-header {
        padding: var(--spacing-xl);
        text-align: center;
        border-bottom: 1px solid var(--color-border);
      }
      
      .modal-body {
        padding: var(--spacing-xl);
        
        .requirements-section,
        .progress-section {
          margin-bottom: var(--spacing-lg);
          
          h4 {
            color: var(--color-text-dark);
            margin-bottom: var(--spacing-md);
          }
          
          .requirements-list {
            list-style: none;
            padding: 0;
            
            li {
              padding: var(--spacing-sm) 0;
              border-bottom: 1px solid var(--color-border);
              
              &:last-child {
                border-bottom: none;
              }
            }
          }
        }
        
        .earned-section {
          text-align: center;
          
          .earned-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-sm);
            padding: var(--spacing-lg);
            background: var(--color-success-light);
            border-radius: var(--border-radius-lg);
            color: var(--color-success-dark);
            font-weight: 600;
            
            .earned-icon {
              font-size: 1.5rem;
            }
          }
        }
      }
    }
  }
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.btn-primary {
    background: var(--color-primary);
    color: white;
    
    &:hover {
      background: var(--color-primary-dark);
    }
  }
}

@media (max-width: 768px) {
  .badge-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    
    &.compact {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
  }
  
  .filter-tabs {
    .filter-tab {
      flex: 1;
      min-width: 0;
      justify-content: center;
    }
  }
}
</style>