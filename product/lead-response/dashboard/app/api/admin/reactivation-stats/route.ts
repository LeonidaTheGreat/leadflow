import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { isAdminUser } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    if (!await isAdminUser(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: agents, error } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,email,first_name,trial_ends_at,trial_email_expired_sent,subscription_status,aha_completed,utm_campaign')

    if (error) throw error

    const lapsed = (agents || []).filter((a: any) =>
      a.trial_ends_at
      && new Date(a.trial_ends_at) < new Date()
      && !a.aha_completed
    )

    const sent = lapsed.filter((a: any) => a.trial_email_expired_sent === true)
    const eligible = lapsed.filter((a: any) => !a.trial_email_expired_sent && a.subscription_status !== 'active')
    const openedViaUtm = sent.filter((a: any) => a.utm_campaign === 'lapsed_trial_reactivation')
    const reactivated = sent.filter((a: any) => a.subscription_status === 'active')

    return NextResponse.json({
      success: true,
      stats: {
        eligible: eligible.length,
        sent: sent.length,
        opened_via_utm: openedViaUtm.length,
        reactivated: reactivated.length,
      },
    })
  } catch (err: any) {
    logger.error('Reactivation stats error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load reactivation stats' },
      { status: 500 }
    )
  }
}
