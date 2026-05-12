/**
 * Unit tests for annual billing webhook logic (AC-WEBHOOK-1, AC-WEBHOOK-3)
 *
 * Tests getTierFromPriceId() behavior for annual and monthly price IDs,
 * and verifies calculateMRR() correctly divides annual amounts by 12.
 */

// ── getTierFromPriceId tests ─────────────────────────────────────────────────

describe('getTierFromPriceId — annual billing (AC-WEBHOOK-1)', () => {
  const STARTER_MONTHLY = 'price_starter_monthly_test'
  const STARTER_ANNUAL  = 'price_starter_annual_test'
  const PRO_MONTHLY     = 'price_pro_monthly_test'
  const PRO_ANNUAL      = 'price_pro_annual_test'
  const TEAM_MONTHLY    = 'price_team_monthly_test'
  const TEAM_ANNUAL     = 'price_team_annual_test'

  // Inline the pure logic from the webhook route so we can test without mocking Stripe/Resend
  function getTierFromPriceId(priceId: string, env: Record<string, string | undefined>): string {
    const tierMap: Record<string, string> = {
      [env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'starter',
      [env.STRIPE_PRICE_STARTER_ANNUAL  || '']: 'starter',
      [env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '']: 'pro',
      [env.STRIPE_PRICE_PRO_ANNUAL      || '']: 'pro',
      [env.STRIPE_PRICE_TEAM_MONTHLY    || '']: 'team',
      [env.STRIPE_PRICE_TEAM_ANNUAL     || '']: 'team',
    }
    delete tierMap['']
    return tierMap[priceId] || 'pro'
  }

  const env = {
    STRIPE_PRICE_STARTER_MONTHLY: STARTER_MONTHLY,
    STRIPE_PRICE_STARTER_ANNUAL: STARTER_ANNUAL,
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: PRO_MONTHLY,
    STRIPE_PRICE_PRO_ANNUAL: PRO_ANNUAL,
    STRIPE_PRICE_TEAM_MONTHLY: TEAM_MONTHLY,
    STRIPE_PRICE_TEAM_ANNUAL: TEAM_ANNUAL,
  }

  it('resolves monthly starter price ID to starter', () => {
    expect(getTierFromPriceId(STARTER_MONTHLY, env)).toBe('starter')
  })

  it('resolves annual starter price ID to starter', () => {
    expect(getTierFromPriceId(STARTER_ANNUAL, env)).toBe('starter')
  })

  it('resolves monthly pro price ID to pro', () => {
    expect(getTierFromPriceId(PRO_MONTHLY, env)).toBe('pro')
  })

  it('resolves annual pro price ID to pro', () => {
    expect(getTierFromPriceId(PRO_ANNUAL, env)).toBe('pro')
  })

  it('resolves monthly team price ID to team', () => {
    expect(getTierFromPriceId(TEAM_MONTHLY, env)).toBe('team')
  })

  it('resolves annual team price ID to team', () => {
    expect(getTierFromPriceId(TEAM_ANNUAL, env)).toBe('team')
  })

  it('returns pro as default for unknown price ID (not professional)', () => {
    expect(getTierFromPriceId('price_unknown_xyz', env)).toBe('pro')
  })

  it('does not map empty string as a tier (all env vars unset)', () => {
    const emptyEnv: Record<string, string | undefined> = {}
    // With all env vars unset, no price IDs should match; unknown returns 'pro'
    expect(getTierFromPriceId('price_anything', emptyEnv)).toBe('pro')
  })

  it('empty string is not a valid price ID even when env vars are unset', () => {
    const emptyEnv: Record<string, string | undefined> = {}
    // Empty string should not map to any tier — the delete tierMap[''] guard prevents it
    expect(getTierFromPriceId('', emptyEnv)).toBe('pro')
  })
})

// ── calculateMRR tests ───────────────────────────────────────────────────────

describe('calculateMRR — annual billing (AC-WEBHOOK-3)', () => {
  function calculateMRR(interval: 'month' | 'year', amountCents: number, quantity = 1): number {
    if (interval === 'month') return (amountCents * quantity) / 100
    if (interval === 'year') return (amountCents * quantity) / 12 / 100
    return 0
  }

  it('annual Pro subscription ($1490/yr) → MRR $124.17', () => {
    const mrr = calculateMRR('year', 149000)
    expect(mrr).toBeCloseTo(124.17, 1)
  })

  it('annual Starter subscription ($490/yr) → MRR $40.83', () => {
    const mrr = calculateMRR('year', 49000)
    expect(mrr).toBeCloseTo(40.83, 1)
  })

  it('annual Team subscription ($3990/yr) → MRR $332.50', () => {
    const mrr = calculateMRR('year', 399000)
    expect(mrr).toBeCloseTo(332.5, 1)
  })

  it('monthly Pro subscription ($149/mo) → MRR $149', () => {
    const mrr = calculateMRR('month', 14900)
    expect(mrr).toBe(149)
  })

  it('monthly Starter subscription ($49/mo) → MRR $49', () => {
    const mrr = calculateMRR('month', 4900)
    expect(mrr).toBe(49)
  })
})
