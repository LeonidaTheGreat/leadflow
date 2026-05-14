'use client'

import { useEffect, useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'

interface TrialApiResponse {
  isTrial: boolean
  isPilot: boolean
  daysRemaining: number
  // note: trial end is derived from daysRemaining <= 0
  [key: string]: unknown
}

// 0 = normal (green), 1 = warning, 2 = critical
type UrgencyCode = 0 | 1 | 2

// All Tailwind classes for warning state on one line
const WARNING_CLASSES = { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-900 dark:text-yellow-100' }
// All Tailwind classes for critical state on one line
const CRITICAL_CLASSES = { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-100' }
const NORMAL_CLASSES = { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100' }

function computeUrgency(days: number, trialEnded: boolean): UrgencyCode {
  if (trialEnded || days <= 2) return 2
  if (days <= 7) return 1
  return 0
}

export function TrialCountdownWidget() {
  const [trial, setTrial] = useState<TrialApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/trial-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setTrial(data) })
      .catch((err) => console.error('Failed to load trial status:', err))
      .finally(() => setLoading(false))
  }, [])

  async function handleCheckout() {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/stripe/upgrade-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCheckoutError(data.error || 'Something went wrong. Please try again.')
        setCheckoutLoading(false)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setCheckoutError('Network error. Please try again.')
      setCheckoutLoading(false)
    }
  }

  if (loading || !trial) return null
  if (!trial.isTrial && !trial.isPilot) return null

  const trialEnded = trial.daysRemaining <= 0
  const urgency: UrgencyCode = computeUrgency(trial.daysRemaining, trialEnded)
  const styles = urgency === 2 ? CRITICAL_CLASSES : urgency === 1 ? WARNING_CLASSES : NORMAL_CLASSES
  const daysLabel = trial.daysRemaining === 1 ? 'day' : 'days'
  const statusText = trialEnded ? 'Trial has ended — keep your AI lead response running' : `${trial.daysRemaining} ${daysLabel} left in your free trial`

  return (
    <div data-testid="trial-countdown-widget" data-urgency={urgency} className={`rounded-lg border p-4 mb-6 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 flex-shrink-0 ${styles.text}`} />
          <span className={`text-sm font-semibold ${styles.text}`}>{statusText}</span>
        </div>
        <button
          data-testid="trial-upgrade-cta"
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {checkoutLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : urgency > 0 ? (
            'Upgrade Now'
          ) : (
            'View Plans'
          )}
        </button>
      </div>
      {checkoutError && <p className="text-xs mt-2 text-rose-600 dark:text-rose-400">{checkoutError}</p>}
    </div>
  )
}
