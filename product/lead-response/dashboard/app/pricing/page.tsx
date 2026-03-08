'use client'

import { useState } from 'react'
import { Check, Minus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type BillingInterval = 'monthly' | 'annual'

// Pricing data matching PMF.md
const PRICING_TIERS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Solo agents testing AI',
    features: [
      { text: '100 SMS responses/mo', included: true },
      { text: 'Basic AI quality', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: '1 agent included', included: true },
      { text: 'Email support', included: true },
      { text: 'Cal.com booking', included: false },
      { text: 'Lead qualification scoring', included: false },
      { text: 'Lead routing', included: false },
      { text: 'White-label', included: false },
    ],
    cta: 'Get Started',
    ctaLink: '/signup?plan=starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Core plan for working agents',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI (Claude)', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: '1 agent included', included: true },
      { text: 'Priority support', included: true },
      { text: 'Lead routing', included: false },
      { text: 'White-label', included: false },
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    tier: 'team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'Small teams (up to 5 agents)',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI (Claude)', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: '5 agents included', included: true },
      { text: 'Lead routing', included: true },
      { text: 'Priority support', included: true },
      { text: 'White-label', included: false },
    ],
    cta: 'Get Started',
    ctaLink: '/signup?plan=team',
    highlighted: false,
  },
  {
    name: 'Brokerage',
    tier: 'brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'Large brokerages & white-label',
    features: [
      { text: 'Unlimited SMS responses', included: true },
      { text: 'Full AI + Custom', included: true },
      { text: 'Follow Up Boss integration', included: true },
      { text: 'Cal.com booking', included: true },
      { text: 'Full analytics + Admin', included: true },
      { text: 'Lead qualification scoring', included: true },
      { text: 'Unlimited agents', included: true },
      { text: 'Lead routing', included: true },
      { text: 'White-label', included: true },
      { text: 'Compliance reporting', included: true },
      { text: 'Dedicated support', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:hello@leadflow.ai',
    highlighted: false,
  },
]

// Feature comparison matrix for the table
const FEATURE_MATRIX = [
  { feature: 'SMS responses', starter: '100/mo', pro: 'Unlimited', team: 'Unlimited', brokerage: 'Unlimited' },
  { feature: 'AI quality', starter: 'Basic', pro: 'Full AI (Claude)', team: 'Full AI (Claude)', brokerage: 'Full AI + Custom' },
  { feature: 'Follow Up Boss integration', starter: true, pro: true, team: true, brokerage: true },
  { feature: 'Cal.com booking', starter: false, pro: true, team: true, brokerage: true },
  { feature: 'Analytics dashboard', starter: 'Basic', pro: 'Full', team: 'Full', brokerage: 'Full + Admin' },
  { feature: 'Lead qualification scoring', starter: false, pro: true, team: true, brokerage: true },
  { feature: 'Agents included', starter: '1', pro: '1', team: '5', brokerage: 'Unlimited' },
  { feature: 'Lead routing', starter: false, pro: false, team: true, brokerage: true },
  { feature: 'White-label', starter: false, pro: false, team: false, brokerage: true },
  { feature: 'Compliance reporting', starter: false, pro: false, team: false, brokerage: true },
  { feature: 'Support', starter: 'Email', pro: 'Priority', team: 'Priority', brokerage: 'Dedicated' },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const handleSelectPlan = async (tier: string) => {
    // TODO: Implement checkout flow
    console.log(`Selected plan: ${tier}`)
  }

  const getPrice = (tier: typeof PRICING_TIERS[0]) => {
    if (tier.tier === 'brokerage') {
      return { display: '$999+', subtext: 'Custom pricing' }
    }
    const price = interval === 'monthly' ? tier.monthlyPrice : Math.floor(tier.annualPrice / 12)
    const fullPrice = interval === 'monthly' ? tier.monthlyPrice * 12 : tier.annualPrice
    const savings = tier.monthlyPrice * 2
    return {
      display: `$${price}`,
      subtext: interval === 'annual' 
        ? `Billed $${fullPrice}/year (save $${savings})`
        : 'Billed monthly'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Pricing
              </Link>
              <Link href="/dashboard" className="text-slate-300 hover:text-white font-medium">
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 py-16">
          {/* Title */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-300 mb-8">
              Choose the perfect plan for your real estate business
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setInterval('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  interval === 'monthly'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('annual')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  interval === 'annual'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  Save 2 months
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {PRICING_TIERS.map((plan) => {
              const priceInfo = getPrice(plan)

              return (
                <div
                  key={plan.tier}
                  className={`relative group rounded-2xl border transition-all ${
                    plan.highlighted
                      ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-slate-600'
                  } p-6 overflow-hidden`}
                >
                  {/* Background gradient */}
                  {plan.highlighted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 pointer-events-none"></div>
                  )}

                  <div className="relative z-10">
                    {/* Popular badge */}
                    {plan.highlighted && (
                      <div className="inline-block mb-4 px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold rounded-full">
                        Most Popular
                      </div>
                    )}

                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-300 text-sm mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">{priceInfo.display}</span>
                        {plan.tier !== 'brokerage' && <span className="text-slate-400">/month</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {priceInfo.subtext}
                      </p>
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={plan.ctaLink}
                      onClick={() => handleSelectPlan(plan.tier)}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-6 flex items-center justify-center gap-2 ${
                        plan.highlighted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                          : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Minus className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-500'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-4 text-slate-400 font-medium sticky left-0 bg-slate-900/95 backdrop-blur-sm z-10">Feature</th>
                    <th className="text-center py-4 px-4 text-white font-semibold min-w-[120px]">Starter</th>
                    <th className="text-center py-4 px-4 text-emerald-400 font-semibold min-w-[120px]">Pro</th>
                    <th className="text-center py-4 px-4 text-white font-semibold min-w-[120px]">Team</th>
                    <th className="text-center py-4 px-4 text-white font-semibold min-w-[120px]">Brokerage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {FEATURE_MATRIX.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800/20' : ''}>
                      <td className="py-4 px-4 text-slate-300 sticky left-0 bg-slate-900/95 backdrop-blur-sm z-10 font-medium">
                        {row.feature}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderCell(row.starter)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderCell(row.pro)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderCell(row.team)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderCell(row.brokerage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h3>

            <div className="space-y-4">
              {[
                {
                  q: 'Can I change plans anytime?',
                  a: 'Yes! Upgrade or downgrade your plan at any time. We will prorate any changes.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards via Stripe. We also offer annual billing with a 2-month discount.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
                },
                {
                  q: 'What if I exceed my SMS limit on Starter?',
                  a: 'You can upgrade to Pro for unlimited SMS, or add SMS packs. We will notify you when you are approaching your limit.',
                },
                {
                  q: 'Do you offer custom enterprise plans?',
                  a: 'Yes! For brokerages with 50+ agents or custom requirements, contact our sales team for a tailored solution.',
                },
              ].map((faq, idx) => (
                <div key={idx} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
                  <p className="font-semibold text-white mb-2">{faq.q}</p>
                  <p className="text-slate-300">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-slate-300 mb-4">Questions? We are here to help.</p>
            <a
              href="mailto:hello@leadflow.ai"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Contact our sales team
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}

function renderCell(value: boolean | string) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
    ) : (
      <Minus className="w-5 h-5 text-slate-600 mx-auto" />
    )
  }
  return <span className="text-slate-300 text-sm">{value}</span>
}
