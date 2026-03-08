/**
 * POST /api/agents/onboarding/complete
 * Marks the onboarding wizard as complete for the agent.
 * Called when the agent reaches the completion screen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAgentId } from '@/lib/jwt-auth'

export async function POST(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('real_estate_agents')
    .update({
      onboarding_completed: true,
      onboarding_step: 3,
    })
    .eq('id', agentId)

  if (error) {
    console.error('Failed to mark onboarding complete:', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }

  // Fetch final status to return to client
  const { data: agent } = await supabase
    .from('real_estate_agents')
    .select('fub_connected, phone_configured, sms_verified')
    .eq('id', agentId)
    .single()

  const { data: integration } = await supabase
    .from('agent_integrations')
    .select('twilio_phone_number')
    .eq('agent_id', agentId)
    .single()

  return NextResponse.json({
    success: true,
    message: 'Onboarding complete! Welcome to LeadFlow.',
    status: {
      fubConnected: agent?.fub_connected ?? false,
      phoneConfigured: agent?.phone_configured ?? false,
      smsVerified: agent?.sms_verified ?? false,
      phoneNumber: integration?.twilio_phone_number ?? null,
    },
  })
}
