import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/revenue-config-health
 *
 * Checks whether all Stripe and email environment variables are properly configured
 * so Stojan can see exactly which configs are blocking payments.
 *
 * Auth: LEADFLOW_API_KEY header (same as other admin endpoints)
 *
 * Response:
 * {
 *   stripe: { ok: boolean, missing: string[], invalid: string[] },
 *   email:  { ok: boolean, domain: string | null },
 *   overall: 'ok' | 'degraded' | 'broken'
 * }
 */

/** Real Stripe secret keys start with sk_live_ or sk_test_ */
function isValidStripeSecretKey(key: string | undefined): key is string {
  return typeof key === 'string' && /^sk_(live|test)_[A-Za-z0-9]{20,}$/.test(key)
}

/** Real Stripe price IDs: price_ + 14–30 alphanumeric chars */
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

const PRICE_ENV_VARS = [
  'STRIPE_PRICE_STARTER_MONTHLY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_TEAM_MONTHLY',
]

export async function GET(request: NextRequest) {
  // Auth: LEADFLOW_API_KEY header
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  const expectedKey = process.env.LEADFLOW_API_KEY
  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Stripe checks ---
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripeKeyOk = isValidStripeSecretKey(stripeKey)

  const missingPriceIds: string[] = []
  const invalidPriceIds: string[] = []

  for (const envVar of PRICE_ENV_VARS) {
    const val = process.env[envVar]
    if (!val) {
      missingPriceIds.push(envVar)
    } else if (!isValidPriceId(val)) {
      invalidPriceIds.push(`${envVar}=${val}`)
    }
  }

  const stripeOk = stripeKeyOk && missingPriceIds.length === 0 && invalidPriceIds.length === 0

  // --- Email checks ---
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL || process.env.NEXT_PUBLIC_FROM_EMAIL
  const emailOk = typeof resendKey === 'string' && resendKey.startsWith('re_') && resendKey.length > 10

  let emailDomain: string | null = null
  if (fromEmail) {
    const match = fromEmail.match(/@([^>]+)/)
    if (match) emailDomain = match[1]
  }

  // --- Overall status ---
  let overall: 'ok' | 'degraded' | 'broken'
  if (stripeOk && emailOk) {
    overall = 'ok'
  } else if (!stripeKeyOk || missingPriceIds.length === PRICE_ENV_VARS.length) {
    overall = 'broken'
  } else {
    overall = 'degraded'
  }

  return NextResponse.json({
    stripe: {
      ok: stripeOk,
      keyConfigured: stripeKeyOk,
      missing: missingPriceIds,
      invalid: invalidPriceIds,
    },
    email: {
      ok: emailOk,
      domain: emailDomain,
    },
    overall,
    checkedAt: new Date().toISOString(),
  })
}
