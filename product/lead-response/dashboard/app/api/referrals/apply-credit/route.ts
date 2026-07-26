/**
 * POST /api/referrals/apply-credit
 * Called when a referred agent completes their first paid month.
 * Marks referral as converted and applies a one-month Stripe credit to the referrer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendReferralConversionEmail } from '@/lib/referral-email'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.LEADFLOW_API_KEY || ''

export async function POST(request: NextRequest) {
  // Require internal secret — this endpoint is called by Stripe webhook handler, not the browser
  const authHeader = request.headers.get('authorization')
  if (!INTERNAL_SECRET || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { referred_agent_id, referral_code } = body

    if (!referred_agent_id && !referral_code) {
      return NextResponse.json(
        { error: 'referred_agent_id or referral_code is required' },
        { status: 400 }
      )
    }

    // Find the pending referral
    let referralQuery = supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('conversion_status', 'pending')

    if (referral_code) {
      referralQuery = referralQuery.eq('referral_code', referral_code)
    } else {
      referralQuery = referralQuery.eq('referred_agent_id', referred_agent_id)
    }

    const { data: referral, error: referralError } = await referralQuery.single()

    if (referralError || !referral) {
      logger.error('Referral not found for apply-credit', { referred_agent_id, referral_code })
      return NextResponse.json({ error: 'Pending referral not found' }, { status: 404 })
    }

    // Mark referral as converted
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        conversion_status: 'converted',
        converted_at: new Date().toISOString(),
        credit_applied: true,
        free_months_earned: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referral.id)

    if (updateError) {
      logger.error('Failed to update referral status', updateError)
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
    }

    // Increment referrer's total_referral_credits
    await supabaseAdmin
      .from('real_estate_agents')
      .update({
        total_referral_credits: supabaseAdmin.rpc('increment', { row_id: referral.referrer_agent_id }),
      })
      .eq('id', referral.referrer_agent_id)

    // Get referrer agent details for Stripe credit
    const { data: referrer } = await supabaseAdmin
      .from('real_estate_agents')
      .select('id, email, name, stripe_customer_id, plan_tier')
      .eq('id', referral.referrer_agent_id)
      .single()

    // Apply Stripe credit if referrer has a Stripe customer
    let stripeCouponApplied = false
    if (referrer?.stripe_customer_id) {
      try {
        stripeCouponApplied = await applyStripeCredit(
          referrer.stripe_customer_id,
          referrer.plan_tier || 'pro'
        )
      } catch (stripeErr) {
        logger.error('Stripe credit application failed (non-fatal)', stripeErr)
      }
    }

    // Send notification email to referrer
    if (referrer?.email) {
      try {
        await sendReferralConversionEmail({
          referrerEmail: referrer.email,
          referrerName: referrer.name || 'there',
          referredEmail: referral.referred_email || 'your referral',
          creditApplied: stripeCouponApplied,
        })
      } catch (emailErr) {
        logger.error('Referral conversion email failed (non-fatal)', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      referral_id: referral.id,
      stripe_credit_applied: stripeCouponApplied,
    })
  } catch (error) {
    logger.error('Error applying referral credit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const PLAN_CREDIT_USD: Record<string, number> = {
  starter: 49_00,
  pro: 149_00,
  team: 399_00,
  brokerage: 999_00,
}

async function applyStripeCredit(stripeCustomerId: string, planTier: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false

  const amountOff = PLAN_CREDIT_USD[planTier] ?? PLAN_CREDIT_USD.pro

  try {
    const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    })

    // Apply credit as a negative balance transaction (credit reduces next invoice amount)
    await stripe.customers.createBalanceTransaction(stripeCustomerId, {
      amount: -amountOff,
      currency: 'usd',
      description: 'Referral Reward — 1 Month Free',
      metadata: { source: 'referral_program' },
    })

    return true
  } catch {
    return false
  }
}
