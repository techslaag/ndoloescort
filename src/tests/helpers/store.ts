import { createPinia } from 'pinia'
import { vi } from 'vitest'

export function createTestPinia() {
  const pinia = createPinia()
  
  // Override the persist plugin behavior for tests
  pinia.use(({ store }) => {
    // Allow setting all properties in tests
    const initialState = JSON.parse(JSON.stringify(store.$state))
    
    store.$reset = () => {
      store.$patch(initialState)
    }
    
    // Make all properties writable for tests
    const storePrototype = Object.getPrototypeOf(store)
    Object.keys(storePrototype).forEach(key => {
      if (typeof storePrototype[key] !== 'function') {
        Object.defineProperty(store, key, {
          get() {
            return this.$state[key]
          },
          set(value) {
            this.$state[key] = value
          },
          configurable: true,
          enumerable: true
        })
      }
    })
  })
  
  return pinia
}