/**
 * Inbound SMS Service
 *
 * Business logic for handling inbound SMS from leads via the Twilio webhook.
 * Extracted from app/api/webhook/twilio/route.ts to keep routes thin.
 *
 * Routes are responsible for: auth, request parsing, TwiML/JSON responses.
 * This service is responsible for: lead lookup/creation, opt-out/opt-in,
 * AI response generation, satisfaction ping scheduling.
 */

import { supabaseAdmin, createLead } from '@/lib/supabase'
import { generateAgentResponse, checkOptOut, extractInfo } from '@/agents/sms-agent/agent'
import { normalizePhone, sendSms } from '@/lib/twilio'
import { searchLeadByPhone, createLeadInFub } from '@/lib/fub'
import {
  classifyReply,
  getPendingSatisfactionPing,
  recordSatisfactionReply,
  sendSatisfactionPing,
} from '@/lib/satisfaction'
import type { Lead, Agent } from '@/lib/types'

// Satisfaction ping fires after AI response cooldown (10 min = 600000ms)
export const SATISFACTION_PING_DELAY_MS = 10 * 60 * 1000

// ============================================
// TYPES
// ============================================

export interface InboundSmsParams {
  from: string
  to: string
  body: string
  messageSid: string
  numMedia: number
}

export type InboundSmsResult =
  | { type: 'validation_error' }
  | { type: 'invalid_phone'; from: string }
  | { type: 'lead_creation_failed'; error: string }
  | { type: 'fub_creation_failed' }
  | { type: 'opt_out' }
  | { type: 'opt_in' }
  | { type: 'dnc' }
  | { type: 'satisfaction_handled' }
  | { type: 'ai_response'; message: string }
  | { type: 'no_auto_respond' }

// ============================================
// HELPERS
// ============================================

export async function getDefaultAgent(): Promise<Agent | null> {
  const { data: agents } = await supabaseAdmin
    .from('real_estate_agents')
    .select('*')
    .eq('is_active', true)
    .limit(1)

  return agents?.[0] || null
}

// ============================================
// LEAD LOOKUP / CREATION
// ============================================

/**
 * Find a lead by phone number.
 * If not found locally, check FUB. If not in FUB, create in FUB then create locally.
 * Returns { lead } on success, { error } on failure.
 */
export async function findOrCreateLeadByPhone(phone: string): Promise<
  | { lead: Lead; error?: never }
  | { lead?: never; error: string }
> {
  // Check local DB first
  const { data: existingLead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('*, agent:real_estate_agents(*)')
    .eq('phone', phone)
    .maybeSingle()

  if (!leadError && existingLead) {
    return { lead: existingLead as Lead }
  }

  // Not found locally — check FUB
  console.log('Lead not found locally, checking FUB:', phone)
  const fubLead = await searchLeadByPhone(phone)

  if (fubLead?.id) {
    console.log('Found lead in FUB:', fubLead.id)
    const agent = await getDefaultAgent()
    const { data: newLead } = await createLead({
      fub_id: String(fubLead.id),
      agent_id: agent?.id || null,
      name: `${fubLead.firstName || ''} ${fubLead.lastName || ''}`.trim() || null,
      email: fubLead.email || null,
      phone: phone,
      source: fubLead.source || 'fub_sync',
      status: 'new' as const,
      consent_sms: fubLead.consents?.sms || false,
      consent_email: fubLead.consents?.email || false,
    })
    if (!newLead) {
      return { error: 'Failed to create local lead from FUB' }
    }
    return { lead: newLead as Lead }
  }

  // Not in FUB — create new
  console.log('Creating NEW lead in FUB from inbound SMS:', phone)
  const createdFubLead = await createLeadInFub({
    firstName: 'New',
    lastName: 'Lead',
    phones: [{ value: phone, type: 'Mobile' }],
    source: 'SMS Inbound',
    stage: 'New Lead',
  })

  if (!createdFubLead?.id) {
    console.error('Failed to create lead in FUB')
    return { error: 'Failed to create lead in FUB' }
  }

  console.log('Lead created in FUB:', createdFubLead.id)
  const agent = await getDefaultAgent()

  const leadData: Partial<Lead> = {
    fub_id: String(createdFubLead.id),
    agent_id: agent?.id || null,
    name: `${createdFubLead.firstName || 'New'} ${createdFubLead.lastName || 'Lead'}`.trim(),
    email: createdFubLead.email || null,
    phone: phone,
    source: 'SMS Inbound',
    status: 'new',
    consent_sms: true,
    consent_email: false,
  }

  const { data: newLead, error: createError } = await createLead(leadData)
  if (createError || !newLead) {
    console.error('createLead error:', createError)
    return { error: createError?.message || 'Failed to create local lead' }
  }

  console.log('Local lead created:', newLead.id)
  return { lead: newLead as Lead }
}

// ============================================
// OPT-OUT HANDLING
// ============================================

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'end', 'quit']
const OPT_IN_KEYWORDS = ['start', 'subscribe', 'yes']

