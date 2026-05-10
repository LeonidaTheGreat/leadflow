'use strict'

// Single source of truth for pricing tiers and feature access.
// Both pricing pages and feature-gates.ts import from here.

export type PlanTier =
  | 'trial'       // Free trial — evaluated at Pro feature level
  | 'pilot'       // Pilot program — evaluated at Pro feature level
  | 'starter'     // $49/mo paid
  | 'pro'         // $149/mo paid
  | 'team'        // $399/mo paid
  | 'brokerage'   // $999+/mo paid
  | 'inactive'    // No active subscription

// Canonical access matrix: which tiers may use each feature.
// Extend here when new features are added — feature-gates.ts reads this.
export const PLAN_FEATURES = {
  calcom:        ['trial', 'pilot', 'pro', 'team', 'brokerage'] as PlanTier[],
  leadRouting:   ['team', 'brokerage'] as PlanTier[],
  apiAccess:     ['trial', 'pilot', 'pro', 'team', 'brokerage'] as PlanTier[],
  whiteLabel:    ['brokerage'] as PlanTier[],
  teamAnalytics: ['team', 'brokerage'] as PlanTier[],
  unlimitedSms:  ['trial', 'pilot', 'pro', 'team', 'brokerage'] as PlanTier[],
} as const

// Pricing tier cards rendered by both pricing pages.
// Remove or add features here; both pages stay in sync automatically.
export const PRICING_TIERS = [
  {
    id: 'starter' as PlanTier,
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for testing the waters',
    features: [
      '100 SMS/month',
      'Basic AI responses',
      'Lead qualification',
      'FUB CRM integration',
      'Dashboard access',
      'Email support',
    ],
    highlighted: false,
    cta: 'Get Started',
    contactSales: false,
  },
  {
    id: 'pro' as PlanTier,
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for solo agents',
    features: [
      'Unlimited SMS',
      'Full AI (Claude)',
      'Cal.com booking',
      'API access',
      'Priority chat + email support',
      'Full analytics',
    ],
    highlighted: true,
    cta: 'Start Free Trial',
    contactSales: false,
  },
  {
    id: 'team' as PlanTier,
    name: 'Team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams (up to 5 agents)',
    features: [
      'Everything in Pro',
      'Lead routing',
      'Team analytics',
      '5 agents included',
      'Priority support',
    ],
    highlighted: false,
    cta: 'Get Started',
    contactSales: false,
  },
  {
    id: 'brokerage' as PlanTier,
    name: 'Brokerage',
    monthlyPrice: 999,
    annualPrice: null, // Custom pricing
    description: 'White-label for large brokerages',
    features: [
      'Unlimited everything',
      'Custom AI training',
      'White-label',
      '20+ agents included',
    ],
    highlighted: false,
    cta: 'Contact Sales',
    contactSales: true,
  },
] as const

// Feature comparison table — what each tier supports.
// Only include features that have real code backing them.
export const FEATURE_CATEGORIES = [
  {
    name: 'SMS & AI',
    features: [
      { name: 'SMS/month', starter: '100', pro: 'Unlimited', team: 'Unlimited', brokerage: 'Unlimited' },
      { name: 'AI Model', starter: 'Basic', pro: 'Full (Claude)', team: 'Full (Claude)', brokerage: 'Full + Custom' },
      { name: 'Response Time', starter: '< 60s', pro: '< 30s', team: '< 30s', brokerage: '< 15s' },
      { name: 'Custom AI Training', starter: false, pro: true, team: true, brokerage: true },
    ],
  },
  {
    name: 'Agents',
    features: [
      { name: 'Included', starter: '1', pro: '1', team: '5', brokerage: '20+' },
      { name: 'Additional Agents', starter: '—', pro: '—', team: '$49/mo', brokerage: 'Custom' },
    ],
  },
  {
    name: 'Integrations',
    features: [
      { name: 'FUB CRM', starter: true, pro: true, team: true, brokerage: true },
      { name: 'Cal.com Booking', starter: false, pro: true, team: true, brokerage: true },
      { name: 'Lead Routing', starter: false, pro: false, team: true, brokerage: true },
      { name: 'API Access', starter: false, pro: true, team: true, brokerage: true },
    ],
  },
  {
    name: 'Analytics',
    features: [
      { name: 'Dashboard', starter: 'Basic', pro: 'Full', team: 'Full', brokerage: 'Full + Admin' },
      { name: 'Team Reports', starter: false, pro: false, team: true, brokerage: true },
      { name: 'Custom Reports', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
  {
    name: 'Support',
    features: [
      { name: 'Email', starter: true, pro: true, team: true, brokerage: true },
      { name: 'Chat', starter: false, pro: true, team: true, brokerage: true },
      { name: 'Priority', starter: false, pro: false, team: true, brokerage: true },
    ],
  },
  {
    name: 'Enterprise',
    features: [
      { name: 'White-label', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
] as const
