import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const supabase = supabaseAdmin

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

// Plan + interval → Stripe price ID env var names.
// Annual = pay 10 months upfront, 2 months free.
const PLAN_PRICE_ENV: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    annual:  'STRIPE_PRICE_STARTER_ANNUAL',
  },
  pro: {
    monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    annual:  'STRIPE_PRICE_PRO_ANNUAL',
  },
  team: {
    monthly: 'STRIPE_PRICE_TEAM_MONTHLY',
    annual:  'STRIPE_PRICE_TEAM_ANNUAL',
  },
}

function getPriceId(plan: string, interval: 'monthly' | 'annual'): string | undefined {
  const envKey = PLAN_PRICE_ENV[plan]?.[interval]
  return envKey ? process.env[envKey] : undefined
}

/**
 * POST /api/stripe/upgrade-checkout
 *
 * Creates a Stripe Checkout session for an authenticated pilot agent who
 * wants to upgrade to a paid plan. Requires a valid auth-token cookie.
 *
 * Body: { plan: 'starter' | 'pro' | 'team', interval?: 'monthly' | 'annual' }
 *   interval defaults to 'monthly'. Annual = 2 months free, billed upfront.
 *
 * Returns: { url: string }  — the Stripe-hosted checkout URL (redirect there)
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ── 2. Validate Stripe config ─────────────────────────────────────────────
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // ── 3. Parse + validate plan + interval ───────────────────────────────────
    const body = await request.json()
    const { plan, interval = 'monthly' } = body

    const validPlans = Object.keys(PLAN_PRICE_ENV)
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Choose one of: ${validPlans.join(', ')}` },
        { status: 400 }
      )
    }

    if (interval !== 'monthly' && interval !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid interval. Must be "monthly" or "annual".' },
        { status: 400 }
      )
    }

    const priceId = getPriceId(plan, interval)
    if (!priceId) {
      logger.error(`Missing Stripe price ID for plan="${plan}" interval="${interval}"`)
      return NextResponse.json(
        { error: `Billing not configured for ${plan} ${interval}. Contact support.`, code: 'PRICE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // ── 4. Fetch agent ────────────────────────────────────────────────────────
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email, stripe_customer_id, plan_tier, first_name, last_name')
      .eq('id', userId)
      .single()

    if (agentError || !agent) {
      logger.error('Agent lookup error:', agentError)
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // ── 5. Create/retrieve Stripe customer ────────────────────────────────────
    let customerId = agent.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: [agent.first_name, agent.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { agent_id: agent.id, source: 'pilot_upgrade' } })
      customerId = customer.id

      await supabase
        .from('real_estate_agents')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', agent.id)

      logger.info(`✅ Created Stripe customer ${customerId} for agent ${agent.id}`)
    }

    // ── 6. Create Checkout session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: agent.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          agent_id: agent.id,
          plan: plan,
          interval: interval,
          upgraded_from: 'pilot' } },
      // After payment, return to dashboard. Banner disappears because plan_tier is no longer 'trial'.
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/dashboard`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true })

    // ── 7. Log upgrade attempt ────────────────────────────────────────────────
    try {
      await supabase.from('subscription_attempts').insert({
        agent_id: agent.id,
        tier: plan,
        interval: interval,
        stripe_session_id: session.id,
        status: 'session_created',
        created_at: new Date().toISOString() })
    } catch (logError) {
      // Non-fatal — proceed even if logging fails
      logger.warn('Failed to log subscription attempt:', logError)
    }

    logger.info(`✅ Upgrade checkout session ${session.id} created for pilot agent ${agent.id} → ${plan} (${interval})`)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    logger.error('Upgrade checkout error:', error)

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Service error', code: 'STRIPE_INVALID_REQUEST' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
