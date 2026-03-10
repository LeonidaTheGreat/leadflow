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
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!stripe) return

  const userId = session.client_reference_id
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  if (!userId) return

  const mrr = calculateMRR(subscription)
  const tier = getTierFromSubscription(subscription)
  const customerId = session.customer as string

  // Upsert subscription into subscriptions table
  const { data: subscriptionData, error: subError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status as string,
        tier: tier,
        price_id: subscription.items.data[0]?.price.id || '',
        interval: (subscription.items.data[0]?.price.recurring?.interval || 'month') as string,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        metadata: subscription.metadata || {},
      },
      { onConflict: 'stripe_subscription_id' }
    )

  if (subError) {
    console.error('Error upserting subscription:', subError)
  }

  // Log subscription creation event
  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionData?.[0]?.id,
    user_id: userId,
    stripe_event_id: `checkout_${session.id}`,
    event_type: 'subscription_created',
    stripe_event_data: {
      tier,
      mrr,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      stripe_subscription_id: subscription.id,
    },
  })

  // Update agent with subscription info
  await supabase.from('agents').update({
    stripe_customer_id: customerId,
    subscription_status: 'active',
    subscription_tier: tier,
    current_period_end: new Date(subscription.current_period_end * 1000),
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    mrr: mrr,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

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

  // Find subscription record
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  const subscriptionRecordId = subscriptions?.id

  // Record payment
  await supabase.from('payments').insert({
    subscription_id: subscriptionRecordId,
    user_id: userId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    amount: amount,
    currency: invoice.currency,
    status: 'succeeded',
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000),
    receipt_url: invoice.hosted_invoice_url || null,
  })

  // Log payment event
  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionRecordId,
    user_id: userId,
    stripe_event_id: `payment_${invoice.id}`,
    event_type: 'payment_succeeded',
    stripe_event_data: {
      amount,
      mrr,
      stripe_invoice_id: invoice.id,
    },
  })

  // Update agent MRR
  await supabase.from('agents').update({
    mrr: mrr,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  console.log(`💰 Payment received: ${userId} - $${amount}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!stripe) return

  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id || subscription.metadata?.agent_id

  if (!userId) return

  // Find subscription record
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  const subscriptionRecordId = subscriptions?.id

  // Record failed payment
  await supabase.from('payments').insert({
    subscription_id: subscriptionRecordId,
    user_id: userId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    status: 'failed',
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000),
    failure_message: (invoice as any).last_payment_error?.message || 'Payment failed',
  })

  // Log payment failed event
  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionRecordId,
    user_id: userId,
    stripe_event_id: `payment_failed_${invoice.id}`,
    event_type: 'payment_failed',
    stripe_event_data: {
      attempt_count: invoice.attempt_count || 1,
      stripe_invoice_id: invoice.id,
      error: (invoice as any).last_payment_error?.message,
    },
  })

  // Update agent subscription status to past_due
  await supabase.from('agents').update({
    subscription_status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  console.log(`⚠️  Payment failed: ${userId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id || subscription.metadata?.agent_id

  if (!userId) return

  const mrr = calculateMRR(subscription)

  // Find subscription record
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const subscriptionRecordId = subscriptions?.id

  // Update subscription to canceled
  await supabase.from('subscriptions').update({
    status: 'canceled',
    canceled_at: new Date(),
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000) : new Date(),
  }).eq('stripe_subscription_id', subscription.id)

  // Log churn event
  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionRecordId,
    user_id: userId,
    stripe_event_id: `canceled_${subscription.id}`,
    event_type: 'subscription_cancelled',
    stripe_event_data: {
      mrr_lost: mrr,
      reason: subscription.cancellation_details?.reason || 'unknown',
      stripe_subscription_id: subscription.id,
    },
  })

  // Record churn in agent
  await supabase.from('agents').update({
    subscription_status: 'canceled',
    mrr: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

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
