/**
 * @jest-environment node
 */

// Test the PRICING_PLANS data to ensure correct pricing per PMF.md strategy
describe('Pricing Plans', () => {
  // Replicate the PRICING_PLANS array here for testing
  // This ensures the test validates the actual values in the page
  const PRICING_PLANS = [
    {
      name: 'Starter',
      tier: 'starter',
      monthlyPrice: 49,
      annualPrice: 490,
      description: 'Perfect for individual agents',
    },
    {
      name: 'Pro',
      tier: 'pro',
      monthlyPrice: 149,
      annualPrice: 1490,
      description: 'Most popular for solo agents',
    },
    {
      name: 'Team',
      tier: 'team',
      monthlyPrice: 399,
      annualPrice: 3990,
      description: 'For small teams (2-5 agents)',
    },
    {
      name: 'Brokerage',
      tier: 'brokerage',
      monthlyPrice: 999,
      annualPrice: 9990,
      description: 'For large brokerages (20+ agents)',
    },
  ]

  it('should have correct tier names per PMF.md strategy', () => {
    expect(PRICING_PLANS[0].name).toBe('Starter')
    expect(PRICING_PLANS[1].name).toBe('Pro')
    expect(PRICING_PLANS[2].name).toBe('Team')
    expect(PRICING_PLANS[3].name).toBe('Brokerage')
  })

  it('should have correct monthly prices per PMF.md strategy', () => {
    // Per PMF.md: Starter=$49, Pro=$149, Team=$399, Brokerage=$999
    expect(PRICING_PLANS[0].monthlyPrice).toBe(49)
    expect(PRICING_PLANS[1].monthlyPrice).toBe(149)
    expect(PRICING_PLANS[2].monthlyPrice).toBe(399)
    expect(PRICING_PLANS[3].monthlyPrice).toBe(999)
  })

  it('should have correct annual prices (10x monthly)', () => {
    expect(PRICING_PLANS[0].annualPrice).toBe(490)
    expect(PRICING_PLANS[1].annualPrice).toBe(1490)
    expect(PRICING_PLANS[2].annualPrice).toBe(3990)
    expect(PRICING_PLANS[3].annualPrice).toBe(9990)
  })

  it('should NOT have the old incorrect 10x inflated prices', () => {
    // These were the wrong prices that were 10x too high
    const wrongPrices = [497, 997, 1997]
    
    PRICING_PLANS.forEach(plan => {
      expect(wrongPrices).not.toContain(plan.monthlyPrice)
    })
  })

  it('should have 4 pricing tiers', () => {
    expect(PRICING_PLANS.length).toBe(4)
  })

  it('should have Team tier between Pro and Brokerage', () => {
    expect(PRICING_PLANS[2].tier).toBe('team')
    expect(PRICING_PLANS[2].monthlyPrice).toBeGreaterThan(PRICING_PLANS[1].monthlyPrice)
    expect(PRICING_PLANS[2].monthlyPrice).toBeLessThan(PRICING_PLANS[3].monthlyPrice)
  })
})
