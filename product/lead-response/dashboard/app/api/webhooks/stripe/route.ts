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

  const agentId = session.client_reference_id
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  if (!agentId) return

  const mrr = calculateMRR(subscription)
  const tier = getTierFromSubscription(subscription)

  // Update agent with subscription info
  await supabase.from('real_estate_agents').update({
    stripe_customer_id: session.customer as string,
    plan_tier: tier,
    mrr: mrr,
    subscription_status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log subscription creation
  await supabase.from('subscription_events').insert({
    agent_id: agentId,
    event_type: 'subscription_created',
    tier: tier,
    mrr: mrr,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    stripe_subscription_id: subscription.id,
    created_at: new Date().toISOString(),
  })

  // Log for analytics (PostHog)
  console.log(`📊 New subscription: ${agentId} - ${tier} - $${mrr}/mo`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!stripe) return

  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const agentId = subscription.metadata?.agent_id

  if (!agentId) return

  const amount = invoice.amount_paid / 100
  const mrr = calculateMRR(subscription)

  // Record payment
  await supabase.from('payments').insert({
    agent_id: agentId,
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
  }).eq('id', agentId)

  // Log event
  await supabase.from('subscription_events').insert({
    agent_id: agentId,
    event_type: 'payment_received',
    amount: amount,
    mrr: mrr,
    stripe_invoice_id: invoice.id,
    created_at: new Date().toISOString(),
  })

  console.log(`💰 Payment received: ${agentId} - $${amount}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!stripe) return

  const subscriptionId = (invoice as any).subscription
  if (!subscriptionId) return
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const agentId = subscription.metadata?.agent_id

  if (!agentId) return

  // Mark as at risk
  await supabase.from('real_estate_agents').update({
    subscription_status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log event
  await supabase.from('subscription_events').insert({
    agent_id: agentId,
    event_type: 'payment_failed',
    attempt_count: invoice.attempt_count || 1,
    stripe_invoice_id: invoice.id,
    created_at: new Date().toISOString(),
  })

  console.log(`⚠️  Payment failed: ${agentId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agent_id

  if (!agentId) return

  const mrr = calculateMRR(subscription)

  // Record churn
  await supabase.from('real_estate_agents').update({
    subscription_status: 'cancelled',
    mrr: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log churn event
  await supabase.from('subscription_events').insert({
    agent_id: agentId,
    event_type: 'subscription_cancelled',
    mrr_lost: mrr,
    reason: subscription.cancellation_details?.reason || 'unknown',
    stripe_subscription_id: subscription.id,
    created_at: new Date().toISOString(),
  })

  console.log(`❌ Subscription cancelled: ${agentId} - Lost $${mrr}/mo`)
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
