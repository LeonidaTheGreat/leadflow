import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import Stripe from 'stripe'
import { getAuthUserId } from '@/lib/auth'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app'

// Default to Pro plan for the nudge CTA
const PRO_PRICE_ID = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly'

/**
 * GET /api/trial/nudge
 *
 * Returns trial nudge state for the authenticated user:
 * - isTrial / isPilot
 * - daysRemaining
 * - isExpired
 * - shouldShow (true when daysRemaining <= 7 and banner not dismissed)
 * - checkoutUrl (Stripe checkout link for Pro plan upgrade)
 *
 * Used by the TrialNudgeBanner component in the dashboard layout.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: agent, error } = await supabaseAdmin
      .from('real_estate_agents')
      .select('plan_tier, trial_ends_at, pilot_expires_at, trial_banner_dismissed, email, first_name, last_name, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const isTrial = agent.plan_tier === 'trial'
    const isPilot = agent.plan_tier === 'pilot'
    const isEligible = isTrial || isPilot

    if (!isEligible) {
      // Already on a paid plan — no nudge needed
      return NextResponse.json({ shouldShow: false })
    }

    const now = new Date()
    const expiresAt = isTrial
      ? (agent.trial_ends_at ? new Date(agent.trial_ends_at) : null)
      : (agent.pilot_expires_at ? new Date(agent.pilot_expires_at) : null)

    const isExpired = expiresAt ? now > expiresAt : false
    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    // Show banner when: expiring within 7 days OR already expired, and not dismissed
    // Note: once expired, dismissal is ignored — we always show the nudge
    const shouldShow = isExpired || (daysRemaining <= 7 && !agent.trial_banner_dismissed)

    if (!shouldShow) {
      return NextResponse.json({ shouldShow: false })
    }

    // Build a Stripe checkout URL for Pro plan upgrade
    let checkoutUrl: string | null = null

    if (stripe && PRO_PRICE_ID && !PRO_PRICE_ID.startsWith('price_professional')) {
      try {
        let customerId = agent.stripe_customer_id

        if (!customerId) {
          const customer = await stripe.customers.create({
            email: agent.email,
            name: [agent.first_name, agent.last_name].filter(Boolean).join(' ') || undefined,
            metadata: { agent_id: userId, source: 'trial_nudge' },
          })
          customerId = customer.id

          await supabaseAdmin
            .from('real_estate_agents')
            .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
            .eq('id', userId)
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          client_reference_id: userId,
          line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
          mode: 'subscription',
          subscription_data: {
            metadata: { agent_id: userId, plan: 'pro', upgraded_from: 'trial_nudge' },
          },
          success_url: `${baseUrl}/dashboard?upgrade=success&plan=pro`,
          cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
        })

        checkoutUrl = session.url
      } catch (stripeError: any) {
        // Non-fatal: fall back to pricing page
        console.warn('Trial nudge: Stripe checkout creation failed:', stripeError.message)
      }
    }

    // Fallback if Stripe not configured or checkout creation failed
    if (!checkoutUrl) {
      checkoutUrl = `${baseUrl}/pricing`
    }

    return NextResponse.json({
      shouldShow: true,
      isTrial,
      isPilot,
      isExpired,
      daysRemaining,
      expiresAt: expiresAt?.toISOString() ?? null,
      checkoutUrl,
    })
  } catch (error: any) {
    console.error('Trial nudge error:', error)
    return NextResponse.json({ error: 'Internal error', shouldShow: false }, { status: 500 })
  }
}
