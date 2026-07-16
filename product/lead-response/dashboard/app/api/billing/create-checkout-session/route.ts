import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

// Canonical env var names — must match PRICE_ID_ENV_MAP in create-checkout/route.ts
const PLAN_ENV_MAP: Record<string, string> = {
  starter: 'STRIPE_PRICE_STARTER_MONTHLY',
  pro:     'STRIPE_PRICE_PRO_MONTHLY',
  team:    'STRIPE_PRICE_TEAM_MONTHLY',
}

/** Real Stripe price IDs: price_ + 14–30 alphanumeric chars (no underscores, no words) */
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

function getPriceIdForPlan(planId: string): { priceId: string | null; envVar: string } {
  const envVar = PLAN_ENV_MAP[planId] ?? ''
  const priceId = envVar ? (process.env[envVar] ?? null) : null
  return { priceId, envVar }
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

    const { priceId, envVar } = getPriceIdForPlan(planId)
    if (!isValidPriceId(priceId)) {
      logger.error(
        `Missing or invalid Stripe Price ID for plan "${planId}". ` +
        `Set ${envVar} in Vercel environment variables to a real price_... ID.`
      )
      return NextResponse.json(
        {
          error: `Billing is not configured for the "${planId}" plan. Contact support.`,
          code: 'PRICE_NOT_CONFIGURED',
          envVar,
        },
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
    const session = await stripe.checkout.sessions.create({
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
