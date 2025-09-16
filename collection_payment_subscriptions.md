# Payment and Subscription Collections Schema

This document outlines the payment and subscription-related collections used in the Elite Companions application. The payment system handles transactions, subscriptions, usage tracking, and invoicing with comprehensive security and audit capabilities.

## Overview

The payment and subscription system consists of several collections that work together to provide secure transaction processing and subscription management:

- **payments**: All payment transactions (bookings, advertising, subscriptions, refunds)
- **revenue**: Platform revenue tracking and analytics
- **payouts**: Escort payout processing and history
- **subscriptions**: User subscription plans and billing information
- **subscription_usage**: Monthly usage metrics for subscription features
- **subscription_invoices**: Subscription billing invoices and payment records

## Collection Schemas

### 1. Payments Collection

**Collection ID:** `payments_20250114`

Stores all payment transactions including bookings, advertising, subscriptions, and refunds.

```json
{
  "bookingId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Related booking ID (if applicable)"
  },
  "advertisingId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Related advertising plan ID (if applicable)"
  },
  "escortId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Escort involved in transaction"
  },
  "clientId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Client making payment"
  },
  "profileId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Related profile ID (if applicable)"
  },
  "amount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Transaction amount in cents"
  },
  "currency": {
    "type": "string",
    "size": 3,
    "required": true,
    "array": false,
    "default": "USD",
    "description": "Currency code (e.g., 'USD')"
  },
  "type": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "description": "Transaction type: booking, advertising, subscription, refund, payout"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "pending",
    "description": "Transaction status: pending, processing, completed, failed, refunded"
  },
  "paymentMethod": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Payment method identifier"
  },
  "processorTransactionId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "External processor transaction ID"
  },
  "processorResponse": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "Response from payment processor as JSON string"
  },
  "description": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "Transaction description"
  },
  "metadata": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "Additional metadata as JSON string"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Transaction creation timestamp"
  },
  "updatedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Last update timestamp"
  }
}
```

**Indexes:**
- `clientId` (ascending)
- `escortId` (ascending)
- `profileId` (ascending)
- `status` (ascending)
- `type` + `status` (compound)
- `createdAt` (descending)

**Permissions:**
- Create: System only
- Read: Users (own transactions only), Admins (all)
- Update: System only
- Delete: None

### 2. Subscriptions Collection

**Collection ID:** `subscriptions_20250114`

Stores user subscription plans and billing information.

```json
{
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "User who owns subscription"
  },
  "planId": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Subscription plan identifier"
  },
  "tier": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "description": "Subscription tier: free, starter, pro, agency"
  },
  "billingPeriod": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "description": "Billing period: monthly, yearly"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "active",
    "description": "Status: active, inactive, cancelled, past_due, trialing"
  },
  "currentPeriodStart": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Current billing period start date"
  },
  "currentPeriodEnd": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Current billing period end date"
  },
  "cancelAtPeriodEnd": {
    "type": "boolean",
    "required": true,
    "array": false,
    "default": false,
    "description": "Whether to cancel at period end"
  },
  "cancelledAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Cancellation timestamp"
  },
  "cancellationReason": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "Reason for cancellation"
  },
  "trialEndsAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Trial end timestamp"
  },
  "paymentMethodId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Default payment method"
  },
  "lastPaymentId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Last payment transaction ID"
  },
  "lastPaymentAmount": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Last payment amount in cents"
  },
  "lastPaymentDate": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Last payment date"
  },
  "nextPaymentDate": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Next payment date"
  },
  "nextPaymentAmount": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Next payment amount in cents"
  },
  "profilesCreatedThisMonth": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 1000,
    "description": "Current month profile count"
  },
  "premiumBoostsUsedThisMonth": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 1000,
    "description": "Current month boost usage"
  },
  "metadata": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "Additional subscription metadata as JSON string"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Subscription creation timestamp"
  },
  "updatedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Last update timestamp"
  }
}
```

