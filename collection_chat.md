# Chat Collections Schema

## Overview
The chat system consists of two main collections:
- **conversations**: Stores conversation metadata and participants
- **messages**: Stores individual messages within conversations

## Collection: conversations

### Description
Stores all chat conversations between users with encryption support and auto-deletion settings.

### JSON Schema
```json
{
  "$id": "conversations",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["participants", "conversationType", "lastActivity", "isArchived"],
  "properties": {
    "$id": {
      "type": "string",
      "description": "Auto-generated conversation ID"
    },
    "participants": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 2,
      "maxItems": 2,
      "description": "Array of user IDs participating in the conversation"
    },
    "participantRoles": {
      "type": "string",
      "description": "JSON string mapping user IDs to their roles (client/escort/support)"
    },
    "initiatedBy": {
      "type": "string",
      "description": "User ID who initiated the conversation"
    },
    "conversationType": {
      "type": "string",
      "enum": ["client_escort", "client_support", "escort_support"],
      "description": "Type of conversation based on participant roles"
    },
    "lastActivity": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of last message or activity"
    },
    "lastMessage": {
      "type": "string",
      "description": "Preview of the last message (encrypted if applicable)"
    },
    "isArchived": {
      "type": "boolean",
      "default": false,
      "description": "Whether the conversation is archived"
    },
    "encryptionKey": {
      "type": "string",
      "description": "Shared encryption key for the conversation (empty for support messages)"
    },
    "autoDeletePeriod": {
      "type": "integer",
      "default": -1,
      "description": "Auto-delete period in minutes (-1 = never, 0 = immediate, 5, 60, 1440, 10080)"
    },
    "$createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Auto-generated creation timestamp"
    },
    "$updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Auto-generated update timestamp"
    }
  }
}
```

### Indexes
```javascript
[
  {
    "key": "participants",
    "type": "key",
    "attributes": ["participants"],
    "orders": ["ASC"]
  },
  {
    "key": "lastActivity",
    "type": "key",
    "attributes": ["lastActivity"],
    "orders": ["DESC"]
  },
  {
    "key": "conversationType",
    "type": "key",
    "attributes": ["conversationType"],
    "orders": ["ASC"]
  },
  {
    "key": "participants_archived",
    "type": "key",
    "attributes": ["participants", "isArchived"],
    "orders": ["ASC", "ASC"]
  }
]
```

### Permissions
- **Create**: Users (authenticated)
- **Read**: Users (participants only)
- **Update**: Users (participants only)
- **Delete**: Users (participants only)

## Collection: messages

### Description
Stores all messages within conversations with support for various content types, encryption, and auto-deletion.

### JSON Schema
```json
{
  "$id": "messages",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["conversationId", "senderId", "receiverId", "content", "type", "isRead"],
  "properties": {
    "$id": {
      "type": "string",
      "description": "Auto-generated message ID"
    },
    "conversationId": {
      "type": "string",
      "description": "ID of the parent conversation"
    },
    "senderId": {
      "type": "string",
      "description": "User ID of the message sender"
    },
    "receiverId": {
      "type": "string",
      "description": "User ID of the message receiver"
    },
    "content": {
      "type": "string",
      "description": "Message content (encrypted if isEncrypted is true)"
    },
    "type": {
      "type": "string",
      "enum": ["text", "image", "video", "voice", "file", "system", "gift"],
      "default": "text",
      "description": "Type of message content"
    },
    "attachmentUrl": {
      "type": "string",
      "description": "URL to attached media file (images, videos, voice messages, documents)"
    },
    "attachmentData": {
      "type": "string",
      "description": "JSON string with attachment metadata (mimeType, size, fileName)"
    },
    "isEncrypted": {
      "type": "boolean",
      "default": true,
      "description": "Whether the message content is encrypted"
    },
    "isRead": {
      "type": "boolean",
      "default": false,
      "description": "Whether the message has been read by the receiver"
    },
    "readAt": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp when the message was read"
    },
    "replyToId": {
      "type": "string",
      "description": "ID of the message being replied to"
    },
    "reactions": {
      "type": "string",
      "description": "JSON string mapping emojis to arrays of user IDs who reacted"
    },
    "autoDeletePeriod": {
      "type": "integer",
      "default": 86400,
      "description": "Auto-delete period in minutes (inherited from conversation)"
    },
    "deleteAt": {
      "type": "string",
      "format": "date-time",
      "description": "Scheduled deletion timestamp"
    },
    "editedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of last edit"
    },
    "deletedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Soft deletion timestamp"
    },
    "$createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Auto-generated creation timestamp"
    },
    "$updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Auto-generated update timestamp"
    }
  }
}
```

