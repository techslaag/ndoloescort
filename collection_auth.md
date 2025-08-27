# Authentication Collections Schema

This document outlines the authentication and security-related collections used in the Elite Companions application. The authentication system includes enhanced security features like session tracking, login attempt monitoring, two-factor authentication, and comprehensive security auditing.

## Overview

The authentication system consists of several collections that work together to provide secure user management:

- **auth_sessions**: Active user session tracking
- **login_attempts**: Login attempt monitoring and rate limiting
- **security_events**: Security event logging and audit trail
- **notification_preferences**: User notification preferences (auth-related)

## Collection Schemas

### 1. Auth Sessions Collection

**Collection ID:** `auth_sessions`

Tracks active user sessions with device information and security metadata.

```json
{
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Reference to the authenticated user"
  },
  "deviceInfo": {
    "type": "string",
    "size": 1000,
    "required": true,
    "array": false,
    "description": "JSON string containing device information (type, os, browser)"
  },
  "ipAddress": {
    "type": "string",
    "size": 45,
    "required": true,
    "array": false,
    "description": "Client IP address (supports IPv4 and IPv6)"
  },
  "location": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "JSON string with location data (country, city)"
  },
  "isActive": {
    "type": "boolean",
    "required": true,
    "array": false,
    "default": true,
    "description": "Whether the session is currently active"
  },
  "lastActivityAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Timestamp of last activity in this session"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Session creation timestamp"
  },
  "expiresAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Session expiration timestamp"
  },
  "sessionToken": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Encrypted session token"
  },
  "userAgent": {
    "type": "string",
    "size": 1000,
    "required": true,
    "array": false,
    "description": "Full user agent string"
  }
}
```

**Indexes:**
- `userId` (ascending)
- `isActive` (ascending)
- `expiresAt` (ascending)
- `lastActivityAt` (descending)

**Permissions:**
- Create: Users
- Read: Users (own sessions only)
- Update: Users (own sessions only)
- Delete: Users (own sessions only)

### 2. Login Attempts Collection

**Collection ID:** `login_attempts`

Monitors and logs all login attempts for security analysis and rate limiting.

```json
{
  "email": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Email address used in login attempt"
  },
  "ipAddress": {
    "type": "string",
    "size": 45,
    "required": true,
    "array": false,
    "description": "Client IP address"
  },
  "userAgent": {
    "type": "string",
    "size": 1000,
    "required": true,
    "array": false,
    "description": "Client user agent string"
  },
  "success": {
    "type": "boolean",
    "required": true,
    "array": false,
    "description": "Whether the login attempt was successful"
  },
  "failureReason": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Reason for failure (invalid credentials, account locked, etc.)"
  },
  "attemptedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "When the login attempt occurred"
  },
  "location": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "JSON string with geolocation data"
  },
  "deviceFingerprint": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Hashed device fingerprint for tracking"
  },
  "twoFactorUsed": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": false,
    "description": "Whether 2FA was used in this attempt"
  }
}
```

**Indexes:**
- `email` (ascending)
- `success` (ascending)
- `attemptedAt` (descending)
- `ipAddress` (ascending)

**Permissions:**
- Create: System only
- Read: System only
- Update: None
- Delete: System only (automated cleanup)

### 3. Security Events Collection

**Collection ID:** `security_events`

Comprehensive logging of security-related events for audit and monitoring.

```json
{
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "User ID associated with the event"
  },
  "eventType": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Event type: login, logout, password_change, email_change, failed_login, account_locked, suspicious_activity"
  },
  "description": {
    "type": "string",
    "size": 500,
    "required": true,
    "array": false,
    "description": "Human-readable description of the security event"
  },
  "ipAddress": {
    "type": "string",
    "size": 45,
    "required": true,
    "array": false,
    "description": "Client IP address"
  },
  "userAgent": {
    "type": "string",
    "size": 1000,
    "required": true,
    "array": false,
    "description": "Client user agent string"
  },
  "location": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "JSON string with geolocation data"
  },
  "metadata": {
    "type": "string",
    "size": 2000,
    "required": false,
    "array": false,
    "description": "Additional event-specific data as JSON string"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "When the event occurred"
  },
  "severity": {
    "type": "string",
    "size": 20,
    "required": false,
    "array": false,
    "default": "info",
    "description": "Event severity: info, warning, error, critical"
  },
  "sessionId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Associated session ID if applicable"
  },
  "riskScore": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 100,
    "description": "Risk score for the event (0-100)"
  }
}
```

**Indexes:**
- `userId` (ascending)
- `eventType` (ascending)
- `createdAt` (descending)
- `severity` (ascending)
- `riskScore` (descending)

**Permissions:**
- Create: System only
- Read: Users (own events only), Admins (all events)
- Update: None
- Delete: System only (automated archival)

### 4. Notification Preferences Collection (Auth-related)

**Collection ID:** `notification_preferences`

User preferences for authentication and security notifications.

```json
{
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "User ID"
  },
  "emailNotifications": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "Enable email notifications"
  },
  "smsNotifications": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": false,
    "description": "Enable SMS notifications"
  },
  "pushNotifications": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "Enable push notifications"
  },
  "securityAlerts": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "Security-related notifications"
  },
  "loginAlerts": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "New login notifications"
  },
  "passwordChangeAlerts": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "Password change notifications"
  },
  "suspiciousActivityAlerts": {
    "type": "boolean",
    "required": false,
    "array": false,
    "default": true,
    "description": "Suspicious activity notifications"
  },
  "detailedSettings": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "JSON string with detailed notification preferences"
  },
  "quietHoursStart": {
    "type": "string",
    "size": 10,
    "required": false,
    "array": false,
    "description": "Quiet hours start time (HH:MM format)"
  },
  "quietHoursEnd": {
    "type": "string",
    "size": 10,
    "required": false,
    "array": false,
    "description": "Quiet hours end time (HH:MM format)"
  },
  "updatedAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Last update timestamp"
  }
}
```

