import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthenticatedAgent } from '@/lib/onboarding-auth'

/**
 * POST /api/agents/onboarding/verify-sms
 * Sends a real test SMS to the agent's personal mobile number using Twilio.
 * Marks sms_verified = true on success.
 *
 * Body: { mobileNumber: string, agentName: string }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const agentId = await getAuthenticatedAgent(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let mobileNumber: string
  let agentName: string
  try {
    const body = await request.json()
    mobileNumber = body.mobileNumber?.trim()
    agentName = body.agentName?.trim() || 'Agent'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!mobileNumber) {
    return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
  }

  // Normalize mobile number
  const digits = mobileNumber.replace(/\D/g, '')
  let toNumber: string
  if (digits.length === 10) {
    toNumber = `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    toNumber = `+${digits}`
  } else {
    return NextResponse.json(
      { error: 'Invalid phone number. Use a 10-digit US/Canada number.' },
      { status: 400 }
    )
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER_US

  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return NextResponse.json(
      { error: 'SMS service is not configured. Contact support.' },
      { status: 503 }
    )
  }

  if (!fromNumber) {
    return NextResponse.json(
      { error: 'LeadFlow sending number not configured. Contact support.' },
      { status: 503 }
    )
  }

  // Send test SMS with the exact copy from the PRD
  const smsBody = `Hi ${agentName}! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI`

  try {
    const twilio = require('twilio')(accountSid, authToken)
    const message = await twilio.messages.create({
      body: smsBody,
      from: fromNumber,
      to: toNumber,
    })

    if (!message.sid) {
      return NextResponse.json(
        { success: false, message: 'SMS could not be delivered. Please try again.' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('Twilio SMS error:', err)
    const userMessage =
      err.code === 21603
        ? 'Invalid phone number format.'
        : err.code === 21608
        ? 'That number cannot receive SMS. Check your number.'
        : 'Failed to send SMS. Please try again or contact support.'
    return NextResponse.json({ success: false, message: userMessage }, { status: 500 })
  }

  // Mark SMS verified and advance step
  const { error: updateError } = await supabase
    .from('real_estate_agents')
    .update({
      sms_verified: true,
      onboarding_step: 3,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)

  if (updateError) {
    console.error('Failed to mark sms_verified:', updateError)
    // SMS was sent — return success even if DB update fails
  }

  return NextResponse.json({
    success: true,
    message: 'SMS sent! Check your phone.',
  })
}
