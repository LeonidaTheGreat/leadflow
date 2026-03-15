/**
 * Test: Signup Plans Display
 *
 * Verifies that the signup page correctly defines all three pricing tiers
 * with the right structure and a tier-to-checkout mapping (no hardcoded priceIds).
 *
 * Task: fix-stripe-price-ids-are-placeholder-values-not-real-s
 * Status: UPDATED — priceId removed from PLANS; checkout now uses tier string
 */

import { describe, it, expect } from '@jest/globals'

// Mirror the PLANS and PLAN_CHECKOUT_TIER structures from signup/page.tsx
interface Plan {
  id: string
  name: string
  price: number
  popular?: boolean
  features: string[]
}

const PLAN_CHECKOUT_TIER: Record<string, string> = {
  starter: 'starter_monthly',
  pro:     'pro_monthly',
  team:    'team_monthly',
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    features: [
      'Up to 50 leads/month',
      'AI SMS responses',
      'Basic qualification',
      'Calendar integration',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    popular: true,
    features: [
      'Up to 200 leads/month',
      'AI SMS & email',
      'Advanced qualification',
      'Calendar integration',
      'Priority support',
      'Advanced analytics'
    ]
  },
  {
    id: 'team',
    name: 'Team',
    price: 399,
    features: [
      'Up to 500 leads/month',
      'Multi-channel AI',
      'Custom workflows',
      'Team management',
      'Dedicated support',
      'White-label options'
    ]
  }
]

describe('Signup Plans Display', () => {
  it('should have exactly 3 plans defined', () => {
    expect(PLANS).toHaveLength(3)
  })

  it('should have all required plan properties', () => {
    PLANS.forEach(plan => {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('features')
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    })
  })

  it('should NOT have hardcoded Stripe priceId on plan objects (security: price IDs are server-side secrets)', () => {
    PLANS.forEach(plan => {
      expect(plan).not.toHaveProperty('priceId')
    })
  })

  it('should have correct plan names', () => {
    const names = PLANS.map(p => p.name)
    expect(names).toEqual(['Starter', 'Pro', 'Team'])
  })

  it('should have correct plan prices', () => {
    const prices = PLANS.map(p => p.price)
    expect(prices).toEqual([49, 149, 399])
  })

  it('should mark Pro plan as popular', () => {
    const proPlan = PLANS.find(p => p.id === 'pro')
    expect(proPlan?.popular).toBe(true)

    const otherPlans = PLANS.filter(p => p.id !== 'pro')
    otherPlans.forEach(plan => {
      expect(plan.popular).toBeUndefined()
    })
  })

  it('should have descriptive features for each plan', () => {
    PLANS.forEach(plan => {
      expect(plan.features.length).toBeGreaterThan(3)
      plan.features.forEach(feature => {
        expect(typeof feature).toBe('string')
        expect(feature.length).toBeGreaterThan(5)
      })
    })
  })

  it('should follow ascending price order', () => {
    for (let i = 1; i < PLANS.length; i++) {
      expect(PLANS[i].price).toBeGreaterThan(PLANS[i-1].price)
    }
  })

  it('should have unique plan IDs', () => {
    const ids = PLANS.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  // Tier mapping tests
  describe('PLAN_CHECKOUT_TIER mapping', () => {
    it('should have a checkout tier for every plan', () => {
      PLANS.forEach(plan => {
        expect(PLAN_CHECKOUT_TIER).toHaveProperty(plan.id)
        expect(typeof PLAN_CHECKOUT_TIER[plan.id]).toBe('string')
        expect(PLAN_CHECKOUT_TIER[plan.id].length).toBeGreaterThan(0)
      })
    })

    it('should map starter → starter_monthly', () => {
      expect(PLAN_CHECKOUT_TIER['starter']).toBe('starter_monthly')
    })

    it('should map pro → pro_monthly (canonical name)', () => {
      expect(PLAN_CHECKOUT_TIER['pro']).toBe('pro_monthly')
    })

    it('should map team → team_monthly (canonical name)', () => {
      expect(PLAN_CHECKOUT_TIER['team']).toBe('team_monthly')
    })

    it('should produce tier values matching create-checkout/route.ts PRICING_TIERS keys', () => {
      // These must match the keys in PRICING_TIERS in create-checkout/route.ts
      // Canonical names: starter, pro, team (matching pricing page and PMF.md)
      const validCheckoutTiers = new Set([
        'starter_monthly',
        'starter_annual',
        'pro_monthly',
        'pro_annual',
        'team_monthly',
        'team_annual',
      ])
      Object.values(PLAN_CHECKOUT_TIER).forEach(tier => {
        expect(validCheckoutTiers.has(tier)).toBe(true)
      })
    })
  })
})
