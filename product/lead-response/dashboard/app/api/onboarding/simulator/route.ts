import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/onboarding/simulator
 * 
 * Start or manage the onboarding lead simulator.
 * This is the "Aha Moment" feature - shows new users a live lead simulation
 * with AI response in <30 seconds.
 * 
 * Actions:
 *   - start: Begin a new simulation
 *   - status: Check current simulation status
 *   - skip: Skip the simulation (sets aha_pending=true)
 *   - retry: Retry a failed/timed out simulation
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// Pre-scripted lead message for onboarding simulation
const ONBOARDING_LEAD_SCRIPT = {
  name: 'Sarah Johnson',
  message: "Hi! I'm looking for a 3-bedroom home in downtown Toronto. My budget is around $800k. Can you help me?",
  phone: '+15551234567',
}

// Generate AI response for onboarding simulation
function generateOnboardingAiResponse(leadName: string): string {
  const firstName = leadName.split(' ')[0]
  return `Hi ${firstName}! 👋 I'm your AI assistant from LeadFlow. I'd love to help you find a 3-bedroom home in downtown Toronto. With your $800K budget, you have some great options! I can show you our latest listings and help schedule a viewing. Are you looking to buy in the next 1–3 months? Reply STOP at any time to opt out.`
}

interface SimulationState {
  id: string
  status: 'idle' | 'running' | 'inbound_received' | 'ai_responded' | 'success' | 'skipped' | 'timeout' | 'failed'
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: Array<{ role: 'lead' | 'ai'; message: string; timestamp: string }>
  lead_name: string
  error_message?: string
}

async function startSimulation(agentId: string, sessionId: string): Promise<SimulationState> {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  
  // Create or update simulation record
  const { data: existing } = await supabase
    .from('onboarding_simulations')
    .select('id, status')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .single()
  
  if (existing && ['running', 'inbound_received', 'ai_responded'].includes(existing.status)) {
    // Simulation already in progress, return current state
    const { data } = await supabase
      .from('onboarding_simulations')
      .select('*')
      .eq('id', existing.id)
      .single()
    return data as SimulationState
  }
  
  // Start new simulation
  const conversation = [
    {
      role: 'lead' as const,
      message: ONBOARDING_LEAD_SCRIPT.message,
      timestamp: now,
    },
  ]
  
  const { data, error } = await supabase
    .from('onboarding_simulations')
    .upsert({
      agent_id: agentId,
      session_id: sessionId,
      status: 'running',
      simulation_started_at: now,
      inbound_received_at: now,
      lead_name: ONBOARDING_LEAD_SCRIPT.name,
      property_interest: '3-bedroom home in downtown Toronto',
      conversation,
      was_skipped: false,
    }, {
      onConflict: 'agent_id,session_id',
    })
    .select()
    .single()
  
  if (error) {
    console.error('Failed to start simulation:', error)
    throw new Error('Failed to start simulation')
  }
  
  // Simulate async AI processing (will complete via status check or webhook)
  // In production, this would trigger an actual AI response generation
  
  return data as SimulationState
}

