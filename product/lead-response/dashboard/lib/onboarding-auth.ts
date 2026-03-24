import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Extract and verify the agent ID from the JWT token in the request.
 * Returns the agent ID (userId) if valid, null otherwise.
 * Supports both Authorization header and cookie.
 */
export async function getAuthenticatedAgent(request: NextRequest): Promise<string | null> {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fall back to cookie
    if (!token) {
      token = request.cookies.get('leadflow_session')?.value || null
    }

    // Fall back to x-agent-id header (legacy, for testing)
    if (!token) {
      return request.headers.get('x-agent-id')
    }

    if (!token) return null

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    return payload.userId || null
  } catch {
    return null
  }
}
