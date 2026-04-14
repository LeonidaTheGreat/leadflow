import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const resendKey = process.env.RESEND_API_KEY?.trim()
const resend = resendKey ? new Resend(resendKey) : null

// Event handlers

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  // Update subscription_attempts status regardless of agentId
  const { error: updateError } = await supabase
    .from('subscription_attempts')
    .update({ status: 'session_expired' })
    .eq('stripe_session_id', session.id)

  if (updateError) {
    console.error('Failed to update subscription_attempts:', updateError)
  }

  const agentId = session.client_reference_id
  if (!agentId) return

  try {

    // Check if agent already paid (don't send recovery email to paying customers)
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('id, email, first_name, plan_tier, status')
      .eq('id', agentId)
      .single()

    if (!agent) {
      console.warn(`checkout.session.expired: agent ${agentId} not found`)
      return
    }

    // Skip if agent already has an active paid plan
    if (agent.status === 'active' && agent.plan_tier && agent.plan_tier !== 'trial' && agent.plan_tier !== 'pilot') {
      console.log(`Skipping abandonment email for ${agentId} — already on ${agent.plan_tier} plan`)
      return
    }

    // Send abandonment recovery email via Resend
    if (resend && agent.email) {
      const firstName = agent.first_name || 'there'
      await resend.emails.send({
        from: 'LeadFlow AI <support@leadflowai.com>',
        to: agent.email,
        subject: 'Your LeadFlow upgrade is waiting',
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; text-align: center; }
    .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your upgrade is waiting</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>We noticed you started upgrading your LeadFlow account but didn't finish. No worries — your upgrade is just one click away.</p>
      <p>Pick up right where you left off:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://leadflow-ai-five.vercel.app/settings/billing" class="button">Complete Your Upgrade</a>
      </p>
      <p>If you ran into any issues or have questions about our plans, just reply to this email — we're happy to help.</p>
      <p>Best,<br>The LeadFlow Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LeadFlow AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `,
      })
      console.log(`Abandonment recovery email sent to ${agent.email}`)
    }

    // Log the event
    await supabase.from('subscription_events').insert({
      user_id: agentId,
      event_type: 'checkout_abandoned',
      stripe_event_data: {
        session_id: session.id,
        recovery_email_sent: Boolean(resend && agent.email),
      },
      created_at: new Date().toISOString(),
    })

    console.log(`Checkout session expired: ${agentId} (session ${session.id})`)
  } catch (error) {
    console.error('Error handling checkout.session.expired:', error)
  }
}

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

/**
 * Map Stripe price ID to plan tier
 * Matches against environment variables for price IDs
 */
function getTierFromPriceId(priceId: string): string {
  const tierMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'team',
  }
  return tierMap[priceId] || 'professional'
}

function getPlanDisplayName(tier: string): string {
  const names: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    team: 'Team',
    professional: 'Pro',
  }
  return names[tier] || 'Professional'
}

// Event handlers
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (!stripe) return

  const userId = session.client_reference_id
  const subscriptionId = session.subscription as string

  if (!userId || !subscriptionId) return

  try {
    // Retrieve subscription and resolve price ID to tier
    const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any
    const lineItem = subscription.items.data[0]
    const priceId = lineItem.price.id
    const tier = getTierFromPriceId(priceId)
    const mrr = calculateMRR(subscription)
    const stripeCustomerId = session.customer as string

    // Get agent info for email confirmation
    const { data: agent } = await supabase
      .from('real_estate_agents')
      .select('email, first_name')
      .eq('id', userId)
      .single()

    // Calculate next billing date
    const nextBillingDate = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'unknown'

    // Update agent with subscription info (non-blocking — subscription upsert is more important)
    // Only set columns that exist in real_estate_agents (see SCHEMA.md)
    const { error: updateError } = await supabase
      .from('real_estate_agents')
      .update({
        stripe_customer_id: stripeCustomerId,
        plan_tier: tier,
        mrr: mrr,
        status: 'active',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update agent:', updateError)
      // Continue — still persist the subscription record
    }

    // Upsert subscription record (idempotent — safe to replay webhooks)
    const { error: subError } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      tier: tier,
      price_id: priceId,
      interval: lineItem.price?.recurring?.interval || 'month',
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      trial_start: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000).toISOString() : null,
      trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
      ended_at: (subscription as any).ended_at ? new Date((subscription as any).ended_at * 1000).toISOString() : null,
      metadata: subscription.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' })

    if (subError) {
      console.error('CRITICAL: Failed to upsert subscription record:', subError)
    } else {
      console.log(`✅ Subscription persisted: ${subscription.id} for user ${userId}, tier=${tier}`)
    }

    // Log subscription creation event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_created',
      plan_tier: tier,
      mrr: Math.round(mrr * 100), // store as cents
      stripe_event_data: {
        subscription_id: subscriptionId,
        tier,
        mrr,
        stripe_customer_id: stripeCustomerId,
      },
      created_at: new Date().toISOString(),
    })

    // Send confirmation email via Resend (non-blocking)
    if (agent && resend) {
      const planName = getPlanDisplayName(tier)
      const agentFirstName = agent.first_name || 'there'
      
      try {
        await resend.emails.send({
          from: 'LeadFlow AI <support@leadflowai.com>',
          to: agent.email,
          subject: `You're on LeadFlow ${planName} — Here's your receipt`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; text-align: center; }
    .plan-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #d1fae5; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
    h1 { margin-top: 0; }
    .price-highlight { font-size: 24px; font-weight: bold; color: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to LeadFlow ${planName}!</h1>
      <p>Your upgrade is complete — here's what you need to know</p>
    </div>
    
    <div class="content">
      <p>Hi ${agentFirstName},</p>
      
      <p>Thank you for upgrading your LeadFlow account! Your payment has been processed and your new plan is now active.</p>
      
      <div class="plan-box">
        <h3>Your Plan Details</h3>
        <p><strong>Plan:</strong> LeadFlow ${planName}</p>
        <p><strong>Price:</strong> <span class="price-highlight">$${mrr}/month</span></p>
        <p><strong>Next Billing Date:</strong> ${nextBillingDate}</p>
      </div>
      
      <p>You now have access to all ${planName} features. Your dashboard has been updated with your new plan tier.</p>
      
      <h3>Need Help?</h3>
      <p>If you have any questions about your plan or need support, please reply to this email or contact us at <a href="mailto:support@leadflowai.com">support@leadflowai.com</a>.</p>
      
      <p>You can manage your subscription, update your payment method, or cancel at any time from your account settings.</p>
      
      <a href="https://leadflow-ai-five.vercel.app/settings/billing" class="button">View Billing Settings</a>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <strong>LeadFlow AI</strong><br>
        <a href="https://leadflow.ai">https://leadflow.ai</a>
      </p>
    </div>
    
    <div class="footer">
      <p>&copy; 2026 LeadFlow AI. All rights reserved.</p>
      <p>This email was sent to ${agent.email} because you upgraded your LeadFlow subscription.</p>
    </div>
  </div>
</body>
</html>
          `,
        })
        console.log(`📧 Confirmation email sent to ${agent.email} for ${planName} plan`)
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Email failure is non-blocking — subscription is already created
      }
    }

    // Log for analytics (PostHog)
    console.log(`📊 New subscription: ${userId} - ${tier} - $${mrr}/mo`)
  } catch (error) {
    console.error('Error handling checkout complete:', error)
  }
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

  // Record payment (status: 'succeeded' matches payments_status_check constraint)
  await supabase.from('payments').insert({
    user_id: agentId,
    stripe_invoice_id: invoice.id,
    amount: amount,
    currency: invoice.currency,
    period_start: new Date(invoice.period_start * 1000).toISOString(),
    period_end: new Date(invoice.period_end * 1000).toISOString(),
    status: 'succeeded',
    created_at: new Date().toISOString(),
  })

  // Update agent MRR
  await supabase.from('real_estate_agents').update({
    mrr: mrr,
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: agentId,
    event_type: 'payment_received',
    mrr: Math.round(mrr * 100),
    stripe_event_data: { invoice_id: invoice.id, amount, mrr },
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

  // Mark as at risk — use subscription_status (payment_status column doesn't exist)
  await supabase.from('real_estate_agents').update({
    subscription_status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log event
  await supabase.from('subscription_events').insert({
    user_id: agentId,
    event_type: 'payment_failed',
    attempt_count: invoice.attempt_count || 1,
    stripe_event_data: { invoice_id: invoice.id, attempt_count: invoice.attempt_count || 1 },
    created_at: new Date().toISOString(),
  })

  console.log(`⚠️  Payment failed: ${agentId}`)
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const agentId = subscription.metadata?.agent_id

  if (!agentId) return

  const mrr = calculateMRR(subscription)

  // Record churn — cancelled_at column doesn't exist; use subscription_status
  await supabase.from('real_estate_agents').update({
    subscription_status: 'cancelled',
    mrr: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', agentId)

  // Log churn event
  await supabase.from('subscription_events').insert({
    user_id: agentId,
    event_type: 'subscription_cancelled',
    mrr_change: -Math.round(mrr * 100), // negative = churn, in cents
    stripe_event_data: {
      subscription_id: subscription.id,
      mrr_lost: mrr,
      reason: subscription.cancellation_details?.reason || 'unknown',
    },
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

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session)
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