**Indexes:**
- `userId` (ascending, unique)
- `status` (ascending)
- `nextPaymentDate` (ascending)
- `tier` (ascending)

**Permissions:**
- Create: System only
- Read: Users (own subscription only)
- Update: System only
- Delete: System only

### 3. Subscription Usage Collection

**Collection ID:** `subscription_usage_20250114`

Tracks monthly usage metrics for subscription features.

```json
{
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "User ID"
  },
  "subscriptionId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Related subscription ID"
  },
  "period": {
    "type": "string",
    "size": 7,
    "required": true,
    "array": false,
    "description": "Period in format 'YYYY-MM'"
  },
  "profilesCreated": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Profiles created this period"
  },
  "profilesRemaining": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Profiles remaining in limit"
  },
  "premiumBoostsUsed": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Premium boosts used this period"
  },
  "premiumBoostsRemaining": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Premium boosts remaining"
  },
  "messagesCount": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Messages sent this period"
  },
  "audioCallMinutes": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Audio call minutes used"
  },
  "videoCallMinutes": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Video call minutes used"
  },
  "liveStreamingMinutes": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Live streaming minutes used"
  },
  "privateRoomSessions": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Private room sessions count"
  },
  "giftsReceived": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Gifts received count"
  },
  "callRevenue": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Revenue from calls in cents (for escorts)"
  },
  "rewardsEarned": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 999999999,
    "description": "Rewards earned this period"
  },
  "supportTickets": {
    "type": "integer",
    "required": true,
    "array": false,
    "default": 0,
    "min": 0,
    "max": 10000,
    "description": "Support tickets created"
  },
  "lastUpdated": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Last update timestamp"
  }
}
```

**Indexes:**
- `userId` + `period` (compound, unique)
- `subscriptionId` (ascending)
- `period` (descending)

**Permissions:**
- Create: System only
- Read: Users (own usage only)
- Update: System only
- Delete: System only

### 4. Subscription Invoices Collection

**Collection ID:** `subscription_invoices_20250114`

Stores subscription billing invoices and payment records.

```json
{
  "subscriptionId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Related subscription ID"
  },
  "userId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "User being billed"
  },
  "invoiceNumber": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Unique invoice number"
  },
  "amount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Invoice amount in cents"
  },
  "currency": {
    "type": "string",
    "size": 3,
    "required": true,
    "array": false,
    "default": "USD",
    "description": "Currency code"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "draft",
    "description": "Status: draft, open, paid, void, uncollectible"
  },
  "dueDate": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Payment due date"
  },
  "paidAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Payment completion timestamp"
  },
  "paymentMethodId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Payment method used"
  },
  "paymentIntentId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Related payment intent"
  },
  "lineItems": {
    "type": "string",
    "size": 5000,
    "required": true,
    "array": false,
    "description": "Invoice line items as JSON array"
  },
  "taxAmount": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Tax amount in cents"
  },
  "totalAmount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Total including tax in cents"
  },
  "invoiceUrl": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "URL to invoice PDF"
  },
  "receiptUrl": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "URL to receipt PDF"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Invoice creation timestamp"
  }
}
```

**Indexes:**
- `userId` (ascending)
- `subscriptionId` (ascending)
- `status` (ascending)
- `createdAt` (descending)
- `invoiceNumber` (ascending, unique)

**Permissions:**
- Create: System only
- Read: Users (own invoices only)
- Update: System only
- Delete: None

### 5. Revenue Collection

**Collection ID:** `revenue`

Tracks platform revenue from all sources with analytics and reporting capabilities.

