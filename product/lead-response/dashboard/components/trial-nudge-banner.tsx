'use client'

import { useState, useEffect } from 'react'
import { X, Zap, AlertTriangle } from 'lucide-react'

interface TrialNudgeData {
  shouldShow: boolean
  isTrial?: boolean
  isPilot?: boolean
  isExpired?: boolean
  daysRemaining?: number
  checkoutUrl?: string
}

/**
 * TrialNudgeBanner
 *
 * An in-app banner that prompts trial/pilot agents to upgrade when their
 * trial is expiring (<=7 days remaining) or has already expired.
 *
 * - Fetches state from /api/trial/nudge on mount
 * - Dismissal persisted server-side via /api/trial/dismiss-nudge
 * - Re-appears after expiry regardless of dismissal
 * - Directs user to Stripe checkout (Pro plan) or /pricing as fallback
 */
export function TrialNudgeBanner() {
  const [nudge, setNudge] = useState<TrialNudgeData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchNudge = async () => {
      try {
        const res = await fetch('/api/trial/nudge')
        if (!res.ok) return
        const data: TrialNudgeData = await res.json()
        setNudge(data)
      } catch {
        // Silent fail — nudge is non-critical
      }
    }
    fetchNudge()
  }, [])

  const handleDismiss = async () => {
    setDismissed(true)
    try {
      await fetch('/api/trial/dismiss-nudge', { method: 'POST' })
    } catch {
      // Silent fail
    }
  }

  const handleUpgradeClick = () => {
    if (nudge?.checkoutUrl) {
      window.location.href = nudge.checkoutUrl
    }
  }

  if (!nudge?.shouldShow || dismissed) return null

  const { isExpired, daysRemaining = 0 } = nudge

  // Expired banner: urgent red, no dismiss
  if (isExpired) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="trial-nudge-banner"
        className="w-full bg-red-600 text-white px-4 py-3"
      >
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Your trial has expired. Upgrade now to keep responding to leads automatically.
            </span>
          </div>
          <button
            onClick={handleUpgradeClick}
            data-testid="trial-nudge-upgrade-btn"
            className="shrink-0 bg-white text-red-600 hover:bg-red-50 font-semibold text-sm px-4 py-1.5 rounded-md transition-colors"
          >
            Upgrade to Pro — $149/mo
          </button>
        </div>
      </div>
    )
  }

  // Expiring soon banner: amber warning with dismiss
  const urgencyLabel =
    daysRemaining === 0 ? 'today' : daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="trial-nudge-banner"
      className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3"
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            <span className="font-semibold">Your trial expires {urgencyLabel}.</span>{' '}
            Upgrade now to keep your AI lead response running 24/7.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUpgradeClick}
            data-testid="trial-nudge-upgrade-btn"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-1.5 rounded-md transition-colors"
          >
            Upgrade to Pro — $149/mo
          </button>
          <button
            onClick={handleDismiss}
            data-testid="trial-nudge-dismiss-btn"
            aria-label="Dismiss trial expiry notice"
            className="text-amber-700 hover:text-amber-900 transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
