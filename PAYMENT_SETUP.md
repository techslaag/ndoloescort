# Payment Setup Guide - Flutterwave Integration

## Prerequisites

1. Create a Flutterwave account at https://dashboard.flutterwave.com
2. Get your API keys from the Flutterwave dashboard

## Setup Instructions

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### 2. Configure Flutterwave Keys

Edit your `.env` file and add your Flutterwave keys:

```env
# For Testing (use test keys)
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
VITE_FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X

# For Production (use live keys)
# VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
# VITE_FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
```

### 3. Test Your Configuration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Login to your account

3. Visit http://localhost:5173/payment-test to verify your setup

### 4. Testing Payments

Use these test card details for testing:

- **Card Number**: 4084084084084081
- **CVV**: 123
- **Expiry**: Any future date
- **PIN**: 0000
- **OTP**: 123456

### Common Issues

#### "Pay Now" button not working

1. Check if Flutterwave keys are configured in `.env`
2. Verify the Flutterwave script is loaded (check browser console)
3. Ensure you're logged in (authentication required)
4. Check browser console for any errors

#### Payment modal not appearing

1. Check if popup blockers are disabled
2. Verify Flutterwave public key is correct
3. Check network tab for any failed API calls

#### Payment verification failing

1. Ensure both public and secret keys are configured
2. Verify the keys match (both test or both live)
3. Check server logs for verification errors

### Security Notes

- Never commit your `.env` file to version control
- Use test keys for development and staging
- Only use live keys in production
- Implement proper error handling for payment failures
- Always verify payments on the server side

### Next Steps

1. Implement webhook handling for payment notifications
2. Add payment receipt generation
3. Implement refund functionality
4. Add payment analytics and reporting

## Support

- Flutterwave Documentation: https://developer.flutterwave.com
- Flutterwave Support: support@flutterwaveapps.com