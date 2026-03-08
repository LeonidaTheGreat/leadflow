/**
 * POST /api/agents/onboarding/configure-phone
 * Stores an existing Twilio phone number for the agent.
 * Body: { phoneNumber: string }  — must be E.164 format (+1XXXXXXXXXX)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAgentId } from '@/lib/jwt-auth'

/** Validate E.164 format (US/Canada: +1 followed by 10 digits) */
function isValidE164(phone: string): boolean {
  return /^\+1\d{10}$/.test(phone)
}

/** Normalize a phone number to E.164 format (+1XXXXXXXXXX) */
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export async function POST(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phoneNumber } = await request.json().catch(() => ({}))

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
  }

  // Normalize to E.164
  const normalized = normalizePhone(phoneNumber)
  if (!normalized || !isValidE164(normalized)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Please enter a valid US or Canadian number (e.g. +12025551234).' },
      { status: 400 }
    )
  }

  // Persist
  const { error: upsertError } = await supabase.from('agent_integrations').upsert(
    { agent_id: agentId, twilio_phone_number: normalized },
    { onConflict: 'agent_id' }
  )

  if (upsertError) {
    console.error('agent_integrations upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to save phone number' }, { status: 500 })
  }

  const { error: agentError } = await supabase
    .from('real_estate_agents')
    .update({ phone_configured: true, onboarding_step: 2 })
    .eq('id', agentId)

  if (agentError) {
    console.error('Agent update error:', agentError)
    return NextResponse.json({ error: 'Failed to update agent record' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Phone number saved successfully',
    phoneNumber: normalized,
  })
}
