import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { randomUUID, randomBytes } from 'crypto'

/**
 * POST /api/onboarding/simulator
 * 
 * Handles onboarding simulator actions:
 * - action: 'start' - Start a new simulation
 * - action: 'status' - Check simulation status
 * - action: 'skip' - Skip the simulation
 * 
 * This API provides the "Aha Moment" - showing new users a live lead simulation
 * with AI response in under 30 seconds.
 */

// Pre-scripted lead messages
const LEAD_SCRIPTS = [
  (name: string, property: string) =>
    `Hi, I'm ${name}. I'm interested in ${property || 'buying a home'}. Can you help me?`,
  () => `Yes, I'd like to see some listings. My budget is around $600,000.`,
  () => `That sounds great! When can we schedule a call to discuss?`,
]

// Scripted AI responses
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

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationState {
  id: string
  session_id: string
  agent_id: string
  status: 'idle' | 'running' | 'inbound_received' | 'ai_responded' | 'success' | 'skipped' | 'timeout' | 'failed'
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: ConversationTurn[]
  lead_name: string
  error_message?: string
}

// In-memory simulation progress (for demo/development - in production use Redis)
const simulationProgress = new Map<string, {
  status: SimulationState['status']
  conversation: ConversationTurn[]
  startedAt: number
  inboundAt: number | null
  aiRespondedAt: number | null
}>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, sessionId, reason } = body

    if (!action || !agentId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, agentId' },
        { status: 400 }
      )
    }

    // sessionId is required for status and skip, but optional for start
    // (client can generate it, or server can generate it)
    if ((action === 'status' || action === 'skip') && !sessionId) {
      return NextResponse.json(
        { error: `sessionId required for ${action} action` },
        { status: 400 }
      )
    }

    switch (action) {
      case 'start':
        return await startSimulation(agentId, sessionId)
      case 'status':
        return await getSimulationStatus(agentId, sessionId)
      case 'skip':
        return await skipSimulation(agentId, sessionId, reason)
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be start, status, or skip' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Onboarding simulator error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function startSimulation(agentId: string, sessionId: string) {
  const now = Date.now()
  const simulationId = randomUUID()
  
  // Generate a realistic lead
  const leadNames = ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Thompson', 'Lisa Park']
  const leadNameIndex = randomBytes(1).readUInt8(0) % leadNames.length
  const leadName = leadNames[leadNameIndex]
  const propertyInterests = ['a 3-bedroom home', 'a downtown condo', 'a family house', 'investment property', 'a new construction']
  const propertyInterestIndex = randomBytes(1).readUInt8(0) % propertyInterests.length
  const propertyInterest = propertyInterests[propertyInterestIndex]

  // Initialize simulation in memory
  simulationProgress.set(sessionId, {
    status: 'running',
    conversation: [],
    startedAt: now,
    inboundAt: null,
    aiRespondedAt: null,
  })

  // Store initial state in database
  const { error: dbError } = await supabase
    .from('onboarding_simulations')
    .insert({
      id: simulationId,
      session_id: sessionId,
      agent_id: agentId,
      status: 'running',
      simulation_started_at: new Date(now).toISOString(),
      lead_name: leadName,
      property_interest: propertyInterest,
      conversation: [],
    })

  if (dbError) {
    console.error('Failed to create simulation record:', dbError)
    // Continue anyway - we'll track in memory
  }

  // Simulate the conversation asynchronously
  simulateConversation(sessionId, leadName, propertyInterest)

  // Log analytics event
  await logAnalyticsEvent('onboarding_simulation_started', agentId, sessionId, { simulationId })

  return NextResponse.json({
    success: true,
    state: {
      id: simulationId,
      session_id: sessionId,
      agent_id: agentId,
      status: 'running',
      simulation_started_at: new Date(now).toISOString(),
      inbound_received_at: null,
      ai_response_received_at: null,
      response_time_ms: null,
      conversation: [],
      lead_name: leadName,
    } as SimulationState,
  })
}

