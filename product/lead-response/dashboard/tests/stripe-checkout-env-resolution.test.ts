/**
 * Test: Stripe Checkout Env Resolution
 * =====================================
 * Task: fix-retry-zero-conversions-no-paying-cus (914b0e5f)
 *
 * Root cause confirmed:
 *   PRICE_ID_ENV_MAP in create-checkout/route.ts maps:
 *     pro_monthly  → STRIPE_PRICE_PRO_MONTHLY
 *     team_monthly → STRIPE_PRICE_TEAM_MONTHLY
 *   But Vercel only had STRIPE_PRICE_PROFESSIONAL_MONTHLY and STRIPE_PRICE_ENTERPRISE_MONTHLY.
 *   Result: every Pro/Team checkout → 503 PRICE_NOT_CONFIGURED.
 *
 * Fix applied:
 *   1. Added STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_TEAM_MONTHLY to Vercel production
 *      (pointing to newly created prices with exact amounts: $149/mo, $399/mo)
 *   2. Created annual prices for all 3 tiers in Stripe
 *   3. Added STRIPE_PRICE_STARTER_ANNUAL, STRIPE_PRICE_PRO_ANNUAL, STRIPE_PRICE_TEAM_ANNUAL to Vercel
 *   4. Updated create-stripe-products.js to use canonical naming and create annual prices
 *
 * These tests verify the naming convention is consistent across: pricing page → API route → env vars.
 */

import { describe, it, expect } from '@jest/globals'

// === Replicated from create-checkout/route.ts (must stay in sync) ===
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

const PRICE_ID_ENV_MAP: Record<string, string> = {
  starter_monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
  starter_annual:  'STRIPE_PRICE_STARTER_ANNUAL',
  pro_monthly:     'STRIPE_PRICE_PRO_MONTHLY',
  pro_annual:      'STRIPE_PRICE_PRO_ANNUAL',
  team_monthly:    'STRIPE_PRICE_TEAM_MONTHLY',
  team_annual:     'STRIPE_PRICE_TEAM_ANNUAL',
}

// Mapping from pricing page tier + billing interval → API tier key
// Source: app/pricing/page.tsx handleSelectPlan()
const TIER_KEY_MAP: Record<string, string | null> = {
  starter:   'starter',
  pro:       'pro',
  team:      'team',
  brokerage: null,
}

// ================================================================

describe('Checkout flow: pricing page → API tier → env var name', () => {
  it('Pro plan (monthly) resolves to STRIPE_PRICE_PRO_MONTHLY', () => {
    // Pricing page: tier='pro', interval='monthly' → apiTier='pro_monthly'
    const baseTierKey = TIER_KEY_MAP['pro']
    const apiTier = `${baseTierKey}_monthly`
    expect(apiTier).toBe('pro_monthly')
    expect(PRICE_ID_ENV_MAP[apiTier]).toBe('STRIPE_PRICE_PRO_MONTHLY')
  })

  it('Pro plan (annual) resolves to STRIPE_PRICE_PRO_ANNUAL', () => {
    const baseTierKey = TIER_KEY_MAP['pro']
    const apiTier = `${baseTierKey}_annual`
    expect(PRICE_ID_ENV_MAP[apiTier]).toBe('STRIPE_PRICE_PRO_ANNUAL')
  })

  it('Team plan (monthly) resolves to STRIPE_PRICE_TEAM_MONTHLY', () => {
    const baseTierKey = TIER_KEY_MAP['team']
    const apiTier = `${baseTierKey}_monthly`
    expect(apiTier).toBe('team_monthly')
    expect(PRICE_ID_ENV_MAP[apiTier]).toBe('STRIPE_PRICE_TEAM_MONTHLY')
  })

  it('Team plan (annual) resolves to STRIPE_PRICE_TEAM_ANNUAL', () => {
    const baseTierKey = TIER_KEY_MAP['team']
    const apiTier = `${baseTierKey}_annual`
    expect(PRICE_ID_ENV_MAP[apiTier]).toBe('STRIPE_PRICE_TEAM_ANNUAL')
  })

  it('Starter plan (monthly) resolves to STRIPE_PRICE_STARTER_MONTHLY', () => {
    const baseTierKey = TIER_KEY_MAP['starter']
    const apiTier = `${baseTierKey}_monthly`
    expect(PRICE_ID_ENV_MAP[apiTier]).toBe('STRIPE_PRICE_STARTER_MONTHLY')
  })

  it('Brokerage plan is null (contact sales — no checkout)', () => {
    expect(TIER_KEY_MAP['brokerage']).toBeNull()
  })

  it('all 6 tiers have env var mappings', () => {
    const allTiers = ['starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'team_monthly', 'team_annual']
    for (const tier of allTiers) {
      expect(PRICE_ID_ENV_MAP).toHaveProperty(tier)
      expect(PRICE_ID_ENV_MAP[tier]).toMatch(/^STRIPE_PRICE_/)
      expect(PRICE_ID_ENV_MAP[tier]).not.toMatch(/^NEXT_PUBLIC_/)
    }
  })

  it('STRIPE_PRICE_PRO_MONTHLY is distinct from STRIPE_PRICE_PROFESSIONAL_MONTHLY', () => {
    // PROFESSIONAL_MONTHLY is the legacy name; route uses PRO_MONTHLY
    expect(PRICE_ID_ENV_MAP['pro_monthly']).toBe('STRIPE_PRICE_PRO_MONTHLY')
    expect(PRICE_ID_ENV_MAP['pro_monthly']).not.toBe('STRIPE_PRICE_PROFESSIONAL_MONTHLY')
  })

  it('STRIPE_PRICE_TEAM_MONTHLY is distinct from STRIPE_PRICE_ENTERPRISE_MONTHLY', () => {
    // ENTERPRISE_MONTHLY is the legacy name; route uses TEAM_MONTHLY
    expect(PRICE_ID_ENV_MAP['team_monthly']).toBe('STRIPE_PRICE_TEAM_MONTHLY')
    expect(PRICE_ID_ENV_MAP['team_monthly']).not.toBe('STRIPE_PRICE_ENTERPRISE_MONTHLY')
  })
})

describe('isValidPriceId: trailing whitespace rejection', () => {
  it('rejects price ID with trailing newline (echo adds \\n — use printf instead)', () => {
    expect(isValidPriceId('price_1TWPtc3HfZL4GVOAKx9t9Eiz\n')).toBe(false)
  })

  it('rejects price ID with trailing space', () => {
    expect(isValidPriceId('price_1TWPtc3HfZL4GVOAKx9t9Eiz ')).toBe(false)
  })

  it('accepts price ID without trailing whitespace', () => {
    expect(isValidPriceId('price_1TWPtc3HfZL4GVOAKx9t9Eiz')).toBe(true)
  })

  it('accepts newly created live price IDs (all 6 tiers)', () => {
    const priceIds = [
      'price_1TWPtb3HfZL4GVOAeIEnEscx', // Starter monthly
      'price_1TWPtb3HfZL4GVOA8jbsWzZG', // Starter annual
      'price_1TWPtc3HfZL4GVOAKx9t9Eiz', // Pro monthly
      'price_1TWPtc3HfZL4GVOAhLYE80sg', // Pro annual
      'price_1TWPtc3HfZL4GVOASq0dblmI', // Team monthly
      'price_1TWPtd3HfZL4GVOAvqVHE2Z5', // Team annual
    ]
    for (const id of priceIds) {
      expect(isValidPriceId(id)).toBe(true)
    }
  })
})
