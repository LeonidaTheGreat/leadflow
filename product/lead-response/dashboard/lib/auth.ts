/**
 * Unified auth helper — resolves userId from either auth method:
 * 1. auth-token cookie (JWT from trial-signup)
 * 2. leadflow_session cookie (session token from login)
 *
 * Use this in all protected API routes instead of manually reading cookies.
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

/**
 * Extract authenticated userId from request cookies.
 * Tries JWT (auth-token) first, then session (leadflow_session).
 * Returns null if not authenticated.
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  // 1. Try JWT cookie (from trial-signup)
  const jwtToken = request.cookies.get('auth-token')?.value
  if (jwtToken) {
    try {
      const payload = jwt.verify(jwtToken, JWT_SECRET) as JWTPayload
      if (payload.userId) return payload.userId
    } catch {}
  }

  // 2. Try session cookie (from login)
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (sessionToken) {
    try {
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('user_id, expires_at')
        .eq('token', sessionToken)
        .single()

      if (session && new Date(session.expires_at) > new Date()) {
        return session.user_id
      }
    } catch {}
  }

  return null
}
