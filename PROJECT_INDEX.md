# Elite Escort Services - Project Index

## Project Overview
- **Name**: Elite Escort Services
- **Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia with persisted state
- **Router**: Vue Router
- **Backend**: Appwrite (BaaS)
- **Styling**: SCSS
- **Authentication**: Appwrite Auth with encrypted storage

## Technology Stack
- **Vue 3.4.38** - Frontend framework
- **TypeScript 5.5.3** - Type safety
- **Vite 5.4.2** - Build tool
- **Pinia 2.1.7** - State management
- **Vue Router 4.2.5** - Client-side routing
- **Appwrite 18.2.0** - Backend as a Service
- **Axios 1.6.2** - HTTP client
- **CryptoJS 4.2.0** - Encryption utilities
- **SASS 1.69.5** - CSS preprocessor

## Project Structure

### Core Configuration
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `index.html` - Entry HTML file

### Source Directory (`/src`)

#### Entry Points
- `main.ts` - Application bootstrap with Pinia and router initialization
- `App.vue` - Root component with age/location confirmation and layout routing

#### Routing
- `router/index.ts` - Route definitions with auth guards
  - Public routes: Home, Escorts, Services, About, etc.
  - Auth routes: Login, Signup, ForgotPassword, ResetPassword
  - Protected routes: UserProfile, EscortDashboard, EscortProfiles

#### State Management (`/stores`)
- `auth.ts` - Authentication store with encrypted persistence
- `location.ts` - Location management store

#### Views (`/views`)
- **Public Pages**: Home, Escorts, Services, About, Contact, FAQ, etc.
- **Auth Pages** (`/auth`): Login, Signup, ForgotPassword, ResetPassword
- **User Pages** (`/user`): Profile
- **Escort Pages** (`/escort`): Dashboard, Profiles, CreateProfile, EditProfile

#### Components (`/components`)
- **Core Components**: AgeConfirmation, LocationConfirmation, ErrorAlert
- **Layout Components** (`/layout`): AppHeader, AppFooter
- **Escort Components** (`/escort`): EscortCard

#### Layouts (`/layouts`)
- `DefaultLayout.vue` - Main application layout
- `AuthLayout.vue` - Authentication pages layout

#### Services & Libraries
- `lib/appwrite.ts` - Appwrite client configuration
- `lib/encryption.ts` - Encryption utilities for storage
- `services/escortService.ts` - Escort-related API services
- `composables/useErrorHandler.ts` - Error handling composable

#### Assets (`/assets`)
- `styles/main.scss` - Main stylesheet
- `images/` - Image assets organized by category
- `cities.json` & `countries.json` - Location data
- `video/` - Video backgrounds

### Key Features
1. **Authentication System**
   - Email/password authentication
   - Remember me functionality
   - Password reset with privacy protection
   - Encrypted storage adapter

2. **User Types**
   - Client users
   - Escort users (with dedicated dashboard)
   - Role-based route protection

3. **Age & Location Verification**
   - Modal-based age confirmation
   - Location selection and confirmation
   - Persisted location preferences

4. **Responsive Design**
   - Mobile-first approach
   - SCSS-based styling system
   - Multiple layout templates

5. **Security Features**
   - Encrypted local storage
   - Auth guards on protected routes
   - Privacy-focused password reset

### Build & Development
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

### Documentation Files
- `README.md` - Project documentation
- `ENCRYPTION_README.md` - Encryption implementation details
- `ERROR_HANDLING.md` - Error handling guidelines
- `FORGOT_PASSWORD_PRIVACY.md` - Password reset privacy considerations
- `LAYOUT_SYSTEM.md` - Layout system documentation