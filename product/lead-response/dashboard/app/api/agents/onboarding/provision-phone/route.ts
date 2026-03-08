import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/onboarding-auth'

/**
 * POST /api/agents/onboarding/provision-phone
 * Provisions a new Twilio phone number for the agent in the given area code.
 *
 * Body: { areaCode: string }
 *
 * Note (Q1 from PRD): Provisioned numbers are on LeadFlow's Twilio account.
 * Billing is abstracted — agent's plan covers it (no direct Twilio charge to agent).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthenticatedAgent(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let areaCode: string
  try {
    const body = await request.json()
    areaCode = body.areaCode?.toString().replace(/\D/g, '').slice(0, 3)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!areaCode || areaCode.length !== 3) {
    return NextResponse.json({ error: 'A valid 3-digit area code is required' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return NextResponse.json(
      { error: 'Twilio is not configured on this server' },
      { status: 503 }
    )
  }

  // Search for available numbers in the requested area code
  let availableNumber: string | null = null
  try {
    const twilio = require('twilio')(accountSid, authToken)

    const numbers = await twilio.availablePhoneNumbers('US').local.list({
      areaCode,
      smsEnabled: true,
      limit: 5,
    })

    if (!numbers || numbers.length === 0) {
      // Try without area code restriction
      const fallback = await twilio.availablePhoneNumbers('US').local.list({
        smsEnabled: true,
        limit: 1,
      })
      if (fallback.length === 0) {
        return NextResponse.json(
          { error: `No phone numbers available for area code ${areaCode}. Try a different area code.` },
          { status: 404 }
        )
      }
      availableNumber = fallback[0].phoneNumber
    } else {
      availableNumber = numbers[0].phoneNumber
    }

    // Purchase the number
    const purchased = await twilio.incomingPhoneNumbers.create({
      phoneNumber: availableNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fub-inbound-webhook.vercel.app'}/api/webhooks/sms`,
    })

    availableNumber = purchased.phoneNumber
  } catch (err: any) {
    console.error('Twilio provision error:', err)
    return NextResponse.json(
      { error: `Failed to provision phone number: ${err.message}` },
      { status: 500 }
    )
  }

  // Store phone number in agent_integrations
  const { error: intError } = await supabase.from('agent_integrations').upsert(
    {
      agent_id: agentId,
      twilio_phone_number: availableNumber,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agent_id' }
  )

  if (intError) {
    console.error('Failed to store phone number:', intError)
    return NextResponse.json({ error: 'Failed to save phone number' }, { status: 500 })
  }

  // Update agent onboarding state
  await supabase
    .from('real_estate_agents')
    .update({
      phone_configured: true,
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  return NextResponse.json({
    success: true,
    phoneNumber: availableNumber,
    message: 'Phone number provisioned successfully!',
  })
}
