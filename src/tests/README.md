# Professional Profile Tests

This directory contains comprehensive tests for the Professional Profile creation and update functionality.

## Test Structure

```
tests/
├── setup.ts                     # Test environment setup
├── services/
│   └── profileService.test.ts   # Unit tests for ProfileService
├── components/
│   ├── CreateProfile.test.ts    # Component tests for profile creation
│   └── EditProfile.test.ts      # Component tests for profile editing
└── integration/
    └── profileFlow.test.ts      # Integration tests for complete profile flow
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/tests/services/profileService.test.ts
```

## Test Coverage

### ProfileService Unit Tests
- Profile CRUD operations (Create, Read, Update, Delete)
- Service management (Create, Update, Delete)
- Pricing management (Create, Update)
- Media upload and deletion
- Calendar/availability management
- Error handling

### CreateProfile Component Tests
- Component initialization and authentication checks
- Form step navigation and validation
- Service selection and description management
- Pricing configuration
- Working hours setup
- Media upload with file size validation
- Draft saving functionality
- Profile publishing with subscription checks

### EditProfile Component Tests
- Profile data loading and form population
- Service updates (add/remove/modify)
- Pricing updates
- Media management (upload new, remove existing)
- Form validation
- Save functionality with data consistency

### Integration Tests
- Complete profile creation flow
- Profile update flow with related data
- Draft to published transition
- Profile deletion cascade
- Subscription limit enforcement
- Error handling across the flow
- Data consistency between store and service

## Key Test Scenarios

### Profile Creation Flow
1. User authentication and role verification
2. Subscription limit checking
3. Multi-step form validation
4. Service selection with descriptions
5. Pricing configuration
6. Working hours setup
7. Media upload with blur options
8. Draft saving at any stage
9. Publishing with all validations

### Profile Update Flow
1. Loading existing profile data
2. Updating basic information
3. Managing services (add/remove/update)
4. Updating pricing options
5. Managing media files
6. Maintaining data consistency

### Edge Cases Tested
- Large file upload rejection (>5MB)
- Missing required fields validation
- Service description requirements
- Pricing validation (at least one valid price)
- Working hours validation (at least one day enabled)
- Subscription limit enforcement
- Error recovery and user feedback

## Mocking Strategy

### Service Layer Mocks
- Appwrite SDK functions (databases, storage, ID)
- Network requests
- File operations

### Component Mocks
- Child components (ErrorAlert, LocationDropdowns)
- Router navigation
- Store actions and state

### Test Data
- Mock profiles with complete data structure
- Mock services, pricing, and media
- Mock subscription states
- Mock user authentication states

## Best Practices

1. **Isolation**: Each test is isolated with fresh store instances
2. **Async Handling**: Proper use of `flushPromises()` for async operations
3. **Coverage**: Both happy path and error scenarios
4. **Readability**: Descriptive test names and clear assertions
5. **Maintainability**: Reusable mock data and helper functions