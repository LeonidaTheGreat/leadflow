import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/activation/completed
 * Returns agents who completed onboarding but have not activated a subscription.
 * These are the agents closest to paying — they did everything right.
 *
 * Criteria: email_verified=true, onboarding_completed=true, subscription_status=inactive
 */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: agents, error } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,first_name,last_name,email,phone_number,plan_tier,stripe_customer_id,onboarding_completed_at,created_at,last_login_at')
      .eq('email_verified', true)
      .eq('onboarding_completed', true)
      .eq('subscription_status', 'inactive')
      .order('onboarding_completed_at', { ascending: false })

    if (error) {
      logger.error('Completed-onboarding agents query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (agents ?? []).map((a: any) => ({
      id: a.id,
      name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || a.email,
      first_name: a.first_name ?? null,
      last_name: a.last_name ?? null,
      email: a.email,
      phone_number: a.phone_number ?? null,
      plan_tier: a.plan_tier ?? 'starter',
      has_stripe_customer: !!a.stripe_customer_id,
      onboarding_completed_at: a.onboarding_completed_at ?? null,
      created_at: a.created_at,
      last_login_at: a.last_login_at ?? null,
    }))

    return NextResponse.json({ agents: result })
  } catch (err) {
    logger.error('Activation/completed GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
