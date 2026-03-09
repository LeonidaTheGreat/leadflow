/**
 * GET /api/internal/pilot-usage
 *
 * Internal analytics endpoint — returns pilot agent engagement data.
 * Requires: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  // Security: require service_role bearer token
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token || token !== SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all pilot agents
    const { data: pilots, error: pilotError } = await supabase
      .from('real_estate_agents')
      .select('id, first_name, last_name, email, status')
      .eq('status', 'pilot')

    if (pilotError) {
      console.error('[pilot-usage] pilot fetch error:', pilotError)
      // Fall back to all agents if no pilots are found by status
    }

    const agentList = pilots ?? []

    // For each pilot, fetch analytics
    const results = await Promise.all(
      agentList.map(async (agent) => {
        // Last login
        const { data: lastSession } = await supabase
          .from('agent_sessions')
          .select('session_start, last_active_at')
          .eq('agent_id', agent.id)
          .order('session_start', { ascending: false })
          .limit(1)
          .single()

        // Sessions in last 7 days
        const { count: sessionsLast7d } = await supabase
          .from('agent_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .gte('session_start', sevenDaysAgo)

        // Top visited page
        const { data: topPageData } = await supabase
          .from('agent_page_views')
          .select('page')
          .eq('agent_id', agent.id)
          .gte('visited_at', sevenDaysAgo)

        let topPage: string | null = null
        if (topPageData && topPageData.length > 0) {
          const pageCounts: Record<string, number> = {}
          for (const row of topPageData) {
            pageCounts[row.page] = (pageCounts[row.page] ?? 0) + 1
          }
          topPage = Object.entries(pageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
        }

        const lastActiveAt = lastSession?.last_active_at ?? null
        const inactiveHours = lastActiveAt
          ? Math.floor((now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60))
          : null

        return {
          agentId: agent.id,
          name: `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim(),
          email: agent.email,
          lastLogin: lastSession?.session_start ?? null,
          sessionsLast7d: sessionsLast7d ?? 0,
          topPage,
          inactiveHours,
        }
      })
    )

    return NextResponse.json({
      pilots: results,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('[pilot-usage] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
