import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

const supabase = supabaseAdmin

/**
 * GET /api/auth/me
 *
 * Reads the HTTP-only `auth-token` or `leadflow_session` cookie,
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
    const agentId = await getAuthUserId(request)
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
