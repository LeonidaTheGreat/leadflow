import { NextRequest, NextResponse } from 'next/server'
import { handleStatusCallback, parseInboundMessage, isOptOut, isPositiveResponse } from '@/lib/twilio'
import { updateMessageStatus, createMessage, getLeadByPhone, updateLead, logEvent } from '@/lib/supabase'
import { classifyIntent, generateAiSmsResponse } from '@/lib/ai'
import { sendAiSmsResponse } from '@/lib/twilio'
import { getAgentById } from '@/lib/supabase'

// ============================================
// TWILIO STATUS CALLBACK & INBOUND WEBHOOK
// ============================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const body: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    console.log('📨 Twilio webhook:', body.MessageSid, body.MessageStatus || 'inbound')

    // Handle status callback (outbound message status update)
    if (body.MessageStatus) {
      return await handleStatusUpdate(body)
    }

    // Handle inbound message
    if (body.From && body.Body) {
      return await handleInboundMessage(body)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('❌ Twilio webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// STATUS UPDATE HANDLER
// ============================================

async function handleStatusUpdate(body: Record<string, string>) {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = body

  // Update message status in database
  const deliveredAt = MessageStatus === 'delivered' ? new Date().toISOString() : undefined
  
  const { error } = await updateMessageStatus(
    MessageSid,
    MessageStatus,
    deliveredAt
  )

  if (error) {
    console.error('❌ Error updating message status:', error)
  } else {
    console.log('✅ Message status updated:', MessageSid, MessageStatus)
  }

  // Log delivery failures
  if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
    await logEvent({
      event_type: 'sms_delivery_failed',
      event_data: {
        twilio_sid: MessageSid,
        status: MessageStatus,
        error_code: ErrorCode,
        error_message: ErrorMessage,
      },
      source: 'twilio_status_callback',
    })
  }

  return NextResponse.json({ received: true, status: MessageStatus })
}

// ============================================
// INBOUND MESSAGE HANDLER
// ============================================

async function handleInboundMessage(body: Record<string, string>) {
  const message = parseInboundMessage(body)
  
  console.log('📥 Inbound SMS from:', message.From)

  // Find lead by phone
  const { data: lead } = await getLeadByPhone(message.From)

  if (!lead) {
    console.log('⚠️  No lead found for phone:', message.From)
    
    // Log unmatched message
    await logEvent({
      event_type: 'inbound_sms_unmatched',
      event_data: {
        from: message.From,
        body: message.Body,
        twilio_sid: message.MessageSid,
      },
      source: 'twilio_inbound',
    })

    return NextResponse.json({ received: true, matched: false })
  }

  // Save inbound message
  await createMessage({
    lead_id: lead.id,
    direction: 'inbound',
    channel: 'sms',
    message_body: message.Body,
    ai_generated: false,
    twilio_sid: message.MessageSid,
    status: 'delivered',
    delivered_at: new Date().toISOString(),
    metadata: {
      num_media: message.NumMedia,
      media_url: message.MediaUrl0,
    },
  })

  // Update lead last contact
  await updateLead(lead.id, {
    last_contact_at: new Date().toISOString(),
  })

  // Log event
  await logEvent({
    event_type: 'inbound_sms_received',
    lead_id: lead.id,
    event_data: {
      body: message.Body,
      twilio_sid: message.MessageSid,
    },
    source: 'twilio_inbound',
  })

  // Handle opt-out
  if (isOptOut(message.Body)) {
    await handleOptOut(lead)
    return NextResponse.json({ received: true, action: 'opt_out' })
  }

  // Get agent for auto-response
  if (!lead.agent_id) {
    return NextResponse.json({ received: true, action: 'no_agent' })
  }

  const { data: agent } = await getAgentById(lead.agent_id)
  
  if (!agent || !agent.settings.auto_respond) {
    return NextResponse.json({ received: true, action: 'auto_respond_disabled' })
  }

  // Classify intent for smart response
  const intentResult = await classifyIntent(message.Body)
  console.log('🤖 Intent classified:', intentResult.intent, `(${(intentResult.confidence * 100).toFixed(0)}%)`)

  // Generate and send AI response
  let aiResponse: { message: string; confidence: number }
  
  if (intentResult.intent === 'book') {
    // Direct booking intent
    aiResponse = await generateAiSmsResponse(lead, agent, {
      trigger: 'initial',
      customContext: 'Lead wants to book an appointment',
    })
  } else if (intentResult.intent === 'question') {
    // Question - provide helpful response
    aiResponse = await generateAiSmsResponse(lead, agent, {
      trigger: 'followup',
      customContext: `Lead asked: ${message.Body}`,
    })
  } else if (isPositiveResponse(message.Body)) {
    // Positive response - nurture
    aiResponse = await generateAiSmsResponse(lead, agent, {
      trigger: 'followup',
      customContext: 'Lead expressed interest',
    })
  } else {
    // Generic response
    aiResponse = await generateAiSmsResponse(lead, agent, {
      trigger: 'followup',
      customContext: `Lead said: ${message.Body}`,
    })
  }

  // Send response
  const smsResult = await sendAiSmsResponse(lead, agent, aiResponse.message)

  if (smsResult.success) {
    await createMessage({
      lead_id: lead.id,
      direction: 'outbound',
      channel: 'sms',
      message_body: aiResponse.message,
      ai_generated: true,
      ai_confidence: aiResponse.confidence,
      twilio_sid: smsResult.messageSid,
      twilio_status: smsResult.status,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    await updateLead(lead.id, {
      responded_at: new Date().toISOString(),
    })

    console.log('✅ Auto-response sent')
  }

  return NextResponse.json({
    received: true,
    lead_id: lead.id,
    intent: intentResult.intent,
    auto_responded: smsResult.success,
  })
}

// ============================================
// OPT-OUT HANDLER
// ============================================

async function handleOptOut(lead: any) {
  console.log('🚫 Processing opt-out for lead:', lead.id)

  // Update lead DNC status
  await updateLead(lead.id, {
    dnc: true,
    status: 'dnc',
    consent_sms: false,
  })

  // Log event
  await logEvent({
    event_type: 'lead_opt_out',
    lead_id: lead.id,
    event_data: { source: 'sms_reply' },
    source: 'twilio_inbound',
  })

  // Send confirmation (optional - this is allowed even after opt-out)
  // Note: You can send one final confirmation message for opt-out
}
