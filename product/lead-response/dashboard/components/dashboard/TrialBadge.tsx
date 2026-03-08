'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'

interface TrialBadgeProps {
  trialEndsAt: string | null
  planTier: string | null
}

/**
 * Trial badge shown in the dashboard nav.
 * Renders only when plan_tier === 'trial'.
 * Turns red when ≤ 7 days remaining (AC-3).
 */
export function TrialBadge({ trialEndsAt, planTier }: TrialBadgeProps) {
  if (planTier !== 'trial' || !trialEndsAt) return null

  const now = Date.now()
  const endsAt = new Date(trialEndsAt).getTime()
  const msRemaining = endsAt - now
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  const isUrgent = daysRemaining <= 7

  return (
    <Link
      href="/settings/billing"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        isUrgent
          ? 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25'
          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
      }`}
      title={`Trial ends ${new Date(trialEndsAt).toLocaleDateString()}. Click to upgrade.`}
    >
      <Clock className="w-3 h-3" />
      Trial · {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
    </Link>
  )
}
