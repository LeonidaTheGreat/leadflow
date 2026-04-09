'use client'

import { useState } from 'react'
import { Check, ArrowRight } from 'lucide-react'

type BillingInterval = 'monthly' | 'annual'

const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 497,
    annualPrice: 4970,
    description: 'Perfect for individual agents',
    features: [
      'Up to 50 leads/month',
      'AI SMS & email responses',
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
    monthlyPrice: 997,
    annualPrice: 9970,
    description: 'Most popular for teams',
    features: [
      'Up to 150 leads/month',
      'AI SMS, email & voice',
      'Advanced qualification scoring',
      'Calendar integration (5 agents)',
      'Priority chat + email support',
      'Advanced analytics & API',
      'Team collaboration',
      'Custom AI training',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 1997,
    annualPrice: 19970,
    description: 'For large brokerages',
    features: [
      'Unlimited leads',
      'Multi-channel AI (SMS/email/voice/chat)',
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

const ADD_ONS = [
  { name: 'Extra 100 leads/month', price: 200 },
  { name: 'Additional phone number', price: 25 },
  { name: 'Custom AI persona', price: 500 },
  { name: 'Advanced reporting', price: 150 },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const handleSelectPlan = async (tier: string) => {
    // TODO: Implement checkout flow
    console.log(`Selected plan: ${tier}`)
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">▶</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
            <a href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Dashboard
            </a>
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
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {PRICING_PLANS.map((plan) => {
              const price = interval === 'monthly' ? plan.monthlyPrice : Math.floor(plan.annualPrice / 12)
              const fullPrice = interval === 'monthly' ? plan.monthlyPrice * 12 : plan.annualPrice

              return (
                <div
                  key={plan.tier}
                  className={`relative group rounded-2xl border transition-all ${
                    plan.highlighted
                      ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-slate-600'
                  } p-8 overflow-hidden`}
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
                        <span className="text-5xl font-bold text-white">${price}</span>
                        <span className="text-slate-400">/month</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {interval === 'annual'
                          ? `Billed $${fullPrice}/year (save $${(plan.monthlyPrice * 2).toFixed(0)})`
                          : 'Billed monthly'}
                      </p>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan.tier)}
                      disabled={selectedTier === plan.tier}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-6 flex items-center justify-center gap-2 ${
                        plan.highlighted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                          : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Features */}
                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add-Ons */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 mb-16">
            <h3 className="text-2xl font-bold text-white mb-8">Optional Add-Ons</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {ADD_ONS.map((addon) => (
                <div key={addon.name} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <span className="text-slate-200">{addon.name}</span>
                  <span className="font-semibold text-emerald-400">${addon.price}/mo</span>
                </div>
              ))}
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
                  q: 'What if I exceed my lead limit?',
                  a: 'You can add extra lead packs anytime, or upgrade to a higher tier for unlimited leads.',
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
            <p className="text-slate-300 mb-4">Questions? We're here to help.</p>
            <a
              href="mailto:support@leadflow.ai"
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