```json
{
  "transactionId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Related payment transaction ID"
  },
  "escortId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Escort earning the revenue (if applicable)"
  },
  "revenueType": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Revenue type: platform_fee, subscription, advertising, cancellation_fee"
  },
  "grossAmount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Gross transaction amount in cents"
  },
  "platformFee": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Platform fee amount in cents"
  },
  "netRevenue": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Net platform revenue in cents"
  },
  "escortEarnings": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Amount earned by escort in cents"
  },
  "feePercentage": {
    "type": "number",
    "required": true,
    "array": false,
    "min": 0,
    "max": 100,
    "description": "Fee percentage applied"
  },
  "currency": {
    "type": "string",
    "size": 3,
    "required": true,
    "array": false,
    "default": "USD",
    "description": "Currency code"
  },
  "period": {
    "type": "string",
    "size": 7,
    "required": true,
    "array": false,
    "description": "Revenue period in format 'YYYY-MM'"
  },
  "category": {
    "type": "string",
    "size": 50,
    "required": false,
    "array": false,
    "description": "Revenue category for reporting"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "pending",
    "description": "Status: pending, confirmed, disputed, refunded"
  },
  "metadata": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "Additional metadata as JSON string"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Revenue record creation timestamp"
  },
  "confirmedAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "Revenue confirmation timestamp"
  }
}
```

**Indexes:**
- `escortId` (ascending)
- `revenueType` (ascending)
- `period` (ascending)
- `status` (ascending)
- `createdAt` (descending)
- `transactionId` (ascending, unique)

**Permissions:**
- Create: System only
- Read: Admins only
- Update: System only
- Delete: None

### 6. Payouts Collection

**Collection ID:** `payouts`

Manages escort payouts with tracking and compliance features.

```json
{
  "escortId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Escort receiving the payout"
  },
  "amount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Payout amount in cents"
  },
  "currency": {
    "type": "string",
    "size": 3,
    "required": true,
    "array": false,
    "default": "USD",
    "description": "Currency code"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "pending",
    "description": "Status: pending, processing, completed, failed, cancelled"
  },
  "payoutMethod": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Payout method: bank_transfer, paypal, crypto, check"
  },
  "payoutDetails": {
    "type": "string",
    "size": 2000,
    "required": true,
    "array": false,
    "description": "Encrypted payout details (account info)"
  },
  "processorPayoutId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "External processor payout ID"
  },
  "processorResponse": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "Response from payout processor"
  },
  "periodStart": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Earning period start date"
  },
  "periodEnd": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Earning period end date"
  },
  "transactionCount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999,
    "description": "Number of transactions included"
  },
  "transactionIds": {
    "type": "string",
    "size": 5000,
    "required": true,
    "array": false,
    "description": "JSON array of included transaction IDs"
  },
  "grossEarnings": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Total gross earnings before fees"
  },
  "platformFees": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Total platform fees deducted"
  },
  "deductions": {
    "type": "string",
    "size": 2000,
    "required": false,
    "array": false,
    "description": "JSON object of any deductions (chargebacks, fees)"
  },
  "taxWithheld": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 0,
    "max": 999999999,
    "description": "Tax amount withheld (if applicable)"
  },
  "statement": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "URL to payout statement PDF"
  },
  "notes": {
    "type": "string",
    "size": 1000,
    "required": false,
    "array": false,
    "description": "Internal notes about the payout"
  },
  "requestedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "When payout was requested"
  },
  "processedAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "When payout was processed"
  },
  "completedAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "When payout was completed"
  },
  "failedAt": {
    "type": "datetime",
    "required": false,
    "array": false,
    "description": "When payout failed (if applicable)"
  },
  "failureReason": {
    "type": "string",
    "size": 500,
    "required": false,
    "array": false,
    "description": "Reason for payout failure"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Payout record creation timestamp"
  },
  "updatedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Last update timestamp"
  }
}
```

**Indexes:**
- `escortId` (ascending)
- `status` (ascending)
- `periodStart` (ascending)
- `periodEnd` (ascending)
- `createdAt` (descending)
- `requestedAt` (descending)

**Permissions:**
- Create: System only
- Read: Users (own payouts only), Admins (all)
- Update: System only
- Delete: None

## Payment Flow

### 1. Payment Processing

1. **Payment Intent Creation:**
   - Create document in `payments` collection with `status: 'pending'`
   - Generate payment intent with processor
   - Store processor reference

