import { Client, Account, Databases, Storage, Locale, Functions, Query, ID } from 'appwrite'

// Appwrite configuration
const client = new Client()

client
  .setEndpoint('https://fra.cloud.appwrite.io/v1') // Your Appwrite Endpoint
  .setProject('68874aa60018d306519d') // Your project ID

// Database and collection IDs - Using timestamp-based naming convention
export const DATABASE_ID = '6890df67000788c3e8f6'

// Core Collections
export const PROFILES_COLLECTION_ID = '6890e0b10016147d8374'
export const SERVICES_COLLECTION_ID = '6890e836002fc0637705'
export const PRICING_COLLECTION_ID = '6890ee2f0021232ae5aa'
export const MEDIA_COLLECTION_ID = '6890eef100084978baf9'
export const CALENDAR_COLLECTION_ID = '6890efa30028bdec6a65'

// Messaging Collections
export const CONVERSATIONS_COLLECTION_ID = '68923bbe0011a743f62f'
export const MESSAGES_COLLECTION_ID = '68923bd300357a65ab1c'
export const CALLS_COLLECTION_ID = '68923bec000022af471a'
export const USER_PRESENCE_COLLECTION_ID = '68954419003584bae597'

// Auth & Security Collections
export const AUTH_SESSIONS_COLLECTION_ID = 'auth_sessions'
export const LOGIN_ATTEMPTS_COLLECTION_ID = 'login_attempts'
export const SECURITY_EVENTS_COLLECTION_ID = 'security_events'

// Notification Collections
export const NOTIFICATIONS_COLLECTION_ID = 'notifications'
export const NOTIFICATION_PREFS_COLLECTION_ID = 'notification_preferences'

// Payment & Revenue Collections
export const PAYMENTS_COLLECTION_ID = 'payments'
export const REVENUE_COLLECTION_ID = 'revenue'
export const PAYOUTS_COLLECTION_ID = 'payouts'

// Booking Collections
export const BOOKINGS_COLLECTION_ID = 'bookings'

// Review & Feedback Collections
export const REVIEWS_COLLECTION_ID = 'reviews'

// Search Collections
export const SAVED_SEARCHES_COLLECTION_ID = 'saved_searches_20250114'
export const SEARCH_HISTORY_COLLECTION_ID = 'search_history_20250114'

// Badge Collections
export const USER_BADGES_COLLECTION_ID = 'user_badges'
export const BADGE_PROGRESS_COLLECTION_ID = 'badge_progress'
export const BADGE_HISTORY_COLLECTION_ID = 'badge_history'

// Support Collections
export const SUPPORT_TICKETS_COLLECTION_ID = 'support_tickets_20250114'
export const SUPPORT_MESSAGES_COLLECTION_ID = 'support_messages_20250114'

// Rewards Collections
export const REWARDS_COLLECTION_ID = 'rewards_20250114'
export const REWARD_POINTS_COLLECTION_ID = 'reward_points_20250114'
export const REWARD_REDEMPTIONS_COLLECTION_ID = 'reward_redemptions_20250114'

// Storage Buckets
export const MEDIA_BUCKET_ID = '6890f0940035e7fa4e34'

// System User IDs
export const SUPPORT_USER_ID = 'support-system-user'

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export const locale = new Locale(client)
export const functions = new Functions(client)

export { client, Query, ID }