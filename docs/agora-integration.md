# Agora.io Video/Audio Call Integration

This document describes the integration of Agora.io for real-time video and audio calls in the Elite Companions platform.

## Overview

The platform uses Agora.io SDK for WebRTC-based real-time communication, providing high-quality video and audio calls between users. The integration includes:

- **Voice Calls**: High-quality audio calls with noise suppression
- **Video Calls**: HD video calls with adaptive bitrate
- **Call Controls**: Mute/unmute, camera toggle, speaker control
- **Network Quality**: Real-time network quality indicators
- **Call State Management**: Proper state synchronization via Appwrite

## Architecture

### Components

1. **AgoraService** (`/src/services/agoraService.ts`)
   - Manages Agora RTC client lifecycle
   - Handles local and remote media tracks
   - Provides event callbacks for UI updates
   - Manages network quality statistics

2. **CallInterface** (`/src/components/calls/CallInterface.vue`)
   - Telegram-style call UI with video/audio views
   - Auto-hiding controls for video calls
   - Network quality indicators
   - Audio visualizer for voice calls

3. **CallManager** (`/src/components/messaging/CallManager.vue`)
   - Initiates calls with proper error handling
   - Manages call state and UI transitions
   - Handles incoming call acceptance/rejection

4. **IncomingCallModal** (`/src/components/calls/IncomingCallModal.vue`)
   - Telegram-style incoming call screen
   - Ripple animations and ringtone support
   - Accept/decline actions

### Call Flow

1. **Initiating a Call**:
   ```
   User clicks call button → CallManager.startCall()
   → Creates call record in Appwrite (status: 'pending')
   → Sends system message to notify receiver
   → Opens CallInterface with Agora connection
   ```

2. **Receiving a Call**:
   ```
   Realtime subscription detects new call
   → Shows IncomingCallModal with ringtone
   → User accepts → Updates call status to 'active'
   → Opens CallInterface and joins Agora channel
   ```

3. **During Call**:
   ```
   Both users connected to same Agora channel
   → Audio/video streams exchanged via Agora
   → Call state synced via Appwrite database
   → Network quality monitored in real-time
   ```

4. **Ending Call**:
   ```
   User clicks end call → Leaves Agora channel
   → Updates call status to 'ended' with duration
   → Cleans up media streams and UI
   ```

## Configuration

### Environment Variables

```env
# Agora Configuration
VITE_AGORA_APP_ID=your_agora_app_id_here

# Optional: Token server for production
VITE_AGORA_TOKEN_SERVER=https://your-token-server.com/api/token
```

### Agora App Settings

1. Create an Agora account at https://www.agora.io
2. Create a new project with App ID authentication
3. For production, implement a token server for enhanced security

## Security Considerations

### Development Mode
- Uses App ID only (less secure)
- Suitable for testing and development
- No token expiration

### Production Mode
- Implement token server for dynamic token generation
- Tokens should expire after call duration
- User authentication required for token generation

### Token Server Implementation

```javascript
// Example token server endpoint
POST /api/agora/token
{
  "channelName": "call_abc123",
  "uid": "user123",
  "role": "publisher"
}

Response:
{
  "token": "006abc123...",
  "expireTime": 3600
}
```

## Media Permissions

The application requests camera and microphone permissions when initiating calls:

- **Audio Calls**: Microphone only
- **Video Calls**: Camera and microphone
- **Permission Denied**: Shows error message and ends call attempt

## Call Quality

### Adaptive Bitrate
- Video: 720p default, adapts based on network
- Audio: Automatic echo cancellation and noise suppression
- Optimized for mobile networks

### Network Quality Indicators
- 📶 Excellent/Good: Green signal
- 📵 Poor: Yellow signal  
- ❌ Bad/Down: Red signal

## Database Schema

### Calls Collection
```javascript
{
  "$id": "unique_call_id",
  "conversationId": "conversation_id",
  "callerId": "user_id",
  "receiverId": "user_id",
  "type": "voice" | "video",
  "status": "pending" | "active" | "ended" | "rejected",
  "startedAt": "ISO timestamp",
  "endedAt": "ISO timestamp",
  "duration": 120, // seconds
  "$createdAt": "ISO timestamp"
}
```

## Troubleshooting

### Common Issues

1. **"Agora App ID not configured"**
   - Add `VITE_AGORA_APP_ID` to `.env` file
   - Restart development server

2. **"Failed to access camera/microphone"**
   - Check browser permissions
   - Ensure HTTPS connection (required for WebRTC)
   - Try different browser

3. **"Failed to join channel"**
   - Verify Agora App ID is correct
   - Check network connectivity
   - Ensure channel name is valid

4. **Poor call quality**
   - Check network bandwidth (minimum 1.5 Mbps for video)
   - Reduce video quality in congested networks
   - Use wired connection when possible

## Future Enhancements

1. **Screen Sharing**
   - Add screen share button to video calls
   - Support for application/tab sharing

2. **Call Recording**
   - Server-side recording via Agora Cloud Recording
   - Playback interface for recorded calls

3. **Group Calls**
   - Multi-party video conferences
   - Active speaker detection
   - Grid/gallery view layouts

4. **Virtual Backgrounds**
   - AI-powered background blur
   - Custom background images
   - Green screen support

5. **Call Analytics**
   - Call quality metrics dashboard
   - Usage statistics
   - Performance monitoring