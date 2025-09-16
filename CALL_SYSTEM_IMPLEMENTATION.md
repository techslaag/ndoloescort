# Audio/Video Call System Implementation

## Overview
The call system is fully implemented with WebRTC using Agora SDK for real-time audio and video communication.

## Components

### 1. CallManager.vue
- Manages call initiation and controls
- Handles incoming/outgoing calls
- Integrated into MessageThread header

### 2. CallInterface.vue
- Main call UI with video/audio display
- Controls for mute, video toggle, speaker
- Network quality indicators
- Picture-in-picture for video calls

### 3. IncomingCallModal.vue
- Displays incoming call notifications
- Accept/Decline buttons
- Ringtone and visual effects

### 4. AgoraService.ts
- WebRTC integration using Agora SDK
- Handles media streams and connections
- Network quality monitoring

## Features Implemented

### ✅ Voice Calls
- One-to-one audio calls
- Mute/unmute functionality
- Speaker toggle
- Audio quality optimization

### ✅ Video Calls
- One-to-one video calls
- Camera on/off toggle
- Front/back camera switch
- Local video preview (mirrored)
- Remote video display

### ✅ Call Controls
- Accept/Decline incoming calls
- End call button
- Mute audio
- Toggle video
- Speaker selection

### ✅ UI Features
- Incoming call modal with ringtone
- Call duration timer
- Network quality indicators
- Responsive design for mobile
- Picture-in-picture mode

### ✅ Integration
- Integrated with messaging system
- Call buttons in chat header
- Call history in database
- System messages for call events

## Configuration Required

### 1. Agora App ID
Add your Agora App ID to `.env`:
```env
VITE_AGORA_APP_ID=your_agora_app_id_here
```

### 2. Optional Token Server
For production security, implement a token server:
```env
VITE_AGORA_TOKEN_SERVER=https://your-token-server.com/api/token
```

## Testing Instructions

### 1. Setup
1. Get an Agora App ID from https://console.agora.io
2. Add it to your `.env` file
3. Restart the development server

### 2. Test Voice Call
1. Log in as a client
2. Navigate to an escort's profile
3. Click "Message" to start a chat
4. Click the phone icon in the chat header
5. Select "Voice Call"

### 3. Test Video Call
1. Follow steps 1-4 above
2. Select "Video Call"
3. Grant camera/microphone permissions when prompted

### 4. Test Incoming Call
1. Open the app in two browser windows
2. Log in as different users
3. Start a call from one window
4. The other window should show incoming call modal

## Troubleshooting

### Common Issues

1. **"Agora App ID not configured"**
   - Add VITE_AGORA_APP_ID to your .env file

2. **No audio/video**
   - Check browser permissions
   - Ensure microphone/camera are not in use by other apps

3. **Connection failed**
   - Check internet connection
   - Verify Agora App ID is correct
   - Check if firewall is blocking WebRTC

4. **Poor quality**
   - Check network bandwidth
   - Reduce video resolution in settings
   - Switch to audio-only call

## Security Considerations

1. **Token Authentication**
   - In production, use temporary tokens
   - Implement server-side token generation
   - Tokens should expire after call duration

2. **Access Control**
   - Calls restricted based on user roles
   - Feature access based on subscription
   - Rate limiting to prevent abuse

3. **Privacy**
   - End-to-end encryption via Agora
   - No call recording without consent
   - Automatic cleanup of call data

## Future Enhancements

1. **Group Calls**
   - Support for multiple participants
   - Grid view for video calls
   - Participant management

2. **Screen Sharing**
   - Share screen during calls
   - Presentation mode
   - Annotation tools

3. **Call Recording**
   - Optional recording with consent
   - Cloud storage integration
   - Playback functionality

4. **Advanced Features**
   - Virtual backgrounds
   - Noise cancellation
   - Beauty filters
   - Call scheduling