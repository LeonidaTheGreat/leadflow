/**
 * GET /api/admin/funnel/trial-activation
 *
 * Segments trial agents by activation state:
 *   - Active:          FUB connected + recent lead + recent outbound SMS (window_days, default 7)
 *   - Onboarded:       FUB connected, no recent activity within window
 *   - Never-activated: No FUB connection
 *
 * Auth: LEADFLOW_API_KEY bearer token (admin-only)
 *
 * PRD: docs/prd/PRD-FUNNEL-DIAGNOSTICS-TRIAL-ACTIVATION.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

function verifyAdminAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  if (!apiKey) return false

  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false

  const provided = authHeader.slice(7).trim()
  return provided === apiKey
}

interface AgentRow {
  agent_id: string
  email: string
  first_name: string
  last_name: string
  trial_ends_at: string
  days_remaining: number
  fub_connected_at: string | null
  leads_last_7d: number
  sms_sent_last_7d: number
  last_activity_at: string | null
}

/**
 * GET /api/admin/funnel/trial-activation
 *
 * Query params:
 *   window_days (integer, default 7)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const windowDays = Math.max(1, parseInt(searchParams.get('window_days') ?? '7', 10) || 7)
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const windowCutoff = new Date(Date.now() - windowMs).toISOString()
  const now = new Date()

  try {
    // 1. Fetch all trial agents (not yet converted to paid)
    const { data: trialAgents, error: taErr } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,email,first_name,last_name,trial_ends_at,created_at,subscription_status')
      .not('trial_ends_at', 'is', null)

    if (taErr) throw taErr

    const allAgents: any[] = (trialAgents ?? []).filter((a: any) => {
      const status = a.subscription_status ?? null
      return status !== 'active' && status !== 'canceled'
    })

    if (allAgents.length === 0) {
      return NextResponse.json({
        summary: {
          total_trial_agents: 0,
          active: 0,
          onboarded: 0,
          never_activated: 0,
          as_of: now.toISOString(),
          window_days: windowDays,
        },
        segments: { active: [], onboarded: [], never_activated: [] },
      })
    }

    const agentIds: string[] = allAgents.map((a: any) => a.id)

    // 2. Fetch FUB integration status for all trial agents
    const { data: integrations, error: intErr } = await postgrestAdmin
      .from('agent_integrations')
      .select('agent_id,follow_up_boss_api_key,updated_at')
      .in('agent_id', agentIds)

    if (intErr) throw intErr

    const fubMap = new Map<string, { connected: boolean; connected_at: string | null }>()
    for (const row of (integrations ?? []) as any[]) {
      const connected = Boolean(row.follow_up_boss_api_key && row.follow_up_boss_api_key !== '')
      fubMap.set(row.agent_id, {
        connected,
        connected_at: connected ? (row.updated_at ?? null) : null,
      })
    }

    // 3. Fetch recent leads (within window) per agent
    const { data: recentLeads, error: leadsErr } = await postgrestAdmin
      .from('leads')
      .select('agent_id,created_at')
      .in('agent_id', agentIds)
      .gte('created_at', windowCutoff)

    if (leadsErr) throw leadsErr

    const recentLeadCount = new Map<string, number>()
    for (const row of (recentLeads ?? []) as any[]) {
      recentLeadCount.set(row.agent_id, (recentLeadCount.get(row.agent_id) ?? 0) + 1)
    }

    // 4. Fetch all lead IDs + dates for these agents (for last_activity_at and SMS lookup)
    const { data: allLeads, error: allLeadsErr } = await postgrestAdmin
      .from('leads')
      .select('id,agent_id,created_at')
      .in('agent_id', agentIds)

    if (allLeadsErr) throw allLeadsErr

    const lastLeadAt = new Map<string, string>()
    for (const row of (allLeads ?? []) as any[]) {
      const existing = lastLeadAt.get(row.agent_id)
      if (!existing || row.created_at > existing) {
        lastLeadAt.set(row.agent_id, row.created_at)
      }
    }

    // 5. Fetch lead IDs to look up SMS messages — we need leads for these agents
    const allLeadIds = ((allLeads ?? []) as any[]).map((l: any) => l.id as string)

    let recentSmsCount = new Map<string, number>()
    let lastSmsAt = new Map<string, string>()

    if (allLeadIds.length > 0) {
      // 5a. Fetch outbound SMS joined through lead IDs
      const { data: smsMessages, error: smsErr } = await postgrestAdmin
        .from('sms_messages')
        .select('lead_id,direction,created_at')
        .in('lead_id', allLeadIds)
        .eq('direction', 'outbound')

      if (smsErr) throw smsErr

      // Build lead→agent map
      const leadAgentMap = new Map<string, string>()
      for (const row of (allLeads ?? []) as any[]) {
        leadAgentMap.set(row.id, row.agent_id)
      }

      for (const sms of (smsMessages ?? []) as any[]) {
        const agentId = leadAgentMap.get(sms.lead_id)
        if (!agentId) continue

        // Track last SMS
        const existingLast = lastSmsAt.get(agentId)
        if (!existingLast || sms.created_at > existingLast) {
          lastSmsAt.set(agentId, sms.created_at)
        }

        // Track recent SMS within window
        if (sms.created_at >= windowCutoff) {
          recentSmsCount.set(agentId, (recentSmsCount.get(agentId) ?? 0) + 1)
        }
      }
    }

    // 6. Classify each agent into a segment
    const segments: { active: AgentRow[]; onboarded: AgentRow[]; never_activated: AgentRow[] } = {
      active: [],
      onboarded: [],
      never_activated: [],
    }

    for (const agent of allAgents) {
      const fub = fubMap.get(agent.id)
      const fubConnected = fub?.connected ?? false
      const fubConnectedAt = fub?.connected_at ?? null

      const leadsInWindow = recentLeadCount.get(agent.id) ?? 0
      const smsInWindow = recentSmsCount.get(agent.id) ?? 0

      const lastLead = lastLeadAt.get(agent.id) ?? null
      const lastSms = lastSmsAt.get(agent.id) ?? null
      const lastActivityAt =
        lastLead && lastSms
          ? lastLead > lastSms ? lastLead : lastSms
          : lastLead ?? lastSms ?? null

      const trialEndsAt = new Date(agent.trial_ends_at)
      const daysRemaining = Math.floor((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const agentRow: AgentRow = {
        agent_id: agent.id,
        email: agent.email,
        first_name: agent.first_name,
        last_name: agent.last_name,
        trial_ends_at: agent.trial_ends_at,
        days_remaining: daysRemaining,
        fub_connected_at: fubConnectedAt,
        leads_last_7d: leadsInWindow,
        sms_sent_last_7d: smsInWindow,
        last_activity_at: lastActivityAt,
      }

      if (fubConnected && leadsInWindow > 0 && smsInWindow > 0) {
        segments.active.push(agentRow)
      } else if (fubConnected) {
        segments.onboarded.push(agentRow)
      } else {
        segments.never_activated.push(agentRow)
      }
    }

    return NextResponse.json({
      summary: {
        total_trial_agents: allAgents.length,
        active: segments.active.length,
        onboarded: segments.onboarded.length,
        never_activated: segments.never_activated.length,
        as_of: now.toISOString(),
        window_days: windowDays,
      },
      segments,
    })
  } catch (err: any) {
    logger.error('[trial-activation] error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Internal server error', detail: err?.message ?? 'unknown' },
      { status: 500 }
    )
  }
}
