/**
 * @jest-environment node
 *
 * Tests for PricingSection component data (FR-1 / AC-1 through AC-4)
 * Validates that the landing page pricing section shows all 4 tiers with
 * correct prices per PMF.md strategy.
 */

// Import PRICING_PLANS from the component to test against the actual data
// We use a dynamic require here because the component is a TypeScript/TSX file
// and jest transforms it appropriately.
const { PRICING_PLANS } = require('../components/PricingSection')

describe('PricingSection — FR-1 Acceptance Criteria', () => {
  it('AC-1: pricing section exists (PRICING_PLANS exported from component)', () => {
    expect(PRICING_PLANS).toBeDefined()
    expect(Array.isArray(PRICING_PLANS)).toBe(true)
  })

  it('AC-2: displays all 4 pricing tiers', () => {
    expect(PRICING_PLANS).toHaveLength(4)
    const tiers = PRICING_PLANS.map((p: { tier: string }) => p.tier)
    expect(tiers).toContain('starter')
    expect(tiers).toContain('pro')
    expect(tiers).toContain('team')
    expect(tiers).toContain('brokerage')
  })

  it('AC-3: correct prices per PMF.md — Starter $49, Pro $149, Team $399, Brokerage $999+', () => {
    const byTier = Object.fromEntries(
      PRICING_PLANS.map((p: { tier: string; monthlyPrice: number }) => [p.tier, p.monthlyPrice])
    )
    expect(byTier.starter).toBe(49)
    expect(byTier.pro).toBe(149)
    expect(byTier.team).toBe(399)
    expect(byTier.brokerage).toBe(999)
  })

  it('AC-4: each tier has a name, description, and features list', () => {
    PRICING_PLANS.forEach((plan: { name: string; description: string; features: string[] }) => {
      expect(typeof plan.name).toBe('string')
      expect(plan.name.length).toBeGreaterThan(0)
      expect(typeof plan.description).toBe('string')
      expect(plan.description.length).toBeGreaterThan(0)
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    })
  })

  it('Pro tier is highlighted as most popular', () => {
    const pro = PRICING_PLANS.find((p: { tier: string }) => p.tier === 'pro')
    expect(pro.highlighted).toBe(true)
  })

  it('prices are strictly ascending: Starter < Pro < Team < Brokerage', () => {
    const prices = PRICING_PLANS.map((p: { monthlyPrice: number }) => p.monthlyPrice)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })
})
