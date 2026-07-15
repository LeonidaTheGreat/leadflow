import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

const TIER_PRICE_ENV: Record<string, string> = {
  starter: 'STRIPE_PRICE_STARTER_MONTHLY',
  professional: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  enterprise: 'STRIPE_PRICE_ENTERPRISE_MONTHLY',
}

/**
 * POST /api/admin/sales-cockpit/payment-link
 * Generates a Stripe payment link for the given agent email.
 * Defaults to the Starter tier ($49/mo) — pass tier='professional' etc. to override.
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
    const { agentEmail, tier = 'starter' } = body

    if (!agentEmail || typeof agentEmail !== 'string') {
      return NextResponse.json({ error: 'agentEmail is required' }, { status: 400 })
    }
    if (!TIER_PRICE_ENV[tier]) {
      return NextResponse.json({ error: `tier must be one of: ${Object.keys(TIER_PRICE_ENV).join(', ')}` }, { status: 400 })
    }

    const priceId = process.env[TIER_PRICE_ENV[tier]]
    if (!priceId) {
      return NextResponse.json({ error: `${tier} plan price ID not configured` }, { status: 503 })
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.leadflow.ai'}/dashboard?upgrade=success` },
      },
      metadata: { source: 'admin_sales_cockpit', agent_email: agentEmail, tier },
    })

    return NextResponse.json({ url: paymentLink.url })
  } catch (error) {
    logger.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
