import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const VALID_TIERS = ['starter', 'pro', 'team'] as const
type Tier = typeof VALID_TIERS[number]

const TIER_CONFIG: Record<Tier, { name: string; amount: number }> = {
  starter: { name: 'LeadFlow AI — Starter', amount: 4900 },
  pro:     { name: 'LeadFlow AI — Pro',     amount: 14900 },
  team:    { name: 'LeadFlow AI — Team',    amount: 39900 },
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadflow-ai-five.vercel.app').replace(/\/$/, '')

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

/**
 * POST /api/admin/sales-cockpit/payment-link
 * Generates a Stripe payment link for any plan tier.
 * Creates the price dynamically — no pre-configured price IDs required.
 * Accepts agentId (preferred) or agentEmail for backwards compatibility.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, agentEmail, tier = 'pro' } = body ?? {}

  if (!agentId && !agentEmail) {
    return NextResponse.json({ error: 'agentId or agentEmail is required' }, { status: 400 })
  }
  if (typeof tier !== 'string' || !VALID_TIERS.includes(tier as Tier)) {
    return NextResponse.json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 })
  }

  const resolvedTier = tier as Tier
  const tierCfg = TIER_CONFIG[resolvedTier]

  let resolvedEmail: string = agentEmail ?? ''
  const metadata: Record<string, string> = {
    source: 'admin_sales_cockpit',
    tier: resolvedTier,
  }

  // Resolve agent by ID if provided
  if (agentId) {
    try {
      const { data: agent, error: agentError } = await postgrestAdmin
        .from('real_estate_agents')
        .select('id,email,stripe_customer_id')
        .eq('id', agentId)
        .single()

      if (agentError || !agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }

      resolvedEmail = agent.email
      metadata.agent_id = agentId
      metadata.agent_email = agent.email
      if (agent.stripe_customer_id) {
        metadata.stripe_customer_id = agent.stripe_customer_id
      }
    } catch (err) {
      logger.error('Agent lookup error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  } else {
    metadata.agent_email = resolvedEmail
  }

  try {
    // Create a price on the fly so we don't depend on pre-configured price IDs in Vercel env
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: tierCfg.amount,
      recurring: { interval: 'month' },
      product_data: { name: tierCfg.name },
    })

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${APP_URL}/dashboard?upgrade=success` },
      },
      metadata,
    })

    return NextResponse.json({ url: paymentLink.url, tier: resolvedTier })
  } catch (error) {
    logger.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
