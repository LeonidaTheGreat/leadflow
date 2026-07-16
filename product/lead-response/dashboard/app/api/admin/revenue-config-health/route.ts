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

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.LEADFLOW_API_KEY
  const authedViaApiKey = validApiKey && apiKey === validApiKey
  if (!authedViaApiKey && !(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = (process.env.FROM_EMAIL || '').trim()

  const missingPrices: string[] = []
  const placeholderPrices: string[] = []
  const validPrices: string[] = []

  for (const envVar of STRIPE_PRICE_VARS) {
    const val = process.env[envVar]
    if (!val) {
      missingPrices.push(envVar)
    } else if (!isValidPriceId(val)) {
      placeholderPrices.push(envVar)
    } else {
      validPrices.push(envVar)
    }
  }

  const stripeKeyOk = isValidStripeSecretKey(stripeSecretKey)
  const webhookSecretOk = !!stripeWebhookSecret
  const pricesOk = missingPrices.length === 0 && placeholderPrices.length === 0

  const stripeOk = stripeKeyOk && webhookSecretOk && pricesOk

  const emailDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : null
  const resendOk = !!resendApiKey
  const emailFromOk = !!emailDomain
  const emailOk = resendOk && emailFromOk

  let overall: 'ok' | 'degraded' | 'broken' = 'ok'
  if (!stripeKeyOk || !pricesOk) {
    overall = 'broken'
  } else if (!emailOk || !webhookSecretOk) {
    overall = 'degraded'
  }

  return NextResponse.json({
    stripe: {
      ok: stripeOk,
      secretKey: stripeKeyOk ? 'valid' : 'missing_or_invalid',
      webhookSecret: webhookSecretOk ? 'set' : 'missing',
      prices: {
        valid: validPrices,
        missing: missingPrices,
        placeholder: placeholderPrices,
      },
    },
    email: {
      ok: emailOk,
      resendApiKey: resendOk ? 'set' : 'missing',
      domain: emailDomain,
    },
    overall,
  })
}
