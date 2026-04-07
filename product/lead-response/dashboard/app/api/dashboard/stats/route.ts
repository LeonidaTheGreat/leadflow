import { NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'
import type { DashboardStats } from '@/lib/types'

type DashboardStatsRow = Partial<DashboardStats> & {
  new_today?: number | null
  responses_today?: number | null
}

type AggregatedDashboardStats = {
  agent_id: string
  new_leads: number
  qualified_leads: number
  responded_leads: number
  leads_today: number
  leads_this_week: number
  avg_urgency: number
  total_leads: number
}

function getEmptyStats(): AggregatedDashboardStats {
  return {
    agent_id: 'all',
    new_leads: 0,
    qualified_leads: 0,
    responded_leads: 0,
    leads_today: 0,
    leads_this_week: 0,
    avg_urgency: 0,
    total_leads: 0,
  }
}

function normalizeRow(row: DashboardStatsRow) {
  return {
    new_leads: row.new_leads ?? row.new_today ?? 0,
    qualified_leads: row.qualified_leads ?? 0,
    responded_leads: row.responded_leads ?? row.responses_today ?? 0,
    leads_today: row.leads_today ?? row.new_today ?? 0,
    leads_this_week: row.leads_this_week ?? 0,
    avg_urgency: row.avg_urgency ?? 0,
    total_leads: row.total_leads ?? 0,
  }
}

function aggregateStats(rows: DashboardStatsRow[]): DashboardStats {
  const stats = rows.reduce<AggregatedDashboardStats>(
    (acc, curr) => {
      const normalized = normalizeRow(curr)

      return {
        agent_id: 'all',
        new_leads: acc.new_leads + normalized.new_leads,
        qualified_leads: acc.qualified_leads + normalized.qualified_leads,
        responded_leads: acc.responded_leads + normalized.responded_leads,
        leads_today: acc.leads_today + normalized.leads_today,
        leads_this_week: acc.leads_this_week + normalized.leads_this_week,
        avg_urgency: acc.avg_urgency + normalized.avg_urgency,
        total_leads: acc.total_leads + normalized.total_leads,
      }
    },
    {
      agent_id: 'all',
      new_leads: 0,
      qualified_leads: 0,
      responded_leads: 0,
      leads_today: 0,
      leads_this_week: 0,
      avg_urgency: 0,
      total_leads: 0,
    },
  )

  return {
    ...stats,
    avg_urgency: rows.length > 0 ? Math.round(stats.avg_urgency / rows.length) : 0,
  }
}

export async function GET() {
  if (!isPostgrestConfigured()) {
    return NextResponse.json({ stats: getEmptyStats() })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('dashboard_stats')
      .select('*')

    if (error) {
      console.error('[dashboard/stats] query failed, returning empty stats:', error)
      return NextResponse.json({ stats: getEmptyStats() })
    }

    const rows = (data || []) as DashboardStatsRow[]

    return NextResponse.json({ stats: aggregateStats(rows) })
  } catch (error) {
    console.error('[dashboard/stats] unexpected error, returning empty stats:', error)
    return NextResponse.json({ stats: getEmptyStats() })
  }
}
