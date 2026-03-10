import { NextRequest, NextResponse } from 'next/server'
import { createLead, getLeadByPhone, updateLead, createMessage, logEvent, getAgentById, supabaseAdmin } from '@/lib/supabase'
import { qualifyLead, generateAiSmsResponse, calculateLeadScore } from '@/lib/ai'
import { sendAiSmsResponse, normalizePhone } from '@/lib/twilio'
import type { Lead, Agent } from '@/lib/types'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// GENERIC LEAD WEBHOOK HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { name, email, phone, source, message, agent_id } = body
    
    if (!phone || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, source' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phone)

    // Check for duplicate lead
    const { data: existingLead } = await getLeadByPhone(normalizedPhone)
    if (existingLead) {
      console.log('📋 Lead already exists:', existingLead.id)
      return NextResponse.json({
        success: true,
        lead_id: existingLead.id,
        existing: true,
        message: 'Lead already exists',
      })
    }

    // Get agent (specified or default)
    let agent: Agent | null = null
    if (agent_id) {
      const { data } = await getAgentById(agent_id)
      agent = data
    }
    
    if (!agent) {
      const { data: agents } = await supabaseAdmin
        .from('real_estate_agents')
        .select('*')
        .eq('is_active', true)
        .limit(1)
      agent = agents?.[0] || null
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'No active agent found' },
        { status: 500 }
      )
    }

    // Create lead record
    const { data: lead, error: leadError } = await createLead({
      agent_id: agent.id,
      name: name || null,
      email: email || null,
      phone: normalizedPhone,
      source,
      source_metadata: body,
      status: 'new',
      consent_sms: true, // Assume consent from form submission
      market: agent.market,
    })

    if (leadError || !lead) {
      console.error('Lead creation error:', leadError)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    console.log('✅ Lead created:', lead.id)

    // Run AI qualification
    const qualification = await qualifyLead({
      name: lead.name || undefined,
      email: lead.email || undefined,
      phone: lead.phone,
      message,
      source,
      metadata: body,
    })

    // Save qualification
    await supabaseAdmin.from('qualifications').insert({
      lead_id: lead.id,
      intent: qualification.intent,
      budget_min: qualification.budget_min,
      budget_max: qualification.budget_max,
      timeline: qualification.timeline,
      location: qualification.location,
      property_type: qualification.property_type,
      bedrooms: qualification.bedrooms,
      confidence_score: qualification.confidence_score,
      is_qualified: qualification.is_qualified,
      qualification_reason: qualification.qualification_reason,
      raw_response: qualification.raw_response,
    })

    // Update lead with qualification data
    await updateLead(lead.id, {
      budget_min: qualification.budget_min,
      budget_max: qualification.budget_max,
      timeline: qualification.timeline,
      location: qualification.location,
      property_type: qualification.property_type,
      urgency_score: calculateLeadScore(qualification),
      status: qualification.is_qualified ? 'qualified' : 'new',
    })

    // Log event
    await logEvent({
      lead_id: lead.id,
      event_type: 'lead_received',
      event_data: { source, qualification },
    })

    // Send AI SMS response if qualified
    let smsResult: any = { success: false, mock: true, messageSid: undefined }
    
    if (qualification.is_qualified && agent.settings.auto_respond) {
      const enrichedLead = { ...lead, latest_qualification: qualification }
      const aiResponse = await generateAiSmsResponse(enrichedLead, agent, {
        trigger: 'initial',
      })

      smsResult = await sendAiSmsResponse(enrichedLead, agent, aiResponse.message)

      if (smsResult.success) {
        await createMessage({
          lead_id: lead.id,
          direction: 'outbound',
          channel: 'sms',
          message_body: aiResponse.message,
          ai_generated: true,
          ai_confidence: qualification.confidence_score,
          twilio_sid: smsResult.messageSid,
          twilio_status: smsResult.status,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })

        await updateLead(lead.id, {
          responded_at: new Date().toISOString(),
        })

        console.log('✅ AI SMS sent:', smsResult.messageSid)
      }
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      qualified: qualification.is_qualified,
      confidence: qualification.confidence_score,
      sms_sent: smsResult.success,
      sms_mock: smsResult.mock,
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
