import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

/**
 * GET /api/onboarding/simulator-status
 * 
 * Returns whether the current agent has completed the onboarding simulator.
 * Used by dashboard banner to show/hide the "Watch demo" CTA.
 */

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if agent has a successful simulation
    const { data: simulation, error } = await supabaseAdmin
      .from('onboarding_simulations')
      .select('id, status, created_at')
      .eq('agent_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Failed to check simulation status:', error)
      return NextResponse.json(
        { error: 'Failed to check simulation status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      hasCompletedSimulation: !!simulation,
      simulationId: simulation?.id || null,
      completedAt: simulation?.created_at || null
    })

  } catch (error) {
    console.error('Simulator status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
