import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, createLead, getLeadByPhone, updateLead, createMessage, logEvent } from '@/lib/supabase'
import { qualifyLead, generateAiSmsResponse, calculateLeadScore } from '@/lib/ai'
import { sendAiSmsResponse, normalizePhone, isOptOut, sendSms } from '@/lib/twilio'
import { syncLeadToFub, logSmsActivity, logQualification, handleWebhookEvent, verifyWebhookSignature } from '@/lib/fub'
import { getAgentBookingLink } from '@/lib/calcom'
import type { FubWebhookPayload, Lead, Agent } from '@/lib/types'

// Force dynamic rendering - webhook must handle runtime requests
export const dynamic = 'force-dynamic'

// ============================================
// FUB WEBHOOK HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature')
    const secret = process.env.FUB_WEBHOOK_SECRET

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const isValid = verifyWebhookSignature(body, signature, secret)
      if (!isValid) {
        console.error('❌ Invalid FUB webhook signature')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload: FubWebhookPayload = JSON.parse(body)
    console.log('📨 FUB Webhook received:', payload.event)

    // Log the event
    await logEvent({
      event_type: `fub_${payload.event}`,
      event_data: payload.data,
      source: 'fub_webhook',
    })

    // Handle the event
    switch (payload.event) {
      case 'lead.created':
      case 'peopleCreated':
        return await handleLeadCreated(payload.data, payload.resourceIds, payload.uri)
      
      case 'lead.updated':
      case 'peopleUpdated':
        return await handleLeadUpdated(payload.data, payload.resourceIds, payload.uri)
      
      case 'lead.status_changed':
      case 'peopleStageUpdated':
        return await handleStatusChanged(payload.data, payload.resourceIds, payload.uri)
      
      case 'lead.assigned':
        return await handleLeadAssigned(payload.data)
      
      default:
        console.log('Unhandled FUB event:', payload.event)
        return NextResponse.json({ received: true, handled: false, event: payload.event })
    }
  } catch (error: any) {
    console.error('❌ FUB webhook error:', error)
    console.error('Error stack:', error.stack)
    
    // Try to log to Supabase, but don't fail if that also fails
    try {
      await logEvent({
        event_type: 'fub_webhook_error',
        event_data: { error: error.message, stack: error.stack },
        source: 'fub_webhook',
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleLeadCreated(fubLead: any, resourceIds?: number[], uri?: string) {
  // If we got resourceIds instead of full lead data, fetch from FUB
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    console.log('🆕 Fetching lead data from FUB:', resourceIds, 'URI:', uri)
    // Trim newlines from env vars (Vercel CLI adds them)
    const fubSystemName = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
    const fubSystemKey = (process.env.FUB_SYSTEM_KEY || '').trim()
    const fubApiKey = (process.env.FUB_API_KEY || '').trim()
    console.log('🔑 Using system:', fubSystemName)
    // FUB uses Basic Auth, not Bearer - API key is the username
    const basicAuth = Buffer.from(`${fubApiKey}:`).toString('base64')
    try {
      const response = await fetch(uri, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-System': fubSystemName,
          'X-System-Key': fubSystemKey,
        }
      })
      console.log('📡 FUB response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('📡 FUB data:', JSON.stringify(data).substring(0, 200))
        // FUB returns array of people
        if (data.people && data.people.length > 0) {
          fubLead = data.people[0]
          console.log('✅ Found lead:', fubLead.id)
        } else {
          console.error('❌ No people in FUB response')
        }
      } else {
        const errorText = await response.text()
        console.error('❌ FUB fetch failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Failed to fetch lead from FUB:', error)
      return NextResponse.json({ error: 'Failed to fetch lead data', details: String(error) }, { status: 500 })
    }
  }

  if (!fubLead || !fubLead.id) {
    console.error('❌ No lead data after fetch. fubLead:', fubLead)
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  console.log('🆕 Processing lead.created:', fubLead.id)

  // Extract phone from FUB format (phones array or phoneNumber field)
  const phoneNumber = fubLead.phoneNumber || 
    (fubLead.phones && fubLead.phones.length > 0 ? fubLead.phones[0].value : null)
  const phone = normalizePhone(phoneNumber || '')
  if (!phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
  }

  const { data: existingLead } = await getLeadByPhone(phone)
  
  if (existingLead) {
    console.log('📋 Lead already exists:', existingLead.id)
    // Update FUB ID if not set
    if (!existingLead.fub_id) {
      await updateLead(existingLead.id, { fub_id: fubLead.id })
    }
    return NextResponse.json({ success: true, lead_id: existingLead.id, existing: true })
  }

  // Get default agent (or assign based on rules)
  const agent = await getDefaultAgent()
  if (!agent) {
    return NextResponse.json({ error: 'No active agent found' }, { status: 500 })
  }

  // Create lead in database
  const { data: lead, error: leadError } = await createLead({
    fub_id: fubLead.id,
    agent_id: agent.id,
    name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || null,
    email: fubLead.email || null,
    phone: phone,
    source: fubLead.source || 'fub_webhook',
    source_metadata: fubLead,
    status: 'new',
    consent_sms: true,
    consent_email: fubLead.consents?.email || false,
    market: agent.market,
  })

  if (leadError || !lead) {
    console.error('❌ Error creating lead:', leadError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  console.log('✅ Lead created:', lead.id)

  // Run AI qualification
  const qualification = await qualifyLead({
    name: lead.name || undefined,
    email: lead.email || undefined,
    phone: lead.phone,
    source: lead.source,
    message: undefined, // Could fetch from FUB notes if needed
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
    bathrooms: qualification.bathrooms,
    notes: qualification.notes,
    confidence_score: qualification.confidence_score,
    is_qualified: qualification.is_qualified,
    qualification_reason: qualification.qualification_reason,
    raw_response: qualification.raw_response,
  } as any)

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

  // Log qualification in FUB
  await logQualification(fubLead.id, qualification)

  // Check consent before sending SMS
  if (!lead.consent_sms) {
    console.log('⚠️  Lead has not consented to SMS, skipping')
    return NextResponse.json({ 
      success: true, 
      lead_id: lead.id, 
      sms_sent: false,
      reason: 'no_consent'
    })
  }

  // Check DNC
  if (lead.dnc) {
    console.log('🚫 Lead is on DNC list, skipping SMS')
    return NextResponse.json({ 
      success: true, 
      lead_id: lead.id, 
      sms_sent: false,
      reason: 'dnc'
    })
  }

  // Generate and send AI SMS response
  const enrichedLead = { ...lead, latest_qualification: qualification }
  const aiResponse = await generateAiSmsResponse(enrichedLead, agent, {
    trigger: 'initial',
  })

  const smsResult = await sendAiSmsResponse(enrichedLead, agent, aiResponse.message)

  // Save message to database
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

    // Update lead responded_at
    await updateLead(lead.id, { responded_at: new Date().toISOString() })

    // Log in FUB
    await logSmsActivity(fubLead.id, aiResponse.message, smsResult.messageSid!, smsResult.status!)

    console.log('✅ AI SMS sent:', smsResult.messageSid)
  }

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    qualified: qualification.is_qualified,
    confidence: qualification.confidence_score,
    sms_sent: smsResult.success,
    sms_mock: smsResult.mock,
  })
}

async function handleLeadUpdated(fubLead: any, resourceIds?: number[], uri?: string) {
  // Fetch full lead data if needed
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    const fubSystemName = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
    const fubSystemKey = (process.env.FUB_SYSTEM_KEY || '').trim()
    const fubApiKey = (process.env.FUB_API_KEY || '').trim()
    const basicAuth = Buffer.from(`${fubApiKey}:`).toString('base64')
    try {
      const response = await fetch(uri, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-System': fubSystemName,
          'X-System-Key': fubSystemKey,
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.people && data.people.length > 0) {
          fubLead = data.people[0]
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch lead from FUB:', error)
    }
  }

  if (!fubLead || !fubLead.id) {
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  console.log('📝 Processing lead.updated:', fubLead.id)

  // Find lead by FUB ID
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('fub_id', fubLead.id)
    .single() as { data: Lead | null }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Update lead data
  await updateLead(lead.id, {
    name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || lead.name,
    email: fubLead.email || lead.email,
    status: mapFubStatus(fubLead.status),
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, lead_id: lead.id })
}

async function handleStatusChanged(fubLead: any, resourceIds?: number[], uri?: string) {
  // Fetch full lead data if needed
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    const fubSystemName = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
    const fubSystemKey = (process.env.FUB_SYSTEM_KEY || '').trim()
    const fubApiKey = (process.env.FUB_API_KEY || '').trim()
    const basicAuth = Buffer.from(`${fubApiKey}:`).toString('base64')
    try {
      const response = await fetch(uri, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-System': fubSystemName,
          'X-System-Key': fubSystemKey,
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.people && data.people.length > 0) {
          fubLead = data.people[0]
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch lead from FUB:', error)
    }
  }

  if (!fubLead || !fubLead.id) {
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  console.log('🔄 Processing lead.status_changed:', fubLead.id)

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*, agent:real_estate_agents(*)')
    .eq('fub_id', fubLead.id)
    .single() as { data: Lead | null }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const agent = lead.agent as Agent
  const newStatus = mapFubStatus(fubLead.status)

  // Update lead status
  await updateLead(lead.id, { status: newStatus })

  // Send status-specific SMS for certain transitions
  const statusTriggers: Record<string, string> = {
    'appointment': 'booking_confirmation',
    'responded': 'followup',
  }

  const trigger = statusTriggers[newStatus]
  if (trigger && agent && lead.consent_sms && !lead.dnc) {
    const aiResponse = await generateAiSmsResponse(lead, agent, {
      trigger: trigger as any,
      newStatus,
    })

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
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }
  }

  return NextResponse.json({ success: true, lead_id: lead.id })
}

async function handleLeadAssigned(fubLead: any) {
  console.log('👤 Processing lead.assigned:', fubLead.id)

  // Update agent assignment
  const { data: agent } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('fub_id', fubLead.agentId)
    .single()

  if (!agent) {
    console.log('⚠️  No agent found with fub_id:', fubLead.agentId)
    return NextResponse.json({ success: true, sms_sent: false, reason: 'no_agent_found' })
  }

  // Update lead with new agent
  await supabaseAdmin
    .from('leads')
    .update({ agent_id: agent.id })
    .eq('fub_id', fubLead.id)

  // Get lead data to check consent and phone
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('fub_id', fubLead.id)
    .single() as { data: Lead | null }

  if (!lead) {
    console.log('⚠️  Lead not found in database:', fubLead.id)
    return NextResponse.json({ success: true, sms_sent: false, reason: 'lead_not_found' })
  }

  // Check if we should send intro SMS
  const shouldSendIntro = 
    lead.consent_sms === true && 
    lead.phone && 
    agent.name &&
    !lead.dnc

  if (!shouldSendIntro) {
    console.log('📵 Skipping intro SMS:', {
      leadId: lead.id,
      hasConsent: lead.consent_sms,
      hasPhone: !!lead.phone,
      hasAgentName: !!agent.name,
      isDnc: lead.dnc,
    })
    return NextResponse.json({ 
      success: true, 
      sms_sent: false,
      reason: lead.dnc ? 'dnc' : !lead.consent_sms ? 'no_consent' : !lead.phone ? 'no_phone' : 'no_agent_name'
    })
  }

  // Generate intro SMS message
  const leadFirstName = lead.name?.split(' ')[0] || 'there'
  const introMessage = `Hi ${leadFirstName}, I'm ${agent.name}, your new real estate agent. I'm here to help you find your perfect home. Feel free to text me anytime or reply STOP to opt out.`

  // Send the SMS
  const smsResult = await sendSms({
    to: lead.phone,
    body: introMessage,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
  })

  if (smsResult.success) {
    // Store message in Supabase
    await createMessage({
      lead_id: lead.id,
      direction: 'outbound',
      channel: 'sms',
      message_body: introMessage,
      ai_generated: false,
      twilio_sid: smsResult.messageSid,
      twilio_status: smsResult.status,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    // Log SMS activity in FUB
    await logSmsActivity(fubLead.id, introMessage, smsResult.messageSid!, smsResult.status!)

    console.log('✅ Agent intro SMS sent:', smsResult.messageSid)
  } else {
    console.error('❌ Failed to send intro SMS:', smsResult.error)
  }

  return NextResponse.json({ 
    success: true, 
    sms_sent: smsResult.success,
    sms_mock: smsResult.mock,
    reason: smsResult.success ? undefined : smsResult.error,
  })
}

// ============================================
// HELPERS
// ============================================

async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('status', 'active')
    .limit(1)

  return agents?.[0] || null
}

function mapFubStatus(fubStatus: string): any {
  const statusMap: Record<string, string> = {
    'New Lead': 'new',
    'Working': 'qualified',
    'Nurture': 'nurturing',
    'Appointment Set': 'appointment',
    'Contacted': 'responded',
    'Closed': 'closed',
    'Dead': 'dnc',
    'Trash': 'spam',
  }
  return statusMap[fubStatus] || 'new'
}
