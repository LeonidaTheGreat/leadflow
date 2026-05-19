'use client'

/**
 * /dashboard/pricing
 *
 * Pricing page for trial users — shows all 4 tiers with upgrade CTAs.
 * Tracks trial_pricing_viewed event on mount.
 * Pre-fills Stripe checkout with the selected plan on CTA click.
 *
 * PRD: PRD-PRICING-CLARITY-TRIAL-USERS.md
 * Plan data: lib/plans.ts (single source of truth)
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Star } from 'lucide-react'
import { PLANS } from '@/lib/plans'

interface TrialStatus {
  isTrial: boolean
  isPilot: boolean
  daysRemaining: number
  planTier: string
}

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

  async function handleChoosePlan(tierId: string) {
    if (tierId === 'brokerage') {
      window.location.href = 'mailto:hello@leadflow.ai?subject=Brokerage%20Plan%20Inquiry'
      return
    }

    setLoadingPlan(tierId)
    setErrors((prev) => ({ ...prev, [tierId]: '' }))

    await trackEvent('trial_upgrade_clicked', {
      plan: tierId,
      source: 'pricing_page',
      days_remaining: trialStatus?.daysRemaining,
    })

    const result = await createCheckout(tierId)
    if (result.error) {
      setErrors((prev) => ({ ...prev, [tierId]: result.error! }))
      setLoadingPlan(null)
      return
    }
    if (result.url) {
      await trackEvent('trial_checkout_started', {
        plan: tierId,
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

      {/* Pricing grid — sourced from lib/plans.ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            data-testid={`pricing-tier-${plan.tier}`}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/10'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                  <Star className="w-3 h-3 fill-white" /> Recommended
                </span>
              </div>
            )}

            {/* Tier header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {plan.name}
              </h2>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {plan.contactSales ? '$999+' : `$${plan.monthlyPrice}`}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/mo</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
            </div>

            {/* Features */}
            <ul className="space-y-2 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div>
              <button
                onClick={() => handleChoosePlan(plan.tier)}
                disabled={loadingPlan === plan.tier}
                data-testid={`upgrade-cta-${plan.tier}`}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  plan.highlighted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900'
                }`}
              >
                {loadingPlan === plan.tier ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : plan.contactSales ? (
                  'Contact Sales'
                ) : plan.highlighted ? (
                  'Choose Pro'
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
              {errors[plan.tier] && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                  {errors[plan.tier]}
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