export function isOptOutMessage(body: string): boolean {
  const lower = body.toLowerCase()
  return OPT_OUT_KEYWORDS.some(
    kw => lower === kw || lower.startsWith(kw + ' ')
  )
}

export function isOptInMessage(body: string): boolean {
  const lower = body.toLowerCase()
  return OPT_IN_KEYWORDS.some(
    kw => lower === kw || lower.startsWith(kw + ' ')
  )
}

export async function handleOptOut(lead: Lead): Promise<void> {
  await supabaseAdmin
    .from('leads')
    .update({
      dnc: true,
      consent_sms: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  await supabaseAdmin.from('events').insert({
    lead_id: lead.id,
    event_type: 'opt_out',
    event_data: { source: 'inbound_sms' },
    source: 'twilio_webhook',
  })
}

export async function handleOptIn(lead: Lead): Promise<void> {
  await supabaseAdmin
    .from('leads')
    .update({
      consent_sms: true,
      dnc: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)
}

// ============================================
// SATISFACTION PING HANDLING
// ============================================

/**
 * Check for a pending satisfaction ping and handle the reply.
 * Returns true if a ping was found and handled (caller should return early).
 */
export async function handleSatisfactionReply(lead: Lead, body: string): Promise<boolean> {
  const pendingPing = await getPendingSatisfactionPing(lead.id)
  if (!pendingPing) {
    return false
  }

  console.log('Pending satisfaction ping found — classifying reply:', body)
  const rating = classifyReply(body)
  await recordSatisfactionReply(pendingPing.id, body, rating)
  console.log(`Satisfaction reply classified as: ${rating}`)

  if (rating === 'negative') {
    await supabaseAdmin.from('events').insert({
      lead_id: lead.id,
      event_type: 'satisfaction_negative',
      event_data: { raw_reply: body, rating, ping_id: pendingPing.id },
      source: 'twilio_webhook',
    })
  }

  return true
}

// ============================================
// INBOUND MESSAGE LOGGING
// ============================================

export async function saveInboundMessage(
  lead: Lead,
  body: string,
  messageSid: string,
  to: string
): Promise<void> {
  const { error: msgError } = await supabaseAdmin
    .from('messages')
    .insert({
      lead_id: lead.id,
      direction: 'inbound',
      channel: 'sms',
      message_body: body,
      ai_generated: false,
      twilio_sid: messageSid,
      status: 'pending',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (msgError) {
    console.error('Error saving inbound message:', msgError)
  }

  await supabaseAdmin
    .from('leads')
    .update({
      last_contact_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)

  await supabaseAdmin.from('events').insert({
    lead_id: lead.id,
    event_type: 'inbound_sms',
    event_data: {
      message: body,
      message_sid: messageSid,
      twilio_number: to,
    },
    source: 'twilio_webhook',
  })
}

// ============================================
// AI RESPONSE GENERATION
// ============================================

export interface AiResponseResult {
  message: string
  confidence: number
  action: string
}

/**
 * Resolve the agent for a lead (from joined data, then by ID, then default).
 */
export async function resolveAgent(lead: Lead): Promise<Agent | null> {
  let agent: Agent | null = (lead.agent as Agent) || null
  if (!agent && lead.agent_id) {
    const { data: agentData } = await supabaseAdmin
      .from('real_estate_agents')
      .select('*')
      .eq('id', lead.agent_id)
      .single()
    agent = agentData as Agent
  }
  if (!agent) {
    agent = await getDefaultAgent()
  }
  return agent
}

/**
 * Generate an AI response and persist the outbound message.
 * Schedules satisfaction ping if applicable.
 * Returns the response message text.
 */
export async function generateAndSaveAiResponse(
  lead: Lead,
  agent: Agent,
  inboundBody: string
): Promise<AiResponseResult> {
  // Fetch conversation history
  const { data: conversation } = await supabaseAdmin
    .from('messages')
    .select('direction, message_body, created_at')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true })
    .limit(10)

  // Check for opt-out via agent utility
  if (checkOptOut(inboundBody)) {
    console.log('Lead opted out via agent check:', lead.id)
    await supabaseAdmin.from('leads').update({ status: 'opted_out' }).eq('id', lead.id)
    return { message: "You've been opted out. You won't receive any more messages.", confidence: 1, action: 'opt_out' }
  }

  // Generate AI response
  // Cast lead to any: the agent's local Lead type adds bedrooms/bathrooms which are
  // not in the shared Lead type from @/lib/types, but the runtime shape is compatible.
  const agentResponse = await generateAgentResponse(
    lead as any,
    { id: agent.id, name: agent.name, market: agent.market, timezone: agent.timezone },
    conversation || [],
    inboundBody,
    { useLocalModel: false }
  )

  // Update lead with any extracted info
  const extractedInfo = extractInfo(inboundBody, null)
  if (Object.keys(extractedInfo).length > 0) {
    console.log('Updating lead with extracted info:', extractedInfo)
    await supabaseAdmin.from('leads').update({
      ...extractedInfo,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
  }

  // Add compliance footer if needed
  let cleanMessage = agentResponse.message.trim()
  if (
    !cleanMessage.toLowerCase().includes('stop to opt') &&
    !cleanMessage.toLowerCase().includes('reply stop')
  ) {
    cleanMessage += ' Reply STOP to opt out.'
  }

  // Save outbound message
  console.log('Saving outbound message to database...')
  const { data: outboundMsg, error: outboundError } = await supabaseAdmin
    .from('messages')
    .insert({
      lead_id: lead.id,
      direction: 'outbound',
      channel: 'sms',
      message_body: cleanMessage,
      ai_generated: true,
      ai_confidence: agentResponse.confidence,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (outboundError) {
    console.error('Error saving outbound message:', outboundError)
    await supabaseAdmin.from('events').insert({
      lead_id: lead.id,
      event_type: 'outbound_message_save_failed',
      event_data: {
        message_body: cleanMessage,
        error: outboundError.message,
        message_length: cleanMessage.length,
      },
      source: 'twilio_webhook',
    })
  } else {
    console.log('Outbound message saved:', outboundMsg?.id)
  }

  // Update responded_at
  await supabaseAdmin
    .from('leads')
    .update({ responded_at: new Date().toISOString() })
    .eq('id', lead.id)

  // Schedule satisfaction ping (fire-and-forget after delay)
  const conversationLength = conversation?.length || 0
  if (conversationLength >= 2) {
    const agentFull = agent as any
    const satisfactionEnabled = agentFull.satisfaction_ping_enabled !== false
    setTimeout(async () => {
      try {
        await sendSatisfactionPing({
          leadId: lead.id,
          agentId: agent.id,
          conversationId: lead.id,
          phone: lead.phone,
          lastAiMessageAt: new Date().toISOString(),
          agentSatisfactionPingEnabled: satisfactionEnabled,
        })
      } catch (e: any) {
        console.error('Satisfaction ping error:', e.message)
      }
    }, SATISFACTION_PING_DELAY_MS)
  }

  return {
    message: cleanMessage,
    confidence: agentResponse.confidence,
    action: agentResponse.action,
  }
}
