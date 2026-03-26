import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
  process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
)

/**
 * GET /api/auth/me
 *
 * Reads the HTTP-only `auth-token` cookie, validates the JWT,
 * and returns the authenticated user object.
 *
 * Used as a server-side fallback when localStorage is empty
 * (e.g., incognito, SSR, new signup that hasn't written localStorage yet).
 *
 * Returns:
 *   200 { id, email, firstName, lastName, onboardingCompleted }  — valid cookie
 *   401 { error: "Unauthorized" }                                — missing or invalid cookie
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate JWT
    let payload: { userId?: string; id?: string; email?: string } | null = null
    try {
      payload = jwt.verify(authToken, JWT_SECRET) as {
        userId?: string
        id?: string
        email?: string
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Support both `userId` (trial/pilot signup) and `id` (trial/start) field names
    const agentId = payload.userId || payload.id
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up agent in Supabase
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, onboarding_completed')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      id: agent.id,
      email: agent.email,
      firstName: agent.first_name,
      lastName: agent.last_name,
      onboardingCompleted: agent.onboarding_completed ?? false,
    })
  } catch (err) {
    console.error('[api/auth/me] Unexpected error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
