# Realtime Chat System Documentation

## Overview

The EliteCompanions platform includes a complete realtime chat system built with Appwrite, featuring:

- **End-to-end encryption** for messages
- **Realtime updates** using Appwrite subscriptions
- **Role-based permissions** (Client/Escort/Support)
- **Auto-deleting messages** for privacy
- **Voice/Video calling** support
- **File attachments** and media sharing
- **Message search** and pagination
- **Typing indicators** and read receipts
- **Push notifications** for new messages

## Architecture

### Collections Structure

#### 1. **Conversations Collection** (`68923bbe0011a743f62f`)
Stores conversation metadata and participants.

```typescript
interface Conversation {
  participants: string[]                    // Array of user IDs
  participantRoles: string                 // JSON object with userId: role mapping
  initiatedBy: string                      // User ID who started conversation
  conversationType: 'client_escort' | 'client_support' | 'escort_support'
  lastActivity: Date
  lastMessageId?: string
  isArchived: boolean
  encryptionKey: string                    // For E2E encryption
  autoDeletePeriod: number                 // Minutes (-1 for never)
  unreadCount: string                      // JSON object with userId: count
}
```

#### 2. **Messages Collection** (`68923bd300357a65ab1c`)
Stores individual messages with encryption.

```typescript
interface Message {
  conversationId: string
  senderId: string
  receiverId: string
  content: string                          // Encrypted content
  type: 'text' | 'image' | 'file' | 'call_request' | 'system'
  isEncrypted: boolean
  autoDeleteAt?: Date
  autoDeletePeriod: number
  isRead: boolean
  deliveredAt?: Date
  readAt?: Date
  attachmentUrl?: string
  attachmentType?: string
  attachmentSize?: number
}
```

#### 3. **Calls Collection** (`68923bec000022af471a`)
Tracks voice/video call sessions.

```typescript
interface CallSession {
  conversationId: string
  callerId: string
  receiverId: string
  type: 'voice' | 'video'
  status: 'pending' | 'active' | 'ended' | 'rejected' | 'missed'
  startedAt?: Date
  endedAt?: Date
  duration?: number                        // Seconds
  recordingUrl?: string
}
```

### Permission System

#### Role-Based Messaging Rules:

1. **Clients**
   - ✅ Can initiate conversations with escorts
   - ✅ Can message support
   - ✅ Can reply to any conversation they're part of

2. **Escorts**
   - ❌ Cannot initiate conversations with clients
   - ✅ Can reply to client messages
   - ✅ Can message support
   - ✅ Can reply to any conversation they're part of

3. **Support**
   - ✅ Can message anyone
   - ✅ Full messaging privileges

### Realtime Features

#### 1. **Message Subscriptions**
```typescript
// Subscribe to new messages in a conversation
const unsubscribe = realtimeService.subscribeToMessages(conversationId)

// Automatically handles:
// - New message notifications
// - Message decryption
// - UI updates
// - Read receipt updates
```

#### 2. **Conversation Updates**
```typescript
// Subscribe to all user's conversations
const unsubscribe = realtimeService.subscribeToConversations()

// Handles:
// - New conversations
// - Last message updates
// - Unread count changes
// - Archive status changes
```

#### 3. **Call Events**
```typescript
// Subscribe to incoming calls
const unsubscribe = realtimeService.subscribeToCalls()

// Handles:
// - Incoming call notifications
// - Call status updates
// - Automatic ringtone management
```

### Security Features

#### 1. **End-to-End Encryption**
- Messages are encrypted client-side before storage
- Each conversation has a unique encryption key
- Keys are generated using conversation participant IDs

#### 2. **Auto-Deletion**
- Messages can auto-delete after specified periods:
  - Immediate (0 minutes)
  - 5 minutes
  - 1 hour
  - 1 day (default)
  - 1 week
  - Never (-1)

#### 3. **Privacy Controls**
- No message content in push notifications
- Optional blur for media attachments
- Conversation encryption keys never leave client

## Implementation Guide

### 1. **Starting a Conversation**

```vue
<MessageButton 
  :receiverId="escortProfile.userId"
  :receiverName="escortProfile.name"
  receiverRole="escort"
  variant="primary"
/>
```

### 2. **Sending Messages**

```typescript
// Text message
await messagingStore.sendMessage(
  receiverId,
  'Hello!',
  'text',
  AUTO_DELETE_PERIODS.ONE_DAY
)

// With attachment
await messagingStore.sendMessage(
  receiverId,
  'Check out this photo',
  'image',
  AUTO_DELETE_PERIODS.ONE_HOUR,
  attachmentUrl
)
```

### 3. **Loading Messages with Pagination**

```typescript
// Initial load
await messagingStore.loadMessages(conversationId)

// Load more (pagination)
await messagingStore.loadMessages(conversationId, 50, currentMessageCount)
```

### 4. **Search Messages**

```typescript
const results = await messagingStore.searchMessages(
  conversationId,
  'search term'
)
```

## UI Components

### 1. **Messages View** (`/src/views/Messages.vue`)
- Main messaging interface
- Conversation list sidebar
- Message thread area
- Responsive design for mobile

### 2. **ConversationList** (`/src/components/messaging/ConversationList.vue`)
- Shows all user conversations
- Unread indicators
- Last message preview
- Role-based visual indicators

### 3. **MessageThread** (`/src/components/messaging/MessageThread.vue`)
- Individual conversation view
- Message bubbles with encryption indicators
- Auto-scroll behavior
- Infinite scroll for message history

### 4. **MessageInput** (`/src/components/messaging/MessageInput.vue`)
- Text input with emoji support
- File attachment button
- Auto-delete period selector
- Encryption indicator

### 5. **MessageButton** (`/src/components/messaging/MessageButton.vue`)
- Permission-aware messaging button
- Role-based styling
- Disabled states for unauthorized actions

## Notification System

### 1. **Browser Notifications**
- Requests permission on first message
- Shows sender name and message type
- Click to focus conversation

### 2. **Sound Notifications**
- `notification.mp3` for new messages
- `ringtone.mp3` for incoming calls
- Respects device sound settings

### 3. **Visual Indicators**
- Unread count badges
- Typing indicators
- Read receipts (double checkmarks)

## Best Practices

### 1. **Performance**
- Messages are paginated (50 per load)
- Lazy loading for media attachments
- Efficient scroll handling
- Debounced typing indicators

### 2. **User Experience**
- Auto-reconnect on connection loss
- Offline message queue
- Optimistic UI updates
- Clear permission feedback

### 3. **Security**
- Never log encryption keys
- Clear sensitive data on logout
- Validate permissions server-side
- Sanitize message content

## Troubleshooting

### Common Issues:

1. **Messages not updating in realtime**
   - Check Appwrite connection
   - Verify subscription is active
   - Check browser console for errors

2. **Encryption/Decryption failures**
   - Verify encryption key exists
   - Check for corrupted message data
   - Fallback to "[Encrypted Message]"

3. **Permission errors**
   - Verify user role is set correctly
   - Check conversation participant roles
   - Review permission logic

4. **Notification issues**
   - Check browser notification permissions
   - Verify sound files exist
   - Test notification API support

## Future Enhancements

1. **Group Conversations**
   - Support for 3+ participants
   - Admin/moderator roles
   - Group encryption keys

2. **Enhanced Media**
   - Image compression
   - Video previews
   - Voice messages

3. **Advanced Features**
   - Message reactions
   - Reply to specific messages
   - Message forwarding
   - Conversation search

4. **Integration**
   - Email notifications
   - SMS fallback
   - Calendar integration
   - Payment requests