'use client'

import Link from 'next/link'
import { trackCTAClick } from '@/lib/analytics/ga4'

export const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Perfect for individual agents',
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
    description: 'For small teams (2–5 agents)',
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

export default function PricingSection() {
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
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Start free during pilot. Scale when you&apos;re ready.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.tier}
            data-testid={`pricing-card-${plan.tier}`}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-100 dark:shadow-none'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
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
                  <span
                    className="text-4xl font-extrabold text-slate-900 dark:text-white"
                    data-testid={`price-${plan.tier}`}
                  >
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">/mo</span>
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
                href="mailto:hello@leadflowai.com?subject=Brokerage%20Plan%20Inquiry"
                onClick={() =>
                  trackCTAClick(plan.ctaId, plan.cta, 'pricing')
                }
                className="block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                data-cta-id={plan.ctaId}
              >
                {plan.cta}
              </a>
            ) : (
              <Link
                href="/signup/trial"
                onClick={() =>
                  trackCTAClick(plan.ctaId, plan.cta, 'pricing')
                }
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
        ))}
      </div>
    </section>
  )
}
