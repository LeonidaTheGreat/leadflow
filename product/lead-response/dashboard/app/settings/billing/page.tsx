'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Clock, Loader } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/ga4'

type BillingInterval = 'monthly' | 'annual'

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Annual price = 10 months upfront (2 months free)
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Solo agents',
    features: ['100 SMS/month', 'AI qualification', 'FUB integration', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    popular: true,
    description: 'Full power, unlimited SMS',
    features: ['Unlimited SMS', 'Advanced AI', 'FUB + Cal.com', 'Priority support', 'Analytics'],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 399,
    annualPrice: 3990,
    description: 'Teams & brokerages',
    features: ['Up to 5 agents', 'Everything in Pro', 'Team management', 'Dedicated onboarding'],
  },
]

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [planTier, setPlanTier] = useState<string>('trial')
  const [isExpired, setIsExpired] = useState<boolean>(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionInterval, setSubscriptionInterval] = useState<string | null>(null)
  const [renewsAt, setRenewsAt] = useState<string | null>(null)

  useEffect(() => {
    const token =
      (typeof localStorage !== 'undefined' && localStorage.getItem('leadflow_token')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('leadflow_token')) ||
      null

    // Load email and fallback agentId from cached user data
    try {
      const raw = localStorage.getItem('leadflow_user') || localStorage.getItem('user')
      if (raw) {
        const user = JSON.parse(raw)
        if (user?.email) setEmail(user.email)
        if (user?.id) setAgentId(user.id)
      }
    } catch {
      // ignore
    }

    if (token) {
      const authHeaders = { Authorization: `Bearer ${token}` }

      fetch('/api/auth/trial-status', { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          setPlanTier(data.planTier || 'trial')
          setTrialEndsAt(data.trialEndsAt || null)
          setIsExpired(data.isExpired === true)
          if (data.agentId) setAgentId(data.agentId)
        })
        .catch(() => {
          try {
            const raw = localStorage.getItem('leadflow_user') || localStorage.getItem('user')
            if (raw) {
              const user = JSON.parse(raw)
              setPlanTier(user.planTier || 'trial')
              setTrialEndsAt(user.trialEndsAt || null)
            }
          } catch {
            // ignore
          }
        })

      // Fetch active subscription info (interval + renewal date for annual subscribers)
      fetch('/api/billing/subscription-info', { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          if (data.interval) setSubscriptionInterval(data.interval)
          if (data.renewsAt) setRenewsAt(data.renewsAt)
        })
        .catch(() => {
          // Non-critical
        })
    } else {
      try {
        const raw = localStorage.getItem('leadflow_user') || localStorage.getItem('user')
        if (raw) {
          const user = JSON.parse(raw)
          setPlanTier(user.planTier || 'trial')
          setTrialEndsAt(user.trialEndsAt || null)
        }
      } catch {
        // ignore
      }
    }

    const upgradeStatus = searchParams.get('upgrade')
    if (upgradeStatus === 'success') {
      setError(null)
      const timer = setTimeout(() => {
        router.replace('/settings/billing')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  async function handleUpgrade(planId: string) {
    try {
      setLoadingPlan(planId)
      setError(null)

      const token =
        (typeof localStorage !== 'undefined' && localStorage.getItem('leadflow_token')) ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('leadflow_token')) ||
        null

      // Resolve agentId + email (prefer server-loaded state, fall back to localStorage)
      let resolvedAgentId = agentId
      let resolvedEmail = email
      if (!resolvedAgentId || !resolvedEmail) {
        try {
          const raw = localStorage.getItem('leadflow_user') || localStorage.getItem('user')
          if (raw) {
            const user = JSON.parse(raw)
            if (!resolvedAgentId && user.id) resolvedAgentId = user.id
            if (!resolvedEmail && user.email) resolvedEmail = user.email
          }
        } catch {
          // ignore
        }
      }

      if (!resolvedAgentId || !resolvedEmail) {
        setError('Session expired. Please log in again.')
        setLoadingPlan(null)
        router.push('/login?redirect=/settings/billing')
        return
      }

      // e.g. 'pro_annual', 'starter_monthly'
      const tier = `${planId}_${billingInterval}`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-agent-id': resolvedAgentId,
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tier, agentId: resolvedAgentId, email: resolvedEmail }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create checkout session')
        setLoadingPlan(null)
        return
      }

      const { url } = await response.json()
      if (url) {
        trackEvent('checkout_started', { plan: planId, interval: billingInterval })
        window.location.href = url
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      setError('Something went wrong. Please try again or contact support@leadflowai.com')
      setLoadingPlan(null)
    }
  }

  const DEMO_BOOKING_URL = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL || 'https://cal.com'
  const daysRemaining = trialEndsAt ? getDaysRemaining(trialEndsAt) : null
  const isUrgent = daysRemaining !== null && daysRemaining <= 7

  const upgradeStatus = searchParams.get('upgrade')

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Expired trial banner — shown above everything else */}
      {isExpired && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-red-800 dark:text-red-200 font-bold text-base mb-1">
              Your trial has expired
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm">
              Your access has ended. Upgrade now to restore your account and keep all your data.
            </p>
          </div>
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loadingPlan === 'pro'}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPlan === 'pro' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Upgrade Now <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Success message */}
      {upgradeStatus === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4 mb-6">
          <p className="text-emerald-800 dark:text-emerald-200 font-semibold">
            🎉 You&apos;re now on a paid plan! Your account is upgraded. This page will refresh shortly.
          </p>
        </div>
      )}

      {/* Cancel message */}
      {upgradeStatus === 'cancelled' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mb-6">
          <p className="text-amber-800 dark:text-amber-200 font-semibold">
            ℹ️ No charge was made. You can upgrade anytime from this page.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 mb-6">
          <p className="text-red-800 dark:text-red-200 font-semibold">
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Annual renewal date banner — shown for active annual subscribers */}
      {subscriptionInterval === 'year' && renewsAt && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 mb-6">
          <p className="text-blue-800 dark:text-blue-200 font-semibold text-sm">
            Annual plan — renews on {formatDate(renewsAt)}
          </p>
        </div>
      )}

      {/* Trial status banner */}
      {planTier === 'trial' && daysRemaining !== null && (
        <div
          className={`rounded-2xl border p-6 mb-8 ${
            isUrgent
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-emerald-400'}`} />
            <h2 className={`text-lg font-bold ${isUrgent ? 'text-red-300' : 'text-emerald-300'}`}>
              {isUrgent
                ? `⚠️ Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
                : `✅ Trial active — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
            </h2>
          </div>
          <p className="text-slate-400 text-sm">
            {isUrgent
              ? "Upgrade now to keep all your data and avoid service interruption."
              : "Upgrade any time before your trial ends — no data loss, instant activation."}
          </p>
        </div>
      )}

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Billing &amp; Plans</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        Choose a plan to continue after your trial. No credit card was needed to start.
      </p>

      {/* Billing interval toggle */}
      <div className="flex items-center gap-3 mb-8">
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setBillingInterval('monthly')}
            data-testid="billing-toggle-monthly"
            className={`px-5 py-2 rounded-md font-medium text-sm transition-all ${
              billingInterval === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            data-testid="billing-toggle-annual"
            className={`px-5 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 ${
              billingInterval === 'annual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Annual
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              2 months free
            </span>
          </button>
        </div>
        {billingInterval === 'annual' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Billed upfront — cancel anytime
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const savings = plan.monthlyPrice * 2

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-7 flex flex-col ${
                plan.popular
                  ? 'border-emerald-500 bg-emerald-500/5 shadow-xl shadow-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              {billingInterval === 'annual' && (
                <div className="absolute top-4 right-4">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    2 MONTHS FREE
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{plan.description}</p>
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-slate-500">/mo</span>
                </div>
                {billingInterval === 'annual' ? (
                  <div className="mt-1.5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Billed <span className="font-semibold">${plan.annualPrice}/year</span>
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      Save ${savings} — 2 months free
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Billed monthly</p>
                )}
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`block w-full text-center px-5 py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white'
                }`}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader className="inline w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Upgrade to {plan.name} <ArrowRight className="inline w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Demo Booking CTA */}
      <div className="mt-8 mb-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Have questions before upgrading?</p>
        <a
          href={DEMO_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="demo-call-cta-billing"
          onClick={() => trackEvent('demo_call_cta_click', { source: 'billing_page' })}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold rounded-lg transition-all text-sm"
        >
          Book a free 15-min demo <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Questions? Email us at{' '}
        <a href="mailto:support@leadflowai.com" className="text-emerald-500 hover:underline">
          support@leadflowai.com
        </a>
      </p>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <BillingPageContent />
    </Suspense>
  )
}
