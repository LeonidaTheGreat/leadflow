// PRICING_DATA.ts
// Source of truth for pricing tiers - matches PMF.md exactly

export const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for testing the waters',
    monthlyPrice: 49,
    annualPrice: 490, // ~17% savings
    badge: null,
    highlighted: false,
    cta: 'Start Free Trial',
    features: {
      sms: { type: 'number', value: 100, suffix: '/month' },
      aiModel: 'Basic',
      responseTime: '< 60s',
      customAiTraining: false,
      agents: 1,
      additionalAgentPrice: null,
      fubCrm: true,
      calCom: true,
      leadRouting: false,
      apiAccess: false,
      webhooks: false,
      dashboard: 'Basic',
      teamReports: false,
      customReports: false,
      emailSupport: true,
      chatSupport: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      whiteLabel: false,
      sla: false,
      complianceReporting: false,
      customContracts: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Most popular for solo agents',
    monthlyPrice: 149,
    annualPrice: 1490, // ~17% savings
    badge: 'Most Popular',
    highlighted: true,
    cta: 'Start Free Trial',
    features: {
      sms: { type: 'text', value: 'Unlimited' },
      aiModel: 'Full',
      responseTime: '< 30s',
      customAiTraining: true,
      agents: 1,
      additionalAgentPrice: null,
      fubCrm: true,
      calCom: true,
      leadRouting: false,
      apiAccess: true,
      webhooks: true,
      dashboard: 'Full',
      teamReports: false,
      customReports: false,
      emailSupport: true,
      chatSupport: true,
      prioritySupport: false,
      dedicatedAccountManager: false,
      whiteLabel: false,
      sla: false,
      complianceReporting: false,
      customContracts: false,
    },
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For growing teams (2-5 agents)',
    monthlyPrice: 399,
    annualPrice: 3990, // ~17% savings
    badge: 'Team Favorite',
    highlighted: false,
    cta: 'Start Free Trial',
    features: {
      sms: { type: 'text', value: 'Unlimited' },
      aiModel: 'Full',
      responseTime: '< 30s',
      customAiTraining: true,
      agents: 5,
      additionalAgentPrice: 49,
      fubCrm: true,
      calCom: true,
      leadRouting: true,
      apiAccess: true,
      webhooks: true,
      dashboard: 'Full',
      teamReports: true,
      customReports: false,
      emailSupport: true,
      chatSupport: true,
      prioritySupport: true,
      dedicatedAccountManager: false,
      whiteLabel: false,
      sla: false,
      complianceReporting: false,
      customContracts: false,
    },
  },
  {
    id: 'brokerage',
    name: 'Brokerage',
    description: 'White-label for 20+ agents',
    monthlyPrice: 999,
    annualPrice: null, // Custom
    badge: 'Enterprise',
    highlighted: false,
    cta: 'Contact Sales',
    features: {
      sms: { type: 'text', value: 'Unlimited' },
      aiModel: 'Full',
      responseTime: '< 15s',
      customAiTraining: true,
      agents: 20,
      additionalAgentPrice: null, // Custom
      fubCrm: true,
      calCom: true,
      leadRouting: true,
      apiAccess: true,
      webhooks: true,
      dashboard: 'Full',
      teamReports: true,
      customReports: true,
      emailSupport: true,
      chatSupport: true,
      prioritySupport: true,
      dedicatedAccountManager: true,
      whiteLabel: true,
      sla: true,
      complianceReporting: true,
      customContracts: true,
    },
  },
] as const;

// Feature comparison table structure
export const FEATURE_CATEGORIES = [
  {
    id: 'pricing',
    name: 'PRICING',
    features: [
      { id: 'monthlyPrice', name: 'Monthly', type: 'price' },
      { id: 'annualPrice', name: 'Annual', type: 'price' },
    ],
  },
  {
    id: 'sms_ai',
    name: 'SMS & AI',
    features: [
      { id: 'sms', name: 'SMS per month', type: 'feature' },
      { id: 'aiModel', name: 'AI Model', type: 'feature' },
      { id: 'responseTime', name: 'Response Time', type: 'feature' },
      { id: 'customAiTraining', name: 'Custom AI Training', type: 'boolean' },
    ],
  },
  {
    id: 'agents',
    name: 'AGENTS',
    features: [
      { id: 'agents', name: 'Included Agents', type: 'feature' },
      { id: 'additionalAgentPrice', name: 'Additional Agent', type: 'feature' },
    ],
  },
  {
    id: 'integrations',
    name: 'INTEGRATIONS',
    features: [
      { id: 'fubCrm', name: 'FUB CRM', type: 'boolean' },
      { id: 'calCom', name: 'Cal.com', type: 'boolean' },
      { id: 'leadRouting', name: 'Lead Routing', type: 'boolean' },
      { id: 'apiAccess', name: 'API Access', type: 'boolean' },
      { id: 'webhooks', name: 'Webhooks', type: 'boolean' },
    ],
  },
  {
    id: 'analytics',
    name: 'ANALYTICS',
    features: [
      { id: 'dashboard', name: 'Dashboard', type: 'feature' },
      { id: 'teamReports', name: 'Team Reports', type: 'boolean' },
      { id: 'customReports', name: 'Custom Reports', type: 'boolean' },
    ],
  },
  {
    id: 'support',
    name: 'SUPPORT',
    features: [
      { id: 'emailSupport', name: 'Email Support', type: 'boolean' },
      { id: 'chatSupport', name: 'Chat Support', type: 'boolean' },
      { id: 'prioritySupport', name: 'Priority Support', type: 'boolean' },
      { id: 'dedicatedAccountManager', name: 'Dedicated Account Manager', type: 'boolean' },
    ],
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    features: [
      { id: 'whiteLabel', name: 'White-label', type: 'boolean' },
      { id: 'sla', name: 'SLA (99.9% uptime)', type: 'boolean' },
      { id: 'complianceReporting', name: 'Compliance Reporting', type: 'boolean' },
      { id: 'customContracts', name: 'Custom Contracts', type: 'boolean' },
    ],
  },
] as const;

// FAQ items
export const PRICING_FAQ = [
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any difference.',
  },
  {
    question: 'What happens if I exceed my SMS limit on Starter?',
    answer: 'We\'ll notify you when you reach 80% of your limit. You can either upgrade to Pro for unlimited SMS or purchase additional SMS packs.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All plans come with a 14-day free trial. No credit card required to start. Cancel anytime during the trial and you won\'t be charged.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund within your first 30 days.',
  },
  {
    question: 'What\'s included in the Brokerage white-label?',
    answer: 'White-label includes a custom domain, your branding throughout the platform, admin dashboard for managing agents, and compliance reporting for your brokerage.',
  },
  {
    question: 'How does team lead routing work?',
    answer: 'Team and Brokerage plans include intelligent lead routing. Set up round-robin distribution or create rules based on lead source, location, or agent availability.',
  },
] as const;

// Annual savings calculation
export function getAnnualSavings(monthlyPrice: number, annualPrice: number | null): number | null {
  if (!annualPrice) return null;
  return (monthlyPrice * 12) - annualPrice;
}

// Format price display
export function formatPrice(price: number | null, interval: 'monthly' | 'annual'): string {
  if (price === null) return 'Custom';
  if (interval === 'annual' && price >= 1000) {
    return `$${(price / 1000).toFixed(1)}k`;
  }
  return `$${price}`;
}
