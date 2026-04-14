import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/onboarding/simulator/status
 * 
 * Check if the current agent has completed the simulator.
 * Used by standalone simulator page and dashboard banner.
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agentId from query params (optional - defaults to authenticated user)
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId') || userId

    // Security check: users can only check their own status
    if (agentId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if agent has a successful simulation
    const { data: simulation, error } = await supabase
      .from('onboarding_simulations')
      .select('id, status, created_at, response_time_ms')
      .eq('agent_id', agentId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Simulator status fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
    }

    // Also check wizard state
    const { data: wizardState } = await supabase
      .from('agent_onboarding_wizard')
      .select('simulator_completed')
      .eq('agent_id', agentId)
      .single()

    const hasCompleted = !!simulation || wizardState?.simulator_completed === true

    return NextResponse.json({
      hasCompleted,
      simulation: simulation || null,
      completedAt: simulation?.created_at || null,
      responseTimeMs: simulation?.response_time_ms || null
    })

  } catch (error) {
    logger.error('Simulator status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
