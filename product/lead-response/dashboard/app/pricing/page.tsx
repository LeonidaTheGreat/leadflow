'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, ArrowRight, Loader2 } from 'lucide-react'

type BillingInterval = 'monthly' | 'annual'

/**
 * Maps pricing page tier + billing interval to the API's tier key format.
 * The API (POST /api/billing/create-checkout) expects: starter_monthly,
 * professional_monthly, enterprise_monthly, etc.
 *
 * Pricing page tiers:
 *   starter    → starter
 *   pro        → professional
 *   team       → enterprise
 *   brokerage  → contact sales (no checkout flow)
 */
const TIER_KEY_MAP: Record<string, string | null> = {
  starter:   'starter',
  pro:       'professional',
  team:      'enterprise',
  brokerage: null, // contact sales — no direct checkout
}

const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for testing the waters',
    features: [
      '100 SMS/month',
      'Basic AI responses',
      'Basic qualification',
      'Dashboard access',
      'FUB integration',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for working agents',
    features: [
      'Unlimited SMS',
      'Full AI (Claude)',
      'Cal.com booking',
      'Lead qualification',
      'Priority chat + email',
      'Full analytics',
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
      'Everything in Pro',
      'Unlimited SMS',
      'Full AI (Claude)',
      'Lead routing',
      'Team analytics',
      '5 agents included',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Brokerage',
    tier: 'brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'White-label for large brokerages',
    features: [
      'Unlimited everything',
      'Custom AI training',
      'White-label options',
      'SLA (99.9% uptime)',
      'Dedicated account manager',
      'Compliance reporting',
    ],
    cta: 'Contact Sales',
    highlighted: false,
    contactSales: true,
  },
]

// Feature comparison data
const FEATURE_CATEGORIES = [
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
      { name: 'Dedicated AM', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
  {
    name: 'Enterprise',
    features: [
      { name: 'White-label', starter: false, pro: false, team: false, brokerage: true },
      { name: 'SLA (99.9%)', starter: false, pro: false, team: false, brokerage: true },
      { name: 'Compliance Reporting', starter: false, pro: false, team: false, brokerage: true },
      { name: 'Custom Contracts', starter: false, pro: false, team: false, brokerage: true },
    ],
  },
]



export default function PricingPage() {
  const router = useRouter()
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handleSelectPlan = async (tier: string) => {
    setCheckoutError(null)

    // Brokerage is a "Contact Sales" tier — redirect to email
    if (tier === 'brokerage') {
      window.location.href = 'mailto:sales@leadflow.ai?subject=Brokerage Plan Inquiry'
      return
    }

    // Get the user from storage (set by login page)
    const token =
      localStorage.getItem('leadflow_token') ||
      sessionStorage.getItem('leadflow_token')
    const userRaw =
      localStorage.getItem('leadflow_user') ||
      sessionStorage.getItem('leadflow_user')

    // Not logged in → redirect to login, then back to pricing
    if (!token || !userRaw) {
      router.push('/login?redirect=/pricing')
      return
    }

    let user: { id: string; email: string }
    try {
      user = JSON.parse(userRaw)
    } catch {
      router.push('/login?redirect=/pricing')
      return
    }

    if (!user?.id || !user?.email) {
      router.push('/login?redirect=/pricing')
      return
    }

    // Map pricing-page tier + billing interval → API tier key
    const baseTierKey = TIER_KEY_MAP[tier]
    if (!baseTierKey) {
      setCheckoutError('This plan requires contacting sales. Please email sales@leadflow.ai.')
      return
    }
    const apiTier = `${baseTierKey}_${interval}` // e.g. "professional_monthly"

    setLoadingTier(tier)
    setSelectedTier(tier)

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-agent-id': user.id,
        },
        body: JSON.stringify({
          tier: apiTier,
          agentId: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout. Please try again.')
      }

      if (!data.url) {
        throw new Error('No checkout URL returned. Please try again.')
      }

      // Redirect to Stripe hosted checkout page
      window.location.href = data.url
    } catch (err: any) {
      setCheckoutError(err.message || 'Something went wrong. Please try again.')
      setLoadingTier(null)
      setSelectedTier(null)
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
                        <span className="text-4xl font-bold text-white">${plan.tier === 'brokerage' ? '999+' : price}</span>
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
                      disabled={loadingTier !== null}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-6 flex items-center justify-center gap-2 ${
                        plan.highlighted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-60'
                          : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-60'
                      }`}
                    >
                      {loadingTier === plan.tier ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          {plan.cta}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
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

          {/* Checkout Error */}
          {checkoutError && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
              {checkoutError}
            </div>
          )}

          {/* Feature Comparison Table */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Compare All Features</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[800px] bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left py-4 px-6 text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">Feature</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Starter</th>
                      <th className="text-center py-4 px-4 text-emerald-400 font-semibold bg-emerald-500/5">Pro</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Team</th>
                      <th className="text-center py-4 px-4 text-slate-300 font-semibold">Brokerage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price row */}
                    <tr className="border-b border-slate-700/50 bg-slate-800/50">
                      <td className="py-4 px-6 text-slate-300 font-medium sticky left-0 bg-slate-800/50 z-10">Monthly Price</td>
                      <td className="text-center py-4 px-4 text-slate-300">$49</td>
                      <td className="text-center py-4 px-4 text-emerald-400 font-semibold bg-emerald-500/5">$149</td>
                      <td className="text-center py-4 px-4 text-slate-300">$399</td>
                      <td className="text-center py-4 px-4 text-slate-300">$999+</td>
                    </tr>
                    {FEATURE_CATEGORIES.map((category, catIdx) => (
                      <>
                        <tr key={catIdx} className="bg-slate-800/30">
                          <td colSpan={5} className="py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {category.name}
                          </td>
                        </tr>
                        {category.features.map((feature, featIdx) => (
                          <tr
                            key={featIdx}
                            className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                          >
                            <td className="py-3 px-6 text-slate-300 text-sm sticky left-0 bg-slate-900/50 z-10">{feature.name}</td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.starter === 'boolean' ? (
                                feature.starter ? (
                                  <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-300 text-sm">{feature.starter}</span>
                              )}
                            </td>
                            <td className="text-center py-3 px-4 bg-emerald-500/5">
                              {typeof feature.pro === 'boolean' ? (
                                feature.pro ? (
                                  <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-300 text-sm">{feature.pro}</span>
                              )}
                            </td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.team === 'boolean' ? (
                                feature.team ? (
                                  <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-300 text-sm">{feature.team}</span>
                              )}
                            </td>
                            <td className="text-center py-3 px-4">
                              {typeof feature.brokerage === 'boolean' ? (
                                feature.brokerage ? (
                                  <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-slate-300 text-sm">{feature.brokerage}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
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