**Indexes:**
- `userId` (ascending, unique)

**Permissions:**
- Create: Users
- Read: Users (own preferences only)
- Update: Users (own preferences only)
- Delete: Users (own preferences only)

## Authentication Flow

### 1. User Registration

1. **Signup Process:**
   - User provides email, password, name, and user type
   - Password strength validation using `authEnhancementService.validatePasswordStrength()`
   - Account creation via Appwrite `account.create()`
   - Automatic login after successful registration
   - User preferences initialization with user type
   - Welcome message creation through `WelcomeMessageService`

2. **Security Features:**
   - Password strength requirements (minimum 8 characters, complexity checks)
   - Email verification (optional)
   - User type assignment (client/escort)

### 2. User Login

1. **Enhanced Login Process:**
   - Account lockout check based on failed attempts
   - Rate limiting (5 attempts, 15-minute lockout)
   - IP and device information collection
   - Session creation with expiration
   - Security event logging
   - Suspicious activity detection

2. **Two-Factor Authentication:**
   - TOTP (Time-based One-Time Password) support
   - Backup codes generation
   - QR code generation for authenticator apps
   - Encrypted storage of 2FA secrets

3. **Anonymous Login:**
   - Anonymous session creation for browsing
   - Limited access to certain features
   - Automatic conversion to registered account option

### 3. Session Management

1. **Session Tracking:**
   - Device information parsing (type, OS, browser)
   - IP address logging
   - Session expiration handling
   - Multiple device support

2. **Security Monitoring:**
   - New device detection
   - Geolocation tracking
   - Unusual activity patterns
   - Automated security alerts

### 4. Password Management

1. **Password Changes:**
   - Current password verification
   - Strength validation
   - Security event logging
   - Notification to user

2. **Password Reset:**
   - Email-based recovery
   - Privacy-preserving (no email enumeration)
   - Secure token generation
   - Expiration handling

## Security Features

### Enhanced Security Service

The `authEnhancementService` provides:

1. **Login Protection:**
   - Brute force protection
   - Account lockout mechanisms
   - IP-based rate limiting
   - Device fingerprinting

2. **Session Security:**
   - Secure session tokens
   - Automatic session cleanup
   - Multi-device management
   - Session hijacking protection

3. **Two-Factor Authentication:**
   - TOTP implementation
   - Backup code system
   - Recovery mechanisms
   - Secure key storage

4. **Audit & Monitoring:**
   - Comprehensive event logging
   - Security audit reports
   - Risk scoring
   - Anomaly detection

### Data Encryption

- **Storage Encryption:** Uses `encryptedStorageAdapter` for sensitive data
- **2FA Secrets:** Encrypted before storage in user preferences
- **Session Data:** Secure token generation and validation
- **Password Handling:** Appwrite's built-in secure password hashing

## Setup Instructions

### 1. Create Collections

```bash
# Create auth_sessions collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "auth_sessions" \
  --name "Auth Sessions"

# Create login_attempts collection  
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "login_attempts" \
  --name "Login Attempts"

# Create security_events collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "security_events" \
  --name "Security Events"

# notification_preferences collection already exists
```

### 2. Configure Permissions

Set appropriate permissions for each collection based on the schemas above.

### 3. Create Indexes

Create the recommended indexes for optimal query performance.

### 4. Environment Variables

```env
# Authentication Configuration
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=68874aa60018d306519d
VITE_DATABASE_ID=6890df67000788c3e8f6

# Security Configuration
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_LOCKOUT_DURATION=900000  # 15 minutes in milliseconds
VITE_SESSION_TIMEOUT=86400000 # 24 hours in milliseconds
```

## Usage Examples

### Authentication Store

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Sign up new user
await authStore.signup('user@example.com', 'password', 'John Doe', 'client')

// Sign in with enhanced security
await authStore.signin('user@example.com', 'password', true)

// Setup 2FA
const result = await authStore.setup2FA()
console.log(result.qrCode) // Show QR code to user

// Get security audit
const audit = await authStore.getSecurityAudit()
console.log(audit.recentLogins)
```

### Security Service

```typescript
import { authEnhancementService } from '@/services/authEnhancementService'

// Validate password strength
const validation = authEnhancementService.validatePasswordStrength('mypassword')
console.log(validation.score) // 0-7 score
console.log(validation.feedback) // Array of improvement suggestions

// Enhanced login
const result = await authEnhancementService.enhancedLogin(
  'user@example.com', 
  'password', 
  true
)

if (result.success) {
  console.log('Login successful')
  if (result.securityWarnings?.length) {
    console.log('Security warnings:', result.securityWarnings)
  }
}
```

## Best Practices

1. **Password Security:**
   - Enforce strong password requirements
   - Regular password rotation reminders
   - Monitor for compromised passwords

2. **Session Management:**
   - Implement proper session timeouts
   - Clean up expired sessions
   - Monitor for session anomalies

3. **Monitoring:**
   - Regular security audit reviews
   - Alert on suspicious activities
   - Track failed login patterns

4. **Privacy:**
   - Sanitize error messages
   - Prevent user enumeration
   - Secure logging practices

5. **Compliance:**
   - Data retention policies
   - User consent management
   - GDPR/privacy compliance