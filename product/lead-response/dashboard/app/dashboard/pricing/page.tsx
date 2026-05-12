'use client'

/**
 * /dashboard/pricing
 *
 * Pricing page for trial users — shows all 4 tiers with upgrade CTAs.
 * Supports monthly and annual billing (annual = 2 months free, paid upfront).
 * Tracks trial_pricing_viewed event on mount.
 *
 * PRD: PRD-PRICING-CLARITY-TRIAL-USERS.md
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Star } from 'lucide-react'

// Annual plan = pay for 10 months, get 12 (2 months free)
const ANNUAL_FREE_MONTHS = 2

interface TrialStatus {
  isTrial: boolean
  isPilot: boolean
  daysRemaining: number
  planTier: string
}

type BillingInterval = 'monthly' | 'annual'

interface PricingTier {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number // total charged upfront for the year (= monthlyPrice × 10)
  description: string
  features: string[]
  recommended: boolean
  cta: string
  contactSales?: boolean
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'For agents just getting started with AI lead response',
    features: [
      '100 SMS per month',
      'Basic AI response',
      'Follow Up Boss integration',
      'Lead qualification',
      'Email support',
    ],
    recommended: false,
    cta: 'Choose Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'Best for solo agents who want full AI power',
    features: [
      'Unlimited SMS',
      'Full AI — appointment booking',
      'Follow Up Boss integration',
      'Cal.com booking automation',
      'Advanced lead qualification',
      'Priority support',
    ],
    recommended: true,
    cta: 'Choose Pro',
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'For small teams and growing brokerages',
    features: [
      'Up to 5 agents',
      'Unlimited SMS',
      'Full AI — all Pro features',
      'Team analytics dashboard',
      'Shared lead routing',
      'Priority support',
    ],
    recommended: false,
    cta: 'Choose Team',
  },
  {
    id: 'brokerage',
    name: 'Brokerage',
    monthlyPrice: 999,
    annualPrice: 9990,
    description: 'White-label solution for large brokerages',
    features: [
      'Unlimited agents',
      'White-label branding',
      'Custom AI training',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    recommended: false,
    cta: 'Contact Sales',
    contactSales: true,
  },
]

async function createCheckout(
  plan: string,
  interval: BillingInterval
): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/stripe/upgrade-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval }),
    })
    if (!res.ok) {
      const data = await res.json()
      return { error: data.error || 'Something went wrong. Please try again.' }
    }
    const { url } = await res.json()
    return { url }
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}

async function trackEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    await fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventType, properties: metadata }),
    })
  } catch {
    // Non-critical — silent fail
  }
}

export default function PricingPage() {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [billing, setBilling] = useState<BillingInterval>('monthly')

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/trial-status')
        if (res.ok) {
          const data = await res.json()
          setTrialStatus(data)
        }
      } catch {
        // Non-critical
      }

      await trackEvent('trial_pricing_viewed', { source: 'pricing_page' })
    }

    init()
  }, [])

  async function handleChoosePlan(tier: PricingTier) {
    if (tier.contactSales) {
      window.location.href = 'mailto:hello@leadflow.ai?subject=Brokerage%20Plan%20Inquiry'
      return
    }

    setLoadingPlan(tier.id)
    setErrors((prev) => ({ ...prev, [tier.id]: '' }))

    await trackEvent('trial_upgrade_clicked', {
      plan: tier.id,
      interval: billing,
      source: 'pricing_page',
      days_remaining: trialStatus?.daysRemaining,
    })

    const result = await createCheckout(tier.id, billing)
    if (result.error) {
      setErrors((prev) => ({ ...prev, [tier.id]: result.error! }))
      setLoadingPlan(null)
      return
    }
    if (result.url) {
      await trackEvent('trial_checkout_started', {
        plan: tier.id,
        interval: billing,
        source: 'pricing_page',
        days_remaining: trialStatus?.daysRemaining,
      })
      window.location.href = result.url
    }
  }

  const isTrialUser = trialStatus?.isTrial || trialStatus?.isPilot

  return (
    <div data-testid="pricing-page" className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Choose Your Plan
        </h1>
        {isTrialUser ? (
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            You&apos;re currently on a free trial.{' '}
            {trialStatus?.daysRemaining !== undefined && trialStatus.daysRemaining > 0 && (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} remaining.{' '}
              </span>
            )}
            Choose a plan to continue after your trial ends.
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Simple, transparent pricing. No hidden fees.
          </p>
        )}

        {/* Billing interval toggle */}
        <div
          data-testid="billing-toggle"
          className="inline-flex items-center mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1"
        >
          <button
            data-testid="billing-toggle-monthly"
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              billing === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            data-testid="billing-toggle-annual"
            onClick={() => setBilling('annual')}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              billing === 'annual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Annual
            <span
              data-testid="annual-savings-badge"
              className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full"
            >
              {ANNUAL_FREE_MONTHS} months free
            </span>
          </button>
        </div>
      </div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier) => {
          const displayPrice =
            tier.contactSales
              ? '$999+'
              : billing === 'annual'
              ? `$${Math.floor(tier.annualPrice / 12)}`
              : `$${tier.monthlyPrice}`

          const annualSavings = tier.monthlyPrice * ANNUAL_FREE_MONTHS

          return (
            <div
              key={tier.id}
              data-testid={`pricing-tier-${tier.id}`}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.recommended
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                    <Star className="w-3 h-3 fill-white" /> Recommended
                  </span>
                </div>
              )}

              {/* Tier header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  {tier.name}
                </h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    data-testid={`price-${tier.id}`}
                    className="text-3xl font-bold text-slate-900 dark:text-white"
                  >
                    {displayPrice}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">/mo</span>
                </div>
                {billing === 'annual' && !tier.contactSales && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Billed ${tier.annualPrice}/year — save ${annualSavings}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">{tier.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div>
                <button
                  onClick={() => handleChoosePlan(tier)}
                  disabled={loadingPlan === tier.id}
                  data-testid={`upgrade-cta-${tier.id}`}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    tier.recommended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900'
                  }`}
                >
                  {loadingPlan === tier.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    tier.cta
                  )}
                </button>
                {errors[tier.id] && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                    {errors[tier.id]}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime.
        {billing === 'annual' && (
          <span className="block mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
            Annual plans are billed upfront and save you {ANNUAL_FREE_MONTHS} months.
          </span>
        )}
      </p>
    </div>
  )
}
