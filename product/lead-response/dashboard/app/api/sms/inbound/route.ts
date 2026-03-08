/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook
 *
 * Handles:
 * 1. STOP opt-outs → update lead consent flag
 * 2. Satisfaction ping replies → classify and record
 * 3. General inbound messages → log to messages table
 *
 * Twilio sends form-encoded POST data (application/x-www-form-urlencoded)
 * Response should be TwiML (plain XML or empty 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  classifyReply,
  getPendingSatisfactionPing,
  recordSatisfactionReply,
} from '@/lib/satisfaction'
import { isOptOut } from '@/lib/twilio'

// Return empty TwiML so Twilio does not complain
const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await request.formData()
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString() || ''
    const messageSid = formData.get('MessageSid')?.toString() || ''

    console.log('📨 Inbound SMS:', { from, body: body.substring(0, 50), sid: messageSid })

    if (!from) {
      return new NextResponse(TWIML_OK, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ============================================
    // 1. Look up lead by phone number
    // ============================================
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, agent_id, phone, consent_sms, dnc')
      .or(`phone.eq.${from},phone.eq.${from.replace('+', '')}`)
      .maybeSingle()

    // ============================================
    // 2. Handle STOP (opt-out) — highest priority
    // ============================================
    if (isOptOut(body)) {
      console.log(`🚫 OPT-OUT received from ${from}`)
      if (lead) {
        await supabaseAdmin
          .from('leads')
          .update({ consent_sms: false, dnc: true })
          .eq('id', lead.id)
        console.log(`✅ Lead ${lead.id} opted out (DNC set)`)
      }

      // Log the inbound message
      await logInboundMessage(lead?.id || null, from, body, messageSid, 'opt_out')

      return new NextResponse(TWIML_OK, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    if (!lead) {
      // Unknown sender — log and return
      console.log(`⚠️  Unknown sender: ${from}`)
      return new NextResponse(TWIML_OK, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ============================================
    // 3. Check for pending satisfaction ping
    // ============================================
    const pendingPing = await getPendingSatisfactionPing(lead.id)

    if (pendingPing) {
      const rating = classifyReply(body)
      await recordSatisfactionReply(pendingPing.id, body, rating)

      console.log(`📊 Satisfaction reply recorded: "${body}" → ${rating} for lead ${lead.id}`)

      // Log as satisfaction reply type
      await logInboundMessage(lead.id, from, body, messageSid, 'satisfaction_reply')

      return new NextResponse(TWIML_OK, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ============================================
    // 4. General inbound message — log it
    // ============================================
    await logInboundMessage(lead.id, from, body, messageSid, 'reply')

    return new NextResponse(TWIML_OK, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error: any) {
    console.error('❌ /api/sms/inbound error:', error)
    // Always return 200 to Twilio to prevent retries
    return new NextResponse(TWIML_OK, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

// ============================================
// HELPER: Log inbound message to DB
// ============================================
async function logInboundMessage(
  leadId: string | null,
  from: string,
  body: string,
  messageSid: string,
  messageType: string
): Promise<void> {
  if (!leadId) return

  try {
    await supabaseAdmin.from('messages').insert({
      lead_id: leadId,
      direction: 'inbound',
      channel: 'sms',
      message_body: body,
      twilio_sid: messageSid,
      twilio_status: 'received',
      status: 'received',
      metadata: { message_type: messageType },
      created_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('❌ Failed to log inbound message:', err.message)
    // Non-fatal — don't rethrow
  }
}