async function simulateConversation(sessionId: string, leadName: string, propertyInterest: string) {
  const progress = simulationProgress.get(sessionId)
  if (!progress) return

  const conversation: ConversationTurn[] = []
  
  // Simulate 3 turns with realistic timing
  for (let turn = 0; turn < 3; turn++) {
    // Simulate network/processing delay (1-2 seconds per turn)
    const randomDelay1 = randomBytes(1).readUInt8(0) / 255 * 1000
    await delay(1000 + randomDelay1)
    
    const now = Date.now()
    const leadTimestamp = new Date(now).toISOString()
    
    // Lead message
    const leadMessage = LEAD_SCRIPTS[turn](leadName, propertyInterest)
    conversation.push({
      role: 'lead',
      message: leadMessage,
      timestamp: leadTimestamp,
    })

    // Update status to inbound_received on first turn
    if (turn === 0) {
      progress.status = 'inbound_received'
      progress.inboundAt = now
      
      // Update database
      await supabase
        .from('onboarding_simulations')
        .update({
          status: 'inbound_received',
          inbound_received_at: new Date(now).toISOString(),
          conversation: conversation,
        })
        .eq('session_id', sessionId)
      
      // Log analytics event
      const agentId = await getAgentIdFromSession(sessionId)
      if (agentId) {
        await logAnalyticsEvent('onboarding_simulation_inbound_received', agentId, sessionId, {})
      }
    }

    // Simulate AI "thinking" time (500ms - 1.5s)
    const randomDelay2 = randomBytes(1).readUInt8(0) / 255 * 1000
    await delay(500 + randomDelay2)
    
    const aiNow = Date.now()
    const aiTimestamp = new Date(aiNow).toISOString()
    
    // AI response
    const aiMessage = generateAiResponse(turn, leadName, propertyInterest)
    conversation.push({
      role: 'ai',
      message: aiMessage,
      timestamp: aiTimestamp,
    })

    // Update progress
    progress.conversation = [...conversation]
    
    // On final turn, mark as success
    if (turn === 2) {
      progress.status = 'success'
      progress.aiRespondedAt = aiNow
      
      const responseTimeMs = progress.inboundAt ? aiNow - progress.inboundAt : 0
      
      // Update database with final state
      await supabase
        .from('onboarding_simulations')
        .update({
          status: 'success',
          ai_response_received_at: new Date(aiNow).toISOString(),
          response_time_ms: responseTimeMs,
          conversation: conversation,
          outcome: 'completed',
        })
        .eq('session_id', sessionId)
      
      // Log analytics event
      const agentId = await getAgentIdFromSession(sessionId)
      if (agentId) {
        await logAnalyticsEvent('onboarding_simulation_ai_responded', agentId, sessionId, { 
          responseTimeMs 
        })
        await logAnalyticsEvent('onboarding_simulation_succeeded', agentId, sessionId, { 
          responseTimeMs,
          totalTurns: 3
        })
      }
    }
  }
}

async function getSimulationStatus(agentId: string, sessionId: string) {
  // First check in-memory state for real-time updates
  const progress = simulationProgress.get(sessionId)
  
  // Also fetch from database for persistence
  const { data: dbState, error } = await supabase
    .from('onboarding_simulations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && !progress) {
    return NextResponse.json(
      { error: 'Simulation not found' },
      { status: 404 }
    )
  }

  // Use in-memory state if available (more current), otherwise use DB state
  const state: SimulationState = {
    id: dbState?.id || 'unknown',
    session_id: sessionId,
    agent_id: agentId,
    status: progress?.status || dbState?.status || 'idle',
    simulation_started_at: dbState?.simulation_started_at || null,
    inbound_received_at: dbState?.inbound_received_at || null,
    ai_response_received_at: dbState?.ai_response_received_at || null,
    response_time_ms: dbState?.response_time_ms || null,
    conversation: progress?.conversation || dbState?.conversation || [],
    lead_name: dbState?.lead_name || 'Unknown Lead',
  }

  // Check for timeout (90 seconds)
  if (state.status === 'running' || state.status === 'inbound_received') {
    const startedAt = state.simulation_started_at 
      ? new Date(state.simulation_started_at).getTime() 
      : 0
    const elapsed = Date.now() - startedAt
    
    if (elapsed > 90000) {
      state.status = 'timeout'
      
      // Update database
      await supabase
        .from('onboarding_simulations')
        .update({ status: 'timeout' })
        .eq('session_id', sessionId)
      
      // Log analytics event
      await logAnalyticsEvent('onboarding_simulation_failed', agentId, sessionId, { 
        reason: 'timeout',
        elapsedMs: elapsed
      })
    }
  }

  return NextResponse.json({ state })
}

async function skipSimulation(agentId: string, sessionId: string, reason?: string) {
  const now = new Date().toISOString()
  
  // Update or create simulation record as skipped
  const { error } = await supabase
    .from('onboarding_simulations')
    .upsert({
      session_id: sessionId,
      agent_id: agentId,
      status: 'skipped',
      simulation_started_at: now,
      lead_name: 'Skipped',
      conversation: [],
      skip_reason: reason || 'User chose to skip',
    }, {
      onConflict: 'session_id',
    })

  if (error) {
    console.error('Failed to record skip:', error)
  }

  // Log analytics event
  await logAnalyticsEvent('onboarding_simulation_skipped', agentId, sessionId, { 
    reason: reason || 'User chose to skip'
  })

  // Clean up in-memory state
  simulationProgress.delete(sessionId)

  return NextResponse.json({
    success: true,
    message: 'Simulation skipped',
  })
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
      event_data: {
        ...data,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      },
      source: 'onboarding_simulator',
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Non-blocking - log and continue
    console.error('Failed to log analytics event:', err)
  }
}

async function getAgentIdFromSession(sessionId: string): Promise<string | null> {
  const { data } = await supabase
    .from('onboarding_simulations')
    .select('agent_id')
    .eq('session_id', sessionId)
    .single()
  
  return data?.agent_id || null
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
