import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

// Canonical env var names — must match PRICE_ID_ENV_MAP in create-checkout/route.ts
const TIER_ENV_MAP: Record<string, string> = {
  starter: 'STRIPE_PRICE_STARTER_MONTHLY',
  pro:     'STRIPE_PRICE_PRO_MONTHLY',
  team:    'STRIPE_PRICE_TEAM_MONTHLY',
}

/** Real Stripe price IDs: price_ + 14–30 alphanumeric chars */
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

/**
 * POST /api/admin/sales-cockpit/payment-link
 * Generates a Stripe payment link for the given tier and agent.
 * Used by the Admin Activation page to manually close first customers.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { agentEmail, agentId, tier = 'pro' } = body

    if (!agentEmail || typeof agentEmail !== 'string') {
      return NextResponse.json({ error: 'agentEmail is required' }, { status: 400 })
    }

    if (!TIER_ENV_MAP[tier]) {
      return NextResponse.json(
        { error: `Invalid tier: ${tier}. Must be one of: ${Object.keys(TIER_ENV_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    const envVar = TIER_ENV_MAP[tier]
    const priceId = process.env[envVar]
    if (!isValidPriceId(priceId)) {
      logger.error(`Missing or invalid Stripe Price ID for tier "${tier}". Set ${envVar} in Vercel env vars.`)
      return NextResponse.json(
        {
          error: `Billing is not configured for the "${tier}" plan. Set ${envVar} in Vercel environment variables.`,
          code: 'PRICE_NOT_CONFIGURED',
          envVar,
        },
        { status: 503 }
      )
    }

    const metadata: Record<string, string> = {
      source: 'admin_sales_cockpit',
      agent_email: agentEmail,
    }
    if (agentId) metadata.agent_id = agentId

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadflow-ai-five.vercel.app'}/dashboard?upgrade=success` },
      },
      metadata,
    })

    return NextResponse.json({ url: paymentLink.url })
  } catch (error) {
    logger.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
