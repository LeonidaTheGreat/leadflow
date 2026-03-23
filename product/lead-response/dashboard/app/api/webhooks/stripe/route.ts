import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Helper functions
function calculateMRR(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0]
  if (!item.price.recurring) return 0

  const amount = item.price.unit_amount || 0
  const quantity = item.quantity || 1

  if (item.price.recurring.interval === 'month') {
    return (amount * quantity) / 100 // Convert cents to dollars
  } else if (item.price.recurring.interval === 'year') {
    return (amount * quantity) / 12 / 100
  }
  return 0
}

function getTierFromSubscription(subscription: Stripe.Subscription): string {
  const metadata = subscription.metadata?.tier || 'professional'
  return metadata
}

// Event handlers

/**
 * Handle checkout.session.completed — creates the initial subscription record.
 * Fix: subscriptions table was never populated; upsert ensures idempotent replay.
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!stripe) return

  const userId = session.client_reference_id
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  if (!userId) return

  const mrr = calculateMRR(subscription)
  const tier = getTierFromSubscription(subscription)

  // Update agent with subscription info
  await supabase.from('real_estate_agents').update({
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    plan_tier: tier,
    mrr: mrr,
    status: 'active',
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  // Create initial subscription record (core fix: subscriptions table was never populated)
  const subData = subscription as any;
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    tier: tier,
    price_id: subscription.items.data[0]?.price?.id ?? null,
    interval: subscription.items.data[0]?.price?.recurring?.interval ?? null,
    current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })

  // Log subscription creation event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_created',
    tier: tier,
    mrr: mrr,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    stripe_subscription_id: subscription.id,
    created_at: new Date().toISOString(),
  })

  // Log for analytics (PostHog)
  console.log(`📊 New subscription: ${userId} - ${tier} - $${mrr}/mo`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!stripe) return

  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id || subscription.metadata?.agent_id

  if (!userId) return

  const amount = invoice.amount_paid / 100
  const mrr = calculateMRR(subscription)

  // Record payment
  await supabase.from('payments').insert({
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount: amount,
    currency: invoice.currency,
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000),
    status: 'paid',
    created_at: new Date().toISOString(),
  })

  // Update agent MRR
  await supabase.from('real_estate_agents').update({
    mrr: mrr,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'payment_received',
    amount: amount,
    mrr: mrr,
    stripe_invoice_id: invoice.id,
    created_at: new Date().toISOString(),
  })

  console.log(`💰 Payment received: ${userId} - $${amount}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!stripe) return

  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id || subscription.metadata?.agent_id

  if (!userId) return

  // Mark as at risk
  await supabase.from('real_estate_agents').update({
    payment_status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'payment_failed',
    attempt_count: invoice.attempt_count || 1,
    stripe_invoice_id: invoice.id,
    created_at: new Date().toISOString(),
  })

  console.log(`⚠️  Payment failed: ${userId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id || subscription.metadata?.agent_id

  if (!userId) return

  const mrr = calculateMRR(subscription)

  // Record churn
  await supabase.from('real_estate_agents').update({
    status: 'cancelled',
    mrr: 0,
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  // Log churn event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'subscription_cancelled',
    mrr_lost: mrr,
    reason: subscription.cancellation_details?.reason || 'unknown',
    stripe_subscription_id: subscription.id,
    created_at: new Date().toISOString(),
  })

  console.log(`❌ Subscription cancelled: ${userId} - Lost $${mrr}/mo`)
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe!.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`⏭️  Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
