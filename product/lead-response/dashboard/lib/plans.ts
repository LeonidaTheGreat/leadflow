/**
 * lib/plans.ts — Single source of truth for LeadFlow plan definitions.
 *
 * All pricing pages, feature tables, and feature gate checks read from here.
 * Never define PRICING_PLANS inline in a component — import PLANS from this file.
 *
 * Feature flags:
 *   canUseCalcom    — Pro+ (real code exists: lib/calcom.ts, api/booking/route.ts)
 *   canUseLeadRouting — Team+ (backend routing logic)
 *   canUseApi       — Pro+ (api.imagineapi.org public API access)
 *   canUseWhiteLabel — Brokerage only (contact sales, no self-serve code)
 */

export type PlanTier = 'starter' | 'pro' | 'team' | 'brokerage'
export type BillingInterval = 'monthly' | 'annual'

export interface PlanFeatureFlags {
  /** Cal.com appointment booking via AI (lib/calcom.ts, api/booking/) */
  calcom: boolean
  /** Lead routing / distribution across agents (Team+) */
  leadRouting: boolean
  /** Public API access (api.imagineapi.org key) */
  api: boolean
  /** White-label branding (Brokerage / contact sales only) */
  whiteLabel: boolean
}

export interface Plan {
  tier: PlanTier
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  /** Marketing badge shown on card (null = no badge) */
  badge: string | null
  /** Feature bullet points shown on pricing cards */
  features: string[]
  /** Determines whether the card gets the "recommended" highlight */
  highlighted: boolean
  /** Brokerage tier uses "Contact Sales" instead of Stripe checkout */
  contactSales: boolean
  /** Tier-gated feature flags — used by FeatureGate + backend checks */
  flags: PlanFeatureFlags
}

export const PLANS: Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for individual agents getting started',
    badge: null,
    highlighted: false,
    contactSales: false,
    features: [
      '100 SMS/month',
      'Basic AI responses',
      'Follow Up Boss integration',
      'Lead qualification',
      'Email support',
    ],
    flags: {
      calcom: false,
      leadRouting: false,
      api: false,
      whiteLabel: false,
    },
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for solo agents',
    badge: 'Most popular',
    highlighted: true,
    contactSales: false,
    features: [
      'Unlimited SMS',
      'Full AI (Claude)',
      'Cal.com booking automation',
      'Advanced lead qualification',
      'Priority support',
      'Full analytics',
    ],
    flags: {
      calcom: true,
      leadRouting: false,
      api: true,
      whiteLabel: false,
    },
  },
  {
    tier: 'team',
    name: 'Team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams (up to 5 agents)',
    badge: '5 agents',
    highlighted: false,
    contactSales: false,
    features: [
      'Everything in Pro',
      'Up to 5 agents',
      'Lead routing & distribution',
      'Team analytics dashboard',
      'Priority support',
    ],
    flags: {
      calcom: true,
      leadRouting: true,
      api: true,
      whiteLabel: false,
    },
  },
  {
    tier: 'brokerage',
    name: 'Brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'White-label for large brokerages',
    badge: 'Enterprise',
    highlighted: false,
    contactSales: true,
    features: [
      'Unlimited everything',
      'Up to 20+ agents',
      'White-label branding',
      'Dedicated account manager',
      'Custom integrations',
      'SLA & compliance (custom contract)',
    ],
    flags: {
      calcom: true,
      leadRouting: true,
      api: true,
      whiteLabel: true,
    },
  },
]

/**
 * Returns the Plan object for a given tier.
 * Throws if the tier is not found (invalid tier strings caught at call sites).
 */
export function getPlan(tier: PlanTier): Plan {
  const plan = PLANS.find((p) => p.tier === tier)
  if (!plan) throw new Error(`Unknown plan tier: ${tier}`)
  return plan
}

/**
 * Returns the feature flags for a given plan tier.
 * Convenience wrapper used by API route middleware.
 */
export function getFeatureFlags(tier: PlanTier): PlanFeatureFlags {
  return getPlan(tier).flags
}

/**
 * Returns true if the given tier can access a specific feature gate.
 * Use this in API route middleware and server components.
 *
 * Example:
 *   if (!canUse('calcom', agentTier)) return 403
 */
export function canUse(feature: keyof PlanFeatureFlags, tier: PlanTier): boolean {
  return getFeatureFlags(tier)[feature]
}

/**
 * Feature comparison table rows — driven from PLANS.
 * Sections with only aspirational/unimplemented features are excluded.
 */
export interface FeatureRow {
  name: string
  /** A tier value shows availability: true=check, false=dash, string=label */
  starter: boolean | string
  pro: boolean | string
  team: boolean | string
  brokerage: boolean | string
}

export interface FeatureSection {
  name: string
  features: FeatureRow[]
}

export const FEATURE_COMPARISON: FeatureSection[] = [
  {
    name: 'SMS & AI',
    features: [
      { name: 'SMS/month', starter: '100', pro: 'Unlimited', team: 'Unlimited', brokerage: 'Unlimited' },
      { name: 'AI Model', starter: 'Basic', pro: 'Full (Claude)', team: 'Full (Claude)', brokerage: 'Full (Claude)' },
      { name: 'Response Time', starter: '< 60s', pro: '< 30s', team: '< 30s', brokerage: '< 30s' },
    ],
  },
  {
    name: 'Agents',
    features: [
      { name: 'Agents included', starter: '1', pro: '1', team: '5', brokerage: '20+' },
      { name: 'Additional agents', starter: '—', pro: '—', team: '$49/mo', brokerage: 'Custom' },
    ],
  },
  {
    name: 'Integrations',
    features: [
      { name: 'Follow Up Boss CRM', starter: true, pro: true, team: true, brokerage: true },
      { name: 'Cal.com booking', starter: false, pro: true, team: true, brokerage: true },
      { name: 'Lead routing', starter: false, pro: false, team: true, brokerage: true },
      { name: 'API access', starter: false, pro: true, team: true, brokerage: true },
    ],
  },
  {
    name: 'Analytics',
    features: [
      { name: 'Dashboard', starter: 'Basic', pro: 'Full', team: 'Full', brokerage: 'Full' },
      { name: 'Team reports', starter: false, pro: false, team: true, brokerage: true },
    ],
  },
  {
    name: 'Support',
    features: [
      { name: 'Email', starter: true, pro: true, team: true, brokerage: true },
      { name: 'Chat', starter: false, pro: true, team: true, brokerage: true },
      { name: 'Priority', starter: false, pro: false, team: true, brokerage: true },
      { name: 'Dedicated account manager', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
  {
    name: 'Enterprise',
    features: [
      { name: 'White-label branding', starter: false, pro: false, team: false, brokerage: true },
      { name: 'SLA & compliance (custom)', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
]

/** Tier ordering for upgrade-path comparisons (higher index = higher tier) */
export const TIER_ORDER: PlanTier[] = ['starter', 'pro', 'team', 'brokerage']

/**
 * Returns true if `currentTier` meets or exceeds `requiredTier`.
 */
export function meetsRequirement(currentTier: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_ORDER.indexOf(currentTier) >= TIER_ORDER.indexOf(requiredTier)
}

/**
 * Returns the minimum tier that grants a given feature flag.
 */
export function minimumTierFor(feature: keyof PlanFeatureFlags): PlanTier {
  for (const tier of TIER_ORDER) {
    if (getFeatureFlags(tier)[feature]) return tier
  }
  return 'brokerage'
}
