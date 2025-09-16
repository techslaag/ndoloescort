<template>
  <div class="test-city-dropdown">
    <h3>Test City Dropdown</h3>
    
    <div class="test-simple">
      <h4>1. Simple HTML Test</h4>
      <input 
        v-model="simpleCity" 
        @focus="showSimple = true"
        placeholder="Click to select city"
      />
      <div v-if="showSimple" class="dropdown">
        <div 
          v-for="city in simpleCities" 
          :key="city"
          @click="selectSimpleCity(city)"
          class="dropdown-item"
        >
          {{ city }}
        </div>
      </div>
      <p>Selected: {{ simpleCity }}</p>
    </div>

    <div class="test-complex">
      <h4>2. Complex Object Test</h4>
      <input 
        v-model="complexCityName" 
        @focus="showComplex = true"
        placeholder="Click to select city"
      />
      <div v-if="showComplex" class="dropdown">
        <div 
          v-for="city in complexCities" 
          :key="city.id"
          @click="selectComplexCity(city)"
          class="dropdown-item"
        >
          {{ city.name }}
        </div>
      </div>
      <p>Selected: {{ complexCity?.name }} (ID: {{ complexCity?.id }})</p>
    </div>

    <div class="test-actual">
      <h4>3. Actual LocationDropdowns</h4>
      <LocationDropdowns 
        v-model="location"
        :required="true"
      />
      <p>Location: {{ JSON.stringify(location, null, 2) }}</p>
    </div>

    <div class="logs">
      <h4>Console Logs</h4>
      <pre>{{ logs.join('\n') }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LocationDropdowns from '../forms/LocationDropdowns.vue'

const logs = ref<string[]>([])
const log = (msg: string) => {
  logs.value.push(`${new Date().toLocaleTimeString()}: ${msg}`)
  console.log(msg)
}

// Simple test
const simpleCity = ref('')
const showSimple = ref(false)
const simpleCities = ['Los Angeles', 'San Francisco', 'San Diego']

const selectSimpleCity = (city: string) => {
  log(`Simple city selected: ${city}`)
  simpleCity.value = city
  showSimple.value = false
}

// Complex test
const complexCity = ref<{ id: number; name: string } | null>(null)
const complexCityName = ref('')
const showComplex = ref(false)
const complexCities = [
  { id: 1, name: 'Los Angeles' },
  { id: 2, name: 'San Francisco' },
  { id: 3, name: 'San Diego' }
]

const selectComplexCity = (city: { id: number; name: string }) => {
  log(`Complex city selected: ${city.name} (${city.id})`)
  complexCity.value = city
  complexCityName.value = city.name
  showComplex.value = false
}

// Actual component test
const location = ref({
  country: '',
  state: '',
  city: ''
})

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (!target.closest('.test-simple')) {
    showSimple.value = false
  }
  if (!target.closest('.test-complex')) {
    showComplex.value = false
  }
})

log('Test component mounted')
</script>

<style scoped>
.test-city-dropdown {
  padding: 20px;
  max-width: 800px;
}

.test-simple, .test-complex, .test-actual {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  padding: 10px;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f0f0f0;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.logs {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 5px;
}

pre {
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}
</style>