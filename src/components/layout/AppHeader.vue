<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLocationStore } from '../../stores/location'
import { useLogout } from '../../composables/useLogout'
import LocationModal from '../LocationModal.vue'
import NotificationBell from '../notifications/NotificationBell.vue'
import { useNotificationStore } from '../../stores/notification'

const router = useRouter()
const authStore = useAuthStore()
const locationStore = useLocationStore()
const notificationStore = useNotificationStore()
const { performLogout } = useLogout()

const isMenuOpen = ref(false)
const isScrolled = ref(false)
const isLoggingOut = ref(false)
const isUserDropdownOpen = ref(false)
const isLocationModalOpen = ref(false)
const locationModalRef = ref()

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  // Prevent body scroll when menu is open
  if (isMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMenu = () => {
  isMenuOpen.value = false
  document.body.style.overflow = ''
}

const toggleUserDropdown = () => {
  isUserDropdownOpen.value = !isUserDropdownOpen.value
}

const closeUserDropdown = () => {
  isUserDropdownOpen.value = false
}

const navigateTo = (path: string) => {
  router.push(path)
  closeMenu()
  closeUserDropdown()
}

const openLocationModal = () => {
  if (locationModalRef.value) {
    locationModalRef.value.openModal()
  }
}

const closeLocationModal = () => {
  isLocationModalOpen.value = false
  document.body.style.overflow = ''
}

const handleLogout = async () => {
  if (isLoggingOut.value) return
  
  isLoggingOut.value = true
  closeMenu()
  
  try {
    await performLogout({
      redirectTo: '/',
      showMessage: true,
      reason: 'user_action'
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    isLoggingOut.value = false
  }
}

const handleScroll = () => {
  if (window.scrollY > 50) {
    isScrolled.value = true
  } else {
    isScrolled.value = false
  }
}

// User role computed properties
const userRole = computed(() => {
  if (authStore.user && authStore.user.prefs) {
    return (authStore.user.prefs as any).userType
  }
  return null
})

const isEscort = computed(() => userRole.value === 'escort')
const isClient = computed(() => userRole.value === 'client')

// Handle touch events for better mobile experience
const handleTouchStart = (event: TouchEvent) => {
  // Close menu when touching outside
  if (isMenuOpen.value && event.target) {
    const target = event.target as Element
    if (!target.closest('.main-nav') && !target.closest('.menu-toggle')) {
      closeMenu()
    }
  }
  // Close user dropdown when touching outside
  if (isUserDropdownOpen.value && event.target) {
    const target = event.target as Element
    if (!target.closest('.user-dropdown-container')) {
      closeUserDropdown()
    }
  }
  // Close location modal when touching outside
  if (isLocationModalOpen.value && event.target) {
    const target = event.target as Element
    if (!target.closest('.location-modal') && !target.closest('.mobile-location-button')) {
      closeLocationModal()
    }
  }
}

// Handle click events for closing dropdowns
const handleClickOutside = (event: MouseEvent) => {
  if (isUserDropdownOpen.value && event.target) {
    const target = event.target as Element
    if (!target.closest('.user-dropdown-container')) {
      closeUserDropdown()
    }
  }
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('touchstart', handleTouchStart)
  document.addEventListener('click', handleClickOutside)
  
  // Initialize notifications if authenticated
  if (authStore.isAuthenticated) {
    await notificationStore.initialize()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('click', handleClickOutside)
  // Clean up body overflow
  document.body.style.overflow = ''
  // Clean up modal state
  isLocationModalOpen.value = false
})
</script>

<template>
  <header :class="['site-header', { 'scrolled': isScrolled }]">
    <div class="container header-container">
      <div class="logo-container" @click="navigateTo('/')">
        <h1 class="logo">
          <span class="logo-text">Ndolo</span>
          <span class="logo-accent">Escorts</span>
        </h1>
      </div>
      
      <button 
        :class="['menu-toggle', { 'active': isMenuOpen }]" 
        @click="toggleMenu" 
        aria-label="Toggle menu"
        :aria-expanded="isMenuOpen"
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
      
      <nav :class="['main-nav', { 'active': isMenuOpen }]">
        <div class="nav-header">
          <h2 class="nav-title">Menu</h2><button 
        :class="['menu-toggle', { 'active': isMenuOpen }]" 
        @click="toggleMenu" 
        aria-label="Toggle menu"
        :aria-expanded="isMenuOpen"
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
        </div>
        
        <ul class="nav-list">
          <li v-if="!isEscort"><a @click="navigateTo('/')" class="nav-link">Home</a></li>
          <li v-if="!isEscort"><a @click="navigateTo('/escorts')" class="nav-link">Escorts</a></li>
          <li v-if="!isEscort"><a @click="navigateTo('/services')" class="nav-link">Services</a></li>
          <li v-if="!isEscort"><a @click="navigateTo('/locations')" class="nav-link">Locations</a></li>
          <!-- <li v-if="isEscort"><a @click="navigateTo('/escort/dashboard')" class="nav-link">Dashboard</a></li> -->
          <!-- <li v-if="isEscort"><a @click="navigateTo('/escort/profiles')" class="nav-link">My Profiles</a></li> -->
        </ul>
        <div class="mobile-location">
          <div class="location-selector" @click="openLocationModal">
            <span class="location-icon">📍</span>
            <span class="location-text">
              {{ locationStore.currentLocation ? `${locationStore.currentLocation.flag} ${locationStore.currentLocation.name}` : 'Select Location' }}
            </span>
            <span class="location-arrow">▼</span>
          </div>
        </div>
        
        <div class="nav-buttons">
          <template v-if="authStore.isAuthenticated">
            <NotificationBell />
            
            <!-- User Dropdown -->
            <div class="user-dropdown-container">
              <button @click="toggleUserDropdown" class="user-dropdown-trigger">
                <div class="user-avatar">
                  {{ authStore.user?.name ? authStore.user.name.charAt(0).toUpperCase() : 'U' }}
                </div>
                <span class="user-name">{{ authStore.user?.name || 'User' }}</span>
                <svg class="dropdown-arrow" :class="{ 'rotated': isUserDropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              
              <div v-if="isUserDropdownOpen" class="user-dropdown-menu">
                <div class="dropdown-header">
                  <div class="user-info">
                    <span class="user-name-full">{{ authStore.user?.name || 'User' }}</span>
                    <span class="user-email">{{ authStore.user?.email || '' }}</span>
                    <span class="user-role">{{ isEscort ? 'Escort' : 'Client' }}</span>
                  </div>
                </div>
                
                <div class="dropdown-divider"></div>
                
                <a v-if="isEscort" @click="navigateTo('/escort/dashboard')" class="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2.5a.5.5 0 01.5-.5h9a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-1zm0 4a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5z"/>
                  </svg>
                  Dashboard
                </a>
                
                <a @click="navigateTo(isEscort ? '/escort/profiles' : '/profile')" class="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                  </svg>
                  {{ isEscort ? 'My Profiles' : 'Profile' }}
                </a>
                
                <a @click="navigateTo('/settings')" class="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.068.727c.243-.97 1.62-.97 1.864 0l.071.286a.96.96 0 001.622.434l.205-.211c.695-.719 1.888-.03 1.613.931l-.08.284a.96.96 0 001.187 1.187l.283-.081c.96-.275 1.65.918.931 1.613l-.211.205a.96.96 0 00.434 1.622l.286.071c.97.243.97 1.62 0 1.864l-.286.071a.96.96 0 00-.434 1.622l.211.205c.719.695.03 1.888-.931 1.613l-.284-.08a.96.96 0 00-1.187 1.187l.081.283c.275.96-.918 1.65-1.613.931l-.205-.211a.96.96 0 00-1.622.434l-.071.286c-.243.97-1.62.97-1.864 0l-.071-.286a.96.96 0 00-1.622-.434l-.205.211c-.695.719-1.888.03-1.613-.931l.08-.284a.96.96 0 00-1.186-1.187l-.284.081c-.96.275-1.65-.918-.931-1.613l.211-.205a.96.96 0 00-.434-1.622l-.286-.071c-.97-.243-.97-1.62 0-1.864l.286-.071a.96.96 0 00.434-1.622l-.211-.205c-.719-.695-.03-1.888.931-1.613l.284.08a.96.96 0 001.187-1.187l-.081-.283c-.275-.96.918-1.65 1.613-.931l.205.211a.96.96 0 001.622-.434l.071-.286zM8 11a3 3 0 110-6 3 3 0 010 6z"/>
                  </svg>
                  Settings
                </a>
                
                <a @click="navigateTo('/messages')" class="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.678 11.894a1 1 0 01.287.801 10.97 10.97 0 01-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 01.71-.074A8.06 8.06 0 008 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 01-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 00.244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 01-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                  </svg>
                  Messages
                </a>
                
                <div class="dropdown-divider"></div>
                
                <a @click="handleLogout" class="dropdown-item logout" :class="{ 'disabled': isLoggingOut }">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 12.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h8a.5.5 0 01.5.5v2a.5.5 0 001 0v-2A1.5 1.5 0 009.5 2h-8A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h8a1.5 1.5 0 001.5-1.5v-2a.5.5 0 00-1 0v2z"/>
                    <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 000-.708l-3-3a.5.5 0 00-.708.708L14.293 7.5H5.5a.5.5 0 000 1h8.793l-2.147 2.146a.5.5 0 00.708.708l3-3z"/>
                  </svg>
                  {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
                </a>
              </div>
            </div>
          </template>
          <template v-else>
            <button @click="navigateTo('/login')" class="btn btn-outline">Login</button>
            <button @click="navigateTo('/signup')" class="btn btn-primary">Sign Up</button>
          </template>
        </div>
      </nav>
      
      <!-- Overlay for mobile menu -->
      <div 
        v-if="isMenuOpen" 
        class="menu-overlay" 
        @click="closeMenu"
        @touchstart="closeMenu"
      ></div>

      
      <!-- LocationModal component -->
      <LocationModal ref="locationModalRef" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  padding: 1rem 0;
  transition: all 0.3s ease;
  background-color: rgba(18, 0, 36, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  &.scrolled {
    background-color: var(--color-background-dark);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 0.75rem 0;
  }
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.logo-container {
  cursor: pointer;
  z-index: 120;
}

.logo {
  margin-bottom: 0;
  font-size: 1.5rem;
  color: white;
  
  .logo-accent {
    color: var(--color-accent);
    margin-left: 0.25rem;
  }
}

// Location Selector Styles
.location-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .location-icon {
    font-size: 1.1rem;
  }
  
  .location-text {
    color: white;
    font-weight: 500;
    font-size: 0.95rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .location-arrow {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    margin-left: 0.25rem;
  }
}

// Desktop location selector - only visible on desktop
.desktop-location-selector {
  margin-left: auto;
  margin-right: 2rem;
  
  @media (max-width: 992px) {
    display: none;
  }
}

.main-nav {
  display: flex;
  align-items: center;
  z-index: 999 !important;
}

.nav-header{
    display: none;
}

.mobile-location {
    margin-right: 2rem;
}

.nav-list {
  display: flex;
  list-style: none;
  margin-right: 2rem;
}

.nav-link {
  color: white;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background-color: var(--color-accent);
    transition: width 0.3s ease;
  }
  
  &:hover {
    color: var(--color-accent);
    
    &::after {
      width: 70%;
    }
  }
}

.nav-buttons {
  display: flex;
  gap: 0.75rem;
  
  .btn {
    padding: 0.5rem 1.25rem;
  }
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  position: relative;
  z-index: 120;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &:active {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .bar {
    display: block;
    width: 24px;
    height: 2px;
    background-color: white;
    margin: 5px auto;
    border-radius: 2px;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform-origin: center;
  }
  
  &.active {
    .bar:nth-child(1) {
      transform: rotate(45deg) translate(6px, 6px);
    }
    
    .bar:nth-child(2) {
      opacity: 0;
      transform: scale(0);
    }
    
    .bar:nth-child(3) {
      transform: rotate(-45deg) translate(6px, -6px);
    }
  }
}

// User Dropdown Styles
.user-dropdown-container {
  position: relative;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-lg);
  padding: 0.375rem 0.75rem;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: white;
  }
  
  .user-name {
    font-weight: 500;
    font-size: 0.95rem;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    @media (max-width: 480px) {
      display: none;
    }
  }
  
  .dropdown-arrow {
    transition: transform 0.3s ease;
    
    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 240px;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: dropdownFadeIn 0.2s ease;
  z-index: 1000;
  
  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .dropdown-header {
    padding: 1rem;
    background: var(--color-background-alt);
    border-bottom: 1px solid var(--color-text-lighter);
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    .user-name-full {
      font-weight: 600;
      color: var(--color-text-dark);
      font-size: 1rem;
    }
    
    .user-email {
      font-size: 0.85rem;
      color: var(--color-text-light);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .user-role {
      font-size: 0.75rem;
      color: var(--color-accent);
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 0.25rem;
    }
  }
  
  .dropdown-divider {
    height: 1px;
    background: var(--color-text-lighter);
    margin: 0;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: var(--color-text-dark);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-background-alt);
      color: var(--color-accent);
      
      svg {
        color: var(--color-accent);
      }
    }
    
    &.logout {
      color: #dc3545;
      
      &:hover {
        background: #fef5f5;
        color: #dc3545;
      }
    }
    
    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      
      &:hover {
        background: transparent;
      }
    }
    
    svg {
      width: 18px;
      height: 18px;
      color: var(--color-text-light);
      transition: color 0.2s ease;
    }
  }
}

// Mobile location button styles
.mobile-location-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--color-accent);
  }
  
  &:active {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .location-icon {
    font-size: 1.2rem;
  }
  
  svg {
    margin-left: auto;
  }
}

