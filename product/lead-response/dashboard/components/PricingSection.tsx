'use client'

import Link from 'next/link'
import { trackCTAClick } from '@/lib/analytics/ga4'
import { PLANS } from '@/lib/plans'

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
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            data-testid={`pricing-card-${plan.tier}`}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-100 dark:shadow-none'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    plan.highlighted
                      ? 'bg-emerald-500 text-white'
                      : plan.tier === 'starter'
                      ? 'bg-blue-500 text-white'
                      : plan.tier === 'team'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-600 text-white'
                  }`}
                >
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

            <div className="mb-6">
              {plan.contactSales ? (
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
                onClick={() => trackCTAClick(`pricing_${plan.tier}`, 'Contact Sales', 'pricing')}
                className="block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                data-cta-id={`pricing_${plan.tier}`}
              >
                Contact Sales
              </a>
            ) : (
              <Link
                href="/signup/trial"
                onClick={() => trackCTAClick(`pricing_${plan.tier}`, 'Start Free Trial', 'pricing')}
                className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                }`}
                data-cta-id={`pricing_${plan.tier}`}
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
