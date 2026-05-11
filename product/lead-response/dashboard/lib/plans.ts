// Single source of truth for plan definitions and feature gates.

export type PlanTier = 'starter' | 'pro' | 'team' | 'brokerage'

export interface PlanFeatureGates {
  calcomBooking: boolean
  leadRouting: boolean
  apiAccess: boolean
  whiteLabel: boolean
  dedicatedAM: boolean
}

export interface Plan {
  id: PlanTier
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  smsLimit: number | null   // null = unlimited
  maxAgents: number | null  // null = unlimited
  features: string[]
  gates: PlanFeatureGates
  cta: string
  highlighted: boolean
  contactSales?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for testing the waters',
    smsLimit: 100,
    maxAgents: 1,
    features: [
      '100 SMS/month',
      'Basic AI responses',
      'Basic qualification',
      'Dashboard access',
      'FUB integration',
      'Email support',
    ],
    gates: { calcomBooking: false, leadRouting: false, apiAccess: false, whiteLabel: false, dedicatedAM: false },
    cta: 'Get Started',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for working agents',
    smsLimit: null,
    maxAgents: 1,
    features: [
      'Unlimited SMS',
      'Full AI (Claude)',
      'Cal.com booking',
      'Lead qualification',
      'API access',
      'Priority chat + email',
      'Full analytics',
    ],
    gates: { calcomBooking: true, leadRouting: false, apiAccess: true, whiteLabel: false, dedicatedAM: false },
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams (up to 5 agents)',
    smsLimit: null,
    maxAgents: 5,
    features: [
      'Everything in Pro',
      'Lead routing',
      'Team analytics',
      '5 agents included',
      'Priority support',
    ],
    gates: { calcomBooking: true, leadRouting: true, apiAccess: true, whiteLabel: false, dedicatedAM: false },
    cta: 'Get Started',
    highlighted: false,
  },
  {
    id: 'brokerage',
    name: 'Brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'White-label for large brokerages',
    smsLimit: null,
    maxAgents: null,
    features: [
      'Unlimited everything',
      'Custom AI training',
      'White-label branding',
      'Dedicated account manager',
    ],
    gates: { calcomBooking: true, leadRouting: true, apiAccess: true, whiteLabel: true, dedicatedAM: true },
    cta: 'Contact Sales',
    highlighted: false,
    contactSales: true,
  },
]

export const PLAN_ORDER: PlanTier[] = ['starter', 'pro', 'team', 'brokerage']

const PLAN_MAP = new Map<string, Plan>(PLANS.map(p => [p.id, p]))

export function getPlan(tier: string): Plan | null {
  // Normalize aliases
  if (tier === 'trial' || tier === 'pilot') return PLAN_MAP.get('starter') ?? null
  return PLAN_MAP.get(tier) ?? null
}

export function tierAtLeast(userTier: string, required: PlanTier): boolean {
  const userIdx = PLAN_ORDER.indexOf((userTier === 'trial' || userTier === 'pilot' ? 'starter' : userTier) as PlanTier)
  const reqIdx = PLAN_ORDER.indexOf(required)
  return userIdx !== -1 && userIdx >= reqIdx
}
