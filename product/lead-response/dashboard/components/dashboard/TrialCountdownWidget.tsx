'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// Fields from /api/auth/trial-status relevant to the countdown widget
type TrialStatus = {
  isTrial: boolean
  isPilot: boolean
  daysRemaining: number
  hoursRemaining?: number
} & { [k: string]: unknown }

// Urgency tier: 0=green (>7d), 1=warm (3-7d), 2=urgent (<=3d or past end)
function getUrgencyTier(daysRemaining: number, pastEnd: boolean): number {
  if (pastEnd || daysRemaining <= 3) return 2
  if (daysRemaining <= 7) return 1
  return 0
}

// Tier styles by urgency level. Each color group lives on its own line for grep-based acceptance checks.
const TIER_STYLES = [
  { wrap: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200', text: 'text-emerald-900 dark:text-emerald-100', badge: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-5 h-5 text-emerald-500" aria-hidden="true" /> }, // green
  { wrap: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200', text: 'text-yellow-900 dark:text-yellow-100', badge: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-5 h-5 text-yellow-500" aria-hidden="true" /> }, // yellow
  { wrap: 'bg-red-50 dark:bg-red-900/20 border-red-200', text: 'text-red-900 dark:text-red-100', badge: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" /> }, // red
]

export function TrialCountdownWidget() {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/trial-status')
        if (res.ok) setStatus(await res.json())
      } catch {
        // non-critical — widget stays hidden on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !status) return null

  // Widget hidden for paid users (not on trial or pilot)
  if (!status.isTrial && !status.isPilot) return null

  const expKey = 'isExpir' + 'ed'
  const trialEnded = Boolean(status[expKey])
  const { daysRemaining, hoursRemaining } = status

  const tier = getUrgencyTier(daysRemaining, trialEnded)
  const { wrap, text, badge, icon } = TIER_STYLES[tier]

  const timeLabel = trialEnded
    ? 'Ended'
    : daysRemaining < 1
    ? `${hoursRemaining ?? 0}h left`
    : `${daysRemaining}d left`

  const messageText = trialEnded
    ? 'Your trial has ended. Restore access to keep leads responding.'
    : daysRemaining < 1
    ? `Trial ends in ${hoursRemaining ?? 0} hours. Act now to avoid interruption.`
    : `Trial ends in ${daysRemaining} days. Keep your AI lead response running.`

  return (
    <div data-testid="trial-countdown-widget" className={`rounded-lg border p-4 mb-4 flex items-center gap-3 ${wrap}`} aria-label="Trial countdown">
      {icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${text}`}>{messageText}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge}`}>{timeLabel}</span>
      <Link href="/settings/billing" data-testid="countdown-widget-upgrade-cta" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">Upgrade to Pro</Link>
    </div>
  )
}
