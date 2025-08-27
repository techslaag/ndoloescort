# Layout System

This document outlines the layout system implemented in the application, which provides different layouts for authentication pages and regular content pages.

## Overview

The application uses two main layouts:

1. **AuthLayout**: For authentication pages (login, signup, password reset)
2. **DefaultLayout**: For all other pages (home, escorts, profile, etc.)

## Layout Components

### 1. AuthLayout (`src/layouts/AuthLayout.vue`)

A dedicated layout for authentication pages with the following features:

#### **Design Features**
- **Full-screen background**: Animated gradient background with overlay
- **Centered content**: All content is centered vertically and horizontally
- **Branded header**: Logo and page-specific title/description
- **Glass morphism cards**: Semi-transparent form cards with backdrop blur
- **Minimal footer**: Simple footer with essential links

#### **Components**
- **Logo section**: Displays the application logo
- **Page info**: Dynamic title and description based on route
- **Content area**: Slot for form components
- **Footer**: Privacy policy, terms, and contact links

#### **Styling**
- Animated gradient background
- Glass morphism effects
- Responsive design
- Smooth transitions and hover effects

### 2. DefaultLayout (`src/layouts/DefaultLayout.vue`)

A standard layout for regular pages with the following features:

#### **Design Features**
- **Header navigation**: Fixed header with navigation menu
- **Main content area**: Flexible content area with proper spacing
- **Footer**: Full footer with links and information
- **Standard spacing**: Consistent padding and margins

#### **Components**
- **AppHeader**: Navigation header with logo and menu
- **Main content**: Slot for page content
- **AppFooter**: Full footer with links and information

#### **Styling**
- Fixed header with proper content offset
- Standard page layout
- Responsive design
- Consistent spacing

## Implementation

### App.vue Layout Selection

The main App.vue component determines which layout to use based on the current route:

```typescript
// Determine if current route is an auth route
const isAuthRoute = computed(() => {
  const authRoutes = ['Login', 'Signup', 'ForgotPassword', 'ResetPassword']
  return authRoutes.includes(route.name as string)
})
```

### Layout Usage

```vue
<template>
  <!-- Use AuthLayout for authentication pages -->
  <AuthLayout v-if="isAuthRoute">
    <router-view />
  </AuthLayout>
  
  <!-- Use DefaultLayout for other pages -->
  <DefaultLayout v-else>
    <router-view />
  </DefaultLayout>
</template>
```

## Route Configuration

### Authentication Routes
- `/login` - Login page
- `/signup` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form

### Regular Routes
- `/` - Home page
- `/escorts` - Escorts listing
- `/profile` - User profile
- `/services` - Services page
- And all other content pages

## Benefits

### 1. **User Experience**
- **Focused authentication**: Clean, distraction-free auth pages
- **Consistent navigation**: Standard header/footer for content pages
- **Clear visual hierarchy**: Different layouts help users understand context

### 2. **Developer Experience**
- **Reusable layouts**: Consistent structure across similar pages
- **Easy maintenance**: Changes to layout affect all related pages
- **Clear separation**: Auth and content concerns are separated

### 3. **Performance**
- **Conditional rendering**: Only necessary components are rendered
- **Optimized loading**: Layout-specific optimizations
- **Reduced complexity**: Simpler component structure

## Styling Guidelines

### AuthLayout Styling
- Use glass morphism effects for form cards
- Implement smooth animations and transitions
- Use consistent spacing and typography
- Ensure high contrast for accessibility

### DefaultLayout Styling
- Use standard page layout patterns
- Maintain consistent header/footer styling
- Implement responsive design principles
- Follow established design system

## Responsive Design

### AuthLayout Responsive Features
- **Mobile-first design**: Optimized for mobile devices
- **Flexible cards**: Cards adapt to screen size
- **Touch-friendly**: Large touch targets for mobile
- **Readable typography**: Appropriate font sizes for all devices

### DefaultLayout Responsive Features
- **Collapsible navigation**: Mobile menu for navigation
- **Flexible content**: Content adapts to screen size
- **Consistent spacing**: Maintains spacing across devices
- **Accessible navigation**: Keyboard and screen reader support

## Customization

### Adding New Auth Routes
1. Add route name to `authRoutes` array in App.vue
2. Update `pageTitle` and `pageDescription` in AuthLayout.vue
3. Create the new auth component
4. Add route to router configuration

### Adding New Layouts
1. Create new layout component in `src/layouts/`
2. Add layout selection logic to App.vue
3. Update route configuration if needed
4. Test layout across different screen sizes

## Best Practices

### 1. **Layout Selection**
- Use AuthLayout only for authentication-related pages
- Use DefaultLayout for all content pages
- Consider user flow when choosing layouts

### 2. **Component Structure**
- Keep layout components focused on structure
- Use slots for flexible content injection
- Maintain clear separation of concerns

### 3. **Styling**
- Use CSS custom properties for consistent theming
- Implement responsive design patterns
- Ensure accessibility compliance

### 4. **Performance**
- Lazy load layout components when possible
- Optimize images and assets for each layout
- Minimize layout shifts during navigation

## Future Enhancements

### 1. **Additional Layouts**
- **AdminLayout**: For admin/management pages
- **DashboardLayout**: For user dashboard pages
- **LandingLayout**: For marketing/landing pages

### 2. **Advanced Features**
- **Layout transitions**: Smooth transitions between layouts
- **Dynamic layouts**: Context-aware layout selection
- **Layout persistence**: Remember user layout preferences

### 3. **Accessibility**
- **Screen reader optimization**: Enhanced accessibility
- **Keyboard navigation**: Improved keyboard support
- **High contrast mode**: Better visibility options

## Conclusion

The layout system provides a clean, maintainable approach to organizing different types of pages in the application. By separating authentication pages from content pages, we create a better user experience while maintaining code organization and reusability.

The system is designed to be extensible, allowing for easy addition of new layouts and routes as the application grows. 