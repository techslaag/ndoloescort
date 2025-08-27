<script setup lang="ts">
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
</script>

<template>
  <div class="default-layout">
    <AppHeader />
    
    <main class="main-content">
      <slot />
    </main>
    
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 75px; // Account for fixed header
}
</style> 