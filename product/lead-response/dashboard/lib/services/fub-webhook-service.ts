/**
 * FUB Webhook Service
 *
 * Business logic for handling Follow Up Boss (FUB) webhook events.
 * Extracted from app/api/webhook/fub/route.ts to keep routes thin.
 *
 * Routes are responsible for: auth, request parsing, signature verification, JSON responses.
 * This service is responsible for: lead creation/update from FUB events, AI qualification,
 * lead scoring, auto-response triggering.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin, createLead, getLeadByPhone, updateLead, createMessage } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { qualifyLead, generateAiSmsResponse, calculateLeadScore } from '@/lib/ai'
import { sendAiSmsResponse, normalizePhone, sendSms } from '@/lib/twilio'
import { logSmsActivity, logQualification } from '@/lib/fub'
import { pauseSequencesByAgent } from '@/lib/sequences'
import type { Lead, Agent, LeadStatus } from '@/lib/types'
import { realEstateAgentRowToAgent } from '@/lib/agent-mapper'

// ============================================
// HELPERS
// ============================================

export async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('status', 'active')
    .limit(1)

  const row = agents?.[0]
  return row ? realEstateAgentRowToAgent(row) : null
}

export function mapFubStatus(fubStatus: string): LeadStatus {
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
  return (statusMap[fubStatus] || 'new') as LeadStatus
}

/**
 * Fetch full lead data from FUB by URI when only resourceIds are provided.
 * Returns null if the fetch fails or no data is found.
 */
export async function fetchFubLeadByUri(uri: string): Promise<any | null> {
  const fubSystemName = (process.env.FUB_SYSTEM_NAME || 'LeadFlow-Properties').trim()
  const fubSystemKey = (process.env.FUB_SYSTEM_KEY || '').trim()
  const fubApiKey = (process.env.FUB_API_KEY || '').trim()
  const basicAuth = Buffer.from(`${fubApiKey}:`).toString('base64')

  try {
    const response = await fetch(uri, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'X-System': fubSystemName,
        'X-System-Key': fubSystemKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`FUB fetch failed: ${response.status} ${errorText}`)
      return null
    }

    const data = await response.json()
    if (data.people && data.people.length > 0) {
      return data.people[0]
    }

    logger.error('No people in FUB response')
    return null
  } catch (error) {
    logger.error('Failed to fetch lead from FUB', error)
    return null
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

export async function handleLeadCreated(
  fubLead: any,
  resourceIds?: number[],
  uri?: string
): Promise<Response> {
  // If we got resourceIds instead of full lead data, fetch from FUB
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    logger.info(`Fetching lead data from FUB: ${resourceIds} URI: ${uri}`)
    fubLead = await fetchFubLeadByUri(uri)

    if (!fubLead) {
      return NextResponse.json(
        { error: 'Failed to fetch lead data', details: 'fetch returned null' },
        { status: 500 }
      )
    }
  }

  if (!fubLead || !fubLead.id) {
    logger.error('No lead data after fetch', fubLead)
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  logger.info(`Processing lead.created: ${fubLead.id}`)

  // Extract phone from FUB format (phones array or phoneNumber field)
  const phoneNumber =
    fubLead.phoneNumber ||
    (fubLead.phones && fubLead.phones.length > 0 ? fubLead.phones[0].value : null)
  const phone = normalizePhone(phoneNumber || '')
  if (!phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
  }

  const { data: existingLead } = await getLeadByPhone(phone)

  if (existingLead) {
    logger.info(`Lead already exists: ${existingLead.id}`)
    if (!existingLead.fub_id) {
      await updateLead(existingLead.id, { fub_id: fubLead.id })
    }
    return NextResponse.json({ success: true, lead_id: existingLead.id, existing: true })
  }

  // Get default agent
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
    logger.error('Error creating lead', leadError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  logger.info(`Lead created: ${lead.id}`)

  // Run AI qualification
  const qualification = await qualifyLead({
    name: lead.name || undefined,
    email: lead.email || undefined,
    phone: lead.phone,
    source: lead.source,
    message: undefined,
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
    logger.info('Lead has not consented to SMS, skipping')
    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      sms_sent: false,
      reason: 'no_consent',
    })
  }

  // Check DNC
  if (lead.dnc) {
    logger.info('Lead is on DNC list, skipping SMS')
    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      sms_sent: false,
      reason: 'dnc',
    })
  }

  // Generate and send AI SMS response
  const enrichedLead = { ...lead, latest_qualification: qualification }
  const aiResponse = await generateAiSmsResponse(enrichedLead, agent, { trigger: 'initial' })
  const smsResult = await sendAiSmsResponse(enrichedLead, agent, aiResponse.message)

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

    await updateLead(lead.id, { responded_at: new Date().toISOString() })
    await logSmsActivity(fubLead.id, aiResponse.message, smsResult.messageSid!, smsResult.status!)

    logger.info(`AI SMS sent: ${smsResult.messageSid}`)
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

