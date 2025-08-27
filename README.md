# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Setup

### Appwrite Setup

This project uses Appwrite for backend services (authentication, database, storage):

1. Create an account at [Appwrite Cloud](https://cloud.appwrite.io) or set up a self-hosted instance
2. Create a new project
3. Copy your project ID and endpoint
4. In your Appwrite console, configure:
   - **Web Platform**: Add your domain (e.g., `http://localhost:5173` for development)
   - **Authentication**: Enable email/password authentication
   - **Security**: Configure password requirements and session settings
   - **Database**: Create collections as needed (users, profiles, conversations, messages, calls)

### Agora.io Setup

This project uses Agora.io for real-time video/audio calls:

1. Create an account at [Agora.io](https://www.agora.io)
2. Create a new project
3. Copy your App ID from the project dashboard
4. For production, set up a token server for enhanced security

### Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here

# Agora Configuration  
VITE_AGORA_APP_ID=your_agora_app_id_here

# Optional: Token server for production
VITE_AGORA_TOKEN_SERVER=https://your-token-server.com/api/token
```

## Features

### Core Platform
- User registration and login
- Password reset functionality  
- Comprehensive profile management with media uploads
- Session management with encrypted storage
- Protected routes with role-based access
- Real-time authentication state

### Messaging System
- End-to-end encrypted messaging
- Discord-style chat interface with dark theme
- Auto-delete messages for privacy
- Real-time message delivery and read receipts
- Role-based messaging permissions (client/escort/support)
- File and image sharing

### Video/Audio Calls
- **High-quality voice and video calls powered by Agora.io**
- Telegram-style call interface with auto-hiding controls
- Picture-in-picture video view with mirrored local video
- Audio visualizer for voice calls
- Network quality indicators and call statistics
- Incoming call modal with ripple animations
- Call state synchronization via real-time database
- Proper media permissions handling
- Mobile-optimized responsive design

### Security & Privacy
- End-to-end message encryption
- Secure file storage with Appwrite
- Role-based access control
- Auto-delete messages and media
- Secure session management