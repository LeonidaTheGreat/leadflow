'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trackCTAClick } from '@/lib/analytics/ga4'

export const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for individual agents',
    badge: 'Free pilot',
    features: [
      '100 SMS responses/month',
      'Basic AI qualification',
      'Follow Up Boss integration',
      'Dashboard & analytics',
      'Email support',
    ],
    cta: 'Get Started',
    ctaId: 'pricing_starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Most popular for solo agents',
    badge: 'Most popular',
    features: [
      'Unlimited SMS responses',
      'Full AI qualification',
      'Follow Up Boss + Cal.com',
      'Advanced analytics',
      'Priority support',
    ],
    cta: 'Start Pro',
    ctaId: 'pricing_pro',
    highlighted: true,
  },
  {
    name: 'Team',
    tier: 'team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams',
    badge: '5 agents',
    features: [
      'Up to 5 agents included',
      'Unlimited SMS responses',
      'Team dashboard',
      'Lead routing & distribution',
      'Dedicated support',
    ],
    cta: 'Start Team',
    ctaId: 'pricing_team',
    highlighted: false,
  },
  {
    name: 'Brokerage',
    tier: 'brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'For large brokerages (20+ agents)',
    badge: 'Enterprise',
    features: [
      'Unlimited agents',
      'White-label branding',
      'Admin dashboard',
      'Compliance reporting',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    ctaId: 'pricing_brokerage',
    highlighted: false,
    customPricing: true,
  },
]

type BillingInterval = 'month' | 'year'

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')
  const isAnnual = billingInterval === 'year'

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="mt-20"
      data-testid="pricing-section"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
          Start free during pilot. Scale when you&apos;re ready.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full p-1" data-testid="billing-interval-toggle">
          <button
            onClick={() => setBillingInterval('month')}
            data-testid="toggle-monthly"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              !isAnnual
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            data-testid="toggle-annual"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isAnnual
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Annual
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
              2 months free
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_PLANS.map((plan) => {
          const monthlyEquivalent = isAnnual
            ? Math.round(plan.annualPrice / 12)
            : plan.monthlyPrice
          const signupHref = isAnnual
            ? `/signup/trial?billing=annual&tier=${plan.tier}`
            : `/signup/trial?tier=${plan.tier}`

          return (
            <div
              key={plan.tier}
              data-testid={`pricing-card-${plan.tier}`}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-100 dark:shadow-none'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              {/* Plan badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    plan.highlighted
                      ? 'bg-emerald-500 text-white'
                      : plan.tier === 'starter'
                      ? 'bg-blue-500 text-white'
                      : plan.tier === 'team'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-600 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {plan.description}
                </p>
              </div>

              {/* Price display */}
              <div className="mb-6">
                {plan.customPricing ? (
                  <div>
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      $999
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 ml-1">+/mo</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-4xl font-extrabold text-slate-900 dark:text-white"
                        data-testid={`price-${plan.tier}`}
                      >
                        ${monthlyEquivalent}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">/mo</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid={`annual-total-${plan.tier}`}>
                        ${plan.annualPrice}/yr billed upfront
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <span className="text-emerald-500 mt-0.5 shrink-0" aria-hidden="true">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.tier === 'brokerage' ? (
                <a
                  href={`mailto:hello@leadflowai.com?subject=Brokerage%20Plan%20Inquiry${isAnnual ? '%20-%20Annual' : ''}`}
                  onClick={() => trackCTAClick(plan.ctaId, plan.cta, 'pricing')}
                  className="block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                  data-cta-id={plan.ctaId}
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  href={signupHref}
                  onClick={() => trackCTAClick(plan.ctaId, plan.cta, 'pricing')}
                  className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                  }`}
                  data-cta-id={plan.ctaId}
                >
                  Start Free Trial
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {isAnnual && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6" data-testid="annual-billing-note">
          Annual plans are billed upfront. 2 months free vs monthly billing.
        </p>
      )}
    </section>
  )
}
