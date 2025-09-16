// Input sanitization utilities

export class Sanitizer {
  // HTML sanitization
  static sanitizeHTML(input: string): string {
    // Remove script tags and event handlers
    const cleaned = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
    
    // Encode HTML entities
    return this.encodeHTML(cleaned)
  }
  
  // Encode HTML entities
  static encodeHTML(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
    
    return str.replace(/[&<>"'/]/g, char => htmlEntities[char])
  }
  
  // SQL injection prevention (for search queries)
  static sanitizeSQL(input: string): string {
    // Remove or escape SQL meta-characters
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/union\s+select/gi, '')
  }
  
  // Email validation and sanitization
  static sanitizeEmail(email: string): string {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const trimmed = email.trim().toLowerCase()
    
    if (!emailRegex.test(trimmed)) {
      throw new Error('Invalid email format')
    }
    
    return trimmed
  }
  
  // Phone number sanitization
  static sanitizePhone(phone: string): string {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '')
  }
  
  // URL sanitization
  static sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url)
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }
      
      return parsed.toString()
    } catch (error) {
      throw new Error('Invalid URL')
    }
  }
  
  // File name sanitization
  static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts and special characters
    return fileName
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .trim()
  }
  
  // General text input sanitization
  static sanitizeText(text: string, maxLength?: number): string {
    let sanitized = text
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/\0/g, '') // Remove null bytes
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength)
    }
    
    return sanitized
  }
  
  // Password validation (not sanitization)
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // Sanitize search query
  static sanitizeSearchQuery(query: string): string {
    return this.sanitizeText(query, 100)
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
  }
  
  // Sanitize user input object
  static sanitizeUserInput(input: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeUserInput(value)
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
}