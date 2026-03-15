import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

// Valid pricing tiers — price IDs MUST come from env vars (no fallback to invalid strings)
const PRICING_TIERS: Record<string, { name: string; amount: number }> = {
  starter_monthly:      { name: 'Starter - Monthly',      amount: 4900  },  // $49/mo
  starter_annual:       { name: 'Starter - Annual',        amount: 49000 },  // $490/yr
  professional_monthly: { name: 'Professional - Monthly',  amount: 14900 },  // $149/mo
  professional_annual:  { name: 'Professional - Annual',   amount: 149000 }, // $1,490/yr
  enterprise_monthly:   { name: 'Enterprise - Monthly',    amount: 39900 },  // $399/mo
  enterprise_annual:    { name: 'Enterprise - Annual',     amount: 399000 }, // $3,990/yr
}

const PRICE_ID_ENV_MAP: Record<string, string> = {
  starter_monthly:      'STRIPE_PRICE_STARTER_MONTHLY',
  starter_annual:       'STRIPE_PRICE_STARTER_ANNUAL',
  professional_monthly: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  professional_annual:  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  enterprise_monthly:   'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  enterprise_annual:    'STRIPE_PRICE_ENTERPRISE_ANNUAL',
}

/**
 * Validate a Stripe Price ID looks correct.
 * Real Stripe price IDs look like: price_1QvIEf2eZvKYlo2CkuDLQABG
 * - Prefix: price_
 * - Followed by 14+ alphanumeric chars (NO underscores, no words like "starter")
 * This rejects placeholder values like price_starter_49, price_pro_149, price_team_399.
 */
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,}$/.test(id)
}

/** Validate a UUID v4 format */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// Simple in-memory rate limiter: max 5 checkout requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  record.count++
  if (record.count > RATE_LIMIT_MAX) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting (before any processing) ---
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      )
    }

    // --- Parse & validate request body (before checking Stripe) ---
    let body: { tier?: string; agentId?: string; email?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_BODY' },
        { status: 400 }
      )
    }

    const { tier, agentId, email } = body

    if (!tier || !agentId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, agentId, email', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    // Validate tier is a known enum value
    if (!PRICING_TIERS[tier]) {
      return NextResponse.json(
        {
          error: `Invalid pricing tier: ${tier}. Must be one of: ${Object.keys(PRICING_TIERS).join(', ')}`,
          code: 'INVALID_TIER',
        },
        { status: 400 }
      )
    }

    // Validate agentId is a valid UUID
    if (!isValidUUID(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agentId format. Must be a UUID.', code: 'INVALID_AGENT_ID' },
        { status: 400 }
      )
    }

    // --- IDOR protection: caller must provide their own agent ID via header ---
    // The authenticated agent's ID is forwarded in x-agent-id by middleware/client
    const callerAgentId = request.headers.get('x-agent-id')
    if (callerAgentId && callerAgentId !== agentId) {
      return NextResponse.json(
        { error: 'Unauthorized: agentId does not match authenticated user', code: 'UNAUTHORIZED' },
        { status: 403 }
      )
    }

    // --- Stripe availability (after input validation) ---
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // --- Resolve Price ID from env vars (no fallback to placeholder strings) ---
    const envVarName = PRICE_ID_ENV_MAP[tier]
    const priceId = process.env[envVarName]
    if (!isValidPriceId(priceId)) {
      console.error(
        `Missing or invalid Stripe Price ID for tier "${tier}". ` +
        `Set ${envVarName} in Vercel environment variables to a valid price_... ID.`
      )
      return NextResponse.json(
        {
          error: `Billing is not configured for the "${tier}" plan. Contact support.`,
          code: 'PRICE_NOT_CONFIGURED',
          envVar: envVarName,
        },
        { status: 503 }
      )
    }

    // --- Validate agent exists in database ---
    const { data: agent, error: agentError } = await supabase
      .from('real_estate_agents')
      .select('id, email')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // --- Create or retrieve Stripe customer ---
    let customerId: string
    const existingCustomers = await stripe.customers.list({ email, limit: 1 })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { agent_id: agentId },
      })
      customerId = customer.id
    }

    // --- Create checkout session ---
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: agentId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          agent_id: agentId,
          tier: tier.split('_')[0], // 'starter' | 'professional' | 'enterprise'
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
      tier,
      stripe_session_id: session.id,
      status: 'session_created',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)

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
