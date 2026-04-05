/**
 * API Route: GET /api/demo/status
 *
 * Returns the authenticated agent's current demo run count and remaining demos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'

const DEMO_LIMIT = 3

export async function GET(request: NextRequest) {
  const agentId = await getAuthUserId(request)
  if (!agentId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: agent, error } = await supabaseAdmin
    .from('real_estate_agents')
    .select('demo_runs_used')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const demosUsed: number = agent.demo_runs_used ?? 0
  const demosRemaining = Math.max(0, DEMO_LIMIT - demosUsed)

  return NextResponse.json({
    demos_used: demosUsed,
    demos_remaining: demosRemaining,
    demo_limit: DEMO_LIMIT,
    limit_reached: demosUsed >= DEMO_LIMIT,
  })
}
