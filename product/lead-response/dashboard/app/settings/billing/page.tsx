'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { StripePortalButton } from '@/components/billing/StripePortalButton'

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 49,
    description: 'Perfect for solo agents',
    features: [
      '100 AI SMS responses/month',
      'AI lead qualification',
      'Follow Up Boss integration',
      'Email support',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 149,
    popular: true,
    description: 'Unlimited power for growing agents',
    features: [
      'Unlimited AI SMS responses',
      'Advanced AI qualification',
      'FUB + Cal.com integration',
      'Priority support',
      'Analytics dashboard',
    ],
  },
  {
    id: 'team' as const,
    name: 'Team',
    price: 399,
    description: 'For teams & brokerages',
    features: [
      'Up to 5 agents',
      'Everything in Pro',
      'Team management',
      'Dedicated onboarding',
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysRemaining(expiresAt: string): number {
  const end = new Date(expiresAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PilotStatus {
  isPilot: boolean
  daysRemaining: number
  isExpired: boolean
  pilotExpiresAt: string | null
  planTier: string | null
}

interface AgentInfo {
  agentId: string | null
  planTier: string | null
}

export default function BillingPage() {
  const [pilotStatus, setPilotStatus] = useState<PilotStatus | null>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo>({ agentId: null, planTier: null })
  const [upgradeResult, setUpgradeResult] = useState<'success' | 'cancelled' | null>(null)

  // Read upgrade query param from URL (set by Stripe redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('upgrade')
    if (result === 'success' || result === 'cancelled') {
      setUpgradeResult(result)
      // Clean URL without reload
      window.history.replaceState({}, '', '/settings/billing')
    }
  }, [])

  // Fetch pilot status (auth-aware server route)
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/auth/pilot-status')
        if (res.ok) {
          const data = await res.json()
          setPilotStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch pilot status:', err)
      }
    }
    fetchStatus()
  }, [])

  // Fetch agent ID for billing portal
  useEffect(() => {
    async function fetchAgent() {
      try {
        const raw = localStorage.getItem('user')
        if (raw) {
          const user = JSON.parse(raw)
          setAgentInfo({ agentId: user.id || null, planTier: user.planTier || null })
        }
      } catch {
        // ignore
      }
    }
    fetchAgent()
  }, [])

  const isPilot = pilotStatus?.isPilot ?? false
  const isExpired = pilotStatus?.isExpired ?? false
  const daysRemaining = pilotStatus?.daysRemaining ?? 0
  const isExpiringSoon = isPilot && !isExpired && daysRemaining <= 7
  const hasPaidPlan =
    agentInfo.planTier &&
    !['pilot', 'trial', null].includes(agentInfo.planTier)

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">

      {/* ── Post-checkout banners ── */}
      {upgradeResult === 'success' && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              🎉 You're now on a paid plan!
            </h2>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              Your subscription is active. All features are unlocked. Thanks for upgrading!
            </p>
          </div>
        </div>
      )}

      {upgradeResult === 'cancelled' && (
        <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Checkout was cancelled. You're still on the free pilot — upgrade any time below.
          </p>
        </div>
      )}

      {/* ── Pilot / expiry banner ── */}
      {isPilot && !hasPaidPlan && (
        <div
          className={`rounded-2xl border p-6 ${
            isExpired
              ? 'bg-red-500/10 border-red-500/30'
              : isExpiringSoon
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {isExpired ? (
              <Clock className="w-5 h-5 text-red-400" />
            ) : (
              <Sparkles className={`w-5 h-5 ${isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'}`} />
            )}
            <h2
              className={`text-lg font-bold ${
                isExpired
                  ? 'text-red-300'
                  : isExpiringSoon
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }`}
            >
              {isExpired
                ? '⚠️ Your pilot has expired'
                : isExpiringSoon
                ? `⚠️ Pilot expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
                : `🎉 You're on a free pilot — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
            </h2>
          </div>
          <p className="text-slate-400 text-sm">
            {isExpired
              ? 'Upgrade now to restore your AI lead response and keep all your data.'
              : isExpiringSoon
              ? 'Upgrade before your pilot ends to keep your AI lead response running without interruption.'
              : 'Enjoy your free pilot. Upgrade any time to lock in your pricing and remove SMS limits.'}
          </p>
        </div>
      )}

      {/* ── Already on paid plan ── */}
      {hasPaidPlan && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Active Subscription
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              You're on the{' '}
              <span className="font-semibold capitalize">{agentInfo.planTier}</span> plan. Manage
              payment methods, invoices, and plan changes from the billing portal.
            </p>
            {agentInfo.agentId && (
              <div className="mt-4">
                <StripePortalButton
                  agentId={agentInfo.agentId}
                  variant="primary"
                  size="md"
                  returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/settings/billing`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Plan cards ── */}
      {!hasPaidPlan && (
        <>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Choose a Plan
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Upgrade to keep your AI lead response active after your pilot ends. No hidden fees.
            </p>
          </div>

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
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-slate-500">/mo</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Self-serve Stripe checkout button */}
                <UpgradeButton
                  plan={plan.id}
                  label={`Get ${plan.name} — $${plan.price}/mo`}
                  variant={plan.popular ? 'primary' : 'secondary'}
                  size="md"
                  className="w-full justify-center"
                />
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Questions? Email{' '}
            <a href="mailto:support@leadflowai.com" className="text-emerald-500 hover:underline">
              support@leadflowai.com
            </a>
          </p>
        </>
      )}
    </div>
  )
}
