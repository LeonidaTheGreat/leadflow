'use client'

/**
 * /dashboard/pricing
 *
 * Pricing page for trial users — shows all 4 tiers with upgrade CTAs.
 * Tracks trial_pricing_viewed event on mount.
 * Pre-fills Stripe checkout with the selected plan on CTA click.
 *
 * PRD: PRD-PRICING-CLARITY-TRIAL-USERS.md
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Star } from 'lucide-react'

interface TrialStatus {
  isTrial: boolean
  isPilot: boolean
  daysRemaining: number
  planTier: string
}

interface PricingTier {
  id: string
  name: string
  price: string
  priceNote?: string
  description: string
  features: string[]
  recommended: boolean
  cta: string
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    priceNote: '/mo',
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
    price: '$149',
    priceNote: '/mo',
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
    price: '$399',
    priceNote: '/mo',
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
    price: '$999+',
    priceNote: '/mo',
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
  },
]

async function createCheckout(plan: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/stripe/upgrade-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
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

  useEffect(() => {
    async function init() {
      // Fetch trial status to personalize messaging
      try {
        const res = await fetch('/api/auth/trial-status')
        if (res.ok) {
          const data = await res.json()
          setTrialStatus(data)
        }
      } catch {
        // Non-critical
      }

      // Track pricing page view
      await trackEvent('trial_pricing_viewed', {
        source: 'pricing_page',
      })
    }

    init()
  }, [])

  async function handleChoosePlan(tier: PricingTier) {
    if (tier.id === 'brokerage') {
      // Brokerage is contact sales — open email
      window.location.href = 'mailto:hello@leadflow.ai?subject=Brokerage%20Plan%20Inquiry'
      return
    }

    setLoadingPlan(tier.id)
    setErrors((prev) => ({ ...prev, [tier.id]: '' }))

    // Track upgrade clicked
    await trackEvent('trial_upgrade_clicked', {
      plan: tier.id,
      source: 'pricing_page',
      days_remaining: trialStatus?.daysRemaining,
    })

    const result = await createCheckout(tier.id)
    if (result.error) {
      setErrors((prev) => ({ ...prev, [tier.id]: result.error! }))
      setLoadingPlan(null)
      return
    }
    if (result.url) {
      // Track checkout started
      await trackEvent('trial_checkout_started', {
        plan: tier.id,
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
      </div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier) => (
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
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {tier.price}
                </span>
                {tier.priceNote && (
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    {tier.priceNote}
                  </span>
                )}
              </div>
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
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime.
      </p>
    </div>
  )
}