2. **Payment Processing:**
   - Update payment status to `processing`
   - Process with external payment provider
   - Update status to `completed` or `failed`
   - Store processor response

3. **Post-Payment Actions:**
   - Trigger webhook/function for fulfillment
   - Update related records (bookings, subscriptions)
   - Send confirmation notifications

### 2. Subscription Management

1. **New Subscription:**
   - Create subscription record
   - Initialize usage tracking
   - Process initial payment
   - Set up recurring billing

2. **Usage Tracking:**
   - Track feature usage in real-time
   - Update `subscription_usage` collection
   - Enforce limits based on plan

3. **Billing Cycle:**
   - Generate invoices before period end
   - Process automatic payments
   - Update subscription periods
   - Reset usage counters

4. **Plan Changes:**
   - Calculate proration
   - Process upgrade/downgrade payment
   - Update subscription tier
   - Adjust feature limits

### 3. Refund Processing

1. **Refund Request:**
   - Validate original transaction
   - Create refund transaction
   - Process with payment provider
   - Update original transaction

2. **Refund Completion:**
   - Update transaction statuses
   - Adjust related records
   - Send notifications
   - Log for accounting

### 4. Revenue Tracking

1. **Automatic Revenue Recording:**
   - Calculate platform fees on successful payments
   - Create revenue records for each transaction
   - Track by revenue type and period
   - Monitor platform earnings

2. **Revenue Analytics:**
   - Monthly revenue reports
   - Revenue by category
   - Escort performance metrics
   - Platform growth tracking

### 5. Payout Processing

1. **Payout Eligibility:**
   - Minimum payout threshold check
   - Verification of escort status
   - Calculate earnings for period
   - Apply any deductions

2. **Payout Creation:**
   - Aggregate eligible transactions
   - Calculate net payout amount
   - Create payout record
   - Queue for processing

3. **Payout Execution:**
   - Process through payment provider
   - Update payout status
   - Generate statements
   - Send notifications

4. **Payout Reconciliation:**
   - Track completed payouts
   - Handle failed payouts
   - Maintain audit trail
   - Tax reporting preparation

## Security Features

### Payment Security

1. **PCI Compliance:**
   - No storage of card details
   - Tokenization through payment processor
   - Secure payment method references
   - Encrypted processor communication

2. **Transaction Security:**
   - Idempotency keys for duplicate prevention
   - Transaction locking during processing
   - Audit trail for all operations
   - Webhook signature verification

3. **Access Control:**
   - Users can only view their own transactions
   - System-only write access
   - Admin oversight capabilities
   - Secure API endpoints

### Data Protection

1. **Encryption:**
   - Sensitive data encrypted at rest
   - TLS for data in transit
   - Secure key management
   - Regular security audits

2. **Privacy:**
   - PII minimization
   - Data retention policies
   - GDPR compliance
   - User data export capabilities

## Setup Instructions

### 1. Create Collections

```bash
# Create payments collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "payments_20250114" \
  --name "Payments"

# Create subscriptions collection  
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "subscriptions_20250114" \
  --name "Subscriptions"

# Create subscription_usage collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "subscription_usage_20250114" \
  --name "Subscription Usage"

# Create subscription_invoices collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "subscription_invoices_20250114" \
  --name "Subscription Invoices"

# Create revenue collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "revenue" \
  --name "Revenue"

# Create payouts collection
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "payouts" \
  --name "Payouts"
```

### 2. Configure Permissions

Set appropriate permissions for each collection based on the schemas above.

### 3. Create Indexes

Create the recommended indexes for optimal query performance.

### 4. Environment Variables

```env
# Payment Configuration
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Configuration
VITE_FREE_PROFILES_LIMIT=1
VITE_STARTER_PROFILES_LIMIT=5
VITE_PRO_PROFILES_LIMIT=20
VITE_AGENCY_PROFILES_LIMIT=100

# Platform Fees
VITE_PLATFORM_FEE_PERCENTAGE=0.20
VITE_MINIMUM_PAYOUT_AMOUNT=5000  # $50 in cents
```

