'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Clock, Loader } from 'lucide-react'

function getDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Solo agents',
    features: ['100 SMS/month', 'AI qualification', 'FUB integration', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    popular: true,
    description: 'Full power, unlimited SMS',
    features: ['Unlimited SMS', 'Advanced AI', 'FUB + Cal.com', 'Priority support', 'Analytics'],
  },
  {
    id: 'team',
    name: 'Team',
    price: 399,
    description: 'Teams & brokerages',
    features: ['Up to 5 agents', 'Everything in Pro', 'Team management', 'Dedicated onboarding'],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [planTier, setPlanTier] = useState<string>('trial')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const user = JSON.parse(raw)
        setPlanTier(user.planTier || 'trial')
        setTrialEndsAt(user.trialEndsAt || null)
      }
    } catch {
      // ignore
    }

    // Handle success/cancel redirects
    const upgradeStatus = searchParams.get('upgrade')
    if (upgradeStatus === 'success') {
      // Show success message (cleared below)
      setError(null)
      // Optional: Redirect after a delay
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

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create checkout session')
        setLoadingPlan(null)
        return
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      setError('Something went wrong. Please try again or contact support@leadflowai.com')
      setLoadingPlan(null)
    }
  }

  const daysRemaining = trialEndsAt ? getDaysRemaining(trialEndsAt) : null
  const isUrgent = daysRemaining !== null && daysRemaining <= 7

  const upgradeStatus = searchParams.get('upgrade')
  
  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Success message */}
      {upgradeStatus === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4 mb-6">
          <p className="text-emerald-800 dark:text-emerald-200 font-semibold">
            🎉 You're now on a paid plan! Your account is upgraded. This page will refresh shortly.
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

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Billing & Plans</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-10">
        Choose a plan to continue after your trial. No credit card was needed to start.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{plan.description}</p>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">${plan.price}</span>
              <span className="text-slate-500">/mo</span>
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
        ))}
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
