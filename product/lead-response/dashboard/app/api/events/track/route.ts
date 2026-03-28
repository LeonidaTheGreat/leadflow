import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Allowlist of valid funnel events (FR-8)
const VALID_EVENTS = new Set([
  'trial_cta_clicked',
  'trial_signup_started',
  'trial_signup_completed',
  'dashboard_first_paint',
  'sample_data_rendered',
  'wizard_started',
  'wizard_step_completed',
  'aha_simulation_started',
  'aha_simulation_completed',
  'onboarding_completed',
])

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org'
  const key = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function getAgentIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try unified auth helper (checks auth-token JWT + leadflow_session cookie)
  const userId = await getAuthUserId(request)
  if (userId) return userId

  // Try Bearer header (client sends token from localStorage)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId?: string; id?: string }
      return payload.userId || payload.id || null
    } catch {
      // invalid token
    }
  }

  return null
}

/**
 * POST /api/events/track
 *
 * Records onboarding funnel events (FR-8).
 * Auth is optional — anonymous events (pre-signup) are accepted for
 * trial_cta_clicked and trial_signup_started.
 *
 * Body: { event: string, properties?: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, properties } = body as {
      event: string
      properties?: Record<string, unknown>
    }

    // Validate event name
    if (!event || typeof event !== 'string' || !VALID_EVENTS.has(event)) {
      return NextResponse.json(
        { error: 'Invalid or unknown event name' },
        { status: 400 }
      )
    }

    const agentId = await getAgentIdFromRequest(request)

    const supabase = getSupabase()

    // Persist to DB if Supabase is configured
    if (supabase) {
      await supabase.from('events').insert({
        event_type: event,
        agent_id: agentId || null,
        event_data: {
          ...(properties || {}),
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Non-critical endpoint — never return 5xx that would block UI
    console.error('[events/track] error:', error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
