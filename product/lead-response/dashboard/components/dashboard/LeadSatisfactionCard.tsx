'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown, Minus, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface SatisfactionStats {
  total: number
  positive: number
  negative: number
  neutral: number
  unclassified: number
  positivePct: number
  negativePct: number
  neutralPct: number
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
}

interface SatisfactionEvent {
  id: string
  lead_id: string
  rating: 'positive' | 'negative' | 'neutral' | 'unclassified'
  raw_reply: string | null
  created_at: string
}

interface LeadSatisfactionCardProps {
  agentId: string
}

const RATING_CONFIG = {
  positive: { label: 'Positive', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500' },
  negative: { label: 'Negative', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500' },
  neutral: { label: 'Neutral', icon: Minus, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800', bar: 'bg-slate-400' },
  unclassified: { label: 'Other', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-400' },
}

const TREND_CONFIG = {
  improving: { label: 'Improving', icon: TrendingUp, color: 'text-emerald-600' },
  declining: { label: 'Declining', icon: TrendingDown, color: 'text-red-600' },
  stable: { label: 'Stable', icon: Activity, color: 'text-slate-500' },
  insufficient_data: { label: 'Collecting data...', icon: Activity, color: 'text-slate-400' },
}

const MIN_RESPONSES_TO_SHOW = 5

export function LeadSatisfactionCard({ agentId }: LeadSatisfactionCardProps) {
  const [stats, setStats] = useState<SatisfactionStats | null>(null)
  const [events, setEvents] = useState<SatisfactionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!agentId) return
    fetchStats()
  }, [agentId])

  async function fetchStats() {
    try {
      setLoading(true)
      const res = await fetch(`/api/satisfaction/stats?agentId=${encodeURIComponent(agentId)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch(`/api/satisfaction/events?agentId=${encodeURIComponent(agentId)}&limit=20`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err: any) {
      console.error('Error fetching events:', err.message)
    }
  }

  function handleShowDetail() {
    setShowDetail(true)
    fetchEvents()
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return null // Silent fail — don't disrupt the dashboard
  }

  if (!stats || stats.total < MIN_RESPONSES_TO_SHOW) {
    return null // Card only shows when ≥5 responses collected
  }

  const trend = TREND_CONFIG[stats.trend]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Lead Satisfaction</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 30 days · {stats.total} responses</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${trend.color}`}>
          <trend.icon className="w-3.5 h-3.5" />
          {trend.label}
        </div>
      </div>

      {/* Stat bars */}
      <div className="px-5 py-4 space-y-3">
        {/* Positive */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <ThumbsUp className="w-3 h-3 text-emerald-500" />
              Positive
            </span>
            <span className="text-emerald-600 font-semibold">{stats.positivePct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.positivePct}%` }}
            />
          </div>
        </div>

        {/* Negative */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <ThumbsDown className="w-3 h-3 text-red-500" />
              Negative
            </span>
            <span className="text-red-600 font-semibold">{stats.negativePct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.negativePct}%` }}
            />
          </div>
        </div>

        {/* Neutral */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <Minus className="w-3 h-3 text-slate-400" />
              Neutral
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">{stats.neutralPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.neutralPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detail toggle */}
      <div className="px-5 pb-4">
        <button
          onClick={showDetail ? () => setShowDetail(false) : handleShowDetail}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
        >
          {showDetail ? 'Hide responses' : 'View individual responses'}
        </button>
      </div>

      {/* Event list */}
      {showDetail && events.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
          {events.map((ev) => {
            const cfg = RATING_CONFIG[ev.rating] || RATING_CONFIG.unclassified
            return (
              <div key={ev.id} className={`flex items-center gap-3 px-5 py-2.5 ${cfg.bg}`}>
                <cfg.icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {ev.raw_reply || <span className="italic text-slate-400">No reply</span>}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
