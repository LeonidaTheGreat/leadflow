import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/onboarding-auth'

/**
 * GET /api/agents/onboarding/status
 * Returns the current onboarding state for the authenticated agent.
 * Used to resume wizard on session restore.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthenticatedAgent(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: agent, error } = await supabase
    .from('real_estate_agents')
    .select('onboarding_completed, onboarding_step, fub_connected, phone_configured, sms_verified')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({
    onboardingCompleted: agent.onboarding_completed ?? false,
    currentStep: agent.onboarding_step ?? 0,
    fubConnected: agent.fub_connected ?? false,
    phoneConfigured: agent.phone_configured ?? false,
    smsVerified: agent.sms_verified ?? false,
  })
}
