import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey) : null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

function calculateMRR(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0]
  if (!item.price.recurring) return 0

  const amount = item.price.unit_amount || 0
  const quantity = item.quantity || 1

  if (item.price.recurring.interval === 'month') {
    return (amount * quantity) / 100
  } else if (item.price.recurring.interval === 'year') {
    return (amount * quantity) / 12 / 100
  }
  return 0
}

function getTierFromSubscription(subscription: Stripe.Subscription): string {
  return subscription.metadata?.tier || 'professional'
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    // Verify auth token or require admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active subscriptions from Stripe
    let totalMRR = 0
    let totalCustomers = 0
    const breakdown: Record<string, number> = {
      starter: 0,
      professional: 0,
      enterprise: 0,
    }

    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const subscriptions = await stripe!.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      })

      for (const sub of subscriptions.data) {
        const mrr = calculateMRR(sub)
        const tier = getTierFromSubscription(sub)

        totalMRR += mrr
        totalCustomers += 1

        if (breakdown[tier] !== undefined) {
          breakdown[tier] += mrr
        }
      }

      hasMore = subscriptions.has_more
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id
      }
    }

    // Store snapshot
    const snapshot = {
      date: new Date().toISOString(),
      total_mrr: totalMRR,
      breakdown: breakdown,
      customer_count: totalCustomers,
      arr: totalMRR * 12, // Annual Recurring Revenue
    }

    await supabase.from('mrr_snapshots').insert({
      ...snapshot,
      recorded_at: new Date().toISOString(),
    })

    // Log summary
    console.log(`📊 MRR Snapshot:`)
    console.log(`   Total MRR: $${totalMRR.toFixed(2)}`)
    console.log(`   Customers: ${totalCustomers}`)
    console.log(`   Breakdown: Starter=$${breakdown.starter?.toFixed(2) || 0}, Professional=$${breakdown.professional?.toFixed(2) || 0}, Enterprise=$${breakdown.enterprise?.toFixed(2) || 0}`)

    return NextResponse.json({
      success: true,
      data: snapshot,
    })
  } catch (error: any) {
    console.error('MRR snapshot error:', error)
    return NextResponse.json(
      { error: 'Failed to create MRR snapshot' },
      { status: 500 }
    )
  }
}

// GET current MRR (cached snapshot)
export async function GET(request: NextRequest) {
  try {
    // Get latest snapshot
    const { data: latestSnapshot } = await supabase
      .from('mrr_snapshots')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (!latestSnapshot) {
      return NextResponse.json({
        success: true,
        data: {
          total_mrr: 0,
          breakdown: { starter: 0, professional: 0, enterprise: 0 },
          customer_count: 0,
          arr: 0,
          date: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: latestSnapshot,
    })
  } catch (error) {
    console.error('MRR fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MRR' },
      { status: 500 }
    )
  }
}
