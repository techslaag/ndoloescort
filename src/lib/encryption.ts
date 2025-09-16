import CryptoJS from 'crypto-js'

// Generate a secure encryption key
// SECURITY WARNING: This key should be stored in environment variables
const generateEncryptionKey = (): string => {
  // Check for environment variable first
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY
  if (envKey) {
    return envKey
  }
  
  // Fallback to generated key (not recommended for production)
  console.warn('SECURITY WARNING: Using generated encryption key. Set VITE_ENCRYPTION_KEY in your environment variables.')
  const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height
  const secret = 'ndolo-escorts-secret-key-2024' // TODO: Remove this hardcoded value
  return CryptoJS.SHA256(browserFingerprint + secret).toString()
}

const ENCRYPTION_KEY = generateEncryptionKey()

export class EncryptedStorage {
  private key: string

  constructor(key: string = ENCRYPTION_KEY) {
    this.key = key
  }

  // Encrypt data
  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.key).toString()
      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      return ''
    }
  }

  // Decrypt data
  decrypt(encryptedData: string): any {
    try {
      if (!encryptedData) return null
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.key)
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8)
      
      if (!decryptedString) return null
      
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  // Set encrypted item in localStorage
  setItem(key: string, value: any): void {
    try {
      const encryptedValue = this.encrypt(value)
      if (encryptedValue) {
        localStorage.setItem(key, encryptedValue)
      }
    } catch (error) {
      console.error('Failed to set encrypted item:', error)
    }
  }

  // Get decrypted item from localStorage
  getItem(key: string): any {
    try {
      const encryptedValue = localStorage.getItem(key)
      if (encryptedValue === null) {
        return null
      }
      return this.decrypt(encryptedValue)
    } catch (error) {
      console.error('Failed to get encrypted item:', error)
      return null
    }
  }

  // Remove item from localStorage
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  // Clear all encrypted items
  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }
}

// Create a singleton instance
export const encryptedStorage = new EncryptedStorage()

// Custom storage adapter for Pinia persistence
export const encryptedStorageAdapter = {
  getItem(key: string) {
    return encryptedStorage.getItem(key)
  },
  setItem(key: string, value: any) {
    encryptedStorage.setItem(key, value)
  },
  removeItem(key: string) {
    encryptedStorage.removeItem(key)
  },
  clear() {
    encryptedStorage.clear()
  }
} 