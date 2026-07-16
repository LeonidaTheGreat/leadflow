import { describe, it, expect } from '@jest/globals'

function isValidPriceId(id: string | undefined): boolean {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

function isValidStripeSecretKey(key: string | undefined): boolean {
  return typeof key === 'string' && /^sk_(live|test)_.+$/.test(key)
}

function computeOverall(opts: {
  stripeKeyOk: boolean
  pricesOk: boolean
  webhookSecretOk: boolean
  emailOk: boolean
}): 'ok' | 'degraded' | 'broken' {
  if (!opts.stripeKeyOk || !opts.pricesOk) return 'broken'
  if (!opts.emailOk || !opts.webhookSecretOk) return 'degraded'
  return 'ok'
}

describe('isValidPriceId()', () => {
  it('rejects undefined', () => expect(isValidPriceId(undefined)).toBe(false))
  it('rejects empty string', () => expect(isValidPriceId('')).toBe(false))
  it('rejects placeholder price_starter_49', () => expect(isValidPriceId('price_starter_49')).toBe(false))
  it('rejects placeholder price_pro_149', () => expect(isValidPriceId('price_pro_149')).toBe(false))
  it('rejects placeholder price_team_399', () => expect(isValidPriceId('price_team_399')).toBe(false))
  it('rejects placeholder price_starter_monthly', () => expect(isValidPriceId('price_starter_monthly')).toBe(false))
  it('accepts real-format price_1QvIEf2eZvKYlo2CkuDLQABG', () => expect(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG')).toBe(true))
  it('accepts minimal valid price_1AbCDEFGHIJKLMN', () => expect(isValidPriceId('price_1AbCDEFGHIJKLMN')).toBe(true))
})

describe('isValidStripeSecretKey()', () => {
  it('rejects undefined', () => expect(isValidStripeSecretKey(undefined)).toBe(false))
  it('rejects empty string', () => expect(isValidStripeSecretKey('')).toBe(false))
  it('rejects pk_live key', () => expect(isValidStripeSecretKey('pk_live_abc123')).toBe(false))
  it('accepts sk_test_* key', () => expect(isValidStripeSecretKey('sk_test_51AbCDEFGH')).toBe(true))
  it('accepts sk_live_* key', () => expect(isValidStripeSecretKey('sk_live_51AbCDEFGH')).toBe(true))
})

describe('computeOverall()', () => {
  it('returns ok when all configured', () => {
    expect(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: true, emailOk: true })).toBe('ok')
  })

  it('returns broken when stripe key missing', () => {
    expect(computeOverall({ stripeKeyOk: false, pricesOk: true, webhookSecretOk: true, emailOk: true })).toBe('broken')
  })

  it('returns broken when prices are placeholder/missing', () => {
    expect(computeOverall({ stripeKeyOk: true, pricesOk: false, webhookSecretOk: true, emailOk: true })).toBe('broken')
  })

  it('returns degraded when email not configured', () => {
    expect(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: true, emailOk: false })).toBe('degraded')
  })

  it('returns degraded when webhook secret missing', () => {
    expect(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: false, emailOk: true })).toBe('degraded')
  })

  it('returns broken over degraded when both stripe key and email are bad', () => {
    expect(computeOverall({ stripeKeyOk: false, pricesOk: true, webhookSecretOk: true, emailOk: false })).toBe('broken')
  })
})

describe('Env var naming consistency', () => {
  const EXPECTED_PRICE_VARS = [
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_STARTER_ANNUAL',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_TEAM_MONTHLY',
    'STRIPE_PRICE_TEAM_ANNUAL',
  ]

  it('all 6 price vars follow the STRIPE_PRICE_{TIER}_{INTERVAL} convention', () => {
    EXPECTED_PRICE_VARS.forEach(v => {
      expect(v).toMatch(/^STRIPE_PRICE_(STARTER|PRO|TEAM)_(MONTHLY|ANNUAL)$/)
    })
  })

  it('none use NEXT_PUBLIC_ prefix', () => {
    EXPECTED_PRICE_VARS.forEach(v => {
      expect(v).not.toMatch(/^NEXT_PUBLIC_/)
    })
  })

  it('none use PROFESSIONAL or ENTERPRISE (canonical names are PRO and TEAM)', () => {
    EXPECTED_PRICE_VARS.forEach(v => {
      expect(v).not.toContain('PROFESSIONAL')
      expect(v).not.toContain('ENTERPRISE')
    })
  })
})
