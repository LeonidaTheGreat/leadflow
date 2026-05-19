/*
Task Spec (c844e56e-e91a-478a-b30b-418060036bc3)
What:
- Update product/lead-response/dashboard/app/api/billing/create-checkout-session/route.ts:
  function getPriceIdForPlan() to use STRIPE_PRICE_PRO_MONTHLY (standardized with create-checkout route).
- Update tests that assert or seed the old STRIPE_PRICE_PROFESSIONAL_MONTHLY name:
  product/lead-response/dashboard/tests/feat-self-serve-stripe-checkout.test.js
  product/lead-response/dashboard/__tests__/upgrade-checkout.test.ts
  product/lead-response/dashboard/__tests__/trial-nudge.test.ts

Verify:
- Run: node product/lead-response/dashboard/tests/b4b9f900-fix-checkout-price-id-regex.test.js
  Expected: all checks pass and confirm regex accepts valid Stripe IDs.
- Run: npm test -- product/lead-response/dashboard/__tests__/upgrade-checkout.test.ts
  Expected: passes with pro monthly env var mapping.
- Run: cd product/lead-response/dashboard && npx next build
  Expected: build succeeds.
- Run grep:
  rg -n "STRIPE_PRICE_PROFESSIONAL_MONTHLY" product/lead-response/dashboard/app/api/billing product/lead-response/dashboard/__tests__ product/lead-response/dashboard/tests
  Expected: zero matches.

Boundaries:
- Do not change checkout business flow, tier lists, or Stripe session payload semantics.
- Do not modify webhook handlers, DB schema, or unrelated UI components.
*/
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

/**
 * Map plan ID to Stripe price ID from environment variables
 */
function getPriceIdForPlan(planId: string): string | null {
  const priceIdMap: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    team: process.env.STRIPE_PRICE_TEAM_MONTHLY || '' }
  return priceIdMap[planId] || null
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
    const { planId } = body

    if (!planId || !['starter', 'pro', 'team'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid or missing planId' },
        { status: 400 }
      )
    }

    const priceId = getPriceIdForPlan(planId)
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
        plan_id: planId } })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
