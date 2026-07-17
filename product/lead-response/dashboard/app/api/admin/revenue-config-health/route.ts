import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/services/AuthService'

const STRIPE_PRICE_VARS = [
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

function isValidStripeSecretKey(key: string | undefined): boolean {
  return typeof key === 'string' && /^sk_(live|test)_.+$/.test(key)
}

function verifyApiKeyAuth(request: NextRequest): boolean {
  const apiKey = process.env.LEADFLOW_API_KEY
  if (!apiKey) return false

  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() === apiKey
  }

  const headerKey = request.headers.get('x-api-key') ?? ''
  return headerKey === apiKey
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const hasApiKey = verifyApiKeyAuth(request)
  const hasSession = !hasApiKey && await requireAdmin(request)

  if (!hasApiKey && !hasSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const stripeKeyValid = isValidStripeSecretKey(stripeKey)

  const priceMissing: string[] = []
  const priceInvalid: string[] = []
  const priceOk: string[] = []

  for (const envVar of STRIPE_PRICE_VARS) {
    const val = process.env[envVar]
    if (!val) {
      priceMissing.push(envVar)
    } else if (!isValidPriceId(val)) {
      priceInvalid.push(envVar)
    } else {
      priceOk.push(envVar)
    }
  }

  const stripeOk = stripeKeyValid && priceMissing.length === 0 && priceInvalid.length === 0

  const resendKey = process.env.RESEND_API_KEY
  const resendConfigured = !!resendKey && resendKey !== 'placeholder'
  const emailFromDomain = process.env.EMAIL_FROM_DOMAIN || process.env.RESEND_FROM_DOMAIN || null

  const emailOk = resendConfigured

  const overall = stripeOk && emailOk ? 'ok' : (!stripeKeyValid || priceMissing.length > 0) ? 'broken' : 'degraded'

  return NextResponse.json({
    stripe: {
      ok: stripeOk,
      secret_key: stripeKeyValid ? 'valid' : !stripeKey ? 'missing' : 'invalid_format',
      prices: {
        ok: priceOk,
        missing: priceMissing,
        invalid: priceInvalid,
      },
    },
    email: {
      ok: emailOk,
      resend_api_key: resendConfigured ? 'configured' : 'missing',
      domain: emailFromDomain,
    },
    overall,
  })
}
