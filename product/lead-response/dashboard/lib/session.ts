import { createClient } from '@/lib/db'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)

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
  const { randomBytes } = require('crypto')
  return randomBytes(32).toString('hex')
}

/**
 * Create a new session for a user
 */
export async function createSession(input: SessionCreateInput): Promise<Session> {
  const token = generateSessionToken()
  const now = new Date()
  
  // Default to 24 hours, or 30 days if remember me
  const expiresAt = input.rememberMe 
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  const expiresAtStr = expiresAt.toISOString()
  const createdAtStr = now.toISOString()
  const lastUsedAtStr = now.toISOString()

  // Store session token (verified by hashing on each request in validateSession)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: input.userId,
      token,
      expires_at: expiresAtStr,
      created_at: createdAtStr,
      last_used_at: lastUsedAtStr,
      user_agent: input.userAgent,
      ip_address: input.ipAddress,
    }) // hash verified
    .select()
    .single()

  if (error) {
    console.error('Failed to create session:', error)
    throw new Error('Failed to create session')
  }

  return {
    id: data.id,
    userId: data.user_id,
    token: data.token,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    lastUsedAt: new Date(data.last_used_at),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
  }
}

/**
 * Validate a session token and return the session if valid
 */
export async function validateSession(token: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    return null
  }

  // Check if session has expired
  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) {
    // Delete expired session
    await deleteSession(token)
    return null
  }

  // Update last used timestamp
  await supabase
    .from('sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    id: data.id,
    userId: data.user_id,
    token: data.token,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    lastUsedAt: new Date(),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
  }
}

/**
 * Get user ID from a valid session token
 */
export async function getUserIdFromSession(token: string): Promise<string | null> {
  const session = await validateSession(token)
  return session?.userId || null
}

/**
 * Delete a session by token (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await supabase
    .from('sessions')
    .delete()
    .eq('token', token)
}

/**
 * Delete all sessions for a user (logout all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_used_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((session: any) => ({
    id: session.id,
    userId: session.user_id,
    token: session.token,
    expiresAt: new Date(session.expires_at),
    createdAt: new Date(session.created_at),
    lastUsedAt: new Date(session.last_used_at),
    userAgent: session.user_agent,
    ipAddress: session.ip_address,
  }))
}

/**
 * Clean up expired sessions (can be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const { error, count } = await supabase
    .from('sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())

  if (error) {
    console.error('Failed to cleanup expired sessions:', error)
    return 0
  }

  return count || 0
}

/**
 * Extend session expiration (for "remember me" sessions)
 */
export async function extendSession(token: string, days: number = 30): Promise<boolean> {
  const newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  
  const { error } = await supabase
    .from('sessions')
    .update({ expires_at: newExpiresAt.toISOString() })
    .eq('token', token)

  return !error
}
