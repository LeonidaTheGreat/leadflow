import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

/**
 * GET /api/agents/onboarding/status
 * Returns the current onboarding state for the authenticated agent.
 * Used to resume wizard on session restore.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: agent, error } = await supabase
    .from('real_estate_agents')
    .select('onboarding_completed, onboarding_step')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // fub_connected, phone_configured, sms_verified don't exist on real_estate_agents.
  // Derive from onboarding_step: step >= 1 means FUB done, >= 2 means phone done, >= 3 means SMS done.
  const step = agent.onboarding_step ?? 0

  return NextResponse.json({
    onboardingCompleted: agent.onboarding_completed ?? false,
    currentStep: step,
    fubConnected: step >= 1,
    phoneConfigured: step >= 2,
    smsVerified: step >= 3,
  })
}
