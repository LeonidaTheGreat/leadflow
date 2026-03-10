import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/internal/pilot-usage
 *
 * Internal analytics endpoint that aggregates per-pilot session data.
 * Per FR-4 of PRD-SESSION-ANALYTICS-PILOT.
 *
 * Authentication: Bearer token must equal SUPABASE_SERVICE_ROLE_KEY.
 *
 * Returns JSON array of pilot engagement records:
 * [
 *   {
 *     agentId: string,
 *     email: string,
 *     name: string,
 *     lastLogin: ISO string | null,
 *     sessionsLast7d: number,
 *     topPage: string | null,
 *     inactiveHours: number | null,
 *   },
 *   ...
 * ]
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Authenticate the request using a Bearer token that must match SUPABASE_SERVICE_ROLE_KEY.
 * Returns true if authenticated, false otherwise.
 */
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  const token = authHeader.slice(7).trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[pilot-usage] SUPABASE_SERVICE_ROLE_KEY is not set')
    return false
  }
  return token === serviceRoleKey
}

/**
 * Compute the mode (most frequent value) of an array.
 * Returns null if the array is empty.
 */
function mode(values: string[]): string | null {
  if (values.length === 0) return null
  const freq: Record<string, number> = {}
  let maxCount = 0
  let modeValue: string | null = null
  for (const v of values) {
    freq[v] = (freq[v] ?? 0) + 1
    if (freq[v] > maxCount) {
      maxCount = freq[v]
      modeValue = v
    }
  }
  return modeValue
}

export async function GET(request: NextRequest) {
  // --- Authentication ---
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all pilot agents from real_estate_agents
    const { data: agents, error: agentsError } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, last_name, last_login_at')
      .order('last_login_at', { ascending: false })

    if (agentsError) {
      console.error('[pilot-usage] Failed to fetch agents:', agentsError.message)
      return NextResponse.json(
        { error: 'Failed to fetch agents', detail: agentsError.message },
        { status: 500 }
      )
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json([])
    }

    const agentIds = agents.map((a) => a.id)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()

    // 2. Fetch agent sessions in the last 7 days (for sessionsLast7d)
    const { data: sessions, error: sessionsError } = await supabase
      .from('agent_sessions')
      .select('agent_id, session_start, last_active_at')
      .in('agent_id', agentIds)
      .gte('session_start', sevenDaysAgo)

    if (sessionsError) {
      console.error('[pilot-usage] Failed to fetch sessions:', sessionsError.message)
      // Non-fatal: continue with empty sessions
    }

    // 3. Fetch all agent sessions for last_active_at (to compute inactiveHours)
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('agent_sessions')
      .select('agent_id, last_active_at')
      .in('agent_id', agentIds)
      .order('last_active_at', { ascending: false })

    if (allSessionsError) {
      console.error('[pilot-usage] Failed to fetch all sessions:', allSessionsError.message)
      // Non-fatal: continue
    }

    // 4. Fetch page views for topPage (mode of page column)
    const { data: pageViews, error: pageViewsError } = await supabase
      .from('agent_page_views')
      .select('agent_id, page')
      .in('agent_id', agentIds)

    if (pageViewsError) {
      console.error('[pilot-usage] Failed to fetch page views:', pageViewsError.message)
      // Non-fatal: continue
    }

    // --- Aggregate per agent ---
    // Index sessions by agent_id
    const sessionsLast7dByAgent: Record<string, number> = {}
    for (const s of sessions ?? []) {
      sessionsLast7dByAgent[s.agent_id] = (sessionsLast7dByAgent[s.agent_id] ?? 0) + 1
    }

    // Latest last_active_at per agent (from all sessions)
    const lastActiveByAgent: Record<string, string> = {}
    for (const s of allSessions ?? []) {
      if (!lastActiveByAgent[s.agent_id]) {
        lastActiveByAgent[s.agent_id] = s.last_active_at
      }
    }

    // Page views grouped by agent
    const pagesByAgent: Record<string, string[]> = {}
    for (const pv of pageViews ?? []) {
      if (!pagesByAgent[pv.agent_id]) pagesByAgent[pv.agent_id] = []
      pagesByAgent[pv.agent_id].push(pv.page)
    }

    // Build response
    const result = agents.map((agent) => {
      const lastActiveAt = lastActiveByAgent[agent.id] ?? null
      const inactiveHours =
        lastActiveAt !== null
          ? Math.round((now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60) * 10) / 10
          : null

      return {
        agentId: agent.id,
        email: agent.email,
        name: [agent.first_name, agent.last_name].filter(Boolean).join(' ') || null,
        lastLogin: agent.last_login_at ?? null,
        sessionsLast7d: sessionsLast7dByAgent[agent.id] ?? 0,
        topPage: mode(pagesByAgent[agent.id] ?? []),
        inactiveHours,
      }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('[pilot-usage] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
