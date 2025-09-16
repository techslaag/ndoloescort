# Flutterwave Payment Integration

## Overview
This application uses Flutterwave for all payment processing including subscriptions, bookings, gifts, and advertising payments.

## Setup

### 1. Get Flutterwave Credentials
1. Sign up at [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Get your API keys from Settings > API
3. For testing, use the test keys provided

### 2. Configure Environment Variables
Add to your `.env` file:
```env
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
VITE_FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X
```

### 3. Test Cards
For testing, use these test cards:
- **Successful Payment**: 4242 4242 4242 4242
- **Failed Payment**: 4000 0000 0000 0069
- **CVV**: 123
- **Expiry**: Any future date
- **PIN**: 3310
- **OTP**: 12345

## Payment Flows

### 1. Subscription Payments
- Location: `/subscription`
- Component: `FlutterwavePayment.vue`
- Flow:
  1. User selects subscription plan
  2. Flutterwave modal opens
  3. User completes payment
  4. Subscription is activated

### 2. Booking Payments
- Location: `/booking/:id`
- Component: `FlutterwavePayment.vue`
- Flow:
  1. Client selects service and date
  2. Flutterwave modal opens
  3. Payment is processed
  4. Booking is confirmed

### 3. Gift Payments
- Location: Chat interface
- Component: `GiftModal.vue`
- Flow:
  1. User selects gift
  2. Flutterwave modal opens
  3. Payment is processed
  4. Gift is sent

### 4. Advertising Payments
- Location: Escort dashboard
- Component: `FlutterwavePayment.vue`
- Flow:
  1. Escort selects advertising plan
  2. Flutterwave modal opens
  3. Payment is processed
  4. Profile is promoted

## Components

### FlutterwavePayment.vue
Main payment component that handles all payment types:
```vue
<FlutterwavePayment
  :amount="100"
  :description="Service payment"
  payment-type="booking"
  :related-id="bookingId"
  :metadata="{ ... }"
  @payment-success="handleSuccess"
  @payment-error="handleError"
  @payment-closed="handleClose"
/>
```

### PaymentHistory.vue
Displays transaction history:
```vue
<PaymentHistory 
  :limit="20"
  :show-filters="true"
/>
```

## Services

### flutterwaveService.ts
Core service for payment processing:
- `createPaymentConfig()` - Creates payment configuration
- `verifyTransaction()` - Verifies payment with Flutterwave
- `processRefund()` - Processes refunds
- `getPaymentHistory()` - Gets user's payment history
- `calculateEscortEarnings()` - Calculates escort earnings after fees

### paymentService.ts
Database integration for payments:
- `createPaymentIntent()` - Creates payment record
- `processPayment()` - Updates payment status
- `getTransaction()` - Gets transaction details
- `getUserTransactions()` - Gets user's transactions

## Payment Types

### 1. Bookings
- Client pays full amount upfront
- 20% platform fee deducted from escort earnings
- Refunds available within 24 hours

### 2. Subscriptions
- Monthly or yearly billing
- Auto-renewal (when implemented)
- Upgrades/downgrades allowed

### 3. Gifts
- Direct payment for virtual gifts
- No refunds on gifts
- Instant delivery

### 4. Advertising
- Pay per campaign
- Various promotion levels
- Analytics tracking

## Security

### Payment Security
- All payments processed through Flutterwave's secure servers
- No card details stored in our database
- PCI DSS compliant through Flutterwave
- SSL/TLS encryption for all transactions

### Webhook Security
For production, implement webhook verification:
```javascript
// Verify webhook signature
const hash = crypto
  .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY)
  .update(JSON.stringify(req.body))
  .digest('hex')

if (hash !== req.headers['verif-hash']) {
  throw new Error('Invalid webhook signature')
}
```

## Testing

### Test Flow
1. Use test credentials in `.env`
2. Use test cards provided above
3. Complete payment flow
4. Verify transaction in database
5. Check Flutterwave dashboard

### Common Issues
- **"Invalid public key"**: Check your env variables
- **"Payment failed"**: Use correct test card
- **"Network error"**: Check internet connection
- **"Amount mismatch"**: Verify amount calculation

## Production Checklist

### Before Going Live
- [ ] Switch to live API keys
- [ ] Set up webhook endpoints
- [ ] Configure webhook URL in Flutterwave dashboard
- [ ] Test with real cards (small amounts)
- [ ] Set up error monitoring
- [ ] Configure email receipts
- [ ] Set up dispute handling process

### Webhook Implementation
Create webhook endpoint to handle:
- Payment completion
- Payment failure
- Refund status
- Dispute notifications

### Revenue Split
- Platform fee: 20% of bookings
- Escort receives: 80% of bookings
- Withdrawal minimum: $50
- Withdrawal processing: 1-3 business days

## API Reference

### Create Payment
```javascript
const config = flutterwaveService.createPaymentConfig({
  amount: 100,
  email: 'user@example.com',
  name: 'John Doe',
  description: 'Booking payment',
  paymentType: 'booking',
  relatedId: 'booking_123',
  metadata: { ... }
})
```

### Verify Payment
```javascript
const verification = await flutterwaveService.verifyTransaction(transactionId)
if (verification.status === 'successful') {
  // Payment confirmed
}
```

### Process Refund
```javascript
await flutterwaveService.processRefund(transactionId, amount)
```

### Get Earnings
```javascript
const earnings = await flutterwaveService.calculateEscortEarnings(escortId)
console.log(earnings.availableBalance)
```

## Support

### Customer Support
- Payment issues: support@yourdomain.com
- Technical issues: Check logs and webhook responses
- Flutterwave support: support@flutterwave.com

### Error Codes
- `INVALID_CARD`: Card details incorrect
- `INSUFFICIENT_FUNDS`: Card has insufficient funds
- `CARD_DECLINED`: Bank declined transaction
- `NETWORK_ERROR`: Connection issues
- `INVALID_AMOUNT`: Amount validation failed