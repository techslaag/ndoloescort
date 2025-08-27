import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Home from '../views/Home.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/escorts',
    name: 'Escorts',
    component: () => import('../views/Escorts.vue')
  },
  {
    path: '/escorts/:id',
    name: 'EscortProfile',
    component: () => import('../views/EscortProfile.vue')
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('../views/Services.vue')
  },
  {
    path: '/locations',
    name: 'Locations',
    component: () => import('../views/Locations.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('../views/Contact.vue')
  },
  {
    path: '/faq',
    name: 'FAQ',
    component: () => import('../views/FAQ.vue')
  },
  {
    path: '/how-it-works',
    name: 'HowItWorks',
    component: () => import('../views/HowItWorks.vue')
  },
  {
    path: '/privacy',
    name: 'PrivacyPolicy',
    component: () => import('../views/PrivacyPolicy.vue')
  },
  {
    path: '/terms',
    name: 'TermsOfService',
    component: () => import('../views/TermsOfService.vue')
  },
  {
    path: '/safety',
    name: 'SafetyGuide',
    component: () => import('../views/SafetyGuide.vue')
  },
  {
    path: '/testimonials',
    name: 'Testimonials',
    component: () => import('../views/Testimonials.vue')
  },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('../views/Blog.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue')
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/auth/Signup.vue')
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPassword.vue')
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPassword.vue')
  },
  {
    path: '/booking/:id',
    name: 'Booking',
    component: () => import('../views/Booking.vue')
  },
  {
    path: '/client/dashboard',
    name: 'ClientDashboard',
    component: () => import('../views/client/Dashboard.vue'),
    meta: { requiresAuth: true, requiresClient: true }
  },
  {
    path: '/client/bookings',
    name: 'ClientBookings',
    component: () => import('../views/client/Bookings.vue'),
    meta: { requiresAuth: true, requiresClient: true }
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: () => import('../views/user/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('../views/Messages.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/notifications',
    name: 'NotificationSettings',
    component: () => import('../views/NotificationSettings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('../views/Subscription.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/escort/settings',
    name: 'EscortSettings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/dashboard',
    name: 'EscortDashboard',
    component: () => import('../views/escort/Dashboard.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles',
    name: 'EscortProfiles',
    component: () => import('../views/escort/Profiles.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/bookings',
    name: 'EscortBookings',
    component: () => import('../views/escort/Bookings.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles/create',
    name: 'CreateProfile',
    component: () => import('../views/escort/profiles/CreateProfile.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles/:id/edit',
    name: 'EditProfile',
    component: () => import('../views/escort/profiles/EditProfile.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles/:id/analytics',
    name: 'ProfileAnalytics',
    component: () => import('../views/escort/profiles/ProfileAnalytics.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles/:profileId/verification',
    name: 'ProfileVerification',
    component: () => import('../views/escort/ProfileVerification.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/profiles/:profileId/badges',
    name: 'ProfileBadges',
    component: () => import('../views/escort/ProfileBadges.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/escort/advertising',
    name: 'EscortAdvertising',
    component: () => import('../views/escort/Advertising.vue'),
    meta: { requiresAuth: true, requiresEscort: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard for auth-required routes
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Clear any existing errors when navigating
  authStore.clearError()
  
  // Wait for auth initialization if not already done
  if (authStore.user === null && !authStore.isLoading) {
    await authStore.init()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresEscort) {
    // Check if user is escort
    const userRole = authStore.user?.prefs ? (authStore.user.prefs as any).userType : null
    if (userRole !== 'escort') {
      next({ name: 'Home' })
    } else {
      next()
    }
  } else if (to.meta.requiresClient) {
    // Check if user is client
    const userRole = authStore.user?.prefs ? (authStore.user.prefs as any).userType : null
    if (userRole !== 'client') {
      next({ name: 'Home' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router