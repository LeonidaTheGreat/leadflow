import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'
import { randomUUID, randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

/**
 * POST /api/onboarding/simulator
 *
 * Handles onboarding simulator actions:
 * - action: 'start' - Start a new simulation
 * - action: 'status' - Check simulation status
 * - action: 'skip'   - Skip the simulation
 *
 * Uses TIME-BASED deterministic simulation — state is calculated from
 * elapsed time since simulation_started_at, stored in DB. No in-memory
 * state or background async tasks are used, making this fully compatible
 * with Vercel serverless (each request may hit a different instance).
 */

// --- Scripted content ---

const LEAD_NAMES = ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Thompson', 'Lisa Park']
const PROPERTY_INTERESTS = [
  'a 3-bedroom home',
  'a downtown condo',
  'a family house',
  'investment property',
  'a new construction',
]

const LEAD_MESSAGES = [
  (name: string, property: string) =>
    `Hi, I'm ${name}. I'm interested in ${property || 'buying a home'}. Can you help me?`,
  () => `Yes, I'd like to see some listings. My budget is around $600,000.`,
  () => `That sounds great! When can we schedule a call to discuss?`,
]

function generateAiResponse(turn: number, leadName: string, propertyInterest: string | null): string {
  const firstName = leadName.split(' ')[0]
  const property = propertyInterest || 'real estate'

  switch (turn) {
    case 0:
      return `Hi ${firstName}! 👋 I'm your AI assistant from LeadFlow. I'd love to help you with ${property}. I can show you our latest listings and help schedule a viewing. Are you looking to buy in the next 1–3 months?`
    case 1:
      return `Perfect! With a $600K budget, you have some excellent options in the area. I've found 3 properties that match your criteria — would you like me to send you details? I can also check availability for a walkthrough this week.`
    case 2:
      return `I'd be happy to set that up! 📅 I have availability this Thursday at 2 PM or Friday at 10 AM. Which works best for you? I'll send a calendar invite right away. Reply STOP at any time to opt out.`
    default:
      return `Thanks for reaching out! Let me connect you with our team for next steps.`
  }
}

// --- Timing constants (ms from simulation_started_at) ---
// Fixed schedule — deterministic across all serverless instances.
const TIMING = {
  LEAD_1_AT: 1500,       // first lead message appears
  AI_1_AT: 3000,         // AI responds to first message (response_time_ms = AI_1_AT - LEAD_1_AT)
  LEAD_2_AT: 4500,
  AI_2_AT: 6000,
  LEAD_3_AT: 7500,
  AI_3_AT: 9000,         // simulation complete
  TIMEOUT_AT: 90000 }

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

type SimulationStatus =
  | 'idle'
  | 'running'
  | 'inbound_received'
  | 'ai_responded'
  | 'success'
  | 'skipped'
  | 'timeout'
  | 'failed'

interface SimulationState {
  id: string
  session_id: string
  agent_id: string
  status: SimulationStatus
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: ConversationTurn[]
  lead_name: string
  error_message?: string
}

// Helper: secure random integer 0..max-1
function secureRandInt(max: number): number {
  return randomBytes(4).readUInt32BE(0) % max
}

/**
 * Derive the current simulation state purely from elapsed time.
 * No async, no side-effects — safe to call on every poll.
 */
function deriveSimulationState(
  dbRow: Record<string, any>,
  elapsedMs: number
): { state: Omit<SimulationState, 'id' | 'session_id' | 'agent_id'>; shouldPersistSuccess: boolean } {
  const startedAt = dbRow.simulation_started_at
  const leadName: string = dbRow.lead_name || 'Sarah Johnson'
  const propertyInterest: string | null = dbRow.property_interest || null

  const makeTs = (offsetMs: number) =>
    new Date(new Date(startedAt).getTime() + offsetMs).toISOString()

  // Timeout
  if (elapsedMs >= TIMING.TIMEOUT_AT) {
    return {
      state: {
        status: 'timeout',
        simulation_started_at: startedAt,
        inbound_received_at: null,
        ai_response_received_at: null,
        response_time_ms: null,
        conversation: [],
        lead_name: leadName },
      shouldPersistSuccess: false }
  }

  // Build conversation turns visible so far
  const conversation: ConversationTurn[] = []

  if (elapsedMs >= TIMING.LEAD_1_AT) {
    conversation.push({
      role: 'lead',
      message: LEAD_MESSAGES[0](leadName, propertyInterest || ''),
      timestamp: makeTs(TIMING.LEAD_1_AT) })
  }
  if (elapsedMs >= TIMING.AI_1_AT) {
    conversation.push({
      role: 'ai',
      message: generateAiResponse(0, leadName, propertyInterest),
      timestamp: makeTs(TIMING.AI_1_AT) })
  }
  if (elapsedMs >= TIMING.LEAD_2_AT) {
    conversation.push({
      role: 'lead',
      message: LEAD_MESSAGES[1](leadName, ''),
      timestamp: makeTs(TIMING.LEAD_2_AT) })
  }
  if (elapsedMs >= TIMING.AI_2_AT) {
    conversation.push({
      role: 'ai',
      message: generateAiResponse(1, leadName, propertyInterest),
      timestamp: makeTs(TIMING.AI_2_AT) })
  }
  if (elapsedMs >= TIMING.LEAD_3_AT) {
    conversation.push({
      role: 'lead',
      message: LEAD_MESSAGES[2](leadName, ''),
      timestamp: makeTs(TIMING.LEAD_3_AT) })
  }
  if (elapsedMs >= TIMING.AI_3_AT) {
    conversation.push({
      role: 'ai',
      message: generateAiResponse(2, leadName, propertyInterest),
      timestamp: makeTs(TIMING.AI_3_AT) })
  }

  // Derive status from what's visible
  let status: SimulationStatus = 'running'
  let inboundReceivedAt: string | null = null
  let aiResponseReceivedAt: string | null = null
  let responseTimeMs: number | null = null
  let shouldPersistSuccess = false

  if (elapsedMs >= TIMING.AI_3_AT) {
    status = 'success'
    inboundReceivedAt = makeTs(TIMING.LEAD_1_AT)
    aiResponseReceivedAt = makeTs(TIMING.AI_1_AT)
    responseTimeMs = TIMING.AI_1_AT - TIMING.LEAD_1_AT // 1500ms
    shouldPersistSuccess = dbRow.status !== 'success'
  } else if (elapsedMs >= TIMING.AI_2_AT) {
    status = 'ai_responded'
    inboundReceivedAt = makeTs(TIMING.LEAD_1_AT)
    aiResponseReceivedAt = makeTs(TIMING.AI_1_AT)
  } else if (elapsedMs >= TIMING.LEAD_3_AT) {
    status = 'inbound_received'
    inboundReceivedAt = makeTs(TIMING.LEAD_1_AT)
    aiResponseReceivedAt = makeTs(TIMING.AI_1_AT)
  } else if (elapsedMs >= TIMING.AI_1_AT) {
    status = 'ai_responded'
    inboundReceivedAt = makeTs(TIMING.LEAD_1_AT)
    aiResponseReceivedAt = makeTs(TIMING.AI_1_AT)
  } else if (elapsedMs >= TIMING.LEAD_1_AT) {
    status = 'inbound_received'
    inboundReceivedAt = makeTs(TIMING.LEAD_1_AT)
  }

  return {
    state: {
      status,
      simulation_started_at: startedAt,
      inbound_received_at: inboundReceivedAt,
      ai_response_received_at: aiResponseReceivedAt,
      response_time_ms: responseTimeMs,
      conversation,
      lead_name: leadName },
    shouldPersistSuccess }
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, sessionId, reason } = body
    const authenticatedId = await getAuthUserId(request)
    const effectiveAgentId = authenticatedId || agentId

    if (!action || !effectiveAgentId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, agentId' },
        { status: 400 }
      )
    }

    if ((action === 'status' || action === 'skip') && !sessionId) {
      return NextResponse.json(
        { error: `sessionId required for ${action} action` },
        { status: 400 }
      )
    }

    const finalSessionId = sessionId || (action === 'start' ? `sim_${randomUUID()}` : undefined)

    switch (action) {
      case 'start':
        return await startSimulation(effectiveAgentId, finalSessionId!)
      case 'status':
        return await getSimulationStatus(effectiveAgentId, sessionId!)
      case 'skip':
        return await skipSimulation(effectiveAgentId, sessionId!, reason)
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be start, status, or skip' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Onboarding simulator error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function startSimulation(agentId: string, sessionId: string) {
  const simulationId = randomUUID()
  const startedAt = new Date().toISOString()

  const leadName = LEAD_NAMES[secureRandInt(LEAD_NAMES.length)]
  const propertyInterest = PROPERTY_INTERESTS[secureRandInt(PROPERTY_INTERESTS.length)]

  // Write initial state to DB synchronously — this is the only write needed at start.
  const { error: dbError } = await supabase
    .from('onboarding_simulations')
    .insert({
      id: simulationId,
      session_id: sessionId,
      agent_id: agentId,
      status: 'running',
      simulation_started_at: startedAt,
      lead_name: leadName,
      property_interest: propertyInterest,
      conversation: [] })

  if (dbError) {
    logger.error('[simulator] Failed to create simulation record:', dbError)
    // Continue — status polling will still work via time-based derivation if DB row exists next call
  }

  await logAnalyticsEvent('onboarding_simulation_started', agentId, sessionId, { simulationId })

  return NextResponse.json({
    success: true,
    state: {
      id: simulationId,
      session_id: sessionId,
      agent_id: agentId,
      status: 'running',
      simulation_started_at: startedAt,
      inbound_received_at: null,
      ai_response_received_at: null,
      response_time_ms: null,
      conversation: [],
      lead_name: leadName } satisfies SimulationState })
}

