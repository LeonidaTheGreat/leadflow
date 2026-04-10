import { createClient, supabaseAdmin, postgrestAdmin } from '@/lib/db'
import {
  REMEMBER_ME_DURATION_MS,
  SESSION_DURATION_MS,
  SESSION_TOKEN_BYTES,
} from '@/lib/config/auth'

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
const DEFAULT_API_KEY = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function mapSessionRowToSession(data, lastUsedAtOverride) {
  return {
    id: data.id,
    userId: data.user_id,
    token: data.token,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    lastUsedAt: lastUsedAtOverride || new Date(data.last_used_at),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
  }
}

export class AuthService {
  constructor(dbClient) {
    this.db = dbClient
  }

  static createDefaultService() {
    if (typeof createClient === 'function') {
      return new AuthService(createClient(DEFAULT_API_URL, DEFAULT_API_KEY))
    }

    // Tests sometimes mock @/lib/db without createClient.
    if (supabaseAdmin && typeof supabaseAdmin.from === 'function') {
      return new AuthService(supabaseAdmin)
    }
    if (postgrestAdmin && typeof postgrestAdmin.from === 'function') {
      return new AuthService(postgrestAdmin)
    }

    throw new Error('AuthService.createDefaultService() requires a DB client with .from()')
  }

  generateToken() {
    const bytes = new Uint8Array(SESSION_TOKEN_BYTES)
    globalThis.crypto.getRandomValues(bytes)
    return bytesToHex(bytes)
  }

  async hashToken(token) {
    const input = new TextEncoder().encode(token)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', input)
    return bytesToHex(new Uint8Array(digest))
  }

  async createSession(input) {
    const token = this.generateToken()
    const now = new Date()
    const expiresAt = input.rememberMe
      ? new Date(now.getTime() + REMEMBER_ME_DURATION_MS)
      : new Date(now.getTime() + SESSION_DURATION_MS)

    const { data, error } = await this.db
      .from('sessions')
      .insert({
        user_id: input.userId,
        token,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        last_used_at: now.toISOString(),
        user_agent: input.userAgent,
        ip_address: input.ipAddress,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create session:', error)
      throw new Error('Failed to create session')
    }

    return mapSessionRowToSession(data)
  }

  async validateSession(token) {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !data) {
      return null
    }

    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      await this.destroySession(token)
      return null
    }

    const nowIso = new Date().toISOString()
    await this.db
      .from('sessions')
      .update({ last_used_at: nowIso })
      .eq('id', data.id)

    return mapSessionRowToSession(data, new Date(nowIso))
  }

  async getUserIdFromSession(token) {
    const session = await this.validateSession(token)
    return session?.userId || null
  }

  async destroySession(token) {
    await this.db
      .from('sessions')
      .delete()
      .eq('token', token)
  }

  async destroyAllUserSessions(userId) {
    await this.db
      .from('sessions')
      .delete()
      .eq('user_id', userId)
  }

  async getUserSessions(userId) {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('last_used_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((session) => mapSessionRowToSession(session))
  }

  async cleanupExpiredSessions() {
    const { error, count } = await this.db
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Failed to cleanup expired sessions:', error)
      return 0
    }

    return count || 0
  }

  async extendSession(token, days = 30) {
    const newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const { error } = await this.db
      .from('sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', token)

    return !error
  }
}

export const authService = AuthService.createDefaultService()

// Named helpers keep callsites simple while centralizing behavior in AuthService.
export async function createSession(input) {
  return authService.createSession(input)
}

export async function validateSession(token) {
  return authService.validateSession(token)
}

export async function getUserIdFromSession(token) {
  return authService.getUserIdFromSession(token)
}

export async function deleteSession(token) {
  await authService.destroySession(token)
}

export async function deleteAllUserSessions(userId) {
  await authService.destroyAllUserSessions(userId)
}

export async function getUserSessions(userId) {
  return authService.getUserSessions(userId)
}

export async function cleanupExpiredSessions() {
  return authService.cleanupExpiredSessions()
}

export async function extendSession(token, days = 30) {
  return authService.extendSession(token, days)
}

export function generateSessionToken() {
  return authService.generateToken()
}

export async function hashToken(token) {
  return authService.hashToken(token)
}
