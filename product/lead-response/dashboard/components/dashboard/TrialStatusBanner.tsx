'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Sparkles, Loader2, ExternalLink } from 'lucide-react'

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

async function initiateUpgradeCheckout(plan: string = 'pro'): Promise<{ url?: string; error?: string }> {
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

export function TrialStatusBanner() {
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
  }, [])

  async function handleUpgrade() {
    setCheckoutLoading(true)
    setCheckoutError(null)

    // Track upgrade click event
    await trackEvent('trial_upgrade_clicked', {
      plan: 'pro',
      source: 'trial_status_banner',
      days_remaining: status?.daysRemaining,
    })

    const result = await initiateUpgradeCheckout('pro')
    if (result.error) {
      setCheckoutError(result.error)
      setCheckoutLoading(false)
      return
    }
    if (result.url) {
      // Track checkout started event
      await trackEvent('trial_checkout_started', {
        plan: 'pro',
        source: 'trial_status_banner',
        days_remaining: status?.daysRemaining,
      })
      window.location.href = result.url
    }
    // Keep loading state active while browser navigates to Stripe
  }

  if (loading || !status) {
    return null
  }

  // Don't show banner for paid plans
  if (!status.isTrial && !status.isPilot) {
    return null
  }

  // Show expired state
  if (status.isExpired) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              Your {status.isTrial ? 'trial' : 'pilot'} has expired
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              Your {status.isTrial ? '14-day trial' : '60-day pilot'} has ended. Upgrade now to keep your AI lead response active.
              Pro plan — <strong>$149/mo</strong>.
            </p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  'Upgrade Now →'
                )}
              </button>
              <a
                href="/dashboard/pricing"
                className="text-sm text-red-700 dark:text-red-300 hover:underline flex items-center gap-1"
              >
                See all plans <ExternalLink className="w-3 h-3" />
              </a>
              {checkoutError && (
                <p className="text-xs text-red-700 dark:text-red-300 w-full mt-1">{checkoutError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const daysRemaining = status.daysRemaining
  const isTrial = status.isTrial

  // Urgency levels per PRD: red <=2 days, amber <=5 days, green otherwise
  const isRedUrgency = daysRemaining <= 2
  const isAmberUrgency = daysRemaining <= 5
  const showUpgradeCta = daysRemaining <= (14 - 8 + 1) || daysRemaining <= 6 // day 8+ means <=6 days left in 14-day trial

  // Color scheme based on urgency
  const colorScheme = isRedUrgency
    ? {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        title: 'text-red-900 dark:text-red-100',
        body: 'text-red-800 dark:text-red-200',
        badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
        link: 'text-red-700 dark:text-red-300',
        button: 'bg-red-600 hover:bg-red-700',
      }
    : isAmberUrgency
    ? {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        title: 'text-amber-900 dark:text-amber-100',
        body: 'text-amber-800 dark:text-amber-200',
        badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
        link: 'text-amber-700 dark:text-amber-300',
        button: 'bg-amber-600 hover:bg-amber-700',
      }
    : {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: 'text-emerald-600 dark:text-emerald-400',
        title: 'text-emerald-900 dark:text-emerald-100',
        body: 'text-emerald-800 dark:text-emerald-200',
        badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
        link: 'text-emerald-700 dark:text-emerald-300',
        button: 'bg-emerald-600 hover:bg-emerald-700',
      }

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        {isAmberUrgency || isRedUrgency ? (
          <Clock className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
        ) : (
          <Sparkles className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={`font-semibold ${colorScheme.title}`}>
              {isTrial ? 'You\'re on a free trial' : 'You\'re on a free pilot'}
            </h3>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${colorScheme.badge}`}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
          </div>
          <p className={`text-sm mt-1 ${colorScheme.body}`}>
            {isAmberUrgency || isRedUrgency
              ? `Your ${isTrial ? 'trial' : 'pilot'} ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Upgrade to keep your AI lead response running. Pro plan — $149/mo.`
              : `Enjoy ${isTrial ? '14 days' : '60 days'} of free AI lead response. Plans start at $49/mo. Pro plan recommended — $149/mo.`
            }
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {showUpgradeCta && (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 ${colorScheme.button} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors`}
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  'Upgrade Now →'
                )}
              </button>
            )}
            <a
              href="/dashboard/pricing"
              className={`text-sm ${colorScheme.link} hover:underline flex items-center gap-1`}
            >
              See all plans <ExternalLink className="w-3 h-3" />
            </a>
            {checkoutError && (
              <p className={`text-xs ${colorScheme.link} w-full mt-1`}>{checkoutError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
