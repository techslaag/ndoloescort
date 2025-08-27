# Encrypted Data Persistence

This application uses encrypted persistence for sensitive data stored in Pinia stores. All persisted data is encrypted using AES-256 encryption before being stored in localStorage.

## Implementation

### Encryption Utility (`src/lib/encryption.ts`)

The encryption utility provides:

- **AES-256 Encryption**: All data is encrypted using CryptoJS AES-256 encryption
- **Secure Key Generation**: Encryption keys are generated using browser fingerprinting and a secret
- **Error Handling**: Robust error handling for encryption/decryption failures
- **Pinia Integration**: Custom storage adapter for seamless Pinia persistence integration

### Stores Using Encryption

1. **Location Store** (`src/stores/location.ts`)
   - Encrypts: `currentLocation`, `locationConfirmed`
   - Storage Key: `location-store`

2. **Auth Store** (`src/stores/auth.ts`)
   - Encrypts: `user` data
   - Storage Key: `auth-store`

## Security Features

### Key Generation
```typescript
const generateEncryptionKey = (): string => {
  const browserFingerprint = navigator.userAgent + navigator.language + screen.width + screen.height
  const secret = 'elite-companions-secret-key-2024'
  return CryptoJS.SHA256(browserFingerprint + secret).toString()
}
```

### Encryption Process
1. Data is serialized to JSON
2. JSON string is encrypted using AES-256
3. Encrypted data is stored in localStorage
4. On retrieval, data is decrypted and parsed back to original format

## Production Considerations

### Environment Variables
In production, replace the hardcoded secret with an environment variable:

```typescript
const secret = import.meta.env.VITE_ENCRYPTION_SECRET || 'fallback-secret'
```

### Key Management
- Store encryption secrets in environment variables
- Use different secrets for different environments
- Rotate secrets periodically
- Consider using a key management service for enterprise applications

### Additional Security Measures
- Implement key rotation mechanisms
- Add data integrity checks
- Consider using Web Crypto API for additional security
- Implement secure key derivation functions

## Usage

The encryption is transparent to the application code. Simply use Pinia stores as usual:

```typescript
// Data is automatically encrypted when persisted
const locationStore = useLocationStore()
locationStore.setLocationConfirmed(true)

// Data is automatically decrypted when retrieved
const isConfirmed = locationStore.locationConfirmed
```

## Migration from Unencrypted Data

If migrating from unencrypted localStorage data:

1. Clear existing localStorage data
2. Restart the application
3. New data will be automatically encrypted

## Troubleshooting

### Decryption Failures
If decryption fails, the data will be treated as null and re-initialized. This can happen if:
- The encryption key has changed
- The data was corrupted
- The data was stored with a different encryption method

### Performance
Encryption/decryption operations are performed synchronously and should not impact performance significantly for typical use cases.

## Dependencies

- `crypto-js`: AES encryption implementation
- `@types/crypto-js`: TypeScript definitions
- `pinia-plugin-persistedstate`: Pinia persistence plugin 