// Location modal styles
.location-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.location-modal {
  background: var(--color-background-dark);
  border-radius: var(--border-radius-lg);
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: white;
  }
}

.modal-close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
}

.modal-content {
  padding: 1rem;
  
  // Override LocationSelector styles for modal
  :deep(.location-selector) {
    width: 100%;
    
    .location-button {
      width: 100%;
      background: var(--color-background);
      border-color: var(--color-text-lighter);
      
      &:hover {
        background: var(--color-background-alt);
      }
    }
    
    .location-dropdown {
      position: static;
      margin-top: 1rem;
      box-shadow: none;
      border: 1px solid var(--color-text-lighter);
      animation: none;
    }
    
    .dropdown-overlay {
      display: none;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Mobile styles
@media (max-width: 992px) {
  .mobile-location {
    display: block;
    margin-right: 0rem;
  }
  
  // Mobile user dropdown styles
  .user-dropdown-container {
    width: 100%;
    
    .user-dropdown-trigger {
      width: 100%;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      
      .user-name {
        display: block;
        flex: 1;
        text-align: left;
      }
    }
    
    .user-dropdown-menu {
      position: static;
      width: 100%;
      box-shadow: none;
      border-radius: 0;
      background: transparent;
      
      .dropdown-header {
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        
        .user-info {
          .user-name-full,
          .user-email,
          .user-role {
            color: white;
          }
          
          .user-email {
            opacity: 0.8;
          }
          
          .user-role {
            color: var(--color-accent);
          }
        }
      }
      
      .dropdown-divider {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .dropdown-item {
        color: white;
        padding: 1rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-accent);
        }
        
        &.logout {
          color: #ff6b6b;
          
          &:hover {
            background: rgba(255, 107, 107, 0.1);
          }
        }
        
        svg {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }
  
  .menu-toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .main-nav {
    position: fixed;
    top: 0;
    right: -100%;
    width: 85%;
    max-width: 350px;
    height: 100vh;
    background: linear-gradient(135deg, var(--color-background-dark) 0%, rgba(18, 0, 36, 0.95) 100%);
    flex-direction: column;
    justify-content: flex-start;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    z-index: 110;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.3);
    
    &.active {
      right: 0;
    }
  }
  
  .nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
  }
  
  .mobile-location {
    padding: 1rem 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
  }
  
  .nav-title {
    color: white;
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
  }
  
  .close-icon {
    line-height: 1;
    font-weight: 300;
  }
  
  .nav-list {
    flex-direction: column;
    align-items: stretch;
    margin: 0;
    padding: 2rem 0;
    width: 100%;
  }
  
  .nav-link {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    display: block;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--color-accent);
      
      &::after {
        width: 0;
      }
    }
    
    &:active {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
  
  .nav-buttons {
    flex-direction: column;
    width: 100%;
    padding: 0 2rem 2rem;
    gap: 1rem;
    
    .btn {
      width: 100%;
      padding: 1rem;
      font-size: 1rem;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s ease;
      
      &:active {
        transform: scale(0.98);
      }
    }
  }
  
  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 105;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
}

// iPhone specific optimizations
@media (max-width: 992px) and (-webkit-min-device-pixel-ratio: 2) {
  .menu-toggle {
    .bar {
      height: 1.5px;
    }
  }
  
  .nav-link {
    -webkit-tap-highlight-color: transparent;
  }
  
  .btn {
    -webkit-tap-highlight-color: transparent;
  }
}

// Android specific optimizations
@media (max-width: 992px) and (hover: none) and (pointer: coarse) {
  .nav-link {
    min-height: 48px;
    display: flex;
    align-items: center;
  }
  
  .btn {
    min-height: 48px;
  }
  
  .menu-toggle {
    min-width: 48px;
    min-height: 48px;
  }
}


// Landscape orientation adjustments
@media (max-width: 992px) and (orientation: landscape) {
  .main-nav {
    .nav-list {
      padding: 1rem 0;
    }
    
    .nav-buttons {
      padding: 0 2rem 1rem;
    }
  }
}
</style>