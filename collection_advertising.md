# Advertising Collection Schema

This document outlines the advertising collection used in the Elite Companions application for managing promotional campaigns and enhanced visibility features for escort profiles. The advertising system provides various promotional options including featured placements, premium positioning, and spotlight campaigns.

## Overview

The advertising system consists of a primary collection that manages all promotional campaigns:

- **advertising**: Campaign management, analytics tracking, and promotional features

## Collection Schema

### Advertising Collection

**Collection ID:** `advertising`

Manages promotional campaigns and advertising features for escort profiles with comprehensive analytics tracking.

```json
{
  "profileId": {
    "type": "string",
    "size": 255,
    "required": true,
    "array": false,
    "description": "Reference to the profile being advertised"
  },
  "purchasedAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "When the advertising campaign was purchased"
  },
  "startDate": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Campaign start date and time"
  },
  "endDate": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Campaign end date and time"
  },
  "type": {
    "type": "string",
    "size": 50,
    "required": true,
    "array": false,
    "description": "Campaign type: featured, premium, spotlight"
  },
  "status": {
    "type": "string",
    "size": 20,
    "required": true,
    "array": false,
    "default": "scheduled",
    "description": "Campaign status: scheduled, active, expired, cancelled"
  },
  "amount": {
    "type": "integer",
    "required": true,
    "array": false,
    "min": 0,
    "description": "Campaign cost in cents (e.g., 4999 = $49.99)"
  },
  "currency": {
    "type": "string",
    "size": 3,
    "required": true,
    "array": false,
    "default": "USD",
    "description": "Currency code (ISO 4217 format)"
  },
  "position": {
    "type": "integer",
    "required": false,
    "array": false,
    "min": 1,
    "description": "Display priority (lower numbers = higher priority)"
  },
  "impressions": {
    "type": "integer",
    "required": false,
    "array": false,
    "default": 0,
    "description": "Number of times the advertisement was displayed"
  },
  "clicks": {
    "type": "integer",
    "required": false,
    "array": false,
    "default": 0,
    "description": "Number of clicks on the advertised profile"
  },
  "transactionId": {
    "type": "string",
    "size": 255,
    "required": false,
    "array": false,
    "description": "Payment transaction reference ID"
  },
  "analyticsData": {
    "type": "string",
    "size": 5000,
    "required": false,
    "array": false,
    "description": "JSON string with detailed analytics and performance metrics"
  },
  "targetAudience": {
    "type": "string",
    "size": 1000,
    "required": false,
    "array": false,
    "description": "JSON string with targeting criteria (location, demographics)"
  },
  "createdAt": {
    "type": "datetime",
    "required": true,
    "array": false,
    "description": "Record creation timestamp"
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
- `profileId` (ascending)
- `status` (ascending)
- `endDate` (ascending)
- `purchasedAt` (descending)
- `type_status` (compound: type ascending, status ascending)

**Permissions:**
- Create: Users (own profiles only)
- Read: Users (own campaigns only), Admins (all campaigns)
- Update: Users (own campaigns only), System (status updates)
- Delete: Users (own campaigns only), Admins (all campaigns)

## Advertising Campaign Types

### 1. Featured Profile
- **Duration Options:** 7, 14, or 30 days
- **Visibility:** Enhanced search result positioning
- **Features:** Special badge, increased discovery
- **Pricing:** $19.99 (7 days), $34.99 (14 days), $49.99 (30 days)

### 2. Premium Placement
- **Duration Options:** 24, 48, or 72 hours
- **Visibility:** Top search results, homepage placement
- **Features:** Priority positioning, premium badge
- **Pricing:** $9.99 (24h), $17.99 (48h), $24.99 (72h)

### 3. Spotlight Campaign
- **Duration Options:** 1, 3, or 7 days
- **Visibility:** Rotating banner, maximum exposure
- **Features:** Hero placement, featured carousel
- **Pricing:** $29.99 (1 day), $79.99 (3 days), $149.99 (7 days)

## Campaign Management Flow

### 1. Campaign Creation
1. **Purchase Process:**
   - User selects advertising type and duration
   - Payment processing via payment gateway
   - Campaign creation with 'scheduled' status
   - Transaction ID linking for payment tracking

2. **Validation Rules:**
   - Profile must be active and complete
   - No overlapping campaigns of same type
   - Valid date range (start < end)
   - Sufficient account balance or valid payment method

### 2. Campaign Activation
1. **Automated Activation:**
   - System checks for campaigns with `startDate <= now()`
   - Status update from 'scheduled' to 'active'
   - Position assignment based on priority
   - Analytics tracking initialization

2. **Display Integration:**
   - Featured profiles appear in designated sections
   - Premium placements get priority sorting
   - Spotlight campaigns show in banner rotations

### 3. Campaign Monitoring
1. **Performance Tracking:**
   - Impression counting on profile views
   - Click tracking when profiles are accessed
   - CTR (Click-Through Rate) calculation
   - ROI analytics for campaign effectiveness

2. **Automated Expiration:**
   - System checks for campaigns with `endDate <= now()`
   - Status update from 'active' to 'expired'
   - Position removal from display algorithms
   - Final analytics compilation

## Setup Instructions

### 1. Create Collection

```bash
appwrite databases createCollection \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "advertising" \
  --name "Advertising Campaigns"
