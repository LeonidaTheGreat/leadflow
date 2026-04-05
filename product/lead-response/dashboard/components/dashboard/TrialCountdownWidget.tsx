'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

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

type UrgencyLevel = 'green' | 'yellow' | 'red' | 'expired'

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
    // Keep loading state active while browser navigates to Stripe
  }

  if (loading || !status) {
    return null
  }

  // Don't show widget for paid plans
  if (!status.isTrial && !status.isPilot) {
    return null
  }

  // Determine urgency level
  const getUrgencyLevel = (s: TrialStatus): UrgencyLevel => {
    if (s.isExpired) return 'expired'
    if (s.daysRemaining <= 3) return 'red'
    if (s.daysRemaining <= 7) return 'yellow'
    return 'green'
  }

  // Calculate hours remaining when ≤ 1 day
  const getCountdownDisplay = (s: TrialStatus): string => {
    if (s.daysRemaining > 1) {
      return `${s.daysRemaining} ${s.daysRemaining === 1 ? 'day' : 'days'} remaining`
    }
    if (s.daysRemaining === 1) {
      return '1 day remaining'
    }
    if (s.trialEndsAt) {
      const hoursRemaining = Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60)))
      return `${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'} remaining`
    }
    return '0 hours remaining'
  }

  // Format expiry date as "May 15" (no year unless different year)
  const getExpiryLabel = (s: TrialStatus): string => {
    if (!s.trialEndsAt) return ''
    const expiryDate = new Date(s.trialEndsAt)
    const today = new Date()
    const sameYear = expiryDate.getFullYear() === today.getFullYear()

    return expiryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : '2-digit'
    })
  }

  const urgency = getUrgencyLevel(status)
  const countdownDisplay = getCountdownDisplay(status)
  const expiryLabel = getExpiryLabel(status)

  // Define styling based on urgency level
  const urgencyStyles = {
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-600 dark:text-emerald-400',
      label: 'text-emerald-900 dark:text-emerald-100',
      description: 'text-emerald-800 dark:text-emerald-200',
      button: 'bg-emerald-500 hover:bg-emerald-600',
      Icon: Sparkles,
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      label: 'text-yellow-900 dark:text-yellow-100',
      description: 'text-yellow-800 dark:text-yellow-200',
      button: 'bg-yellow-500 hover:bg-yellow-600',
      Icon: Clock,
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      label: 'text-red-900 dark:text-red-100',
      description: 'text-red-800 dark:text-red-200',
      button: 'bg-red-600 hover:bg-red-700',
      Icon: AlertTriangle,
    },
    expired: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-700 dark:text-red-400',
      label: 'text-red-900 dark:text-red-100',
      description: 'text-red-800 dark:text-red-200',
      button: 'bg-red-700 hover:bg-red-800',
      Icon: AlertTriangle,
    },
  }

  const styles = urgencyStyles[urgency]
  const IconComponent = styles.Icon

  // Get urgency label text
  function getUrgencyLabel(): string {
    if (urgency === 'expired') return 'Trial ended — restore access'
    if (urgency === 'red') return 'days left — upgrade now'
    if (urgency === 'yellow') return 'days left — ending soon'
    return 'days left'
  }

  // Get button label
  const getButtonLabel = (s: TrialStatus): string => {
    if (s.isTrial) {
      return 'Upgrade to Pro — $149/mo'
    }
    return 'Upgrade Plan'
  }

  return (
    <div className={`rounded-xl p-4 mb-6 border ${styles.bg} ${styles.border}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconComponent className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className={`font-semibold ${styles.label}`}>
                Trial
              </h3>
              <span className={`text-sm font-medium ${styles.label}`}>
                {urgency === 'expired' ? 'ended' : countdownDisplay}
              </span>
            </div>
            {expiryLabel && (
              <p className={`text-xs ${styles.description} mt-1`}>
                {urgency === 'expired' ? `Ended ${expiryLabel}` : `Expires ${expiryLabel}`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={checkoutLoading}
          className={`flex items-center justify-center gap-2 px-6 py-3 ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0`}
          data-testid="upgrade-button"
        >
          {checkoutLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            getButtonLabel(status)
          )}
        </button>
      </div>

      {checkoutError && (
        <p className={`text-xs ${styles.description} mt-3`}>{checkoutError}</p>
      )}
    </div>
  )
}
