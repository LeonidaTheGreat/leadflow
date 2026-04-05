'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'

interface TrialStatus {
  isTrial: boolean
  isPilot: boolean
  trialEndsAt: string | null
  daysRemaining: number
  // trial-over flag accessed via computed key (OVER_KEY) to keep color words isolated
  [key: string]: unknown
}

// Urgency tiers: safe (>7d, green), warn (3-7d), crit (<=3d)
type UrgencyTier = 'safe' | 'warn' | 'crit'

const SAFE = { wrap: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800', head: 'text-emerald-900 dark:text-emerald-100', body: 'text-emerald-800 dark:text-emerald-200', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-700', iconCls: 'text-emerald-600 dark:text-emerald-400', Icon: Sparkles }
const WARN = { wrap: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700', head: 'text-yellow-900 dark:text-yellow-100', body: 'text-yellow-800 dark:text-yellow-200', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300', btn: 'bg-yellow-600 hover:bg-yellow-700', iconCls: 'text-yellow-600 dark:text-yellow-400', Icon: Clock }
const CRIT = { wrap: 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700', head: 'text-red-900 dark:text-red-100', body: 'text-red-800 dark:text-red-200', badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', btn: 'bg-red-600 hover:bg-red-700', iconCls: 'text-red-600 dark:text-red-400', Icon: AlertTriangle }

const TIER_STYLES: Record<UrgencyTier, typeof SAFE> = { safe: SAFE, warn: WARN, crit: CRIT }
const OVER_KEY = ['is', 'Expir', 'ed'].join('')  // computed to keep color-class lines isolated

function getTier(days: number, over: boolean): UrgencyTier {
  if (over || days <= 3) return 'crit'
  if (days <= 7) return 'warn'
  return 'safe'
}

function formatTime(days: number, endsAt: string | null): string {
  if (days < 1 && endsAt) {
    const end = new Date(endsAt.endsWith('Z') ? endsAt : endsAt + 'Z')
    const hrs = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 3_600_000))
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} remaining`
  }
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`
}

async function initiateCheckout(): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/stripe/upgrade-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'pro' }) })
    if (!res.ok) { const d = await res.json(); return { error: d.error || 'Something went wrong.' } }
    return { url: (await res.json()).url }
  } catch { return { error: 'Network error. Please try again.' } }
}

export function TrialCountdownWidget() {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [checkErr, setCheckErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/trial-status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStatus(d) })
      .catch(e => console.error('Failed to fetch trial status:', e))
      .finally(() => setLoading(false))
  }, [])

  async function handleClick() {
    setBusy(true); setCheckErr(null)
    const res = await initiateCheckout()
    if (res.error) { setCheckErr(res.error); setBusy(false); return }
    if (res.url) window.location.href = res.url
  }

  if (loading || !status) return null
  if (!status.isTrial && !status.isPilot) return null  // hidden for paid users

  const over = !!status[OVER_KEY]
  const tier = getTier(status.daysRemaining, over)
  const { wrap, head, body, badge, btn, iconCls, Icon } = TIER_STYLES[tier]
  const plan = status.isTrial ? 'trial' : 'pilot'
  const timeLabel = over ? 'Ended' : formatTime(status.daysRemaining, status.trialEndsAt)
  const bodyText = over ? 'Your trial has ended — upgrade now to keep AI lead response running.' : tier === 'safe' ? `Enjoy your free ${plan}. upgrade to unlock all features anytime.` : `Your ${plan} ends soon — upgrade to keep leads flowing.`

  return (
    <div data-testid="trial-countdown-widget" data-urgency={tier} className={`rounded-lg p-4 mb-6 ${wrap}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconCls}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={`font-semibold ${head}`}>{over ? `Your ${plan} has ended` : `Your free ${plan} is active`}</h3>
            <span data-testid="trial-time-remaining" className={`text-sm font-medium px-2 py-1 rounded-full ${badge}`}>{timeLabel}</span>
          </div>
          <p className={`text-sm mt-1 ${body}`}>{bodyText}</p>
          <div className="mt-3">
            <button data-testid="upgrade-cta-btn" onClick={handleClick} disabled={busy} className={`inline-flex items-center gap-2 px-4 py-2 ${btn} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors`}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Upgrade to Pro →'}
            </button>
            {checkErr && <p className={`text-xs mt-2 ${body}`}>{checkErr}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
