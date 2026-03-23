'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Reply, CalendarCheck } from 'lucide-react'

// ============================================
// TYPES
// ============================================

type TimeWindow = '7d' | '30d' | 'all'

interface SmsStats {
  window: TimeWindow
  deliveryRate: number | null
  replyRate: number | null
  bookingConversion: number | null
  messagesSent: number
  messagesDelivered: number
  leadsMessaged: number
  leadsReplied: number
  bookingsMade: number
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a rate (0–1) as a percentage string.
 * Returns "—" when rate is null (no data).
 */
function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

/**
 * Delivery rate colour coding:
 *   ≥ 80% → green
 *   60–79% → amber
 *   < 60%  → red
 *   null   → default
 */
function deliveryRateColor(rate: number | null): string {
  if (rate === null) return 'text-slate-400 dark:text-slate-500'
  if (rate >= 0.8) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 0.6) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/** Default colour for reply and booking rates (no threshold in v1). */
const defaultRateColor = 'text-blue-600 dark:text-blue-400'

// ============================================
// SUB-COMPONENT: Stat Card
// ============================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  valueColor: string
  tooltip?: string
  loading: boolean
}

function StatCard({ icon, label, value, hint, valueColor, tooltip, loading }: StatCardProps) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex flex-col gap-1"
      title={tooltip}
    >
      {loading ? (
        <>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse mb-1" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-28 animate-pulse mt-1" />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-4 h-4 flex-shrink-0">{icon}</span>
            <p className="text-sm font-medium">{label}</p>
          </div>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
        </>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT: SmsAnalyticsCards
// ============================================

/**
 * SMS Analytics stat cards — Delivery Rate, Reply Rate, Booking Conversion.
 * Displays a time window selector that updates all three metrics together.
 *
 * PRD: SMS Analytics Dashboard — Delivery, Reply & Booking Conversion Tracking
 */
export function SmsAnalyticsCards() {
  const [window, setWindow] = useState<TimeWindow>('30d')
  const [stats, setStats] = useState<SmsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (win: TimeWindow) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics/sms-stats?window=${win}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const data: SmsStats = await res.json()
      setStats(data)
    } catch (err) {
      console.error('[SmsAnalyticsCards] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load SMS stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats(window)
  }, [window, fetchStats])

  const handleWindowChange = (win: TimeWindow) => {
    setWindow(win)
  }

  // Build display values
  const deliveryValue = formatRate(stats?.deliveryRate ?? null)
  const replyValue = formatRate(stats?.replyRate ?? null)
  const bookingValue = formatRate(stats?.bookingConversion ?? null)

  const deliveryHint =
    stats?.messagesSent
      ? `${stats.messagesSent} message${stats.messagesSent !== 1 ? 's' : ''} sent`
      : 'No messages sent yet'

  const replyHint =
    stats?.leadsMessaged
      ? `${stats.leadsReplied} of ${stats.leadsMessaged} leads replied`
      : 'No leads messaged yet'

  const bookingHint =
    stats?.leadsReplied
      ? `${stats.bookingsMade} of ${stats.leadsReplied} replied leads booked`
      : 'No replied leads yet'

  return (
    <div className="space-y-3">
      {/* Header row: title + window selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          SMS Performance
        </h2>

        {/* Segmented time window selector */}
        <div
          role="group"
          aria-label="Time window"
          className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden text-sm"
        >
          {(['7d', '30d', 'all'] as TimeWindow[]).map((win) => (
            <button
              key={win}
              onClick={() => handleWindowChange(win)}
              className={`px-3 py-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
                ${
                  window === win
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              aria-pressed={window === win}
            >
              {win === '7d' ? '7 days' : win === '30d' ? '30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Stat cards grid — responsive: 1 col → 3 col */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<MessageSquare size={16} />}
          label="Delivery Rate"
          value={loading ? '…' : deliveryValue}
          hint={loading ? '' : deliveryHint}
          valueColor={loading ? 'text-slate-400' : deliveryRateColor(stats?.deliveryRate ?? null)}
          tooltip="Percentage of outbound SMS successfully delivered by Twilio"
          loading={loading}
        />

        <StatCard
          icon={<Reply size={16} />}
          label="Reply Rate"
          value={loading ? '…' : replyValue}
          hint={loading ? '' : replyHint}
          valueColor={loading ? 'text-slate-400' : defaultRateColor}
          tooltip="Percentage of messaged leads who replied (opt-outs excluded)"
          loading={loading}
        />

        <StatCard
          icon={<CalendarCheck size={16} />}
          label="Booking Conversion"
          value={loading ? '…' : bookingValue}
          hint={loading ? '' : bookingHint}
          valueColor={loading ? 'text-slate-400' : defaultRateColor}
          tooltip="Of leads who replied to SMS, percentage who booked an appointment"
          loading={loading}
        />
      </div>
    </div>
  )
}
