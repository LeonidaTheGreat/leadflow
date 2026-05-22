import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { requireAdminSession } from '@/lib/admin-auth'

const DEFAULT_SESSION_HOURS = 24
const REMEMBER_ME_SESSION_DAYS = 30
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MS_PER_SECOND = 1000
const SESSION_TOKEN_BYTES = 32
const SHA256_HEX_LENGTH = 64
const SHA256_HEX_REGEX = /^[a-f0-9]+$/
const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production'

interface JWTPayload {
  userId?: string
  email?: string
  name?: string
  id?: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthResult {
  user: AuthUser | null
}

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

export interface SessionSummary {
  id: string
  userId: string
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

export class AuthService {
  constructor(
    private readonly db = supabaseAdmin,
    private readonly jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET
  ) {}

  generateSessionToken(): string {
    return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex')
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private isValidTokenHash(tokenHash: string): boolean {
    return tokenHash.length === SHA256_HEX_LENGTH && SHA256_HEX_REGEX.test(tokenHash)
  }

  private getSessionExpiryDate(rememberMe?: boolean): Date {
    const now = Date.now()
    const durationMs = rememberMe
      ? REMEMBER_ME_SESSION_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
      : DEFAULT_SESSION_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
    return new Date(now + durationMs)
  }

  async createSession(input: SessionCreateInput): Promise<Session> {
    const rawToken = this.generateSessionToken()
    const tokenHash = this.hashToken(rawToken)
    if (tokenHash === rawToken || !this.isValidTokenHash(tokenHash)) {
      throw new Error('Session token hashing failed')
    }
    const now = new Date()
    const expiresAt = this.getSessionExpiryDate(input.rememberMe)

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

    if (error) {
      logger.error('Failed to create session', error)
      throw new Error('Failed to create session')
    }

    return {
      id: data.id,
      userId: data.user_id,
      token: rawToken,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      lastUsedAt: new Date(data.last_used_at),
      userAgent: data.user_agent,
      ipAddress: data.ip_address,
    }
  }

  async validateSession(token: string): Promise<Session | null> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('token', this.hashToken(token))
      .single()

    if (error || !data) {
      return null
    }

    const expiresAt = new Date(data.expires_at)
    if (expiresAt < new Date()) {
      await this.deleteSession(token)
      return null
    }

    await this.db
      .from('sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return {
      id: data.id,
      userId: data.user_id,
      token,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      lastUsedAt: new Date(),
      userAgent: data.user_agent,
      ipAddress: data.ip_address,
    }
  }

  async getUserIdFromSession(token: string): Promise<string | null> {
    const session = await this.validateSession(token)
    return session?.userId || null
  }

  async deleteSession(token: string): Promise<void> {
    await this.db
      .from('sessions')
      .delete()
      .eq('token', this.hashToken(token))
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.db
      .from('sessions')
      .delete()
      .eq('user_id', userId)
  }

  async getUserSessions(userId: string): Promise<SessionSummary[]> {
    const { data, error } = await this.db
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('last_used_at', { ascending: false })

    if (error || !data) {
      return []
    }

    // Never return token material from persisted session rows.
    return data.map((session: any) => ({
      id: session.id,
      userId: session.user_id,
      expiresAt: new Date(session.expires_at),
      createdAt: new Date(session.created_at),
      lastUsedAt: new Date(session.last_used_at),
      userAgent: session.user_agent,
      ipAddress: session.ip_address,
    }))
  }

  async cleanupExpiredSessions(): Promise<number> {
    const { error, count } = await this.db
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      logger.error('Failed to cleanup expired sessions', error)
      return 0
    }

    return count || 0
  }

  async extendSession(token: string, days: number = REMEMBER_ME_SESSION_DAYS): Promise<boolean> {
    const newExpiresAt = new Date(
      Date.now() + days * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
    )

    const { error } = await this.db
      .from('sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('token', this.hashToken(token))

    return !error
  }

  async getAuthUserId(request: NextRequest): Promise<string | null> {
    const jwtToken =
      request.cookies.get('auth-token')?.value ||
      request.cookies.get('auth_token')?.value
    if (jwtToken) {
      try {
        const payload = jwt.verify(jwtToken, this.jwtSecret) as JWTPayload
        const userId = payload.userId || (payload as any).id
        if (userId) return userId
      } catch {}
    }

    const authHeader = (request.headers as any)?.get?.('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim()
      if (bearerToken) {
        try {
          const payload = jwt.verify(bearerToken, this.jwtSecret) as JWTPayload
          const userId = payload.userId || (payload as any).id
          if (userId) return userId
        } catch {}
      }
    }

    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (!sessionToken) {
      return null
    }

    const session = await this.validateSession(sessionToken)
    return session?.userId || null
  }

  async requireAdmin(request: NextRequest): Promise<boolean> {
    return requireAdminSession(request)
  }

  async auth(request: NextRequest): Promise<AuthResult> {
    const token = this.extractBearerOrCookieJwtToken(request)
    if (!token) {
      return { user: null }
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload
      if (!payload.userId) {
        return { user: null }
      }

      return {
        user: {
          id: payload.userId,
          email: payload.email ?? '',
        },
      }
    } catch {
      return { user: null }
    }
  }

  async getAuthenticatedAgent(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.substring(7), this.jwtSecret) as JWTPayload
        if (payload.userId) {
          return payload.userId
        }
      } catch {}
    }

    const sessionToken = request.cookies.get('leadflow_session')?.value
    if (sessionToken) {
      const session = await this.validateSession(sessionToken)
      if (session?.userId) {
        return session.userId
      }
    }

    return request.headers.get('x-agent-id')
  }

  private extractBearerOrCookieJwtToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7).trim() || null
    }

    return (
      request.cookies.get('auth-token')?.value ||
      request.cookies.get('auth_token')?.value ||
      null
    )
  }
}

export const authService = new AuthService()

export function generateSessionToken(): string {
  return authService.generateSessionToken()
}

export async function createSession(input: SessionCreateInput): Promise<Session> {
  return authService.createSession(input)
}

export async function validateSession(token: string): Promise<Session | null> {
  return authService.validateSession(token)
}

export async function getUserIdFromSession(token: string): Promise<string | null> {
  return authService.getUserIdFromSession(token)
}

export async function deleteSession(token: string): Promise<void> {
  return authService.deleteSession(token)
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  return authService.deleteAllUserSessions(userId)
}

export async function getUserSessions(userId: string): Promise<SessionSummary[]> {
  return authService.getUserSessions(userId)
}

export async function cleanupExpiredSessions(): Promise<number> {
  return authService.cleanupExpiredSessions()
}

export async function extendSession(token: string, days?: number): Promise<boolean> {
  return authService.extendSession(token, days)
}

export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  return authService.getAuthUserId(request)
}

export async function requireAdmin(request: NextRequest): Promise<boolean> {
  return authService.requireAdmin(request)
}

export async function auth(request: NextRequest): Promise<AuthResult> {
  return authService.auth(request)
}

export async function getAuthenticatedAgent(request: NextRequest): Promise<string | null> {
  return authService.getAuthenticatedAgent(request)
}
