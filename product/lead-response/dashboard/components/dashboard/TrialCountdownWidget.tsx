'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Sparkles, Zap, Loader2 } from 'lucide-react'

interface TrialStatus {
  isTrial: boolean
  isPilot: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  daysRemaining: number
  isExpired: boolean
  onboardingCompleted: boolean
  onboardingStep: string | null
}

async function initiateUpgradeCheckout(): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/stripe/upgrade-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
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

/**
 * TrialCountdownWidget — compact countdown timer with urgency states.
 *
 * Urgency states:
 *   green  — > 7 days remaining (safe)
 *   yellow — 3–7 days remaining (warning)
 *   red    — < 3 days remaining or expired (critical)
 *
 * Always shows a prominent Upgrade CTA button.
 */
export function TrialCountdownWidget() {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrialStatus() {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch trial status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrialStatus()

    // Refresh hourly so the countdown stays current without a page reload
    const interval = setInterval(fetchTrialStatus, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleUpgrade() {
    setCheckoutLoading(true)
    setCheckoutError(null)
    const result = await initiateUpgradeCheckout()
    if (result.error) {
      setCheckoutError(result.error)
      setCheckoutLoading(false)
      return
    }
    if (result.url) {
      window.location.href = result.url
    }
  }

  if (loading || !status) return null

  // Only render for trial / pilot users
  if (!status.isTrial && !status.isPilot) return null

  const days = status.daysRemaining
  const isExpired = status.isExpired

  // Determine urgency level
  const urgency: 'green' | 'yellow' | 'red' =
    isExpired || days < 3 ? 'red' : days <= 7 ? 'yellow' : 'green'

  const styles = {
    green: {
      wrapper: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      heading: 'text-green-900 dark:text-green-100',
      badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      body: 'text-green-800 dark:text-green-200',
      cta: 'bg-green-600 hover:bg-green-700',
    },
    yellow: {
      wrapper: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      heading: 'text-yellow-900 dark:text-yellow-100',
      badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      body: 'text-yellow-800 dark:text-yellow-200',
      cta: 'bg-yellow-600 hover:bg-yellow-700',
    },
    red: {
      wrapper: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      heading: 'text-red-900 dark:text-red-100',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      body: 'text-red-800 dark:text-red-200',
      cta: 'bg-red-600 hover:bg-red-700',
    },
  }

  const s = styles[urgency]

  const Icon =
    urgency === 'red' ? AlertTriangle : urgency === 'yellow' ? Clock : Sparkles

  const label = isExpired
    ? 'Trial expired'
    : `${days} ${days === 1 ? 'day' : 'days'} left`

  const message = isExpired
    ? 'Your trial has ended. Upgrade now to keep your AI lead response active.'
    : urgency === 'red'
    ? `Only ${days} ${days === 1 ? 'day' : 'days'} left on your trial. Upgrade today — plans start at $149/mo.`
    : urgency === 'yellow'
    ? `${days} days remaining on your trial. Upgrade soon to avoid any interruption. Plans start at $149/mo.`
    : `Enjoying your free trial? Upgrade anytime. Plans start at $149/mo.`

  return (
    <div
      data-testid="trial-countdown-widget"
      data-urgency={urgency}
      className={`rounded-xl border p-4 mb-6 ${s.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.icon}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={`font-semibold text-sm ${s.heading}`}>
              Trial Countdown
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
              {label}
            </span>
          </div>

          <p className={`text-xs mt-1 leading-relaxed ${s.body}`}>
            {message}
          </p>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {/* Primary Upgrade CTA — always visible */}
            <button
              data-testid="upgrade-cta-button"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${s.cta}`}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Upgrade to Pro
                </>
              )}
            </button>

            <a
              href="/pricing"
              data-testid="learn-more-link"
              className={`text-xs font-medium underline underline-offset-2 ${s.body}`}
            >
              See all plans
            </a>
          </div>

          {checkoutError && (
            <p className="text-xs mt-2 text-red-600 dark:text-red-400">
              {checkoutError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
