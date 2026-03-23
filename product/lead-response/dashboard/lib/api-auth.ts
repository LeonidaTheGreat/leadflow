/**
 * API Authentication Helpers
 *
 * Provides a reusable `auth()` function for Route Handlers.
 * Supports two token sources (in priority order):
 *   1. Authorization: Bearer <jwt>  (preferred — used by mobile/API clients)
 *   2. auth-token cookie            (used by browser sessions)
 *
 * Usage:
 *   const { user } = await auth(request)
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthUser {
  /** The authenticated agent's UUID (maps to real_estate_agents.id) */
  id: string
  email: string
}

export interface AuthResult {
  user: AuthUser | null
}

/**
 * Extract and verify the JWT from the incoming request.
 *
 * Returns `{ user }` where `user` is null when:
 *   - No token is present
 *   - The token is expired or has an invalid signature
 */
export async function auth(request: NextRequest): Promise<AuthResult> {
  const token = extractToken(request)
  if (!token) return { user: null }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId?: string
      email?: string
    }

    if (!payload.userId) return { user: null }

    return {
      user: {
        id: payload.userId,
        email: payload.email ?? '',
      },
    }
  } catch {
    // Covers TokenExpiredError, JsonWebTokenError, etc.
    return { user: null }
  }
}

/**
 * Extract the raw JWT string from:
 *   1. Authorization: Bearer <token>
 *   2. auth-token cookie
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || null
  }

  return request.cookies.get('auth-token')?.value ?? null
}
