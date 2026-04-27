import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedRouteAuth } from '@/lib/security/privileged-route-auth'
import { postgrestAdmin, isPostgrestConfigured } from '@/lib/db'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

/**
 * GET /api/smoke/stripe-checkout-e2e
 *
 * End-to-end smoke test for the Stripe checkout flow.
 * Uses Stripe test mode to verify every step of the payment pipeline:
 *
 *   1. Create a Stripe test customer
 *   2. Create a checkout session for that customer
 *   3. Create a test subscription directly (simulates card 4242 completion)
 *   4. Simulate webhook: persist subscription + update agent in DB
 *   5. Verify DB writes: subscriptions table + real_estate_agents.subscription_status
 *   6. Clean up: delete test Stripe customer + DB rows
 *
 * Returns { status: 'ok' | 'fail', steps: [...], duration_ms }
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requirePrivilegedRouteAuth(request)
  if (unauthorized) return unauthorized
  const startTime = Date.now()
  const steps: Array<{
    step: string
    status: 'pass' | 'fail' | 'skip'
    detail: string
    duration_ms: number
  }> = []

  // Test-scoped IDs for cleanup
  let stripeCustomerId: string | null = null
  let stripeSubscriptionId: string | null = null
  const testAgentId = `smoke-test-${Date.now()}`
  const testEmail = `smoke-${Date.now()}@test.leadflow.dev`

  function addStep(step: string, status: 'pass' | 'fail' | 'skip', detail: string, stepStart: number) {
    steps.push({ step, status, detail, duration_ms: Date.now() - stepStart })
  }

  try {
    // ── Step 0: Preflight checks ──────────────────────────────────
    const s0 = Date.now()
    if (!stripe) {
      addStep('preflight', 'fail', 'STRIPE_SECRET_KEY not set', s0)
      return respond(steps, startTime)
    }
    if (!isPostgrestConfigured()) {
      addStep('preflight', 'fail', 'PostgREST not configured (NEXT_PUBLIC_API_URL / API_SECRET_KEY)', s0)
      return respond(steps, startTime)
    }

    // Verify we're in test mode
    if (!stripeKey!.startsWith('sk_test_')) {
      addStep('preflight', 'fail', 'STRIPE_SECRET_KEY is not a test key — refusing to run smoke test with live keys', s0)
      return respond(steps, startTime)
    }
    addStep('preflight', 'pass', 'Stripe test mode + DB configured', s0)

    // ── Step 1: Create Stripe test customer ──────────────────────
    const s1 = Date.now()
    try {
      const customer = await stripe.customers.create({
        email: testEmail,
        metadata: { agent_id: testAgentId, source: 'smoke_test' } })
      stripeCustomerId = customer.id
      addStep('create_customer', 'pass', `Customer ${customer.id}`, s1)
    } catch (err: any) {
      addStep('create_customer', 'fail', err.message, s1)
      return respond(steps, startTime)
    }

    // ── Step 2: Create checkout session ──────────────────────────
    const s2 = Date.now()
    try {
      // Find a valid price ID from env or list existing prices
      const priceId = await resolveTestPriceId(stripe)
      if (!priceId) {
        addStep('create_checkout_session', 'fail', 'No Stripe price ID found in env or account. Set STRIPE_PRICE_STARTER_MONTHLY or create a price in Stripe.', s2)
        return respond(steps, startTime)
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId!,
        client_reference_id: testAgentId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: 'https://leadflow-ai-five.vercel.app/dashboard?smoke=ok',
        cancel_url: 'https://leadflow-ai-five.vercel.app/pricing?smoke=cancelled',
        metadata: { agent_id: testAgentId, source: 'smoke_test' } })

      if (!session.id || !session.url) {
        addStep('create_checkout_session', 'fail', 'Session created but missing id or url', s2)
        return respond(steps, startTime)
      }
      addStep('create_checkout_session', 'pass', `Session ${session.id}`, s2)
    } catch (err: any) {
      addStep('create_checkout_session', 'fail', err.message, s2)
      return respond(steps, startTime)
    }

    // ── Step 3: Create subscription directly (simulates card 4242 payment) ──
    const s3 = Date.now()
    try {
      // Attach a test payment method to the customer
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' } })
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: stripeCustomerId! })
      await stripe.customers.update(stripeCustomerId!, {
        invoice_settings: { default_payment_method: paymentMethod.id } })

      const priceId = await resolveTestPriceId(stripe)
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId!,
        items: [{ price: priceId! }],
        metadata: {
          agent_id: testAgentId,
          tier: 'starter',
          source: 'smoke_test' } })

      stripeSubscriptionId = subscription.id

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        addStep('create_subscription', 'fail', `Unexpected status: ${subscription.status}`, s3)
        return respond(steps, startTime)
      }
      addStep('create_subscription', 'pass', `Subscription ${subscription.id} (${subscription.status})`, s3)
    } catch (err: any) {
      addStep('create_subscription', 'fail', err.message, s3)
      return respond(steps, startTime)
    }

    // ── Step 4: Insert test agent + simulate webhook DB writes ───
    const s4 = Date.now()
    try {
      // Create a temporary agent record for the smoke test
      await postgrestAdmin.from('real_estate_agents').insert({
        id: testAgentId,
        email: testEmail,
        first_name: 'Smoke',
        last_name: 'Test',
        status: 'trial',
        plan_tier: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() })

      // Simulate what handleCheckoutComplete does: update agent + upsert subscription
      const subscription = await stripe!.subscriptions.retrieve(stripeSubscriptionId!)
      const lineItem = (subscription as any).items.data[0]
      const priceId = lineItem?.price?.id || 'unknown'
      const interval = lineItem?.price?.recurring?.interval || 'month'

      // Update agent record (mirrors webhook handler)
      await postgrestAdmin.from('real_estate_agents').update({
        stripe_customer_id: stripeCustomerId,
        subscription_status: 'active',
        plan_tier: 'starter',
        mrr: (lineItem?.price?.unit_amount || 4900) / 100,
        updated_at: new Date().toISOString() }).eq('id', testAgentId)

      // Upsert subscription record (mirrors webhook handler)
      await postgrestAdmin.from('subscriptions').upsert({
        user_id: testAgentId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        tier: 'starter',
        price_id: priceId,
        interval: interval,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: subscription.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() }, { onConflict: 'stripe_subscription_id' })

      addStep('webhook_db_writes', 'pass', 'Agent updated + subscription upserted', s4)
    } catch (err: any) {
      addStep('webhook_db_writes', 'fail', err.message, s4)
      return respond(steps, startTime)
    }

    // ── Step 5: Verify DB state ─────────────────────────────────
    const s5 = Date.now()
    try {
      // Check subscriptions table
      const { data: subRow, error: subErr } = await postgrestAdmin
        .from('subscriptions')
        .select('id, user_id, stripe_subscription_id, status, tier')
        .eq('stripe_subscription_id', stripeSubscriptionId!)
        .single()

      if (subErr || !subRow) {
        addStep('verify_subscriptions_table', 'fail', `Subscription not found: ${subErr?.message || 'no row'}`, s5)
        return respond(steps, startTime)
      }
      if (subRow.status !== 'active' && subRow.status !== 'trialing') {
        addStep('verify_subscriptions_table', 'fail', `Unexpected status: ${subRow.status}`, s5)
        return respond(steps, startTime)
      }
      addStep('verify_subscriptions_table', 'pass', `Row found: status=${subRow.status}, tier=${subRow.tier}`, s5)

      // Check real_estate_agents record
      const s5b = Date.now()
      const { data: agentRow, error: agentErr } = await postgrestAdmin
        .from('real_estate_agents')
        .select('id, subscription_status, plan_tier, stripe_customer_id')
        .eq('id', testAgentId)
        .single()

      if (agentErr || !agentRow) {
        addStep('verify_agent_record', 'fail', `Agent not found: ${agentErr?.message || 'no row'}`, s5b)
        return respond(steps, startTime)
      }
      if (agentRow.subscription_status !== 'active') {
        addStep('verify_agent_record', 'fail', `subscription_status=${agentRow.subscription_status}, expected active`, s5b)
        return respond(steps, startTime)
      }
      if (!agentRow.stripe_customer_id) {
        addStep('verify_agent_record', 'fail', 'stripe_customer_id is null', s5b)
        return respond(steps, startTime)
      }
      addStep('verify_agent_record', 'pass', `subscription_status=${agentRow.subscription_status}, plan_tier=${agentRow.plan_tier}`, s5b)
    } catch (err: any) {
      addStep('verify_db', 'fail', err.message, s5)
      return respond(steps, startTime)
    }
  } finally {
    // ── Cleanup: remove test data ─────────────────────────────
    const sc = Date.now()
    const cleanupErrors: string[] = []

    // Cancel and delete Stripe subscription
    if (stripe && stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId)
      } catch (e: any) {
        cleanupErrors.push(`sub: ${e.message}`)
      }
    }

    // Delete Stripe customer (cascades to payment methods)
    if (stripe && stripeCustomerId) {
      try {
        await stripe.customers.del(stripeCustomerId)
      } catch (e: any) {
        cleanupErrors.push(`cust: ${e.message}`)
      }
    }

    // Delete DB rows
    if (isPostgrestConfigured()) {
      try {
        await postgrestAdmin.from('subscriptions').delete().eq('user_id', testAgentId)
      } catch (e: any) {
        cleanupErrors.push(`db_sub: ${e.message}`)
      }
      try {
        await postgrestAdmin.from('real_estate_agents').delete().eq('id', testAgentId)
      } catch (e: any) {
        cleanupErrors.push(`db_agent: ${e.message}`)
      }
    }

    if (cleanupErrors.length > 0) {
      steps.push({ step: 'cleanup', status: 'fail', detail: cleanupErrors.join('; '), duration_ms: Date.now() - sc })
    } else {
      steps.push({ step: 'cleanup', status: 'pass', detail: 'All test data removed', duration_ms: Date.now() - sc })
    }
  }

  return respond(steps, startTime)
}

/**
 * Resolve a usable Stripe price ID for testing.
 * Checks env vars first, then lists active prices from the Stripe account.
 */
async function resolveTestPriceId(stripe: Stripe): Promise<string | null> {
  // Check env vars in priority order
  const envKeys = [
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_TEAM_MONTHLY',
  ]
  for (const key of envKeys) {
    const val = process.env[key]
    if (val && val.startsWith('price_')) return val
  }

  // Fallback: list prices from Stripe account
  try {
    const prices = await stripe.prices.list({ active: true, limit: 5, type: 'recurring' })
    if (prices.data.length > 0) return prices.data[0].id
  } catch {
    // ignore
  }

  return null
}

function respond(
  steps: Array<{ step: string; status: string; detail: string; duration_ms: number }>,
  startTime: number
) {
  const allPassed = steps.every(s => s.status === 'pass' || s.status === 'skip')
  const failedStep = steps.find(s => s.status === 'fail')
  const status = allPassed ? 'ok' : 'fail'

  return NextResponse.json(
    {
      status,
      ...(failedStep && { failure_point: failedStep.step }),
      steps,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString() },
    { status: allPassed ? 200 : 500 }
  )
}
