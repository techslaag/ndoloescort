// Security configuration
export const securityConfig = {
  // Session configuration
  session: {
    timeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'), // 24 hours default
    idleTimeout: parseInt(import.meta.env.VITE_SESSION_IDLE_TIMEOUT || '1800000'), // 30 minutes default
    checkInterval: 60000, // Check every minute
  },
  
  // Password policy
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // Days before password must be changed
    historySize: 5, // Number of previous passwords to remember
  },
  
  // Login security
  login: {
    maxAttempts: 5,
    lockoutDuration: 900000, // 15 minutes in milliseconds
    captchaAfterAttempts: 3,
  },
  
  // Rate limiting
  rateLimit: {
    api: {
      windowMs: 900000, // 15 minutes
      maxRequests: 100,
    },
    auth: {
      windowMs: 900000, // 15 minutes
      maxRequests: 10,
    },
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      import.meta.env.VITE_APP_URL || 'http://localhost:5173',
      'https://cloud.appwrite.io',
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Appwrite-Project'],
    credentials: true,
  },
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://cloud.appwrite.io', 'wss://cloud.appwrite.io', 'https://api.ipify.org'],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
  
  // Security headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  },
}

// Generate CSP header string
export function generateCSP(): string {
  const csp = securityConfig.csp
  const directives = []
  
  for (const [key, values] of Object.entries(csp)) {
    const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    directives.push(`${directiveName} ${values.join(' ')}`)
  }
  
  return directives.join('; ')
}

// Apply security headers to response
export function applySecurityHeaders(headers: Headers): void {
  // Apply CSP
  headers.set('Content-Security-Policy', generateCSP())
  
  // Apply other security headers
  for (const [key, value] of Object.entries(securityConfig.headers)) {
    headers.set(key, value)
  }
}