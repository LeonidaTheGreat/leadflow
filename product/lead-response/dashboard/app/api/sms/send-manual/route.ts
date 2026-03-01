import { NextRequest, NextResponse } from 'next/server'
import { sendSms } from '@/lib/twilio'
import { createMessage, getLeadById, getAgentById } from '@/lib/supabase'
import { generateAiSmsResponse } from '@/lib/ai'

/**
 * POST /api/sms/send-manual
 * 
 * UC-7: Dashboard Manual SMS - Send endpoint
 * 
 * Accepts:
 * - lead_id: UUID (required)
 * - message_body: string (required if ai_assist=false)
 * - ai_assist: boolean (optional, default false)
 * 
 * Returns:
 * - success: boolean
 * - message_id: UUID
 * - status: string ('sent' | 'delivered' | 'failed')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, message_body, ai_assist = false } = body

    // Validation
    if (!lead_id) {
      return NextResponse.json(
        { error: 'Missing required field: lead_id' },
        { status: 400 }
      )
    }

    if (!ai_assist && !message_body) {
      return NextResponse.json(
        { error: 'Missing message_body (required when ai_assist=false)' },
        { status: 400 }
      )
    }

    // Get lead with agent
    const { data: lead, error: leadError } = await getLeadById(lead_id)
    
    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Validate agent permission
    if (!lead.agent_id) {
      return NextResponse.json(
        { error: 'Lead has no assigned agent' },
        { status: 400 }
      )
    }

    const { data: agent } = await getAgentById(lead.agent_id)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Check consent and DNC
    if (!lead.consent_sms || lead.dnc) {
      return NextResponse.json(
        { error: 'Lead has not consented to SMS or is on DNC list' },
        { status: 403 }
      )
    }

    // Determine final message content
    let finalMessage: string
    let aiConfidence: number | undefined

    if (ai_assist) {
      // AI generates suggestion
      const aiResponse = await generateAiSmsResponse(lead, agent, {
        trigger: 'manual',
      })
      finalMessage = aiResponse.message
      aiConfidence = aiResponse.confidence
    } else {
      // Use provided message
      finalMessage = message_body
    }

    // Send SMS via Twilio
    const result = await sendSms({
      to: lead.phone,
      body: finalMessage,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS', code: result.errorCode },
        { status: 500 }
      )
    }

    // Store message in Supabase
    const { data: messageRecord, error: messageError } = await createMessage({
      lead_id: lead.id,
      direction: 'outbound',
      channel: 'sms',
      message_body: finalMessage,
      ai_generated: ai_assist,
      ai_confidence: aiConfidence,
      twilio_sid: result.messageSid,
      twilio_status: result.status,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (messageError) {
      console.error('❌ Failed to save message:', messageError)
      return NextResponse.json(
        { error: 'SMS sent but failed to save to database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: messageRecord?.id,
      status: result.status,
      message_body: finalMessage,
      ai_generated: ai_assist,
      twilio_sid: result.messageSid,
    })

  } catch (error: any) {
    console.error('❌ Send manual SMS error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