async function getSimulationStatus(agentId: string, sessionId: string): Promise<SimulationState | null> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('onboarding_simulations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  // Check for timeout (90 seconds default)
  if (data.status === 'running' || data.status === 'inbound_received') {
    const startedAt = new Date(data.simulation_started_at).getTime()
    const elapsedMs = Date.now() - startedAt
    const timeoutMs = 90000 // 90 seconds
    
    if (elapsedMs > timeoutMs) {
      // Update to timeout status
      await supabase
        .from('onboarding_simulations')
        .update({
          status: 'timeout',
          error_code: 'TIMEOUT',
          error_message: 'Simulation timed out after 90 seconds',
        })
        .eq('id', data.id)
      
      data.status = 'timeout'
      data.error_code = 'TIMEOUT'
      data.error_message = 'Simulation timed out after 90 seconds'
    }
  }
  
  // Simulate AI response after delay for demo purposes
  // In production, this would be triggered by actual AI processing
  if (data.status === 'running' && data.simulation_started_at) {
    const startedAt = new Date(data.simulation_started_at).getTime()
    const elapsedMs = Date.now() - startedAt
    
    // Simulate AI response after 2-5 seconds
    if (elapsedMs > 2000) {
      const aiResponse = generateOnboardingAiResponse(data.lead_name)
      const aiTimestamp = new Date().toISOString()
      const responseTimeMs = Math.floor(elapsedMs)
      
      const updatedConversation = [
        ...data.conversation,
        {
          role: 'ai' as const,
          message: aiResponse,
          timestamp: aiTimestamp,
        },
      ]
      
      const { data: updated } = await supabase
        .from('onboarding_simulations')
        .update({
          status: 'success',
          ai_response_received_at: aiTimestamp,
          response_time_ms: responseTimeMs,
          conversation: updatedConversation,
        })
        .eq('id', data.id)
        .select()
        .single()
      
      if (updated) {
        // Track analytics event
        await trackEvent(agentId, 'onboarding_simulation_succeeded', {
          session_id: sessionId,
          response_time_ms: responseTimeMs,
          elapsed_ms: elapsedMs,
        })
        
        return updated as SimulationState
      }
    }
  }
  
  return data as SimulationState
}

async function skipSimulation(agentId: string, sessionId: string, reason?: string): Promise<void> {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  
  // Mark simulation as skipped
  await supabase
    .from('onboarding_simulations')
    .upsert({
      agent_id: agentId,
      session_id: sessionId,
      status: 'skipped',
      was_skipped: true,
      skip_reason: reason || 'User skipped',
    }, {
      onConflict: 'agent_id,session_id',
    })
  
  // Mark agent as having pending aha moment
  await supabase
    .from('real_estate_agents')
    .update({ aha_pending: true })
    .eq('id', agentId)
  
  // Track analytics event
  await trackEvent(agentId, 'onboarding_simulation_skipped', {
    session_id: sessionId,
    reason: reason || 'User skipped',
  })
}

async function trackEvent(agentId: string, eventType: string, eventData: Record<string, any>): Promise<void> {
  const supabase = getSupabase()
  
  try {
    await supabase.from('events').insert({
      agent_id: agentId,
      event_type: eventType,
      event_data: eventData,
      source: 'onboarding_simulator',
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Failed to track event:', err)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, agentId, sessionId, reason } = body
    
    if (!agentId || !sessionId) {
      return NextResponse.json(
        { error: 'agentId and sessionId are required' },
        { status: 400 }
      )
    }
    
    switch (action) {
      case 'start': {
        // Track start event
        await trackEvent(agentId, 'onboarding_simulation_started', {
          session_id: sessionId,
          timestamp: Date.now(),
        })
        
        const state = await startSimulation(agentId, sessionId)
        
        // Track inbound received event
        await trackEvent(agentId, 'onboarding_simulation_inbound_received', {
          session_id: sessionId,
          elapsed_ms: 0,
        })
        
        return NextResponse.json({ success: true, state })
      }
      
      case 'status': {
        const state = await getSimulationStatus(agentId, sessionId)
        
        if (!state) {
          return NextResponse.json(
            { error: 'Simulation not found' },
            { status: 404 }
          )
        }
        
        // Track AI responded event when we hit that state
        if (state.status === 'ai_responded' || state.status === 'success') {
          await trackEvent(agentId, 'onboarding_simulation_ai_responded', {
            session_id: sessionId,
            response_time_ms: state.response_time_ms,
            elapsed_ms: state.response_time_ms,
          })
        }
        
        return NextResponse.json({ success: true, state })
      }
      
      case 'skip': {
        await skipSimulation(agentId, sessionId, reason)
        return NextResponse.json({ success: true })
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, status, skip' },
          { status: 400 }
        )
    }
  } catch (err: any) {
    console.error('Simulator API error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err.message },
      { status: 500 }
    )
  }
}
