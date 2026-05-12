import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: sub, error } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, interval, current_period_end, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !sub) {
      // No active subscription — return empty (not an error)
      return NextResponse.json({ interval: null, currentPeriodEnd: null, tier: null })
    }

    return NextResponse.json({
      tier: sub.tier,
      interval: sub.interval,
      currentPeriodEnd: sub.current_period_end,
      status: sub.status,
    })
  } catch (error) {
    logger.error('Subscription details error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