## Usage Examples

### Payment Service

```typescript
import { paymentService } from '@/services/paymentService'

// Create payment intent
const paymentIntentId = await paymentService.createPaymentIntent({
  amount: 10000, // $100 in cents
  currency: 'USD',
  clientId: 'user123',
  bookingId: 'booking456',
  description: 'Booking payment for escort service'
})

// Process payment
const transaction = await paymentService.processPayment(
  paymentIntentId,
  'pm_1234567890' // payment method ID
)

// Get user transactions
const transactions = await paymentService.getUserTransactions(
  'user123',
  'client'
)

// Process refund
const refund = await paymentService.processRefund(
  'transaction123',
  5000, // partial refund amount
  'Customer request'
)
```

### Subscription Service

```typescript
import { subscriptionService } from '@/services/subscriptionService'

// Create subscription
const subscription = await subscriptionService.createSubscription(
  'user123',
  'pro_monthly',
  'monthly',
  'pm_1234567890'
)

// Get user subscription
const currentSub = await subscriptionService.getUserSubscription('user123')

// Update subscription plan
const change = await subscriptionService.updateSubscription(
  subscription.id,
  'agency_monthly',
  'monthly'
)

// Track usage
await subscriptionService.incrementProfileUsage('user123', subscription.id)

// Cancel subscription
await subscriptionService.cancelSubscription(
  subscription.id,
  'Too expensive',
  false // cancel at period end
)
```

### Revenue Service

```typescript
import { revenueService } from '@/services/revenueService'

// Track revenue from transaction
await revenueService.trackRevenue({
  transactionId: 'trans123',
  escortId: 'escort456',
  revenueType: 'platform_fee',
  grossAmount: 10000,
  feePercentage: 20,
  currency: 'USD'
})

// Get revenue analytics
const monthlyRevenue = await revenueService.getMonthlyRevenue('2025-01')
const revenueByType = await revenueService.getRevenueByType('2025-01')

// Get escort earnings
const escortEarnings = await revenueService.getEscortEarnings(
  'escort456',
  '2025-01'
)
```

### Payout Service

```typescript
import { payoutService } from '@/services/payoutService'

// Check payout eligibility
const eligible = await payoutService.checkPayoutEligibility('escort456')

// Create payout request
const payout = await payoutService.createPayout({
  escortId: 'escort456',
  periodStart: '2025-01-01',
  periodEnd: '2025-01-31',
  payoutMethod: 'bank_transfer',
  payoutDetails: encryptedBankDetails
})

// Process payout
await payoutService.processPayout(payout.id)

// Get payout history
const payouts = await payoutService.getPayoutHistory('escort456')

// Generate payout statement
const statement = await payoutService.generateStatement(payout.id)
```

## Best Practices

1. **Payment Processing:**
   - Always use idempotency keys
   - Implement retry logic with backoff
   - Handle webhook failures gracefully
   - Log all payment events

2. **Subscription Management:**
   - Proactively notify before renewals
   - Handle failed payments gracefully
   - Provide clear upgrade/downgrade paths
   - Track usage accurately

3. **Security:**
   - Never log sensitive payment data
   - Validate webhook signatures
   - Implement rate limiting
   - Monitor for fraud patterns

4. **User Experience:**
   - Provide clear pricing information
   - Show usage limits clearly
   - Send payment receipts
   - Allow easy cancellation

5. **Compliance:**
   - Maintain PCI compliance
   - Follow regional regulations
   - Provide tax documentation
   - Enable data export

6. **Revenue Management:**
   - Track all revenue sources
   - Monitor platform fees
   - Analyze revenue trends
   - Prepare financial reports

7. **Payout Management:**
   - Set minimum payout thresholds
   - Verify escort identity
   - Maintain accurate records
   - Handle tax withholding
   - Provide detailed statements