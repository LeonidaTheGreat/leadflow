import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase, isSupabaseConfigured } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' as any })
  : null

const PRICE_ENV_MAP: Record<string, string> = {
  starter: 'STRIPE_PRICE_STARTER_MONTHLY',
  pro: 'STRIPE_PRICE_PRO_MONTHLY',
  team: 'STRIPE_PRICE_TEAM_MONTHLY',
}

function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,36}$/.test(id)
}

function getPriceIdForPlan(planId: string): { priceId: string; envVar: string } | null {
  const envVar = PRICE_ENV_MAP[planId]
  if (!envVar) return null
  const priceId = process.env[envVar]
  if (!isValidPriceId(priceId)) return null
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

    const resolved = getPriceIdForPlan(planId)
    if (!resolved) {
      const envVar = PRICE_ENV_MAP[planId] || 'STRIPE_PRICE_*'
      logger.error(`Missing or invalid Stripe Price ID for plan "${planId}". Set ${envVar} to a valid price_... ID.`)
      return NextResponse.json(
        { error: `Billing is not configured for the "${planId}" plan. Contact support.`, code: 'PRICE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }
    const priceId = resolved.priceId

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
