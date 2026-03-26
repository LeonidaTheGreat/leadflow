/**
 * GET /api/internal/pilot-usage
 *
 * Internal analytics endpoint for pilot agent engagement.
 * FR-4: Returns per-pilot session data for Stojan visibility.
 *
 * Auth: API_SECRET_KEY bearer token required.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/db'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_API_URL || 'https://api.imagineapi.org',
    process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || ''
  )
}

function isAuthorized(req: NextRequest): boolean {
  const serviceKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY
  if (!serviceKey) return false
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim()
  return token === serviceKey
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid API_SECRET_KEY bearer token." },
      { status: 401 }
    )
  }

  const supabase = getSupabase()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const { data: agents, error: agentsError } = await supabase
      .from("real_estate_agents")
      .select("id, email, first_name, last_name, plan_tier")
      .order("created_at", { ascending: true })

    if (agentsError) {
      console.error("[pilot-usage] agents query failed:", agentsError)
      return NextResponse.json({ error: "Failed to fetch pilot agents" }, { status: 500 })
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ pilots: [], generatedAt: now.toISOString() })
    }

    const agentIds = agents.map((a: { id: string }) => a.id)

    const { data: allSessions, error: sessionsError } = await supabase
      .from("agent_sessions")
      .select("id, agent_id, session_start, last_active_at")
      .in("agent_id", agentIds)
      .order("session_start", { ascending: false })

    if (sessionsError) {
      console.error("[pilot-usage] sessions query failed:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 })
    }

    const { data: allPageViews } = await supabase
      .from("agent_page_views")
      .select("agent_id, page")
      .in("agent_id", agentIds)

    const sessionsByAgent: Record<string, { id: string; agent_id: string; session_start: string; last_active_at: string }[]> = {}
    for (const session of allSessions ?? []) {
      if (!sessionsByAgent[session.agent_id]) sessionsByAgent[session.agent_id] = []
      sessionsByAgent[session.agent_id]!.push(session)
    }

    const pageViewsByAgent: Record<string, string[]> = {}
    for (const pv of allPageViews ?? []) {
      if (!pageViewsByAgent[pv.agent_id]) pageViewsByAgent[pv.agent_id] = []
      pageViewsByAgent[pv.agent_id]!.push(pv.page)
    }

    const pilots = agents.map((agent: { id: string; email: string; first_name: string; last_name: string; plan_tier: string }) => {
      const sessions = sessionsByAgent[agent.id] ?? []
      const pages = pageViewsByAgent[agent.id] ?? []

      const lastLogin = sessions.length > 0 ? sessions[0]!.session_start : null

      const sessionsLast7d = sessions.filter(
        (s) => s.session_start >= sevenDaysAgo
      ).length

      const pageFreq: Record<string, number> = {}
      for (const page of pages) {
        pageFreq[page] = (pageFreq[page] ?? 0) + 1
      }
      const topPage =
        Object.keys(pageFreq).length > 0
          ? Object.keys(pageFreq).reduce((a, b) =>
              (pageFreq[a] ?? 0) >= (pageFreq[b] ?? 0) ? a : b
            )
          : null

      let inactiveHours: number | null = null
      if (sessions.length > 0) {
        const latestActive = sessions
          .map((s) => new Date(s.last_active_at).getTime())
          .reduce((max: number, t: number) => Math.max(max, t), 0)
        inactiveHours = Math.floor((now.getTime() - latestActive) / (1000 * 60 * 60))
      }

      return {
        agentId: agent.id,
        name: (agent.first_name + " " + agent.last_name).trim() || agent.email,
        email: agent.email,
        planTier: agent.plan_tier,
        lastLogin,
        sessionsLast7d,
        topPage,
        inactiveHours,
        atRisk: inactiveHours !== null && inactiveHours > 72,
      }
    })

    return NextResponse.json({ pilots, generatedAt: now.toISOString() })
  } catch (err) {
    console.error("[pilot-usage] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