async function getSimulationStatus(agentId: string, sessionId: string) {
  const { data: dbRow, error } = await supabase
    .from('onboarding_simulations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !dbRow) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
  }

  // If already in a terminal state stored in DB, return it directly.
  if (['success', 'skipped', 'timeout', 'failed'].includes(dbRow.status)) {
    return NextResponse.json({
      state: {
        id: dbRow.id,
        session_id: sessionId,
        agent_id: agentId,
        status: dbRow.status,
        simulation_started_at: dbRow.simulation_started_at,
        inbound_received_at: dbRow.inbound_received_at,
        ai_response_received_at: dbRow.ai_response_received_at,
        response_time_ms: dbRow.response_time_ms,
        conversation: dbRow.conversation || [],
        lead_name: dbRow.lead_name } satisfies SimulationState })
  }

  // Derive current state from elapsed time.
  const startedAt = dbRow.simulation_started_at
  const elapsedMs = Date.now() - new Date(startedAt).getTime()
  const { state: derived, shouldPersistSuccess } = deriveSimulationState(dbRow, elapsedMs)

  // Persist success state to DB once, so future polls return it without recomputing.
  if (shouldPersistSuccess) {
    await supabase
      .from('onboarding_simulations')
      .update({
        status: 'success',
        inbound_received_at: derived.inbound_received_at,
        ai_response_received_at: derived.ai_response_received_at,
        response_time_ms: derived.response_time_ms,
        conversation: derived.conversation,
        outcome: 'completed',
        aha_moment_reached: true })
      .eq('session_id', sessionId)

    // Persist Aha telemetry on the agent record immediately when simulation succeeds.
    // This avoids relying on later onboarding completion payloads to carry simulator state.
    await supabase
      .from('real_estate_agents')
      .update({
        aha_completed: true,
        aha_response_time_ms: derived.response_time_ms,
        updated_at: new Date().toISOString() })
      .eq('id', agentId)

    await logAnalyticsEvent('onboarding_simulation_succeeded', agentId, sessionId, {
      responseTimeMs: derived.response_time_ms })
  }

  return NextResponse.json({
    state: {
      id: dbRow.id,
      session_id: sessionId,
      agent_id: agentId,
      ...derived } satisfies SimulationState })
}

async function skipSimulation(agentId: string, sessionId: string, reason?: string) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('onboarding_simulations')
    .upsert(
      {
        session_id: sessionId,
        agent_id: agentId,
        status: 'skipped',
        simulation_started_at: now,
        lead_name: 'Skipped',
        conversation: [],
        skip_reason: reason || 'User chose to skip' },
      { onConflict: 'session_id' }
    )

  if (error) {
    logger.error('[simulator] Failed to record skip:', error)
  }

  await logAnalyticsEvent('onboarding_simulation_skipped', agentId, sessionId, {
    reason: reason || 'User chose to skip' })

  return NextResponse.json({ success: true, message: 'Simulation skipped' })
}

async function logAnalyticsEvent(
  eventType: string,
  agentId: string,
  sessionId: string,
  data: Record<string, any>
) {
  try {
    await supabase.from('events').insert({
      agent_id: agentId,
      event_type: eventType,
      event_data: { ...data, session_id: sessionId, timestamp: new Date().toISOString() },
      source: 'onboarding_simulator',
      created_at: new Date().toISOString() })
  } catch (err) {
    logger.error('[simulator] Failed to log analytics event:', err)
  }
}
