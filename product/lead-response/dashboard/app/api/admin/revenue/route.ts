import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'
import { supabaseServer as supabase } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user } = await auth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('revenue_metrics')
      .select('date, active_subscribers, trial_users, mrr_cents, new_subscribers, conversion_rate, data')
      .eq('project_id', 'leadflow')
      .order('date', { ascending: false })
      .limit(7)

    if (error) {
      throw error
    }

    const rows = (data || []).slice().reverse()
    const today = rows[rows.length - 1] || null
    const yesterday = rows.length > 1 ? rows[rows.length - 2] : null

    return NextResponse.json({ rows, today, yesterday }, { status: 200 })
  } catch (error: any) {
    logger.error('[/api/admin/revenue] Error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
