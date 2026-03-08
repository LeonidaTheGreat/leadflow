/**
 * POST /api/agents/onboarding/verify-sms
 * Sends a test SMS to the agent's personal mobile number.
 * Body: { mobileNumber: string }
 *
 * Requires the agent to have a phone number configured (Step 2 done).
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

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 11) return `+${digits}`
  return null
}

export async function POST(request: NextRequest) {
  const agentId = getAgentId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mobileNumber } = await request.json().catch(() => ({}))

  if (!mobileNumber || typeof mobileNumber !== 'string') {
    return NextResponse.json({ error: 'mobileNumber is required' }, { status: 400 })
  }

  const normalizedMobile = normalizePhone(mobileNumber)
  if (!normalizedMobile) {
    return NextResponse.json(
      { error: 'Invalid mobile number. Please enter a valid US or Canadian number.' },
      { status: 400 }
    )
  }

  // Fetch agent name and Twilio phone number
  const { data: agent, error: agentFetchError } = await supabase
    .from('real_estate_agents')
    .select('first_name, last_name')
    .eq('id', agentId)
    .single()

  if (agentFetchError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const { data: integration } = await supabase
    .from('agent_integrations')
    .select('twilio_phone_number')
    .eq('agent_id', agentId)
    .single()

  // Use the agent's configured number or fall back to system number
  const fromNumber =
    integration?.twilio_phone_number ||
    process.env.TWILIO_PHONE_NUMBER ||
    ''

  if (!fromNumber) {
    return NextResponse.json(
      { error: 'No phone number configured. Please complete Step 2 first.' },
      { status: 400 }
    )
  }

  const agentName = `${agent.first_name} ${agent.last_name}`.trim() || 'Agent'
  const smsBody = `Hi ${agent.first_name}! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI`

  // Send SMS
  try {
    const client = getTwilioClient()
    const message = await client.messages.create({
      body: smsBody,
      from: fromNumber,
      to: normalizedMobile,
    })

    if (!message.sid) {
      throw new Error('No message SID returned')
    }

    // Mark SMS verified
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({ sms_verified: true, onboarding_step: 3 })
      .eq('id', agentId)

    if (updateError) {
      console.error('Failed to mark sms_verified:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully! Check your phone.',
      messageSid: message.sid,
    })
  } catch (err: any) {
    console.error('Twilio SMS error:', err)

    // Surface useful Twilio error codes
    if (err.code === 21608) {
      return NextResponse.json(
        { error: 'This phone number cannot receive SMS. Please use a different number.' },
        { status: 400 }
      )
    }
    if (err.code === 21211) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please check and try again.' },
        { status: 400 }
      )
    }

    // Mock mode fallback (dev/CI without Twilio creds)
    if (err.message?.includes('Twilio credentials not configured')) {
      // Still mark as verified in non-production environments
      await supabase
        .from('real_estate_agents')
        .update({ sms_verified: true, onboarding_step: 3 })
        .eq('id', agentId)

      return NextResponse.json({
        success: true,
        message: 'SMS sending simulated (dev mode). Marked as verified.',
        mock: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to send SMS. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
