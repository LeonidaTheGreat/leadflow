import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

// Pricing tiers (from product spec)
const PRICING_TIERS: Record<string, { priceId: string; name: string; amount: number }> = {
  starter_monthly: {
    priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    name: 'Starter - Monthly',
    amount: 49700, // $497 in cents
  },
  starter_annual: {
    priceId: process.env.STRIPE_PRICE_STARTER_ANNUAL || 'price_starter_annual',
    name: 'Starter - Annual',
    amount: 497000,
  },
  professional_monthly: {
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
    name: 'Professional - Monthly',
    amount: 99700, // $997 in cents
  },
  professional_annual: {
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_professional_annual',
    name: 'Professional - Annual',
    amount: 997000,
  },
  enterprise_monthly: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
    name: 'Enterprise - Monthly',
    amount: 199700, // $1997 in cents
  },
  enterprise_annual: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_enterprise_annual',
    name: 'Enterprise - Annual',
    amount: 1997000,
  },
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const { tier, agentId, email } = await request.json()

    if (!tier || !agentId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!PRICING_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      )
    }

    // Create or get Stripe customer
    let customerId: string
    const existingCustomer = await stripe!.customers.list({
      email: email,
      limit: 1,
    })

    if (existingCustomer.data.length > 0) {
      customerId = existingCustomer.data[0].id
    } else {
      const customer = await stripe!.customers.create({
        email: email,
        metadata: { agent_id: agentId },
      })
      customerId = customer.id
    }

    // Create checkout session
    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      client_reference_id: agentId,
      line_items: [
        {
          price: PRICING_TIERS[tier].priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          agent_id: agentId,
          tier: tier.split('_')[0], // Extract 'starter', 'professional', 'enterprise'
          source: 'onboarding_flow',
        },
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    })

    // Log subscription attempt
    await supabase.from('subscription_attempts').insert({
      agent_id: agentId,
      tier: tier,
      stripe_session_id: session.id,
      status: 'session_created',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Checkout error:', error)

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
