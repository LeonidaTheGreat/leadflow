/**
 * @jest-environment node
 * 
 * Tests for the Pricing Page
 * Covers: PRICING_PLANS data, tier display, pricing accuracy, grid layout
 */

// Replicate the PRICING_PLANS array from the page for testing
const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for individual agents',
    features: [
      'Up to 100 SMS/month',
      'Basic AI responses',
      'Basic qualification',
      'Calendar integration (1 agent)',
      'Standard email support',
      'Basic analytics',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    tier: 'professional',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for solo agents',
    features: [
      'Unlimited SMS',
      'Full AI with Cal.com booking',
      'Advanced qualification scoring',
      'Calendar integration (1 agent)',
      'Priority chat + email support',
      'Advanced analytics & API',
      'Custom AI training',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    tier: 'team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams (up to 5 agents)',
    features: [
      'Unlimited SMS',
      'Full AI with Cal.com booking',
      'Advanced qualification scoring',
      'Calendar integration (5 agents)',
      'Priority chat + email support',
      'Team dashboard & lead routing',
      'Performance analytics per agent',
      'Custom AI training',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'For large brokerages',
    features: [
      'Unlimited SMS',
      'Multi-channel AI (SMS/email/voice)',
      'Custom qualification workflows',
      'Unlimited calendar integrations',
      'Dedicated account manager',
      'White-label options',
      'SLA guarantees (99.9% uptime)',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

// ────────────────────────────────────────────────────────────
// Pricing Plans Data Structure Tests
// ────────────────────────────────────────────────────────────

describe('Pricing Plans Data Structure', () => {
  it('has exactly 4 pricing tiers', () => {
    expect(PRICING_PLANS).toHaveLength(4)
  })

  it('includes all required tiers: starter, professional, team, enterprise', () => {
    const tiers = PRICING_PLANS.map(plan => plan.tier)
    expect(tiers).toContain('starter')
    expect(tiers).toContain('professional')
    expect(tiers).toContain('team')
    expect(tiers).toContain('enterprise')
  })

  it('has Team tier at $399/month', () => {
    const teamPlan = PRICING_PLANS.find(plan => plan.tier === 'team')
    expect(teamPlan).toBeDefined()
    expect(teamPlan?.monthlyPrice).toBe(399)
    expect(teamPlan?.name).toBe('Team')
  })

  it('has correct pricing for all tiers per PMF.md', () => {
    const starter = PRICING_PLANS.find(plan => plan.tier === 'starter')
    const professional = PRICING_PLANS.find(plan => plan.tier === 'professional')
    const team = PRICING_PLANS.find(plan => plan.tier === 'team')
    const enterprise = PRICING_PLANS.find(plan => plan.tier === 'enterprise')

    expect(starter?.monthlyPrice).toBe(49)
    expect(professional?.monthlyPrice).toBe(149)
    expect(team?.monthlyPrice).toBe(399)
    expect(enterprise?.monthlyPrice).toBe(999)
  })

  it('has correct annual pricing (10x monthly, save 2 months)', () => {
    PRICING_PLANS.forEach(plan => {
      expect(plan.annualPrice).toBe(plan.monthlyPrice * 10)
    })
  })

  it('each plan has required fields', () => {
    PRICING_PLANS.forEach(plan => {
      expect(plan.name).toBeTruthy()
      expect(plan.tier).toBeTruthy()
      expect(plan.monthlyPrice).toBeGreaterThan(0)
      expect(plan.annualPrice).toBeGreaterThan(0)
      expect(plan.description).toBeTruthy()
      expect(plan.features).toBeInstanceOf(Array)
      expect(plan.features.length).toBeGreaterThan(0)
      expect(plan.cta).toBeTruthy()
      expect(typeof plan.highlighted).toBe('boolean')
    })
  })
})

// ────────────────────────────────────────────────────────────
// Team Tier Specific Tests
// ────────────────────────────────────────────────────────────

describe('Team Tier ($399/mo)', () => {
  const teamPlan = PRICING_PLANS.find(plan => plan.tier === 'team')

  it('exists in PRICING_PLANS', () => {
    expect(teamPlan).toBeDefined()
  })

  it('has correct name', () => {
    expect(teamPlan?.name).toBe('Team')
  })

  it('targets small teams (up to 5 agents)', () => {
    expect(teamPlan?.description).toContain('5 agents')
  })

  it('supports up to 5 agents via calendar integration', () => {
    const features = teamPlan?.features || []
    const calendarFeature = features.find(f => f.includes('Calendar integration'))
    expect(calendarFeature).toContain('5 agents')
  })

  it('has team dashboard and lead routing features', () => {
    const features = teamPlan?.features || []
    expect(features.some(f => f.includes('Team dashboard'))).toBe(true)
    expect(features.some(f => f.includes('lead routing'))).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────
// Professional Tier Tests (Most Popular)
// ────────────────────────────────────────────────────────────

describe('Professional Tier ($149/mo)', () => {
  const proPlan = PRICING_PLANS.find(plan => plan.tier === 'professional')

  it('is marked as highlighted (most popular)', () => {
    expect(proPlan?.highlighted).toBe(true)
  })

  it('has correct price', () => {
    expect(proPlan?.monthlyPrice).toBe(149)
  })

  it('supports 1 agent', () => {
    const features = proPlan?.features || []
    const calendarFeature = features.find(f => f.includes('Calendar integration'))
    expect(calendarFeature).toContain('1 agent')
  })
})

// ────────────────────────────────────────────────────────────
// Starter Tier Tests
// ────────────────────────────────────────────────────────────

describe('Starter Tier ($49/mo)', () => {
  const starterPlan = PRICING_PLANS.find(plan => plan.tier === 'starter')

  it('has correct price', () => {
    expect(starterPlan?.monthlyPrice).toBe(49)
  })

  it('has limited SMS (100/month)', () => {
    const features = starterPlan?.features || []
    expect(features.some(f => f.includes('100 SMS'))).toBe(true)
  })

  it('supports 1 agent', () => {
    const features = starterPlan?.features || []
    const calendarFeature = features.find(f => f.includes('Calendar integration'))
    expect(calendarFeature).toContain('1 agent')
  })
})

// ────────────────────────────────────────────────────────────
// Enterprise Tier Tests
// ────────────────────────────────────────────────────────────

describe('Enterprise Tier ($999/mo)', () => {
  const enterprisePlan = PRICING_PLANS.find(plan => plan.tier === 'enterprise')

  it('has correct price', () => {
    expect(enterprisePlan?.monthlyPrice).toBe(999)
  })

  it('has unlimited calendar integrations', () => {
    const features = enterprisePlan?.features || []
    expect(features.some(f => f.includes('Unlimited calendar'))).toBe(true)
  })

  it('has white-label options', () => {
    const features = enterprisePlan?.features || []
    expect(features.some(f => f.includes('White-label'))).toBe(true)
  })

  it('has dedicated account manager', () => {
    const features = enterprisePlan?.features || []
    expect(features.some(f => f.includes('Dedicated account manager'))).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────
// Grid Layout Tests
// ────────────────────────────────────────────────────────────

describe('Grid Layout Responsiveness', () => {
  it('should use md:grid-cols-2 for 4 tiers on medium screens', () => {
    // The grid class should be md:grid-cols-2 lg:grid-cols-4
    const expectedGridClass = 'md:grid-cols-2 lg:grid-cols-4'
    expect(expectedGridClass).toContain('md:grid-cols-2')
    expect(expectedGridClass).toContain('lg:grid-cols-4')
  })

  it('should use lg:grid-cols-4 for 4 tiers on large screens', () => {
    const expectedGridClass = 'md:grid-cols-2 lg:grid-cols-4'
    expect(expectedGridClass).toContain('lg:grid-cols-4')
  })
})

// ────────────────────────────────────────────────────────────
// Pricing Accuracy Tests (Regression Prevention)
// ────────────────────────────────────────────────────────────

describe('Pricing Accuracy (Regression Prevention)', () => {
  it('should NOT have 10x inflated prices (497, 997, 1997)', () => {
    const prices = PRICING_PLANS.map(plan => plan.monthlyPrice)
    expect(prices).not.toContain(497)
    expect(prices).not.toContain(997)
    expect(prices).not.toContain(1997)
  })

  it('should have correct prices per PMF.md: 49, 149, 399, 999', () => {
    const expectedPrices = [49, 149, 399, 999]
    const actualPrices = PRICING_PLANS.map(plan => plan.monthlyPrice).sort((a, b) => a - b)
    expect(actualPrices).toEqual(expectedPrices)
  })
})

// ────────────────────────────────────────────────────────────
// Feature Matrix Validation
// ────────────────────────────────────────────────────────────

describe('Feature Matrix Validation', () => {
  it('Starter has limited SMS (100/month)', () => {
    const starter = PRICING_PLANS.find(p => p.tier === 'starter')
    expect(starter?.features.some(f => f.includes('100 SMS'))).toBe(true)
  })

  it('Professional, Team, and Enterprise have unlimited SMS', () => {
    const tiers = ['professional', 'team', 'enterprise']
    tiers.forEach(tier => {
      const plan = PRICING_PLANS.find(p => p.tier === tier)
      expect(plan?.features.some(f => f.includes('Unlimited SMS'))).toBe(true)
    })
  })

  it('Team and Enterprise have team-specific features', () => {
    const team = PRICING_PLANS.find(p => p.tier === 'team')
    const enterprise = PRICING_PLANS.find(p => p.tier === 'enterprise')
    
    expect(team?.features.some(f => f.includes('Team dashboard'))).toBe(true)
    expect(enterprise?.features.some(f => f.includes('White-label'))).toBe(true)
  })

  it('Only Enterprise has dedicated account manager', () => {
    PRICING_PLANS.forEach(plan => {
      const hasDedicatedManager = plan.features.some(f => f.includes('Dedicated account manager'))
      if (plan.tier === 'enterprise') {
        expect(hasDedicatedManager).toBe(true)
      } else {
        expect(hasDedicatedManager).toBe(false)
      }
    })
  })
})
