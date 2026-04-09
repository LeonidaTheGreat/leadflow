import { createClient } from '@/lib/db'
import {
  DEFAULT_SESSION_EXTENSION_DAYS,
  DEFAULT_SESSION_TTL_MS,
  MILLISECONDS_PER_DAY,
  REMEMBER_ME_SESSION_TTL_MS,
  SESSION_TOKEN_BYTES,
} from '@/lib/config/auth'

function toHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getRuntimeCrypto() {
  return globalThis.crypto
}

function mapSessionRow(data, token, lastUsedAtOverride = null) {
  return {
    id: data.id,
    userId: data.user_id,
    token,
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
    return new AuthService(
      createClient(
        process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
        process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
      )
    )
  }

  generateToken() {
    const runtimeCrypto = getRuntimeCrypto()
    if (runtimeCrypto?.getRandomValues) {
      const bytes = new Uint8Array(SESSION_TOKEN_BYTES)
      runtimeCrypto.getRandomValues(bytes)
      return toHex(bytes)
    }

    if (typeof runtimeCrypto?.randomBytes === 'function') {
      return runtimeCrypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex')
    }

    throw new Error('No secure random generator available for session tokens')
  }

  async hashToken(token) {
    const runtimeCrypto = getRuntimeCrypto()
    if (runtimeCrypto?.subtle?.digest) {
      const encoded = new TextEncoder().encode(token)
      const hashBuffer = await runtimeCrypto.subtle.digest('SHA-256', encoded)
      return toHex(new Uint8Array(hashBuffer))
    }

    if (typeof runtimeCrypto?.createHash === 'function') {
      return runtimeCrypto.createHash('sha256').update(token).digest('hex')
    }

    throw new Error('No SHA-256 implementation available for session hashing')
  }

  async createSession(input) {
    const rawToken = this.generateToken()
    const tokenHash = await this.hashToken(rawToken)
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + (input.rememberMe ? REMEMBER_ME_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS)
    )

    const { data, error } = await this.db
      .from('sessions')
      .insert({
        user_id: input.userId,
        token: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        last_used_at: now.toISOString(),
        user_agent: input.userAgent,
        ip_address: input.ipAddress,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create session:', error)
      throw new Error('Failed to create session')
    }

    return mapSessionRow(data, rawToken)
  }

  async validateSession(token) {
    const tokenHash = await this.hashToken(token)
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('token', tokenHash)
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
    await this.db.from('sessions').update({ last_used_at: nowIso }).eq('id', data.id)

    return mapSessionRow(data, token, new Date(nowIso))
  }

  async destroySession(token) {
    const tokenHash = await this.hashToken(token)
    await this.db.from('sessions').delete().eq('token', tokenHash)
  }

  async deleteAllUserSessions(userId) {
    await this.db.from('sessions').delete().eq('user_id', userId)
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

    return data.map((session) => mapSessionRow(session, session.token))
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

  async extendSession(token, days = DEFAULT_SESSION_EXTENSION_DAYS) {
    const newExpiresAt = new Date(Date.now() + days * MILLISECONDS_PER_DAY)
    const tokenHash = await this.hashToken(token)

    const { error } = await this.db
      .from('sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', tokenHash)

    return !error
  }

  async getUserIdFromSession(token) {
    const session = await this.validateSession(token)
    return session?.userId || null
  }
}
