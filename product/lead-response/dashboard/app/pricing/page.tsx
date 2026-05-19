'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, ArrowRight, Loader2, Phone } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/ga4'
import { PLANS, FEATURE_COMPARISON, type BillingInterval } from '@/lib/plans'

type BillingToggle = BillingInterval

export default function PricingPage() {
  const router = useRouter()
  const [interval, setInterval] = useState<BillingToggle>('monthly')
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const DEMO_BOOKING_URL = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL || 'https://cal.com'

  const handleSelectPlan = async (tier: string) => {
    setCheckoutError(null)

    if (tier === 'brokerage') {
      window.location.href = 'mailto:sales@leadflow.ai?subject=Brokerage Plan Inquiry'
      return
    }

    const token =
      localStorage.getItem('leadflow_token') ||
      sessionStorage.getItem('leadflow_token')
    const userRaw =
      localStorage.getItem('leadflow_user') ||
      sessionStorage.getItem('leadflow_user')

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

    const apiTier = `${tier}_${interval}`
    setLoadingTier(tier)

    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-agent-id': user.id,
        },
        body: JSON.stringify({ tier: apiTier, agentId: user.id, email: user.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout. Please try again.')
      }

      if (!data.url) {
        throw new Error('No checkout URL returned. Please try again.')
      }

      window.location.href = data.url
    } catch (err: any) {
      setCheckoutError(err.message || 'Something went wrong. Please try again.')
      setLoadingTier(null)
    }
  }

  return (
    <div data-testid="pricing-page" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
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

          {/* Pricing Cards — sourced from lib/plans.ts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {PLANS.map((plan) => {
              const price =
                interval === 'monthly'
                  ? plan.monthlyPrice
                  : Math.floor(plan.annualPrice / 12)
              const annualSaving =
                (plan.monthlyPrice - Math.floor(plan.annualPrice / 12)) * 12

              return (
                <div
                  key={plan.tier}
                  className={`relative group rounded-2xl border transition-all ${
                    plan.highlighted
                      ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-slate-600'
                  } p-8 overflow-hidden`}
                >
                  {plan.highlighted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 pointer-events-none" />
                  )}

                  <div className="relative z-10">
                    {plan.badge && (
                      <div className="inline-block mb-4 px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold rounded-full">
                        {plan.badge}
                      </div>
                    )}

                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-300 text-sm mb-6">{plan.description}</p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          ${plan.contactSales ? '999+' : price}
                        </span>
                        <span className="text-slate-400">/month</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {interval === 'annual' && !plan.contactSales
                          ? `Billed $${plan.annualPrice}/year (save $${annualSaving})`
                          : 'Billed monthly'}
                      </p>
                    </div>

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
                          {plan.contactSales
                            ? 'Contact Sales'
                            : interval === 'annual'
                            ? 'Pay Annually'
                            : plan.highlighted
                            ? 'Start Free Trial'
                            : 'Get Started'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

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

          {/* Demo Call CTA */}
          <div className="mb-16 text-center" data-testid="demo-call-section">
            <p className="text-slate-300 mb-3 text-sm">Not sure which plan fits your business?</p>
            <a
              href={DEMO_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="demo-call-cta"
              onClick={() => trackEvent('demo_call_cta_click', { source: 'pricing_page' })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-blue-200 font-semibold rounded-lg transition-all"
            >
              <Phone className="w-4 h-4" />
              Questions? Book a 15-min demo
            </a>
          </div>

          {/* Feature Comparison Table — sourced from lib/plans.ts */}
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
                    <tr className="border-b border-slate-700/50 bg-slate-800/50">
                      <td className="py-4 px-6 text-slate-300 font-medium sticky left-0 bg-slate-800/50 z-10">Monthly Price</td>
                      {PLANS.map((plan) => (
                        <td
                          key={plan.tier}
                          className={`text-center py-4 px-4 ${plan.tier === 'pro' ? 'text-emerald-400 font-semibold bg-emerald-500/5' : 'text-slate-300'}`}
                        >
                          {plan.contactSales ? '$999+' : `$${plan.monthlyPrice}`}
                        </td>
                      ))}
                    </tr>

                    {FEATURE_COMPARISON.map((section, sIdx) => (
                      <>
                        <tr key={`section-${sIdx}`} className="bg-slate-800/30">
                          <td colSpan={5} className="py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {section.name}
                          </td>
                        </tr>
                        {section.features.map((feat, fIdx) => (
                          <tr
                            key={`feat-${sIdx}-${fIdx}`}
                            className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                          >
                            <td className="py-3 px-6 text-slate-300 text-sm sticky left-0 bg-slate-900/50 z-10">{feat.name}</td>
                            {(['starter', 'pro', 'team', 'brokerage'] as const).map((tier) => (
                              <td
                                key={tier}
                                className={`text-center py-3 px-4 ${tier === 'pro' ? 'bg-emerald-500/5' : ''}`}
                              >
                                {typeof feat[tier] === 'boolean' ? (
                                  feat[tier] ? (
                                    <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                                  ) : (
                                    <Minus className="w-5 h-5 text-slate-600 mx-auto" />
                                  )
                                ) : (
                                  <span className="text-slate-300 text-sm">{feat[tier]}</span>
                                )}
                              </td>
                            ))}
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
                  q: 'What happens if I hit my SMS limit on Starter?',
                  a: 'AI responses pause for the rest of the month. Upgrade to Pro for unlimited SMS.',
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={DEMO_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('demo_call_cta_click', { source: 'pricing_page' })}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Book a 15-min demo call
              </a>
              <span className="hidden sm:inline text-slate-600">·</span>
              <a
                href="mailto:support@leadflow.ai"
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Contact our sales team
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