### Indexes
```javascript
[
  {
    "key": "conversationId",
    "type": "key",
    "attributes": ["conversationId"],
    "orders": ["ASC"]
  },
  {
    "key": "conversationId_createdAt",
    "type": "key",
    "attributes": ["conversationId", "$createdAt"],
    "orders": ["ASC", "DESC"]
  },
  {
    "key": "receiverId_isRead",
    "type": "key",
    "attributes": ["receiverId", "isRead"],
    "orders": ["ASC", "ASC"]
  },
  {
    "key": "deleteAt",
    "type": "key",
    "attributes": ["deleteAt"],
    "orders": ["ASC"]
  },
  {
    "key": "senderId",
    "type": "key",
    "attributes": ["senderId"],
    "orders": ["ASC"]
  }
]
```

### Permissions
- **Create**: Users (authenticated)
- **Read**: Users (sender or receiver only)
- **Update**: Users (sender only for reactions, receiver only for isRead)
- **Delete**: Users (sender only)

## Features

### 1. End-to-End Encryption
- Messages between clients and escorts are encrypted using AES-GCM
- Encryption keys are stored in the conversation document
- Support messages are not encrypted for moderation purposes

### 2. Auto-Delete Messages
- Configurable per conversation: immediate, 5 minutes, 1 hour, 1 day, 1 week, or never
- Messages are automatically deleted based on the `deleteAt` timestamp
- Cleanup service runs periodically to remove expired messages

### 3. Message Types
- **text**: Regular text messages
- **image**: Photo attachments
- **video**: Video attachments
- **voice**: Voice messages with duration
- **file**: Document attachments (PDF, DOC, etc.)
- **system**: System notifications (gifts, payments, etc.)
- **gift**: Virtual gift messages with gift details

### 4. Rich Messaging Features
- Message reactions with emojis
- Reply to specific messages
- Read receipts
- Typing indicators (via real-time)
- Message editing with history
- Soft deletion with recovery option

### 5. Welcome Messages
- Automatic welcome message from support for new users
- Different messages for clients vs escorts
- Never auto-deleted for compliance

### 6. Gift System Integration
- Send virtual gifts during chat
- Gift transactions recorded as system messages
- Gift modal integrated into chat interface
- 8 gift types: Rose ($5), Heart ($10), Diamond ($25), Crown ($50), Star ($100), Rocket ($200), Unicorn ($500), Treasure ($1000)

### 7. Access Control
- Role-based conversation types
- Clients can only message escorts (not other clients)
- Escorts can message any client
- Support can message anyone
- Conversation permissions enforced at database level

## Usage Examples

### Create a new conversation
```javascript
const conversation = await databases.createDocument(
  DATABASE_ID,
  CONVERSATIONS_COLLECTION_ID,
  ID.unique(),
  {
    participants: [userId1, userId2],
    participantRoles: JSON.stringify({
      [userId1]: 'client',
      [userId2]: 'escort'
    }),
    initiatedBy: userId1,
    conversationType: 'client_escort',
    lastActivity: new Date().toISOString(),
    isArchived: false,
    encryptionKey: generateEncryptionKey(),
    autoDeletePeriod: 1440 // 1 day
  }
)
```

### Send an encrypted message
```javascript
const encryptedContent = await encryptMessage(messageText, conversation.encryptionKey)
const message = await databases.createDocument(
  DATABASE_ID,
  MESSAGES_COLLECTION_ID,
  ID.unique(),
  {
    conversationId: conversation.$id,
    senderId: currentUserId,
    receiverId: otherUserId,
    content: encryptedContent,
    type: 'text',
    isEncrypted: true,
    isRead: false,
    autoDeletePeriod: conversation.autoDeletePeriod,
    deleteAt: calculateDeleteTime(conversation.autoDeletePeriod)
  }
)
```

### Send a gift message
```javascript
const giftMessage = await databases.createDocument(
  DATABASE_ID,
  MESSAGES_COLLECTION_ID,
  ID.unique(),
  {
    conversationId: conversation.$id,
    senderId: currentUserId,
    receiverId: escortId,
    content: `Sent a Diamond 💎 gift`,
    type: 'system',
    isEncrypted: false,
    isRead: false,
    attachmentData: JSON.stringify({
      giftType: 'diamond',
      giftValue: 25,
      giftIcon: '💎'
    })
  }
)
```

### Query unread messages
```javascript
const unreadMessages = await databases.listDocuments(
  DATABASE_ID,
  MESSAGES_COLLECTION_ID,
  [
    Query.equal('receiverId', currentUserId),
    Query.equal('isRead', false),
    Query.orderDesc('$createdAt')
  ]
)
```