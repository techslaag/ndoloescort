# Calls Collection Schema

## Overview
The calls collection stores video and audio call sessions between users, tracking call metadata, duration, and status.

## Collection: calls

### Description
Stores all voice and video call sessions with support for real-time status updates and call analytics.

### JSON Schema
```json
{
  "$id": "calls",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["conversationId", "callerId", "receiverId", "type", "status"],
  "properties": {
    "$id": {
      "type": "string",
      "description": "Auto-generated call session ID"
    },
    "conversationId": {
      "type": "string",
      "description": "ID of the parent conversation"
    },
    "callerId": {
      "type": "string",
      "description": "User ID who initiated the call"
    },
    "receiverId": {
      "type": "string",
      "description": "User ID who received the call"
    },
    "type": {
      "type": "string",
      "enum": ["voice", "video"],
      "description": "Type of call"
    },
    "status": {
      "type": "string",
      "enum": ["pending", "active", "ended", "missed", "declined"],
      "default": "pending",
      "description": "Current status of the call"
    },
    "startedAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the call was answered/started"
    },
    "endedAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the call ended"
    },
    "duration": {
      "type": "integer",
      "description": "Call duration in seconds (calculated from startedAt and endedAt)"
    },
    "endReason": {
      "type": "string",
      "enum": ["completed", "cancelled", "declined", "failed", "no_answer", "busy"],
      "description": "Reason for call termination"
    },
    "agoraChannelName": {
      "type": "string",
      "description": "Agora channel name for this call session"
    },
    "recordingUrl": {
      "type": "string",
      "description": "URL to call recording (if enabled and available)"
    },
    "quality": {
      "type": "object",
      "description": "Call quality metrics",
      "properties": {
        "avgBitrate": {
          "type": "integer",
          "description": "Average bitrate in kbps"
        },
        "packetLoss": {
          "type": "number",
          "description": "Packet loss percentage"
        },
        "networkQuality": {
          "type": "string",
          "enum": ["excellent", "good", "poor", "bad", "very_bad"],
          "description": "Overall network quality assessment"
        }
      }
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
    "key": "callerId",
    "type": "key",
    "attributes": ["callerId"],
    "orders": ["ASC"]
  },
  {
    "key": "receiverId",
    "type": "key",
    "attributes": ["receiverId"],
    "orders": ["ASC"]
  },
  {
    "key": "status",
    "type": "key",
    "attributes": ["status"],
    "orders": ["ASC"]
  },
  {
    "key": "createdAt",
    "type": "key",
    "attributes": ["$createdAt"],
    "orders": ["DESC"]
  }
]
```

### Permissions
- **Create**: Users (authenticated)
- **Read**: Users (participants only)
- **Update**: Users (participants only)
- **Delete**: None (calls are historical records)

## Features

### 1. Call Types
- **Voice Calls**: Audio-only communication using device microphone
- **Video Calls**: Audio and video communication using camera and microphone

### 2. Call States
- **pending**: Call initiated, waiting for receiver to answer
- **active**: Call in progress
- **ended**: Call completed normally
- **missed**: Receiver didn't answer within timeout
- **declined**: Receiver explicitly declined the call

### 3. WebRTC Integration
- Uses Agora RTC SDK for real-time communication
- Supports peer-to-peer connections with TURN/STUN servers
- Automatic quality adaptation based on network conditions

### 4. Call Features
- Mute/unmute audio
- Enable/disable video
- Switch between front/back camera
- Speaker/earpiece toggle
- Picture-in-picture mode for video calls
- Network quality indicators

### 5. Security & Permissions
- Feature access control based on user subscription
- Encrypted communication channels
- Call recordings only with consent (future feature)

## Usage Examples

### Initiate a call
```javascript
const call = await databases.createDocument(
  DATABASE_ID,
  CALLS_COLLECTION_ID,
  ID.unique(),
  {
    conversationId: conversation.$id,
    callerId: currentUserId,
    receiverId: targetUserId,
    type: 'video',
    status: 'pending',
    agoraChannelName: `call_${ID.unique()}`
  }
)
```

### Accept a call
```javascript
const acceptedCall = await databases.updateDocument(
  DATABASE_ID,
  CALLS_COLLECTION_ID,
  callId,
  {
    status: 'active',
    startedAt: new Date().toISOString()
  }
)
```

### End a call
```javascript
const endedCall = await databases.updateDocument(
  DATABASE_ID,
  CALLS_COLLECTION_ID,
  callId,
  {
    status: 'ended',
    endedAt: new Date().toISOString(),
    duration: calculateDuration(call.startedAt),
    endReason: 'completed'
  }
)
```

### Query call history
```javascript
const callHistory = await databases.listDocuments(
  DATABASE_ID,
  CALLS_COLLECTION_ID,
  [
    Query.equal('callerId', userId),
    Query.equal('receiverId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(50)
  ]
)
```

## Agora Configuration

### Environment Variables
```env
VITE_AGORA_APP_ID=your_agora_app_id_here
VITE_AGORA_TOKEN_SERVER=https://your-token-server.com/api/token (optional)
```

### Token Server (Optional)
For production, implement a token server that generates temporary tokens:
```javascript
// Token server endpoint
POST /api/token
{
  "channelName": "call_abc123",
  "uid": "user123",
  "role": "publisher"
}

// Response
{
  "token": "temporary_rtc_token",
  "expires": 86400
}
```

## Call Flow

1. **Initiate Call**
   - Create call document with status 'pending'
   - Send push notification to receiver
   - Show outgoing call UI to caller

2. **Receive Call**
   - Show incoming call modal
   - Play ringtone
   - Allow accept/decline actions

3. **Accept Call**
   - Update call status to 'active'
   - Join Agora channel
   - Exchange media streams

4. **During Call**
   - Monitor network quality
   - Allow media controls
   - Track call duration

5. **End Call**
   - Update call status to 'ended'
   - Calculate duration
   - Leave Agora channel
   - Clean up resources

## Error Handling

### Common Errors
- **No microphone/camera permission**: Request permissions before call
- **Network connectivity issues**: Show quality indicators
- **Agora connection failed**: Retry with exponential backoff
- **Call timeout**: Mark as missed after 30 seconds

### Fallback Strategies
- Automatic quality degradation on poor network
- Audio-only mode when video fails
- Reconnection attempts on temporary disconnections