/**
 * GET /api/agents/onboarding/status
 * Returns the current onboarding state for the authenticated agent.
 * Used to resume the wizard on re-login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAgentId } from '@/lib/jwt-auth'

export async function GET(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select(
        'id, first_name, last_name, onboarding_completed, onboarding_step, fub_connected, phone_configured, sms_verified'
      )
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Also fetch integration details
    const { data: integration } = await supabase
      .from('agent_integrations')
      .select('fub_api_key, twilio_phone_number')
      .eq('agent_id', agentId)
      .single()

    return NextResponse.json({
      onboardingCompleted: agent.onboarding_completed ?? false,
      onboardingStep: agent.onboarding_step ?? 0,
      fubConnected: agent.fub_connected ?? false,
      phoneConfigured: agent.phone_configured ?? false,
      smsVerified: agent.sms_verified ?? false,
      twilioPhoneNumber: integration?.twilio_phone_number ?? null,
      agentName: `${agent.first_name} ${agent.last_name}`.trim(),
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
