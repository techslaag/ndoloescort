# Appwrite Security Configuration Guide

This guide explains how to properly configure Appwrite for maximum security in the Elite Companions application.

## Appwrite Console Configuration

### 1. Authentication Settings

Navigate to **Auth → Settings** in your Appwrite Console:

#### Session Length
- Set appropriate session duration (recommended: 24 hours)
- Configure session limits per user

#### Auth Methods
- ✅ Email/Password (enabled)
- ❌ OAuth providers (disable unless needed)
- ❌ Anonymous Sessions (disable for production)
- ✅ Custom user IDs (if needed)

#### Security Settings
- **Password History**: Enable to prevent password reuse
- **Password Dictionary**: Enable to block common passwords
- **Personal Data Protection**: Enable to prevent using personal info in passwords

### 2. Database Security

#### Collections Permissions
For each collection, set appropriate permissions:

```javascript
// Example: profiles collection
Read: ["users"] // Only authenticated users
Create: ["users"] // Only authenticated users
Update: ["user:{userId}"] // Only owner can update
Delete: ["user:{userId}"] // Only owner can delete

// Example: messages collection  
Read: ["user:{userId}", "user:{recipientId}"] // Only participants
Create: ["users"] // Any authenticated user
Update: ["user:{userId}"] // Only sender can update
Delete: ["user:{userId}"] // Only sender can delete
```

#### Audit Collections
Create these collections for security tracking:

1. **login_attempts**
   - email (string, required)
   - ipAddress (string)
   - success (boolean)
   - attemptedAt (datetime)
   - Indexes: email, attemptedAt

2. **security_events**
   - userId (string, required)
   - eventType (string, required)
   - ipAddress (string)
   - description (string)
   - createdAt (datetime)
   - Indexes: userId, eventType, createdAt

3. **auth_sessions**
   - userId (string, required)
   - sessionToken (string)
   - deviceInfo (string)
   - isActive (boolean)
   - expiresAt (datetime)
   - Indexes: userId, isActive

### 3. API Security

#### Rate Limiting
In **Settings → Security**:
- API Rate Limit: 100 requests per minute
- Auth Rate Limit: 10 requests per minute
- Enable abuse protection

#### CORS Settings
In **Settings → Platforms**:
- Add your production domain
- Add localhost for development
- Avoid using wildcards (*)

### 4. Network Security

#### SSL/TLS
- Appwrite Cloud enforces HTTPS
- For self-hosted: Configure SSL certificates

#### IP Whitelisting (Optional)
For additional security:
- Whitelist your server IPs
- Enable for production environments

## Client-Side Security Integration

### 1. Secure Initialization

```typescript
// src/lib/appwrite.ts
import { Client, Account, Databases } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

// Never expose API keys in client-side code
// Use Appwrite's permission system instead
```

### 2. Authentication Flow

```typescript
// Secure login with attempt tracking
async enhancedLogin(email: string, password: string) {
  // Check login attempts before proceeding
  const attempts = await this.getRecentLoginAttempts(email)
  if (attempts >= 5) {
    throw new Error('Account temporarily locked')
  }
  
  try {
    // Use Appwrite's secure session creation
    const session = await account.createEmailPasswordSession(email, password)
    // Log successful attempt
    await this.logLoginAttempt(email, true)
    return session
  } catch (error) {
    // Log failed attempt
    await this.logLoginAttempt(email, false)
    throw error
  }
}
```

### 3. Session Management

```typescript
// Appwrite handles session tokens automatically
// Additional client-side monitoring:
- Monitor user activity
- Implement idle timeout
- Clear local data on logout
```

## Security Best Practices with Appwrite

### 1. Environment Variables
```bash
# .env.production
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
# Never commit these values
```

### 2. Permission Templates

```javascript
// User-owned data
Permission.read(Role.user(userId))
Permission.update(Role.user(userId))
Permission.delete(Role.user(userId))

// Public read, authenticated write
Permission.read(Role.any())
Permission.create(Role.users())

// Team-based access
Permission.read(Role.team(teamId))
Permission.update(Role.team(teamId, 'owner'))
```

### 3. Secure File Storage

In **Storage → Settings**:
- Enable virus scanning
- Set file size limits
- Configure allowed file types
- Use bucket-level permissions

### 4. Monitoring & Alerts

#### Enable Webhooks
Set up webhooks for security events:
- Failed login attempts
- Account deletions
- Permission changes

#### Audit Logs
Regular review:
- Check Appwrite logs
- Monitor custom security_events collection
- Review active sessions

## Production Checklist

### Appwrite Console
- [ ] Configure session length and limits
- [ ] Set up proper collection permissions
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain
- [ ] Disable unnecessary auth methods
- [ ] Enable password security features
- [ ] Set up webhooks for security events

### Application Code
- [ ] Use environment variables for configuration
- [ ] Implement login attempt tracking
- [ ] Add session monitoring
- [ ] Clear sensitive data on logout
- [ ] Validate all user inputs
- [ ] Use Appwrite permissions correctly

### Monitoring
- [ ] Set up alerts for suspicious activity
- [ ] Regular security audit reviews
- [ ] Monitor rate limit violations
- [ ] Track failed authentication attempts

## Troubleshooting

### Common Issues

1. **"User unauthorized" errors**
   - Check collection permissions
   - Verify user is authenticated
   - Check session expiration

2. **Rate limiting triggered**
   - Review API usage patterns
   - Implement client-side throttling
   - Consider increasing limits

3. **CORS errors**
   - Verify domain in platform settings
   - Check protocol (http vs https)
   - Clear browser cache

### Security Incident Response

1. **Suspicious Activity Detected**
   - Review security_events collection
   - Check login_attempts for patterns
   - Temporarily disable affected accounts

2. **Potential Breach**
   - Revoke all sessions via Appwrite Console
   - Force password resets
   - Review audit logs
   - Enable additional security measures

## Additional Resources

- [Appwrite Security Documentation](https://appwrite.io/docs/security)
- [Appwrite Permissions Guide](https://appwrite.io/docs/permissions)
- [Appwrite Best Practices](https://appwrite.io/docs/best-practices)