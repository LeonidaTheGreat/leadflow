import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/services/AuthService'
import { postgrestAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'

// Amounts in cents: Starter $49/mo, Pro $149/mo, Team $399/mo
const PLAN_AMOUNTS_CENTS: Record<string, number> = {
  starter: 4900,
  pro: 14900,
  team: 39900,
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
}

const VALID_PLAN_TIERS = ['starter', 'pro', 'team'] as const
type PlanTier = (typeof VALID_PLAN_TIERS)[number]

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any })
  : null

/**
 * Get or create a Stripe Price for the given plan tier using lookup keys.
 * This ensures prices are created once and reused across calls.
 */
async function getOrCreatePrice(planTier: PlanTier): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  const lookupKey = `leadflow_${planTier}_monthly`

  // Try to find existing price with this lookup key
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true })
  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  // Create a new recurring price with the lookup key for future reuse
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: PLAN_AMOUNTS_CENTS[planTier],
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
    product_data: {
      name: `LeadFlow ${PLAN_DISPLAY_NAMES[planTier]}`,
    },
  })

  return price.id
}

/**
 * POST /api/admin/create-payment-link
 *
 * Generates a Stripe Payment Link for a specific agent and plan tier.
 * Payment links are reusable shareable URLs — unlike checkout sessions.
 *
 * Body: { agentId: string, planTier: 'starter' | 'pro' | 'team' }
 * Returns: { url: string, agentId: string, planTier: string, email: string }
 *
 * Auth: admin session (requireAdmin cookie-based auth)
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let body: { agentId?: unknown; planTier?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, planTier } = body

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  if (!planTier || !VALID_PLAN_TIERS.includes(planTier as PlanTier)) {
    return NextResponse.json({ error: 'planTier must be starter, pro, or team' }, { status: 400 })
  }

  const tier = planTier as PlanTier

  try {
    // Look up agent to get email and existing stripe_customer_id
    const { data: agent, error: agentError } = await postgrestAdmin
      .from('real_estate_agents')
      .select('id,email,stripe_customer_id,plan_tier')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get or create a reusable Stripe Price for this plan tier
    const priceId = await getOrCreatePrice(tier)

    // Build metadata — agent_id and plan_tier enable the webhook to
    // identify the agent when checkout.session.completed fires
    const metadata: Record<string, string> = {
      agent_id: agentId,
      plan_tier: tier,
      source: 'admin_payment_link',
    }

    // Include existing stripe_customer_id in metadata so webhook can reconcile
    if (agent.stripe_customer_id) {
      metadata.existing_stripe_customer_id = agent.stripe_customer_id
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.leadflow.ai'}/dashboard?upgrade=success`,
        },
      },
      metadata,
      // Always create a Stripe customer so subscriptions are trackable
      customer_creation: 'always',
    })

    logger.info('Admin payment link created', {
      agentId,
      planTier: tier,
      linkId: paymentLink.id,
    })

    return NextResponse.json({
      url: paymentLink.url,
      agentId,
      planTier: tier,
      email: agent.email,
    })
  } catch (error: any) {
    logger.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
