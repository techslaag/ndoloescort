<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CalendarEvent } from '../../types/profile'

interface Props {
  profileId: string
  events?: CalendarEvent[]
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  editable: true
})

const emit = defineEmits<{
  'update:events': [events: CalendarEvent[]]
  'date-selected': [date: string]
}>()

const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(null)
const viewMode = ref<'month' | 'week'>('month')

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const calendarDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const days = []
  const current = new Date(startDate)
  
  while (current <= lastDay || current.getDay() !== 0) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return days
})

const getEventsForDate = (date: Date): CalendarEvent[] => {
  const dateStr = date.toISOString().split('T')[0]
  return props.events.filter(event => event.date === dateStr)
}

const getDayClasses = (date: Date) => {
  const isCurrentMonth = date.getMonth() === currentMonth.value
  const isToday = date.toDateString() === new Date().toDateString()
  const isSelected = selectedDate.value?.toDateString() === date.toDateString()
  const events = getEventsForDate(date)
  const hasBooking = events.some(e => e.type === 'booked')
  const isAvailable = events.some(e => e.type === 'available')
  const isBlocked = events.some(e => e.type === 'blocked')
  
  return {
    'calendar-day': true,
    'other-month': !isCurrentMonth,
    'today': isToday,
    'selected': isSelected,
    'has-booking': hasBooking,
    'available': isAvailable && !hasBooking,
    'blocked': isBlocked && !hasBooking,
    'clickable': props.editable
  }
}

const previousMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

const selectDate = (date: Date) => {
  if (!props.editable) return
  
  selectedDate.value = date
  emit('date-selected', date.toISOString().split('T')[0])
}

const goToToday = () => {
  currentDate.value = new Date()
  selectedDate.value = new Date()
}
</script>

<template>
  <div class="availability-calendar">
    <div class="calendar-header">
      <button @click="previousMonth" class="nav-btn">‹</button>
      <div class="month-year">
        {{ monthNames[currentMonth] }} {{ currentYear }}
      </div>
      <button @click="nextMonth" class="nav-btn">›</button>
    </div>
    
    <div class="calendar-actions">
      <button @click="goToToday" class="today-btn">Today</button>
      <div class="view-toggle">
        <button 
          @click="viewMode = 'month'" 
          :class="{ active: viewMode === 'month' }"
        >
          Month
        </button>
        <button 
          @click="viewMode = 'week'" 
          :class="{ active: viewMode === 'week' }"
        >
          Week
        </button>
      </div>
    </div>
    
    <div class="calendar-grid">
      <div v-for="day in weekDays" :key="day" class="weekday">
        {{ day }}
      </div>
      
      <div 
        v-for="(date, index) in calendarDays" 
        :key="index"
        :class="getDayClasses(date)"
        @click="selectDate(date)"
      >
        <span class="day-number">{{ date.getDate() }}</span>
        <div v-if="getEventsForDate(date).length > 0" class="day-events">
          <span 
            v-for="event in getEventsForDate(date).slice(0, 3)" 
            :key="event.id"
            class="event-dot"
            :class="event.type"
          ></span>
        </div>
      </div>
    </div>
    
    <div class="calendar-legend">
      <div class="legend-item">
        <span class="event-dot available"></span>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <span class="event-dot booked"></span>
        <span>Booked</span>
      </div>
      <div class="legend-item">
        <span class="event-dot blocked"></span>
        <span>Blocked</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.availability-calendar {
  background: white;
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  
  .nav-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-dark);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    
    &:hover {
      color: var(--color-accent);
    }
  }
  
  .month-year {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-text-dark);
  }
}

.calendar-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  
  .today-btn {
    padding: 6px 12px;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
    cursor: pointer;
    
    &:hover {
      background: var(--color-accent-dark);
    }
  }
  
  .view-toggle {
    display: flex;
    background: var(--color-background-alt);
    border-radius: var(--border-radius-sm);
    
    button {
      padding: 6px 12px;
      background: none;
      border: none;
      color: var(--color-text-light);
      font-size: 0.9rem;
      cursor: pointer;
      
      &.active {
        background: white;
        color: var(--color-text-dark);
        border-radius: var(--border-radius-sm);
      }
    }
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--color-text-lighter);
  border: 1px solid var(--color-text-lighter);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.weekday {
  background: var(--color-background-alt);
  padding: var(--spacing-sm);
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-dark);
}

.calendar-day {
  background: white;
  padding: var(--spacing-sm);
  min-height: 80px;
  position: relative;
  
  &.clickable {
    cursor: pointer;
    
    &:hover {
      background: var(--color-background-alt);
    }
  }
  
  &.other-month {
    .day-number {
      color: var(--color-text-lighter);
    }
  }
  
  &.today {
    background: rgba(183, 110, 121, 0.1);
    
    .day-number {
      font-weight: 600;
      color: var(--color-accent);
    }
  }
  
  &.selected {
    background: var(--color-accent);
    
    .day-number {
      color: white;
    }
  }
  
  &.has-booking {
    background: rgba(255, 193, 7, 0.1);
  }
  
  &.available {
    background: rgba(40, 167, 69, 0.1);
  }
  
  &.blocked {
    background: rgba(220, 53, 69, 0.1);
  }
  
  .day-number {
    font-size: 0.9rem;
    color: var(--color-text-dark);
  }
  
  .day-events {
    position: absolute;
    bottom: var(--spacing-xs);
    left: var(--spacing-xs);
    right: var(--spacing-xs);
    display: flex;
    gap: 2px;
    justify-content: center;
  }
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  
  &.available {
    background: #28a745;
  }
  
  &.booked {
    background: #ffc107;
  }
  
  &.blocked {
    background: #dc3545;
  }
}

.calendar-legend {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-text-lighter);
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    color: var(--color-text-light);
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 60px;
    padding: var(--spacing-xs);
    
    .day-number {
      font-size: 0.8rem;
    }
  }
  
  .calendar-legend {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
}
</style>