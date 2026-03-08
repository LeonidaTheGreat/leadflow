/**
 * POST /api/agents/onboarding/provision-phone
 * Searches for and provisions a new Twilio phone number for the agent.
 * Body: { areaCode: string }
 * 
 * Note: Provisioned number is billed to the LeadFlow Twilio account.
 * The agent does NOT need their own Twilio account for this flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAgentId } from '@/lib/jwt-auth'
import twilio from 'twilio'

function getTwilioClient(): twilio.Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    throw new Error('Twilio credentials not configured')
  }

  return twilio(accountSid, authToken)
}

export async function POST(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { areaCode } = await request.json().catch(() => ({}))

  if (!areaCode || !/^\d{3}$/.test(String(areaCode))) {
    return NextResponse.json(
      { error: 'A valid 3-digit area code is required (US/Canada)' },
      { status: 400 }
    )
  }

  let client: twilio.Twilio
  try {
    client = getTwilioClient()
  } catch {
    return NextResponse.json(
      { error: 'Phone provisioning is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  // --- 1. Search for available numbers ---
  let availableNumbers: any[]
  try {
    const numbers = await client.availablePhoneNumbers('US').local.list({
      areaCode: parseInt(areaCode, 10),
      smsEnabled: true,
      limit: 5,
    })
    availableNumbers = numbers
  } catch (err: any) {
    console.error('Twilio number search error:', err)
    return NextResponse.json(
      { error: `No phone numbers found for area code ${areaCode}. Please try a different area code.` },
      { status: 404 }
    )
  }

  if (!availableNumbers || availableNumbers.length === 0) {
    return NextResponse.json(
      { error: `No phone numbers available for area code ${areaCode}. Please try a different area code.` },
      { status: 404 }
    )
  }

  // --- 2. Provision the first available number ---
  const numberToBuy = availableNumbers[0].phoneNumber
  let purchasedNumber: string

  try {
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: numberToBuy,
      friendlyName: `LeadFlow Agent ${agentId.slice(0, 8)}`,
    })
    purchasedNumber = purchased.phoneNumber
  } catch (err: any) {
    console.error('Twilio number purchase error:', err)
    return NextResponse.json(
      { error: 'Failed to provision phone number. Please try again or use an existing number.' },
      { status: 500 }
    )
  }

  // --- 3. Store in Supabase ---
  const { error: upsertError } = await supabase.from('agent_integrations').upsert(
    { agent_id: agentId, twilio_phone_number: purchasedNumber },
    { onConflict: 'agent_id' }
  )

  if (upsertError) {
    console.error('agent_integrations upsert error:', upsertError)
    // Don't fail — number is provisioned, just log the issue
    console.error('Failed to save phone number to DB. Provisioned:', purchasedNumber)
  }

  const { error: agentError } = await supabase
    .from('real_estate_agents')
    .update({ phone_configured: true, onboarding_step: 2 })
    .eq('id', agentId)

  if (agentError) {
    console.error('Agent update error:', agentError)
  }

  return NextResponse.json({
    success: true,
    message: 'Phone number provisioned successfully',
    phoneNumber: purchasedNumber,
  })
}
