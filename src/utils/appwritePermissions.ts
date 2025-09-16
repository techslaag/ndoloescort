import { Permission, Role } from 'appwrite'

/**
 * Appwrite permission helpers for consistent security across the application
 */

// Permission helper types
export type PermissionType = 'read' | 'create' | 'update' | 'delete'
export type RoleType = 'any' | 'users' | 'user' | 'team' | 'member' | 'guests'

/**
 * Create permissions for user-owned resources
 */
export function createUserPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]
}

/**
 * Create permissions for resources readable by all authenticated users
 */
export function createAuthenticatedReadPermissions(ownerId: string): string[] {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId))
  ]
}

/**
 * Create permissions for public profiles (escorts)
 */
export function createPublicProfilePermissions(ownerId: string): string[] {
  return [
    Permission.read(Role.any()), // Anyone can view
    Permission.update(Role.user(ownerId)), // Only owner can update
    Permission.delete(Role.user(ownerId)) // Only owner can delete
  ]
}

/**
 * Create permissions for private messages
 */
export function createMessagePermissions(senderId: string, recipientId: string): string[] {
  return [
    Permission.read(Role.user(senderId)),
    Permission.read(Role.user(recipientId)),
    Permission.update(Role.user(senderId)), // Only sender can edit
    Permission.delete(Role.user(senderId)) // Only sender can delete
  ]
}

/**
 * Create permissions for conversations
 */
export function createConversationPermissions(participantIds: string[]): string[] {
  const permissions: string[] = []
  
  // All participants can read
  participantIds.forEach(id => {
    permissions.push(Permission.read(Role.user(id)))
  })
  
  // Any authenticated user can create (to start new conversations)
  permissions.push(Permission.create(Role.users()))
  
  return permissions
}

/**
 * Create permissions for bookings
 */
export function createBookingPermissions(clientId: string, escortId: string): string[] {
  return [
    Permission.read(Role.user(clientId)),
    Permission.read(Role.user(escortId)),
    Permission.update(Role.user(clientId)), // Client can update (cancel)
    Permission.update(Role.user(escortId)), // Escort can update (accept/reject)
  ]
}

/**
 * Create permissions for reviews
 */
export function createReviewPermissions(reviewerId: string): string[] {
  return [
    Permission.read(Role.any()), // Public reviews
    Permission.create(Role.user(reviewerId)),
    Permission.update(Role.user(reviewerId)),
    Permission.delete(Role.user(reviewerId))
  ]
}

/**
 * Create permissions for support tickets
 */
export function createSupportTicketPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    // Support team would have additional permissions via teams
  ]
}

/**
 * Create permissions for notifications
 */
export function createNotificationPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)), // Mark as read
    Permission.delete(Role.user(userId))
  ]
}

/**
 * Validate if user has permission for a resource
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission)
}

/**
 * Create team-based permissions (for future use)
 */
export function createTeamPermissions(teamId: string, role?: string): string[] {
  if (role) {
    return [
      Permission.read(Role.team(teamId, role)),
      Permission.update(Role.team(teamId, role)),
      Permission.delete(Role.team(teamId, role))
    ]
  }
  
  return [
    Permission.read(Role.team(teamId)),
    Permission.update(Role.team(teamId)),
    Permission.delete(Role.team(teamId))
  ]
}

/**
 * Security best practices for permissions:
 * 
 * 1. Principle of Least Privilege
 *    - Grant only the minimum permissions necessary
 *    - Start restrictive and expand as needed
 * 
 * 2. Resource Ownership
 *    - Users should only modify their own resources
 *    - Shared resources need explicit permissions for each user
 * 
 * 3. Public vs Private Data
 *    - Public profiles: read(any), write(owner)
 *    - Private data: read/write(owner only)
 *    - Shared data: read(participants), write(owner)
 * 
 * 4. Audit Trail
 *    - Security events: write(system), read(owner)
 *    - Login attempts: write(system), read(admin)
 * 
 * 5. Never use Role.any() for write operations
 *    - Always require authentication for modifications
 *    - Use Role.users() for authenticated users
 *    - Use Role.user(id) for specific user access
 */