/**
 * GET /api/satisfaction/stats
 * Returns satisfaction stats for the current agent (last 30 days)
 * 
 * Query params:
 *   agentId (required) — the agent's UUID
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSatisfactionStats } from '@/lib/satisfaction'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    // Validate agent exists
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('real_estate_agents')
      .select('id, satisfaction_ping_enabled')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const stats = await getSatisfactionStats(agentId)

    return NextResponse.json({
      success: true,
      satisfactionPingEnabled: agent.satisfaction_ping_enabled ?? true,
      stats,
    })
  } catch (error: any) {
    console.error('❌ /api/satisfaction/stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
