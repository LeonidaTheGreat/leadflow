/**
 * JWT authentication helper for onboarding and other API routes.
 * Extracts and verifies the JWT from the Authorization: Bearer header.
 */

import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthPayload {
  userId: string
  email: string
}

/**
 * Extract and verify JWT from the Authorization header.
 * Returns the payload if valid, null otherwise.
 */
export function verifyJwt(request: NextRequest): AuthPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    return payload
  } catch {
    return null
  }
}

/**
 * Get agent ID from JWT or x-agent-id header (fallback for internal tooling).
 * Returns null if neither is present/valid.
 */
export function getAgentId(request: NextRequest): string | null {
  const payload = verifyJwt(request)
  if (payload?.userId) return payload.userId

  // Allow internal x-agent-id header for testing
  const headerAgentId = request.headers.get('x-agent-id')
  if (headerAgentId && headerAgentId !== 'test-agent-id') return headerAgentId

  return null
}
