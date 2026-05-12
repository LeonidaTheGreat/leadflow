import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, interval, current_period_end, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      return NextResponse.json({ interval: null, renewsAt: null, tier: null })
    }

    return NextResponse.json({
      tier: subscription.tier,
      interval: subscription.interval,
      renewsAt: subscription.current_period_end,
      status: subscription.status,
    })
  } catch (err) {
    logger.error('Subscription info error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
