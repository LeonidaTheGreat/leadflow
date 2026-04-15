import { NextResponse } from 'next/server'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'
import type { DashboardStats } from '@/lib/types'
import { logger } from '@/lib/logger'

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

export async function GET() {
  if (!isPostgrestConfigured()) {
    return NextResponse.json({ stats: getEmptyStats() })
  }

  try {
    const { data, error } = await postgrestAdmin
      .from('dashboard_stats')
      .select('*')

    if (error) {
      logger.error('[dashboard/stats] query failed:', error)
      return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
    }

    const rows = (data || []) as Partial<DashboardStats>[]

    const stats = rows.reduce((acc: DashboardStats, curr) => ({
      agent_id: 'all',
      new_leads: acc.new_leads + (curr.new_leads || 0),
      qualified_leads: acc.qualified_leads + (curr.qualified_leads || 0),
      responded_leads: acc.responded_leads + (curr.responded_leads || 0),
      leads_today: acc.leads_today + (curr.leads_today || 0),
      leads_this_week: acc.leads_this_week + (curr.leads_this_week || 0),
      avg_urgency: (acc.avg_urgency || 0) + (curr.avg_urgency || 0),
      total_leads: acc.total_leads + (curr.total_leads || 0),
    }), getEmptyStats())

    return NextResponse.json({ stats })
  } catch (error) {
    logger.error('[dashboard/stats] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
