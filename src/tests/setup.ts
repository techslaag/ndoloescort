import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock pinia-plugin-persistedstate
vi.mock('pinia-plugin-persistedstate', () => ({
  default: () => ({ install: vi.fn() }),
}))

// Mock Appwrite
vi.mock('../lib/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    getDocument: vi.fn(),
    listDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  },
  storage: {
    createFile: vi.fn(),
    getFileView: vi.fn(),
    deleteFile: vi.fn(),
  },
  ID: {
    unique: vi.fn(() => 'test-id-' + Math.random()),
  },
  DATABASE_ID: 'test-db',
  PROFILES_COLLECTION_ID: 'test-profiles',
  SERVICES_COLLECTION_ID: 'test-services',
  PRICING_COLLECTION_ID: 'test-pricing',
  MEDIA_COLLECTION_ID: 'test-media',
  CALENDAR_COLLECTION_ID: 'test-calendar',
  MEDIA_BUCKET_ID: 'test-bucket',
}))

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/',
  }),
  createRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    install: vi.fn(),
    isReady: vi.fn(() => Promise.resolve()),
  })),
  createWebHistory: vi.fn(),
}))

// Mock error handling utility
vi.mock('../utils/appwriteErrors', () => ({
  handleAppwriteError: (error: any, context: string) => {
    return error?.message || `Error in ${context}`
  }
}))