```

### 2. Configure Attributes

```bash
# Required fields
appwrite databases createStringAttribute \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "advertising" \
  --key "profileId" \
  --size 255 \
  --required true

appwrite databases createDatetimeAttribute \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "advertising" \
  --key "purchasedAt" \
  --required true

# Add other attributes as defined in schema...
```

### 3. Create Indexes

```bash
# Profile-based queries
appwrite databases createIndex \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "advertising" \
  --key "profileId_index" \
  --type "key" \
  --attributes "profileId"

# Status and expiration queries
appwrite databases createIndex \
  --databaseId "6890df67000788c3e8f6" \
  --collectionId "advertising" \
  --key "status_endDate_index" \
  --type "key" \
  --attributes "status,endDate"
```

## Usage Examples

### Advertising Service

```typescript
import { advertisingService } from '@/services/advertisingService'

// Purchase featured campaign
const campaign = await advertisingService.purchaseCampaign({
  profileId: 'profile-123',
  type: 'featured',
  duration: 14, // days
  amount: 3499 // $34.99
})

// Get active campaigns for profile
const activeCampaigns = await advertisingService.getActiveCampaigns('profile-123')

// Track impression
await advertisingService.trackImpression('campaign-123')

// Track click
await advertisingService.trackClick('campaign-123', 'search-results')
```

### Campaign Analytics

```typescript
// Get campaign performance
const analytics = await advertisingService.getCampaignAnalytics('campaign-123')
console.log({
  impressions: analytics.impressions,
  clicks: analytics.clicks,
  ctr: analytics.clickThroughRate,
  costPerClick: analytics.costPerClick
})

// Get profile advertising history
const history = await advertisingService.getProfileAdvertisingHistory('profile-123')
```

## Business Rules

### Campaign Validation
- Profile must be active and verified
- End date must be after start date
- Only one active campaign per type per profile
- Minimum campaign duration: 24 hours
- Maximum campaign duration: 90 days

### Pricing Structure
- **Featured Profile:** $19.99/week, $34.99/2weeks, $49.99/month
- **Premium Placement:** $9.99/day, $17.99/2days, $24.99/3days  
- **Spotlight Campaign:** $29.99/day, $79.99/3days, $149.99/week

### Performance Metrics
- Impression tracking on profile visibility
- Click tracking on profile access
- Conversion tracking for bookings
- ROI calculation for campaign effectiveness

## Related Collections

- **profiles**: Source profiles being advertised
- **payment_transactions**: Payment records for campaign purchases
- **analytics_events**: Detailed user interaction tracking