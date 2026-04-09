import { createClient } from '@/lib/db'
import { AuthService } from '@/lib/services/AuthService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)
const authService = new AuthService(supabase)

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  lastUsedAt: Date
  userAgent?: string
  ipAddress?: string
}

export interface SessionCreateInput {
  userId: string
  userAgent?: string
  ipAddress?: string
  rememberMe?: boolean
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return authService.generateToken()
}

export async function hashToken(token: string): Promise<string> {
  return authService.hashToken(token)
}

/**
 * Create a new session for a user
 */
export async function createSession(input: SessionCreateInput): Promise<Session> {
  return authService.createSession(input)
}

/**
 * Validate a session token and return the session if valid
 */
export async function validateSession(token: string): Promise<Session | null> {
  return authService.validateSession(token)
}

/**
 * Get user ID from a valid session token
 */
export async function getUserIdFromSession(token: string): Promise<string | null> {
  return authService.getUserIdFromSession(token)
}

/**
 * Delete a session by token (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await authService.destroySession(token)
}

export async function destroySession(token: string): Promise<void> {
  await authService.destroySession(token)
}

/**
 * Delete all sessions for a user (logout all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await authService.deleteAllUserSessions(userId)
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  return authService.getUserSessions(userId)
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  return authService.cleanupExpiredSessions()
}

/**
 * Extend session expiration (for "remember me" sessions)
 */
export async function extendSession(token: string, days: number = 30): Promise<boolean> {
  return authService.extendSession(token, days)
}

export { authService }
