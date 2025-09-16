import { account } from '../lib/appwrite'
import { AuthenticationFactor } from 'appwrite'

export class Test2FA {
  static async runFullTest() {
    console.log('=== Starting 2FA Test Suite ===\n')
    
    try {
      // Test 1: Check current user and MFA status
      console.log('Test 1: Checking current user and MFA status...')
      const user = await account.get()
      console.log('✓ Current user:', user.email)
      console.log('✓ MFA enabled on account:', user.mfa)
      
      // Test 2: List current MFA factors
      console.log('\nTest 2: Listing MFA factors...')
      const factors = await account.listMfaFactors()
      console.log('✓ Current MFA factors:', JSON.stringify(factors, null, 2))
      
      // Test 3: Enable MFA if not already enabled
      if (!user.mfa) {
        console.log('\nTest 3: Enabling MFA for user account...')
        try {
          await account.updateMFA(true)
          console.log('✓ MFA enabled successfully')
        } catch (error: any) {
          console.error('✗ Failed to enable MFA:', error.message)
          if (error.message.includes('mfa_not_enabled')) {
            console.log('\n⚠️  MFA is not enabled for this Appwrite project!')
            console.log('Please enable MFA in your Appwrite Console:')
            console.log('1. Go to Auth → Security')
            console.log('2. Enable Multi-factor authentication')
            console.log('3. Select Email as an allowed MFA method')
            console.log('4. Configure SMTP settings in Settings → SMTP')
            return
          }
        }
      }
      
      // Test 4: Create MFA challenge (send email)
      console.log('\nTest 4: Creating MFA challenge (sending email)...')
      try {
        const challenge = await account.createMfaChallenge(AuthenticationFactor.Email)
        console.log('✓ MFA challenge created successfully')
        console.log('✓ Challenge ID:', challenge.$id)
        console.log('✓ Expires at:', challenge.expire)
        console.log('\n📧 Check your email for the verification code!')
        
        // Test 5: Prompt for verification code
        console.log('\nTest 5: Verification')
        console.log('To complete the test, run:')
        console.log(`Test2FA.verifyChallenge('${challenge.$id}', 'YOUR_CODE')`)
        
        return challenge.$id
      } catch (error: any) {
        console.error('✗ Failed to create MFA challenge:', error.message)
        
        if (error.message.includes('smtp_config_invalid')) {
          console.log('\n⚠️  SMTP is not configured in Appwrite!')
          console.log('Please configure SMTP in your Appwrite Console:')
          console.log('1. Go to Settings → SMTP')
          console.log('2. Add your SMTP configuration')
          console.log('3. Test the configuration')
        }
      }
      
    } catch (error: any) {
      console.error('\n✗ Test failed:', error.message)
    }
  }
  
  static async verifyChallenge(challengeId: string, code: string) {
    console.log('\n=== Verifying MFA Challenge ===')
    
    try {
      // Complete the challenge
      console.log('Verifying code...')
      await account.updateMfaChallenge(challengeId, code)
      console.log('✓ MFA challenge verified successfully!')
      
      // Check updated factors
      const factors = await account.listMfaFactors()
      console.log('\n✓ Updated MFA factors:', JSON.stringify(factors, null, 2))
      
      if (factors.email === true) {
        console.log('\n✅ Email MFA is now fully enabled!')
      } else {
        console.log('\n⚠️  Email MFA is still not showing as enabled')
        console.log('This might require additional configuration in Appwrite')
      }
      
    } catch (error: any) {
      console.error('✗ Verification failed:', error.message)
    }
  }
  
  static async disableTest() {
    console.log('\n=== Testing MFA Disable ===')
    
    try {
      await account.updateMFA(false)
      console.log('✓ MFA disabled successfully')
      
      const factors = await account.listMfaFactors()
      console.log('✓ MFA factors after disable:', JSON.stringify(factors, null, 2))
      
    } catch (error: any) {
      console.error('✗ Failed to disable MFA:', error.message)
    }
  }
  
  static async checkProjectMFA() {
    console.log('\n=== Checking Project MFA Configuration ===')
    
    try {
      // Try to enable MFA to check if it's allowed
      const user = await account.get()
      
      if (!user.mfa) {
        try {
          await account.updateMFA(true)
          await account.updateMFA(false) // Revert
          console.log('✓ MFA is enabled for this project')
        } catch (error: any) {
          if (error.message.includes('mfa_not_enabled')) {
            console.log('✗ MFA is NOT enabled for this project')
            console.log('\nTo fix this:')
            console.log('1. Go to Appwrite Console')
            console.log('2. Navigate to Auth → Security')
            console.log('3. Enable Multi-factor authentication')
            console.log('4. Select Email as an allowed method')
          } else {
            throw error
          }
        }
      } else {
        console.log('✓ User already has MFA enabled')
      }
      
      // Check SMTP configuration by attempting to send a test email
      console.log('\nChecking email configuration...')
      try {
        await account.createRecovery(
          user.email,
          'https://test.example.com'
        )
        console.log('✓ Email service appears to be configured')
        console.log('  (A recovery email was sent to test SMTP)')
      } catch (error: any) {
        if (error.message.includes('smtp')) {
          console.log('✗ SMTP is not properly configured')
          console.log('\nTo fix this:')
          console.log('1. Go to Appwrite Console')
          console.log('2. Navigate to Settings → SMTP')
          console.log('3. Configure your SMTP settings')
        }
      }
      
    } catch (error: any) {
      console.error('✗ Configuration check failed:', error.message)
    }
  }
}

// Make it available globally for testing
;(window as any).Test2FA = Test2FA

// Auto-run basic check on load
console.log('2FA Test Suite loaded. Available commands:')
console.log('- Test2FA.runFullTest() - Run complete test')
console.log('- Test2FA.checkProjectMFA() - Check project configuration')
console.log('- Test2FA.verifyChallenge(challengeId, code) - Verify email code')
console.log('- Test2FA.disableTest() - Test disabling MFA')