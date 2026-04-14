import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { auth } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/outreach-candidates
 *
 * Returns all email-verified agents ranked by engagement for direct outreach.
 * Includes contacted status from pilot_invites table.
 * Scoring: onboarding_step (40%) + page views (30%) + recency (30%)
 */
export async function GET(request: NextRequest) {
  const { user } = await auth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all email-verified agents
    const { data: agents, error: agentsError } = await supabase
      .from('real_estate_agents')
      .select(
        'id,first_name,last_name,email,phone_number,plan_tier,onboarding_step,onboarding_completed,last_login_at,created_at,source,utm_source,utm_medium,utm_campaign,email_verified'
      )
      .eq('email_verified', true)
      .order('created_at', { ascending: false })

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    const agentList = agents ?? []
    if (agentList.length === 0) {
      return NextResponse.json({ candidates: [], total: 0 })
    }

    // Fetch page view counts per agent
    const agentIds = agentList.map((a: any) => a.id)

    const { data: pageViews } = await supabase
      .from('agent_page_views')
      .select('agent_id')
      .in('agent_id', agentIds)

    const pageViewCounts: Record<string, number> = {}
    for (const pv of pageViews ?? []) {
      pageViewCounts[pv.agent_id] = (pageViewCounts[pv.agent_id] ?? 0) + 1
    }

    // Fetch session counts per agent
    const { data: sessions } = await supabase
      .from('agent_sessions')
      .select('agent_id')
      .in('agent_id', agentIds)

    const sessionCounts: Record<string, number> = {}
    for (const s of sessions ?? []) {
      sessionCounts[s.agent_id] = (sessionCounts[s.agent_id] ?? 0) + 1
    }

    // Fetch pilot_invites to determine which agents have been personally contacted
    const { data: invites } = await supabase
      .from('pilot_invites')
      .select('agent_id,status,invited_at')
      .in('agent_id', agentIds)

    const inviteMap: Record<string, { status: string; invited_at: string }> = {}
    for (const inv of invites ?? []) {
      // Keep most recent invite per agent
      if (!inviteMap[inv.agent_id] || inv.invited_at > inviteMap[inv.agent_id].invited_at) {
        inviteMap[inv.agent_id] = { status: inv.status, invited_at: inv.invited_at }
      }
    }

    const now = Date.now()

    const candidates = agentList.map((agent: any) => {
      const pvCount = pageViewCounts[agent.id] ?? 0
      const sessionCount = sessionCounts[agent.id] ?? 0
      const onboardingStep = agent.onboarding_step ?? 0

      // Recency score: 0-1 based on last login (last 30 days = full score)
      let recencyScore = 0
      if (agent.last_login_at) {
        const daysSinceLogin = (now - new Date(agent.last_login_at + (agent.last_login_at.endsWith('Z') ? '' : 'Z')).getTime()) / (1000 * 60 * 60 * 24)
        recencyScore = Math.max(0, 1 - daysSinceLogin / 30)
      }

      // Page view score: 0-1 (capped at 20 views = full score)
      const pvScore = Math.min(pvCount / 20, 1)

      // Onboarding score: 0-1 (step 0-5, higher = more engaged)
      const onboardingScore = Math.min(onboardingStep / 5, 1)

      const engagementScore = Math.round(
        (onboardingScore * 0.4 + pvScore * 0.3 + recencyScore * 0.3) * 100
      )

      const invite = inviteMap[agent.id] ?? null

      return {
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`.trim(),
        email: agent.email,
        phone: agent.phone_number ?? null,
        plan_tier: agent.plan_tier,
        onboarding_step: onboardingStep,
        onboarding_completed: agent.onboarding_completed ?? false,
        last_login_at: agent.last_login_at ?? null,
        created_at: agent.created_at,
        page_views: pvCount,
        sessions: sessionCount,
        source: agent.source ?? null,
        utm_source: agent.utm_source ?? null,
        engagement_score: engagementScore,
        contacted: invite !== null,
        contacted_at: invite?.invited_at ?? null,
        invite_status: invite?.status ?? null,
      }
    })

    // Sort by engagement score descending
    candidates.sort((a: any, b: any) => b.engagement_score - a.engagement_score)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    const uncontacted = candidates.filter((c: any) => !c.contacted)
    const contacted = candidates.filter((c: any) => c.contacted)

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
      summary: {
        total_verified: candidates.length,
        contacted: contacted.length,
        uncontacted: uncontacted.length,
        trial: candidates.filter((c: any) => c.plan_tier === 'trial').length,
        pilot: candidates.filter((c: any) => c.plan_tier === 'pilot').length,
        completed_onboarding: candidates.filter((c: any) => c.onboarding_completed).length,
        high_engagement: candidates.filter((c: any) => c.engagement_score >= 50).length,
      },
    })
  } catch (err: any) {
    logger.error('[outreach-candidates]', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
