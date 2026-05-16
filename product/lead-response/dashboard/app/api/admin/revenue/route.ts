import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

function pct(count: number, base: number): number {
  if (!base) return 0
  return Number(((count / base) * 100).toFixed(1))
}

export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [
      metricsResult,
      signupsResult,
      fubResult,
      ahaResult,
      paidResult,
    ] = await Promise.all([
      postgrestAdmin
        .from('revenue_metrics')
        .select('date,active_subscribers,trial_users,mrr_cents,new_subscribers,conversion_rate,data')
        .order('date', { ascending: false })
        .limit(8),
      postgrestAdmin.from('real_estate_agents').select('id', { count: 'exact', head: true }),
      postgrestAdmin.from('agent_integrations').select('agent_id,follow_up_boss_api_key'),
      postgrestAdmin.from('real_estate_agents').select('id', { count: 'exact', head: true }).eq('aha_completed', true),
      postgrestAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    if (metricsResult.error) throw metricsResult.error
    if (signupsResult.error) throw signupsResult.error
    if (fubResult.error) throw fubResult.error
    if (ahaResult.error) throw ahaResult.error
    if (paidResult.error) throw paidResult.error

    const metrics = metricsResult.data || []
    const today = metrics[0] || null
    const yesterday = metrics[1] || null

    const signups = signupsResult.count || 0
    const fubConnected = (fubResult.data || []).filter((row: any) => row.follow_up_boss_api_key && row.follow_up_boss_api_key !== '').length
    const ahaCount = ahaResult.count || 0
    const paid = paidResult.count || 0

    const funnel = [
      { step: 'Signups', count: signups, conversion: 100 },
      { step: 'FUB Connected', count: fubConnected, conversion: pct(fubConnected, signups) },
      { step: 'Aha Moment', count: ahaCount, conversion: pct(ahaCount, signups) },
      { step: 'Paid', count: paid, conversion: pct(paid, signups) },
    ]

    const reverse = [...metrics].reverse()
    const sparklines = {
      active_subscribers: reverse.map((r: any) => r.active_subscribers || 0),
      trial_users: reverse.map((r: any) => r.trial_users || 0),
      mrr_cents: reverse.map((r: any) => r.mrr_cents || 0),
      conversion_rate: reverse.map((r: any) => Number(r.conversion_rate || 0)),
      fub_activation_rate: reverse.map((r: any) => Number(r.data?.fub_activation_rate || 0)),
      aha_completion_rate: reverse.map((r: any) => Number(r.data?.aha_completion_rate || 0)),
    }

    const deltas = {
      active_subscribers: (today?.active_subscribers || 0) - (yesterday?.active_subscribers || 0),
      trial_users: (today?.trial_users || 0) - (yesterday?.trial_users || 0),
      mrr_cents: (today?.mrr_cents || 0) - (yesterday?.mrr_cents || 0),
      conversion_rate: Number((today?.conversion_rate || 0)) - Number((yesterday?.conversion_rate || 0)),
    }

    return NextResponse.json({
      success: true,
      asOfDate: today?.date || null,
      funnel,
      sparklines,
      deltas,
      today,
      yesterday,
    })
  } catch (error: any) {
    logger.error('[admin/revenue] Error:', error.message)
    return NextResponse.json({ success: false, error: error.message || 'Failed to load revenue funnel' }, { status: 500 })
  }
}