export async function handleLeadUpdated(
  fubLead: any,
  resourceIds?: number[],
  uri?: string
): Promise<Response> {
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    fubLead = await fetchFubLeadByUri(uri)
  }

  if (!fubLead || !fubLead.id) {
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  logger.info(`Processing lead.updated: ${fubLead.id}`)

  const { data: lead } = (await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('fub_id', fubLead.id)
    .single()) as { data: Lead | null }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  await updateLead(lead.id, {
    name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || lead.name,
    email: fubLead.email || lead.email,
    status: mapFubStatus(fubLead.status),
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, lead_id: lead.id })
}

export async function handleStatusChanged(
  fubLead: any,
  resourceIds?: number[],
  uri?: string
): Promise<Response> {
  if (resourceIds && uri && (!fubLead || !fubLead.id)) {
    fubLead = await fetchFubLeadByUri(uri)
  }

  if (!fubLead || !fubLead.id) {
    return NextResponse.json({ error: 'No lead data available' }, { status: 400 })
  }

  logger.info(`Processing lead.status_changed: ${fubLead.id}`)

  const { data: lead } = (await supabaseAdmin
    .from('leads')
    .select('*, agent:real_estate_agents(*)')
    .eq('fub_id', fubLead.id)
    .single()) as { data: Lead | null }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const agent = lead.agent as Agent
  const newStatus = mapFubStatus(fubLead.status)

  await updateLead(lead.id, { status: newStatus })

  // Send status-specific SMS for certain transitions
  const statusTriggers: Record<string, string> = {
    appointment: 'booking_confirmation',
    responded: 'followup',
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

export async function handleLeadAssigned(fubLead: any): Promise<Response> {
  logger.info(`Processing lead.assigned: ${fubLead.id}`)

  const { data: agentRow } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('fub_id', fubLead.agentId)
    .single()

  const agent = agentRow ? realEstateAgentRowToAgent(agentRow) : null

  if (!agent) {
    logger.info(`No agent found with fub_id: ${fubLead.agentId}`)
    return NextResponse.json({ success: true, sms_sent: false, reason: 'no_agent_found' })
  }

  await supabaseAdmin
    .from('leads')
    .update({ agent_id: agent.id })
    .eq('fub_id', fubLead.id)

  const { data: lead } = (await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('fub_id', fubLead.id)
    .single()) as { data: Lead | null }

  if (!lead) {
    logger.info(`Lead not found in database: ${fubLead.id}`)
    return NextResponse.json({ success: true, sms_sent: false, reason: 'lead_not_found' })
  }

  const shouldSendIntro =
    lead.consent_sms === true && lead.phone && agent.name && !lead.dnc

  if (!shouldSendIntro) {
    logger.info('Skipping intro SMS', {
      leadId: lead.id,
      hasConsent: lead.consent_sms,
      hasPhone: !!lead.phone,
      hasAgentName: !!agent.name,
      isDnc: lead.dnc,
    })
    return NextResponse.json({
      success: true,
      sms_sent: false,
      reason: lead.dnc
        ? 'dnc'
        : !lead.consent_sms
        ? 'no_consent'
        : !lead.phone
        ? 'no_phone'
        : 'no_agent_name',
    })
  }

  const leadFirstName = lead.name?.split(' ')[0] || 'there'
  const introMessage = `Hi ${leadFirstName}, I'm ${agent.name}, your new real estate agent. I'm here to help you find your perfect home. Feel free to text me anytime or reply STOP to opt out.`

  const smsResult = await sendSms({
    to: lead.phone,
    body: introMessage,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
  })

  if (smsResult.success) {
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

    await logSmsActivity(fubLead.id, introMessage, smsResult.messageSid!, smsResult.status!)
    logger.info(`Agent intro SMS sent: ${smsResult.messageSid}`)
  } else {
    logger.error('Failed to send intro SMS', smsResult.error)
  }

  return NextResponse.json({
    success: true,
    sms_sent: smsResult.success,
    sms_mock: smsResult.mock,
    reason: smsResult.success ? undefined : smsResult.error,
  })
}

/**
 * Handle FUB outbound activity (agent sent SMS/text from FUB inbox).
 * FUB fires textMessageSent / activityCreated when an agent sends from their inbox.
 * We pause active AI sequences for that lead so the human can own the conversation.
 */
export async function handleAgentOutboundActivity(activityData: any): Promise<Response> {
  const fubPersonId = activityData?.personId || activityData?.person?.id
  if (!fubPersonId) {
    logger.info('Agent outbound activity — no personId, skipping')
    return NextResponse.json({ received: true, sequences_paused: 0 })
  }

  logger.info(`Processing agent outbound activity for FUB person: ${fubPersonId}`)

  const { data: lead } = (await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('fub_id', String(fubPersonId))
    .single()) as { data: { id: string } | null }

  if (!lead) {
    logger.info(`No local lead found for FUB person: ${fubPersonId}`)
    return NextResponse.json({ received: true, sequences_paused: 0 })
  }

  const count = await pauseSequencesByAgent(lead.id)
  logger.info(`⏸ Agent outbound from FUB — paused ${count} sequence(s) for lead ${lead.id}`)

  return NextResponse.json({ success: true, sequences_paused: count })
}
