import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

const supabase = supabaseAdmin

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

interface JWTPayload {
  userId: string
  email: string
  name?: string
}

// Plan → Stripe price ID mapping.
// In production these are set via Vercel env vars.
const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
  pro: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
  team: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
}

/**
 * POST /api/stripe/upgrade-checkout
 *
 * Creates a Stripe Checkout session for an authenticated pilot agent who
 * wants to upgrade to a paid plan. Requires a valid auth-token cookie.
 *
 * Body: { plan: 'starter' | 'pro' | 'team' }
 *
 * Returns: { url: string }  — the Stripe-hosted checkout URL (redirect there)
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let payload: JWTPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ── 2. Validate Stripe config ─────────────────────────────────────────────
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // ── 3. Parse + validate plan ──────────────────────────────────────────────
    const body = await request.json()
    const { plan } = body

    if (!plan || !PLAN_PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: `Invalid plan. Choose one of: ${Object.keys(PLAN_PRICE_IDS).join(', ')}` },
        { status: 400 }
      )
    }

    // ── 4. Fetch agent ────────────────────────────────────────────────────────
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email, stripe_customer_id, plan_tier, first_name, last_name')
      .eq('id', payload.userId)
      .single()

    if (agentError || !agent) {
      console.error('Agent lookup error:', agentError)
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // ── 5. Create/retrieve Stripe customer ────────────────────────────────────
    let customerId = agent.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: [agent.first_name, agent.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { agent_id: agent.id, source: 'pilot_upgrade' },
      })
      customerId = customer.id

      await supabase
        .from('real_estate_agents')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', agent.id)

      console.log(`✅ Created Stripe customer ${customerId} for agent ${agent.id}`)
    }

    // ── 6. Create Checkout session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: agent.id,
      line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          agent_id: agent.id,
          plan: plan,
          upgraded_from: 'pilot',
        },
      },
      // Pilot agents have already been using the product — no extra trial
      success_url: `${baseUrl}/settings/billing?upgrade=success&plan=${plan}`,
      cancel_url: `${baseUrl}/settings/billing?upgrade=cancelled`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    })

    // ── 7. Log upgrade attempt ────────────────────────────────────────────────
    try {
      await supabase.from('subscription_attempts').insert({
        agent_id: agent.id,
        tier: plan,
        stripe_session_id: session.id,
        status: 'session_created',
        created_at: new Date().toISOString(),
      })
    } catch (logError) {
      // Non-fatal — proceed even if logging fails
      console.warn('Failed to log subscription attempt:', logError)
    }

    console.log(`✅ Upgrade checkout session ${session.id} created for pilot agent ${agent.id} → ${plan}`)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Upgrade checkout error:', error)

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}`, code: 'STRIPE_INVALID_REQUEST' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
