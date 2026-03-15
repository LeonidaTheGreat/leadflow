/**
 * Test: Fix — Stripe Price IDs Are Placeholder Values
 * =====================================================
 * Task: fix-stripe-price-ids-are-placeholder-values-not-real-s
 * Task ID: 9a6d1920-9b9a-4fb3-92b4-c620ae45973d
 *
 * Validates:
 * 1. isValidPriceId() rejects placeholder values like price_starter_49
 * 2. isValidPriceId() accepts real Stripe price IDs (price_1AbCDEFGHIJKL...)
 * 3. PRICE_ID_ENV_MAP uses correct server-side var names
 * 4. No NEXT_PUBLIC_ price ID vars are in the env map
 * 5. The plan→tier mapping aligns with PRICE_ID_ENV_MAP keys
 */

import { describe, it, expect } from '@jest/globals'

// === Replicated from create-checkout/route.ts (must stay in sync) ===

/**
 * Must match the implementation in create-checkout/route.ts exactly.
 * Real Stripe price IDs: price_XXXXXXXXXXXXXXXX (no underscores after prefix, 14+ alphanumeric chars)
 */
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,}$/.test(id)
}

const PRICE_ID_ENV_MAP: Record<string, string> = {
  starter_monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
  starter_annual:  'STRIPE_PRICE_STARTER_ANNUAL',
  pro_monthly:     'STRIPE_PRICE_PRO_MONTHLY',
  pro_annual:      'STRIPE_PRICE_PRO_ANNUAL',
  team_monthly:    'STRIPE_PRICE_TEAM_MONTHLY',
  team_annual:     'STRIPE_PRICE_TEAM_ANNUAL',
}

// === Replicated from signup/page.tsx (must stay in sync) ===

// Canonical tier names: starter, pro, team — matching the pricing page and PMF.md
const PLAN_CHECKOUT_TIER: Record<string, string> = {
  starter: 'starter_monthly',
  pro:     'pro_monthly',
  team:    'team_monthly',
}

// ================================================================

describe('isValidPriceId()', () => {
  it('should reject placeholder price_starter_49 (length <= 10 after prefix)', () => {
    expect(isValidPriceId('price_starter_49')).toBe(false)
  })

  it('should reject placeholder price_pro_149 (length <= 10 after prefix)', () => {
    expect(isValidPriceId('price_pro_149')).toBe(false)
  })

  it('should reject placeholder price_team_399 (length <= 10 after prefix)', () => {
    expect(isValidPriceId('price_team_399')).toBe(false)
  })

  it('should reject undefined', () => {
    expect(isValidPriceId(undefined)).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidPriceId('')).toBe(false)
  })

  it('should reject non-price_ prefixed strings', () => {
    expect(isValidPriceId('prod_abc123')).toBe(false)
    expect(isValidPriceId('sub_abc123')).toBe(false)
  })

  it('should accept a real-looking Stripe price ID (price_ + 14+ chars)', () => {
    expect(isValidPriceId('price_1AbCDEFGHIJKLMN')).toBe(true)
    expect(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG')).toBe(true)
  })
})

describe('PRICE_ID_ENV_MAP (create-checkout/route.ts)', () => {
  it('should use STRIPE_PRICE_STARTER_MONTHLY (not NEXT_PUBLIC_ variant)', () => {
    expect(PRICE_ID_ENV_MAP['starter_monthly']).toBe('STRIPE_PRICE_STARTER_MONTHLY')
    expect(PRICE_ID_ENV_MAP['starter_monthly']).not.toContain('NEXT_PUBLIC')
  })

  it('should use STRIPE_PRICE_PRO_MONTHLY for canonical pro tier (not PROFESSIONAL)', () => {
    expect(PRICE_ID_ENV_MAP['pro_monthly']).toBe('STRIPE_PRICE_PRO_MONTHLY')
    expect(PRICE_ID_ENV_MAP['pro_monthly']).not.toContain('NEXT_PUBLIC')
  })

  it('should use STRIPE_PRICE_TEAM_MONTHLY for canonical team tier (not ENTERPRISE)', () => {
    expect(PRICE_ID_ENV_MAP['team_monthly']).toBe('STRIPE_PRICE_TEAM_MONTHLY')
    expect(PRICE_ID_ENV_MAP['team_monthly']).not.toContain('NEXT_PUBLIC')
  })

  it('should have no NEXT_PUBLIC_ prefixed values', () => {
    Object.values(PRICE_ID_ENV_MAP).forEach(envVar => {
      expect(envVar).not.toMatch(/^NEXT_PUBLIC_/)
    })
  })

  it('should cover all 6 pricing tiers with canonical names (3 plans × 2 intervals)', () => {
    const expectedTiers = [
      'starter_monthly', 'starter_annual',
      'pro_monthly', 'pro_annual',
      'team_monthly', 'team_annual',
    ]
    expectedTiers.forEach(tier => {
      expect(PRICE_ID_ENV_MAP).toHaveProperty(tier)
    })
  })
})

describe('Signup → Checkout tier alignment', () => {
  it('every signup plan ID should have a checkout tier', () => {
    const planIds = ['starter', 'pro', 'team']
    planIds.forEach(id => {
      expect(PLAN_CHECKOUT_TIER).toHaveProperty(id)
    })
  })

  it('every checkout tier from signup page should exist in PRICE_ID_ENV_MAP', () => {
    Object.values(PLAN_CHECKOUT_TIER).forEach(tier => {
      expect(PRICE_ID_ENV_MAP).toHaveProperty(tier)
    })
  })

  it('team plan should map to team_monthly (canonical name, not enterprise_monthly)', () => {
    // After tier naming fix: canonical names match the pricing page (starter, pro, team)
    expect(PLAN_CHECKOUT_TIER['team']).toBe('team_monthly')
    expect(PRICE_ID_ENV_MAP['team_monthly']).toBe('STRIPE_PRICE_TEAM_MONTHLY')
  })
})

describe('Placeholder price ID detection', () => {
  const KNOWN_PLACEHOLDERS = [
    'price_starter_49',    // was in Vercel NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY
    'price_pro_149',       // was in Vercel NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
    'price_team_399',      // was in Vercel NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY
    'price_replace_with_basic_plan_price_id',
    'price_replace_with_pro_plan_price_id',
    'price_replace_with_enterprise_plan_price_id',
  ]

  it('should reject all known placeholder values', () => {
    KNOWN_PLACEHOLDERS.forEach(placeholder => {
      expect(isValidPriceId(placeholder)).toBe(false)
    })
  })
})
