/**
 * GET /api/admin/payments
 *
 * Admin diagnostic endpoint for Stripe checkout visibility.
 * Returns:
 *   - events: last 30 Stripe events (type, received_at, payload summary)
 *   - ratio: checkout.session.created vs completed count
 *   - lastPaymentAttempt: ISO timestamp of most recent checkout.session.created
 *   - priceIdHealth: which configured price IDs are valid / invalid / missing
 *
 * Auth: LEADFLOW_API_KEY bearer token
 * UC: uc-leadflow-checkout-failure-diagnostics
 */

import { NextRequest, NextResponse } from 'next/server'
import { postgrestAdmin } from '@/lib/db'
import { requireAdmin } from '@/lib/services/AuthService'
import { logger } from '@/lib/logger'

const STRIPE_PRICE_ENV_VARS = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_STARTER_ANNUAL',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_ANNUAL',
  'STRIPE_PRICE_TEAM_MONTHLY',
  'STRIPE_PRICE_TEAM_ANNUAL',
] as const

function isValidPriceId(id: string | undefined): boolean {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

function verifyApiKeyAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  if (!apiKey) return false
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false
  return authHeader.slice(7).trim() === apiKey
}

function buildPriceIdHealth(): { valid: string[]; invalid: Array<{ envVar: string; value: string }>; missing: string[] } {
  const valid: string[] = []
  const invalid: Array<{ envVar: string; value: string }> = []
  const missing: string[] = []

  for (const envVar of STRIPE_PRICE_ENV_VARS) {
    const val = process.env[envVar]
    if (!val) {
      missing.push(envVar)
    } else if (!isValidPriceId(val)) {
      invalid.push({ envVar, value: val })
    } else {
      valid.push(envVar)
    }
  }

  return { valid, invalid, missing }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authed = verifyApiKeyAuth(request) || (await requireAdmin(request))
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch last 30 Stripe events
    const { data: events, error: eventsError } = await postgrestAdmin
      .from('stripe_events')
      .select('id, type, received_at, payload')
      .order('received_at', { ascending: false })
      .limit(30)

    if (eventsError) {
      logger.error('[/api/admin/payments] stripe_events query error:', eventsError)
    }

    const rows = (events ?? []) as Array<{ id: string; type: string; received_at: string; payload: any }>

    // Compute checkout ratio from the returned events window
    // Use a broader query for ratio accuracy (last 100 checkout events)
    const { data: checkoutEvents } = await postgrestAdmin
      .from('stripe_events')
      .select('type, received_at')
      .in('type', ['checkout.session.created', 'checkout.session.completed', 'checkout.session.expired'])
      .order('received_at', { ascending: false })
      .limit(100)

    const checkoutRows = (checkoutEvents ?? []) as Array<{ type: string; received_at: string }>
    const createdCount = checkoutRows.filter(r => r.type === 'checkout.session.created').length
    const completedCount = checkoutRows.filter(r => r.type === 'checkout.session.completed').length
    const expiredCount = checkoutRows.filter(r => r.type === 'checkout.session.expired').length

    const conversionRate = createdCount > 0
      ? Math.round((completedCount / createdCount) * 10000) / 100
      : null

    // Last payment attempt: most recent checkout.session.created
    const lastAttemptRow = checkoutRows.find(r => r.type === 'checkout.session.created')
    const lastPaymentAttempt = lastAttemptRow?.received_at ?? null

    // Build display events with status derived from payload
    const displayEvents = rows.map(row => {
      const payload = row.payload ?? {}
      const obj = payload.data?.object ?? {}
      const status = obj.status ?? payload.status ?? null
      const amountTotal = obj.amount_total ?? null
      const currency = obj.currency ?? null
      return {
        id: row.id,
        type: row.type,
        received_at: row.received_at,
        status,
        amount_total: amountTotal,
        currency,
      }
    })

    return NextResponse.json({
      events: displayEvents,
      ratio: {
        created: createdCount,
        completed: completedCount,
        expired: expiredCount,
        conversion_rate: conversionRate,
      },
      lastPaymentAttempt,
      priceIdHealth: buildPriceIdHealth(),
      as_of: new Date().toISOString(),
    })
  } catch (err: any) {
    logger.error('[/api/admin/payments] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
