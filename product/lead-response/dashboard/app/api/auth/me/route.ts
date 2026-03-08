import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateSession } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/auth/me
 * Returns current user info including trial status for the dashboard nav badge.
 */
export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('leadflow_session')?.value

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const session = await validateSession(sessionToken)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const { data: agent, error } = await supabase
    .from('real_estate_agents')
    .select('id, email, first_name, last_name, plan_tier, trial_ends_at')
    .eq('id', session.userId)
    .single()

  if (error || !agent) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: agent.id,
      email: agent.email,
      firstName: agent.first_name,
      lastName: agent.last_name,
      planTier: agent.plan_tier,
      trialEndsAt: agent.trial_ends_at,
    },
  })
}
