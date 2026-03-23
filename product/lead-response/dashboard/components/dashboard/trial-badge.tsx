'use client'

import Link from 'next/link'

interface TrialBadgeProps {
  trialEndsAt: string | null
  planTier: string | null
}

export default function TrialBadge({ trialEndsAt, planTier }: TrialBadgeProps) {
  if (planTier !== 'trial' || !trialEndsAt) return null

  const now = new Date()
  const endsAt = new Date(trialEndsAt)
  const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isUrgent = daysRemaining <= 7

  return (
    <Link
      href="/settings/billing"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        isUrgent
          ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
      }`}
      title="Click to upgrade"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-red-400' : 'bg-emerald-400'}`} />
      Trial · {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
    </Link>
  )
}
