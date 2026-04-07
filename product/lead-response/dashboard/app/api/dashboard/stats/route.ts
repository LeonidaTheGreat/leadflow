import { NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'
import type { DashboardStats } from '@/lib/types'

// The dashboard_stats view may use either the canonical column names
// (new_leads, responded_leads) or the alternate names used in production
// (new_today, responses_today). Both shapes are handled here.
type DashboardStatsRow = Partial<DashboardStats> & {
  new_today?: number | null
  responses_today?: number | null
}

function getEmptyStats(): DashboardStats {
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

export async function GET() {
  if (!isPostgrestConfigured()) {
    return NextResponse.json({ stats: getEmptyStats() })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('dashboard_stats')
      .select('*')

    if (error) {
      console.error('[dashboard/stats] query failed:', error)
      return NextResponse.json({ stats: getEmptyStats() })
    }

    const rows = (data || []) as DashboardStatsRow[]

    const stats = rows.reduce<DashboardStats>(
      (acc, curr) => {
        const n = normalizeRow(curr)
        return {
          agent_id: 'all',
          new_leads: acc.new_leads + n.new_leads,
          qualified_leads: acc.qualified_leads + n.qualified_leads,
          responded_leads: acc.responded_leads + n.responded_leads,
          leads_today: acc.leads_today + n.leads_today,
          leads_this_week: acc.leads_this_week + n.leads_this_week,
          avg_urgency: (acc.avg_urgency ?? 0) + n.avg_urgency,
          total_leads: acc.total_leads + n.total_leads,
        }
      },
      getEmptyStats()
    )

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[dashboard/stats] unexpected error:', error)
    return NextResponse.json({ stats: getEmptyStats() })
  }
}
