import { useAuthStore } from '../stores/auth'

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  XAF: 'XAF ',
  XOF: 'XOF ',
  NGN: '₦',
  ZAR: 'R',
  KES: 'KSh',
  GHS: '₵',
  AUD: 'A$',
  NZD: 'NZ$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  AED: 'د.إ',
  SAR: 'ر.س'
}

// Currency decimal places
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0, // Japanese Yen doesn't use decimals
  XAF: 0, // CFA Franc BEAC
  XOF: 0, // CFA Franc BCEAO
  // Default for all others is 2
}

/**
 * Get the user's preferred currency from their settings
 * Falls back to USD if not set
 */
export function getUserCurrency(): string {
  const authStore = useAuthStore()
  const userPrefs = authStore.user?.prefs as any
  return userPrefs?.currency || 'USD'
}

/**
 * Format amount with currency
 * @param amount - The amount to format
 * @param currency - Override currency (optional, defaults to user preference)
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number, 
  currency?: string,
  options?: {
    showSymbol?: boolean
    showCode?: boolean
    compact?: boolean
  }
): string {
  const { showSymbol = true, showCode = false, compact = false } = options || {}
  
  // Use provided currency or user's preferred currency
  const currencyCode = currency || getUserCurrency()
  
  // Get decimal places for this currency
  const decimals = CURRENCY_DECIMALS[currencyCode] ?? 2
  
  // Format the number
  let formattedAmount: string
  
  if (compact && amount >= 1000) {
    // Compact formatting for large numbers
    const units = ['', 'K', 'M', 'B', 'T']
    let unitIndex = 0
    let value = amount
    
    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000
      unitIndex++
    }
    
    formattedAmount = value.toFixed(decimals) + units[unitIndex]
  } else {
    // Standard formatting with thousands separator
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount)
  }
  
  // Build the final string
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' '
  
  if (showSymbol && showCode) {
    return `${symbol}${formattedAmount} ${currencyCode}`
  } else if (showSymbol) {
    return `${symbol}${formattedAmount}`
  } else if (showCode) {
    return `${formattedAmount} ${currencyCode}`
  } else {
    return formattedAmount
  }
}

/**
 * Parse currency string to number
 * @param value - Currency string to parse
 * @returns Parsed number or 0 if invalid
 */
export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleanValue = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Convert amount between currencies (placeholder - needs real exchange rates)
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  // This is a placeholder - in a real app, you'd fetch current exchange rates
  // For now, return the same amount
  console.warn('Currency conversion not implemented - returning same amount')
  return amount
}

/**
 * Get currency symbol
 * @param currency - Currency code
 */
export function getCurrencySymbol(currency?: string): string {
  const currencyCode = currency || getUserCurrency()
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' '
}

/**
 * Get list of supported currencies
 */
export function getSupportedCurrencies() {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'XAF' },
    { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'XOF' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  ]
}