import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

/**
 * POST /api/agents/onboarding/configure-phone
 * Stores an existing Twilio phone number the agent already owns.
 *
 * Body: { phoneNumber: string }  — E.164 or 10-digit format accepted
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let phoneNumber: string
  try {
    const body = await request.json()
    phoneNumber = body.phoneNumber?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  // Normalize to E.164
  const digits = phoneNumber.replace(/\D/g, '')
  let e164: string
  if (digits.length === 10) {
    e164 = `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    e164 = `+${digits}`
  } else {
    return NextResponse.json(
      { error: 'Invalid phone number. Use a 10-digit US/Canada number.' },
      { status: 400 }
    )
  }

  // Store phone number in agent_integrations
  const { error: intError } = await supabase.from('agent_integrations').upsert(
    {
      agent_id: agentId,
      twilio_phone_number: e164,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agent_id' }
  )

  if (intError) {
    console.error('Failed to store phone number:', intError)
    return NextResponse.json({ error: 'Failed to save phone number' }, { status: 500 })
  }

  // Update agent onboarding state (only use columns that exist on the table)
  await supabase
    .from('real_estate_agents')
    .update({
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  return NextResponse.json({
    success: true,
    phoneNumber: e164,
    message: 'Phone number configured successfully!',
  })
}
