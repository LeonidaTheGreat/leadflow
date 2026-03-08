'use client'

// PRICING_SECTION_MOCKUP.tsx
// Visual mockup for the 4-tier pricing section
// This is a DESIGN REFERENCE for dev implementation

import { useState } from 'react'
import { Check, Minus, ArrowRight, Zap, Star, Users, Building2 } from 'lucide-react'

// Types
interface PricingTier {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number | null
  badge: string | null
  highlighted: boolean
  cta: string
  icon: React.ReactNode
}

interface FeatureCategory {
  id: string
  name: string
  features: Feature[]
}

interface Feature {
  id: string
  name: string
  type: 'boolean' | 'text'
}

// Data - matches PMF.md exactly
const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for testing the waters',
    monthlyPrice: 49,
    annualPrice: 490,
    badge: null,
    highlighted: false,
    cta: 'Start Free Trial',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Most popular for solo agents',
    monthlyPrice: 149,
    annualPrice: 1490,
    badge: 'Most Popular',
    highlighted: true,
    cta: 'Start Free Trial',
    icon: <Star className="w-5 h-5" />,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For growing teams (2-5 agents)',
    monthlyPrice: 399,
    annualPrice: 3990,
    badge: 'Team Favorite',
    highlighted: false,
    cta: 'Start Free Trial',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'brokerage',
    name: 'Brokerage',
    description: 'White-label for 20+ agents',
    monthlyPrice: 999,
    annualPrice: null,
    badge: 'Enterprise',
    highlighted: false,
    cta: 'Contact Sales',
    icon: <Building2 className="w-5 h-5" />,
  },
]

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'sms_ai',
    name: 'SMS & AI',
    features: [
      { id: 'sms', name: 'SMS per month', type: 'text' },
      { id: 'aiModel', name: 'AI Model', type: 'text' },
      { id: 'responseTime', name: 'Response Time', type: 'text' },
      { id: 'customAiTraining', name: 'Custom AI Training', type: 'boolean' },
    ],
  },
  {
    id: 'agents',
    name: 'Agents',
    features: [
      { id: 'agents', name: 'Included Agents', type: 'text' },
      { id: 'additionalAgent', name: 'Additional Agent', type: 'text' },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    features: [
      { id: 'fubCrm', name: 'FUB CRM', type: 'boolean' },
      { id: 'calCom', name: 'Cal.com', type: 'boolean' },
      { id: 'leadRouting', name: 'Lead Routing', type: 'boolean' },
      { id: 'apiAccess', name: 'API Access', type: 'boolean' },
      { id: 'webhooks', name: 'Webhooks', type: 'boolean' },
    ],
  },
  {
    id: 'support',
    name: 'Support',
    features: [
      { id: 'emailSupport', name: 'Email Support', type: 'boolean' },
      { id: 'chatSupport', name: 'Chat Support', type: 'boolean' },
      { id: 'prioritySupport', name: 'Priority Support', type: 'boolean' },
      { id: 'dedicatedAM', name: 'Dedicated Account Manager', type: 'boolean' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    features: [
      { id: 'whiteLabel', name: 'White-label', type: 'boolean' },
      { id: 'sla', name: 'SLA (99.9%)', type: 'boolean' },
      { id: 'compliance', name: 'Compliance Reporting', type: 'boolean' },
    ],
  },
]

// Feature values for each tier
const FEATURE_VALUES: Record<string, Record<string, string | boolean>> = {
  starter: {
    sms: '100 / month',
    aiModel: 'Basic',
    responseTime: '< 60s',
    customAiTraining: false,
    agents: '1',
    additionalAgent: '—',
    fubCrm: true,
    calCom: true,
    leadRouting: false,
    apiAccess: false,
    webhooks: false,
    emailSupport: true,
    chatSupport: false,
    prioritySupport: false,
    dedicatedAM: false,
    whiteLabel: false,
    sla: false,
    compliance: false,
  },
  pro: {
    sms: 'Unlimited',
    aiModel: 'Full',
    responseTime: '< 30s',
    customAiTraining: true,
    agents: '1',
    additionalAgent: '—',
    fubCrm: true,
    calCom: true,
    leadRouting: false,
    apiAccess: true,
    webhooks: true,
    emailSupport: true,
    chatSupport: true,
    prioritySupport: false,
    dedicatedAM: false,
    whiteLabel: false,
    sla: false,
    compliance: false,
  },
  team: {
    sms: 'Unlimited',
    aiModel: 'Full',
    responseTime: '< 30s',
    customAiTraining: true,
    agents: '5',
    additionalAgent: '$49/mo',
    fubCrm: true,
    calCom: true,
    leadRouting: true,
    apiAccess: true,
    webhooks: true,
    emailSupport: true,
    chatSupport: true,
    prioritySupport: true,
    dedicatedAM: false,
    whiteLabel: false,
    sla: false,
    compliance: false,
  },
  brokerage: {
    sms: 'Unlimited',
    aiModel: 'Full',
    responseTime: '< 15s',
    customAiTraining: true,
    agents: '20+',
    additionalAgent: 'Custom',
    fubCrm: true,
    calCom: true,
    leadRouting: true,
    apiAccess: true,
    webhooks: true,
    emailSupport: true,
    chatSupport: true,
    prioritySupport: true,
    dedicatedAM: true,
    whiteLabel: true,
    sla: true,
    compliance: true,
  },
}

// FAQ data
const FAQ_ITEMS = [
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
    answer: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund within your first 30 days.',
  },
]

// Components

function PricingCard({ tier, interval }: { tier: PricingTier; interval: 'monthly' | 'annual' }) {
  const price = interval === 'monthly' ? tier.monthlyPrice : tier.annualPrice
  const displayPrice = price === null ? 'Custom' : `$${interval === 'annual' ? Math.round(price / 12) : price}`
  const billingText = price === null 
    ? 'Custom pricing' 
    : interval === 'annual' 
      ? `Billed $${price}/year` 
      : 'Billed monthly'

  return (
    <div
      className={`
        relative rounded-2xl p-8 transition-all duration-200
        ${tier.highlighted 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/50 ring-2 ring-emerald-500/20 scale-105 z-10' 
          : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:scale-[1.02]'
        }
      `}
    >
      {/* Highlighted background glow */}
      {tier.highlighted && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-2xl pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Badge */}
        {tier.badge && (
          <div
            className={`
              inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full
              ${tier.id === 'pro' ? 'bg-emerald-500 text-white' : ''}
              ${tier.id === 'team' ? 'bg-blue-500 text-white' : ''}
              ${tier.id === 'brokerage' ? 'bg-purple-500 text-white' : ''}
            `}
          >
            {tier.badge}
          </div>
        )}

        {/* Icon + Name */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg ${tier.highlighted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
            {tier.icon}
          </div>
          <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-6">{tier.description}</p>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-white">{displayPrice}</span>
            {price !== null && <span className="text-slate-400">/month</span>}
          </div>
          <p className="text-xs text-slate-500 mt-2">{billingText}</p>
        </div>

        {/* CTA Button */}
        <button
          className={`
            w-full py-3 px-4 rounded-lg font-semibold transition-all
            flex items-center justify-center gap-2
            ${tier.highlighted
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25'
              : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
            }
          `}
        >
          {tier.cta}
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Features List */}
        <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
          {Object.entries(FEATURE_VALUES[tier.id])
            .slice(0, 6)
            .map(([key, value]) => (
              <div key={key} className="flex items-start gap-3">
                {typeof value === 'boolean' ? (
                  value ? (
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-600 shrink-0" />
                  )
                ) : (
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <span className="text-sm text-slate-300">
                  {typeof value === 'boolean' 
                    ? key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                    : value
                  }
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function FeatureComparisonTable() {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400 sticky left-0 bg-slate-800 z-10 min-w-[200px]">
                Features
              </th>
              {TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className={`px-6 py-4 text-center text-sm font-semibold min-w-[140px]
                    ${tier.highlighted ? 'text-emerald-400' : 'text-white'}
                  `}
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {FEATURE_CATEGORIES.map((category) => (
              <>
                {/* Category Header */}
                <tr key={category.id} className="bg-slate-800/50">
                  <td
                    colSpan={5}
                    className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {category.name}
                  </td>
                </tr>
                {/* Features */}
                {category.features.map((feature) => (
                  <tr key={feature.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-300 sticky left-0 bg-slate-900/50 z-10">
                      {feature.name}
                    </td>
                    {TIERS.map((tier) => {
                      const value = FEATURE_VALUES[tier.id][feature.id]
                      return (
                        <td key={tier.id} className="px-6 py-4 text-center">
                          {feature.type === 'boolean' ? (
                            value ? (
                              <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                            ) : (
                              <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-slate-300">{value as string}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto">
      <h3 className="text-2xl font-bold text-white mb-8 text-center">
        Frequently Asked Questions
      </h3>
      <div className="space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <div
            key={index}
            className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
              <span className="font-semibold text-white">{item.question}</span>
              <span className="text-slate-400">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4">
                <p className="text-slate-300">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FinalCTA() {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl p-12 text-center">
      <h2 className="text-3xl font-bold text-white mb-4">
        Ready to Transform Your Lead Response?
      </h2>
      <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
        Join thousands of agents closing more deals with AI-powered follow-up
      </p>
      <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors hover:scale-105 transform">
        Start Your Free Trial
        <ArrowRight className="w-5 h-5" />
      </button>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
        <span className="flex items-center gap-1">
          <Check className="w-4 h-4" /> No credit card required
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-4 h-4" /> Cancel anytime
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-4 h-4" /> 14-day free trial
        </span>
      </div>
    </div>
  )
}

// Main Pricing Section Component
export default function PricingSectionMockup() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="min-h-screen bg-slate-950 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Choose the perfect plan for your real estate business
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                billingInterval === 'annual'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Annual
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} interval={billingInterval} />
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            Compare All Features
          </h3>
          <FeatureComparisonTable />
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <FAQSection />
        </div>

        {/* Final CTA */}
        <FinalCTA />
      </div>
    </div>
  )
}
