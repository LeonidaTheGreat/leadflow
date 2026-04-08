/**
 * POST /api/demo/send-aha-sms
 *
 * Sends a realistic AI lead response SMS to the agent's phone number
 * using the platform Twilio account. This lets agents experience the
 * aha moment without configuring FUB or their own Twilio credentials.
 *
 * Rate limited: 3 SMS per IP per 24 hours.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'
import { sendSms, normalizePhone, isValidPhoneNumber } from '@/lib/twilio'
import { checkDemoSmsRateLimit } from '@/lib/rate-limit'

const AHA_SMS_BODY =
  "Hi! I saw you're interested in 123 Main St. What timeline are you working with? - Sent by LeadFlow AI"

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Parse body
  let body: { phoneNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawPhone = body.phoneNumber
  if (!rawPhone || typeof rawPhone !== 'string') {
    return NextResponse.json(
      { error: 'phoneNumber is required' },
      { status: 400 }
    )
  }

  // Normalize & validate
  const phone = normalizePhone(rawPhone)
  if (!isValidPhoneNumber(phone)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Use format: +14165551234' },
      { status: 400 }
    )
  }

  // Rate limit by IP (3 per day)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const rateCheck = checkDemoSmsRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Max 3 demo SMS per day.',
        resetInSeconds: rateCheck.resetInSeconds,
      },
      { status: 429 }
    )
  }

  // Send SMS via platform Twilio account
  const smsResult = await sendSms({ to: phone, body: AHA_SMS_BODY })

  if (!smsResult.success) {
    return NextResponse.json(
      { error: 'Failed to send SMS', detail: smsResult.error },
      { status: 502 }
    )
  }

  const responseTimeMs = Date.now() - startTime

  // Mark aha_completed on the agent record
  try {
    await supabaseAdmin
      .from('real_estate_agents')
      .update({
        aha_completed: true,
        aha_response_time_ms: responseTimeMs,
      })
      .eq('id', agentId)
  } catch (err) {
    // Non-blocking — SMS already sent, log and continue
    console.error('Failed to update aha_completed:', err)
  }

  return NextResponse.json({
    success: true,
    responseTimeMs,
    mock: smsResult.mock ?? false,
    remaining: rateCheck.remaining,
  })
}
