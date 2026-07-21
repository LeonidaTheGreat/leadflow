import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

/**
 * POST /api/admin/sales-cockpit/payment-link
 * Generates a Stripe payment link for the Pro plan pre-filled for the given agent email.
 * Used by the Admin Sales Cockpit to manually close first customers.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY
  if (!proPriceId) {
    return NextResponse.json({ error: 'Pro plan price ID not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { agentEmail } = body

    if (!agentEmail || typeof agentEmail !== 'string') {
      return NextResponse.json({ error: 'agentEmail is required' }, { status: 400 })
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: proPriceId, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.leadflow.ai'}/dashboard?upgrade=success` },
      },
      metadata: { source: 'admin_sales_cockpit', agent_email: agentEmail },
    })

    return NextResponse.json({ url: paymentLink.url })
  } catch (error) {
    logger.error('Payment link creation error:', error)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }
}
