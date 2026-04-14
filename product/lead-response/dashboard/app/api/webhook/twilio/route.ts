import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizePhone } from '@/lib/twilio'
import {
  findOrCreateLeadByPhone,
  resolveAgent,
  isOptOutMessage,
  isOptInMessage,
  handleOptOut,
  handleOptIn,
  handleSatisfactionReply,
  saveInboundMessage,
  generateAndSaveAiResponse,
} from '@/lib/services/inbound-sms-service'
import type { Agent } from '@/lib/types'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// TWILIO INBOUND SMS WEBHOOK
// ============================================

/**
 * Handle incoming SMS from leads
 * POST /api/webhook/twilio
 *
 * Twilio sends form data:
 * - From: sender phone number
 * - To: Twilio phone number
 * - Body: message text
 * - MessageSid: unique message ID
 * - NumMedia: number of media attachments
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Twilio webhook START')
    const formData = await request.formData()
    console.log('📥 FormData parsed')

    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = (formData.get('Body') as string || '').trim()
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    console.log('📥 Inbound SMS:', { from, to, body: body.substring(0, 50), messageSid })

    // Validate required fields
    if (!from || !body) {
      console.error('❌ Missing required fields in Twilio webhook')
      return emptyTwiml()
    }

    // Normalize phone number
    const phone = normalizePhone(from)
    if (!phone) {
      console.error('❌ Invalid phone number:', from)
      return emptyTwiml()
    }

    // Find or create lead
    const leadResult = await findOrCreateLeadByPhone(phone)
    if (!leadResult.lead) {
      console.error('❌ Lead creation failed:', leadResult.error)
      if (leadResult.error === 'Failed to create lead in FUB') {
        return NextResponse.json({ success: false, error: 'Failed to create lead in FUB' }, { status: 500 })
      }
      return NextResponse.json({ success: false, error: leadResult.error || 'Failed to create or find lead' }, { status: 500 })
    }
    const lead = leadResult.lead

    // Resolve agent
    const agent = await resolveAgent(lead)

    // Check for opt-out keywords (TCPA compliance)
    if (isOptOutMessage(body)) {
      console.log('🚫 Opt-out request from:', phone)
      await handleOptOut(lead)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed. You will no longer receive messages. Reply START to resubscribe.</Message>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    // Check for opt-in keywords
    if (isOptInMessage(body) && !lead.consent_sms) {
      console.log('✅ Opt-in request from:', phone)
      await handleOptIn(lead)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you! You are now subscribed to receive messages. Reply STOP at any time to unsubscribe.</Message>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    // Check if lead is on DNC list
    if (lead.dnc || !lead.consent_sms) {
      console.log('🚫 Lead on DNC or no consent:', phone)
      return emptyTwiml()
    }

    // Check for pending satisfaction ping reply
    const satisfactionHandled = await handleSatisfactionReply(lead, body)
    if (satisfactionHandled) {
      return emptyTwiml()
    }

    // Save inbound message
    await saveInboundMessage(lead, body, messageSid, to)

    // Determine if we should auto-respond
    console.log('🤖 Agent check:', {
      hasAgent: !!agent,
      agentId: agent?.id,
      market: agent?.market,
      hasSettings: !!agent?.settings,
      autoRespond: agent?.settings?.auto_respond,
    })
    const hasRequiredAgent = agent && agent.market && agent.settings
    const shouldAutoRespond = hasRequiredAgent && agent!.settings?.auto_respond !== false
    console.log('🤖 Auto-respond decision:', { hasRequiredAgent, shouldAutoRespond })

    if (shouldAutoRespond) {
      console.log('🤖 Generating AI response for lead:', lead.id)

      const aiResult = await generateAndSaveAiResponse(lead, agent!, body)

      // Special case: opt-out detected during AI processing
      if (aiResult.action === 'opt_out') {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(aiResult.message)}</Message>
</Response>`
        return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
      }

      console.log('✅ Agent response generated:', {
        action: aiResult.action,
        confidence: aiResult.confidence,
      })

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(aiResult.message)}</Message>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    // No auto-respond
    return emptyTwiml()
  } catch (error: any) {
    console.error('❌ Twilio webhook error:', error)
    console.error('Stack:', error.stack)

    try {
      await supabaseAdmin.from('events').insert({
        event_type: 'webhook_error',
        event_data: {
          error: error.message,
          stack: error.stack,
          source: 'twilio_webhook',
        },
        source: 'twilio_webhook',
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    // Return empty TwiML on error (don't expose errors to Twilio)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n</Response>`,
      { headers: { 'Content-Type': 'text/xml' }, status: 200 }
    )
  }
}

// ============================================
// STATUS CALLBACK (for delivery tracking)
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const messageSid = formData.get('MessageSid') as string
    const status = formData.get('MessageStatus') as string
    const errorCode = formData.get('ErrorCode') as string

    console.log('📊 SMS Status Update:', { messageSid, status, errorCode })

    const { error } = await supabaseAdmin
      .from('messages')
      .update({
        twilio_status: status,
        error_code: errorCode,
        delivered_at: status === 'delivered' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('twilio_sid', messageSid)

    if (error) {
      console.error('❌ Error updating message status:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Status callback error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ============================================
// HELPERS
// ============================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function emptyTwiml(status = 200): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n</Response>`,
    { headers: { 'Content-Type': 'text/xml' }, status }
  )
}
