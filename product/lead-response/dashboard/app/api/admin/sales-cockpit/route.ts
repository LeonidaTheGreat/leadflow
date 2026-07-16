import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/sales-cockpit
 * Returns email-verified inactive agents with their latest outreach status.
 * Used by the Admin Sales Cockpit to identify warm leads for manual close.
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: agents, error: agentsError } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,phone_number,plan_tier,onboarding_step,onboarding_completed,created_at,last_login_at,subscription_status')
      .eq('email_verified', true)
      .eq('subscription_status', 'inactive')
      .order('created_at', { ascending: false })

    if (agentsError) {
      logger.error('Sales cockpit agents query failed:', agentsError)
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    const agentList = agents ?? []

    if (agentList.length === 0) {
      return NextResponse.json({ agents: [] })
    }

    const agentIds = agentList.map((a: any) => a.id)

    const { data: logs } = await postgrestAdmin
      .from('outreach_log')
      .select('agent_id,status,contacted_at,channel,notes,id')
      .in('agent_id', agentIds)
      .order('contacted_at', { ascending: false })

    const latestByAgent = new Map<string, any>()
    const historyByAgent = new Map<string, any[]>()
    for (const log of logs ?? []) {
      if (!latestByAgent.has(log.agent_id)) {
        latestByAgent.set(log.agent_id, log)
      }
      const hist = historyByAgent.get(log.agent_id) ?? []
      hist.push(log)
      historyByAgent.set(log.agent_id, hist)
    }

    const result = agentList.map((agent: any) => {
      const latest = latestByAgent.get(agent.id)
      return {
        id: agent.id,
        name: `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || agent.email,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        phone: agent.phone_number,
        plan_tier: agent.plan_tier,
        onboarding_step: agent.onboarding_step ?? 0,
        onboarding_completed: agent.onboarding_completed ?? false,
        created_at: agent.created_at,
        last_login_at: agent.last_login_at,
        outreach_status: latest?.status ?? 'new',
        last_contacted_at: latest?.contacted_at ?? null,
        last_channel: latest?.channel ?? null,
        outreach_history: historyByAgent.get(agent.id) ?? [],
      }
    })

    return NextResponse.json({ agents: result })
  } catch (error) {
    logger.error('Sales cockpit fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
