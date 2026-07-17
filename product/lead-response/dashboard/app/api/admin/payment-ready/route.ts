import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/payment-ready
 *
 * Returns agents who have completed onboarding but don't yet have an active subscription.
 * These are the prime targets for admin-generated payment links.
 *
 * Filter: email_verified=true AND onboarding_completed=true AND subscription_status='inactive'
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: agents, error } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,plan_tier,stripe_customer_id,created_at')
      .eq('email_verified', true)
      .eq('onboarding_completed', true)
      .eq('subscription_status', 'inactive')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Payment-ready agents query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (agents ?? []).map((a: any) => ({
      id: a.id,
      name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email,
      email: a.email,
      plan_tier: a.plan_tier ?? null,
      stripe_customer_id: a.stripe_customer_id ?? null,
      created_at: a.created_at,
    }))

    return NextResponse.json({ agents: result })
  } catch (err) {
    logger.error('Payment-ready GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
