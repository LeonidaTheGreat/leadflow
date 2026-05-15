/**
 * Task Spec (1740ea6b-9d62-4ae9-b0a8-a2b5da2f12d6)
 * What:
 * - Update `getPriceIdForPlan` in this file to support `interval` (`monthly` | `annual`) and map to monthly/annual Stripe price env vars.
 * - Update POST body parsing/validation in this file to accept `interval=annual`.
 * - Update webhook plan mapping in `app/api/webhooks/stripe/route.ts` to recognize annual price IDs.
 * - Update trial-status response in `app/api/auth/trial-status/route.ts` to include subscription interval and renewal date from `subscriptions`.
 * - Update billing settings UI in `app/settings/billing/page.tsx` to send interval in checkout request and show renewal date for annual subscriptions.
 * - Add annual interval verification in `tests/integration/stripe-checkout-e2e.test.js`.
 * Verify:
 * - `npm test -- tests/integration/stripe-checkout-e2e.test.js` passes and includes year interval assertion.
 * - `npm test` passes.
 * - `npm run build` succeeds.
 * - `rg -n "STRIPE_PRICE_PROFESSIONAL_MONTHLY|STRIPE_PRICE_ENTERPRISE_MONTHLY"` on updated checkout endpoints confirms canonical PRO/TEAM mapping coverage with backward-compatible fallback.
 * Boundaries:
 * - Do not change unrelated auth/onboarding/pilot flows.
 * - Do not modify protected generated docs/config files.
 * - Do not alter database schema/migrations in this task.
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
function getPriceIdForPlan(planId: string, interval: 'monthly' | 'annual'): string | null {
  const priceIdMap: Record<string, string> = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || '',
    team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    team_annual: process.env.STRIPE_PRICE_TEAM_ANNUAL || process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || '' }
  return priceIdMap[`${planId}_${interval}`] || null
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

    if (!planId || !['starter', 'pro', 'team'].includes(planId) || !['monthly', 'annual'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid planId or interval' },
        { status: 400 }
      )
    }

    const priceId = getPriceIdForPlan(planId, interval)
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
