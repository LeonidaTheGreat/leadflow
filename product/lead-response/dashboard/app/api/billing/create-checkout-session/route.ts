import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

const VALID_PLANS = ['starter', 'pro', 'team'] as const
type PlanId = typeof VALID_PLANS[number]
type BillingInterval = 'monthly' | 'annual'

/**
 * Map plan ID + interval to Stripe price ID from environment variables.
 * Annual price IDs use the _ANNUAL suffix; monthly use _MONTHLY.
 * For 'pro', tries canonical STRIPE_PRICE_PRO_* first, then legacy STRIPE_PRICE_PROFESSIONAL_*.
 */
function getPriceIdForPlan(planId: PlanId, interval: BillingInterval): string | null {
  const intervalKey = interval === 'annual' ? 'ANNUAL' : 'MONTHLY'
  const canonicalEnvVar = `STRIPE_PRICE_${planId.toUpperCase()}_${intervalKey}`
  const canonicalValue = process.env[canonicalEnvVar]
  if (canonicalValue) return canonicalValue

  // Legacy fallback for 'pro' plan (old env var name)
  if (planId === 'pro') {
    const legacyMonthly = process.env[`STRIPE_PRICE_PROFESSIONAL_${intervalKey}`]
    if (legacyMonthly) return legacyMonthly
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { planId, interval = 'monthly' } = body

    if (!planId || !VALID_PLANS.includes(planId as PlanId)) {
      return NextResponse.json(
        { error: 'Invalid or missing planId' },
        { status: 400 }
      )
    }

    if (!['monthly', 'annual'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval — must be monthly or annual' },
        { status: 400 }
      )
    }

    const priceId = getPriceIdForPlan(planId as PlanId, interval as BillingInterval)
    if (!priceId || priceId.startsWith('price_replace')) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 503 }
      )
    }

    // Authenticate via auth-token or leadflow_session cookie
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get agent email from database to ensure they exist and get current email
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Create Stripe Checkout session
    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1 },
      ],
      customer_email: agent.email,
      client_reference_id: agent.id,
      success_url: `${new URL(request.url).origin}/dashboard?upgrade=success`,
      cancel_url: `${new URL(request.url).origin}/settings/billing?upgrade=cancelled`,
      metadata: {
        agent_id: agent.id,
        plan_id: planId,
        interval } })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
