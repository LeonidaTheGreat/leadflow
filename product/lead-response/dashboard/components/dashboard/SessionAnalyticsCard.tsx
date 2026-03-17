'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, Clock, Users, Eye } from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface PilotMetrics {
  agentId: string
  name: string
  email: string
  planTier: string
  lastLogin: string | null
  sessionsLast7d: number
  topPage: string | null
  inactiveHours: number | null
  atRisk: boolean
}

interface PilotUsageData {
  pilots: PilotMetrics[]
  generatedAt: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a timestamp into a readable relative time string.
 * E.g., "2 hours ago", "Yesterday", "3 days ago"
 */
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '—'
  
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 2) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Determine the display color for inactivity status.
 * - Green (<24h): engaged
 * - Yellow (24-72h): at risk
 * - Red (>72h): high risk
 */
function inactivityColor(inactiveHours: number | null): string {
  if (inactiveHours === null) return 'text-slate-500 dark:text-slate-400'
  if (inactiveHours < 24) return 'text-emerald-600 dark:text-emerald-400'
  if (inactiveHours < 72) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Format page path to a user-friendly label.
 */
function formatPageLabel(page: string | null): string {
  if (!page) return '—'
  const segments = page.split('/').filter(Boolean)
  if (segments.length === 0) return '/'
  return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' › ')
}

/**
 * Format inactivity hours into a readable status string.
 */
function formatInactivityStatus(hours: number | null): string {
  if (hours === null) return 'No activity'
  if (hours < 1) return 'Active now'
  if (hours < 24) return `${Math.floor(hours)}h inactive`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} inactive`
}

// ============================================
// MAIN COMPONENT: SessionAnalyticsCard
// ============================================

/**
 * Session Analytics dashboard card for pilot agent engagement metrics.
 * 
 * Displays a table of all pilots with:
 * - Last login timestamp
 * - Sessions in last 7 days
 * - Most-visited dashboard page
 * - Inactivity status (with visual alerts for at-risk pilots)
 * 
 * PRD: PRD-SESSION-ANALYTICS-PILOT (US-1: Stojan wants a usage overview)
 */
export function SessionAnalyticsCard() {
  const [data, setData] = useState<PilotUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPilotUsage = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/analytics/pilot-usage', {
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }

      const data: PilotUsageData = await res.json()
      setData(data)
    } catch (err) {
      console.error('[SessionAnalyticsCard] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load pilot metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPilotUsage()
  }, [fetchPilotUsage])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPilotUsage()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const pilots = data?.pilots || []
  const atRiskCount = pilots.filter((p) => p.atRisk).length
  const totalPilots = pilots.length

  return (
    <div className="space-y-4">
      {/* Header with title and refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Pilot Engagement Metrics
          </h2>
          {atRiskCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle size={12} />
              {atRiskCount} at risk
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {!error && totalPilots === 0 && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-6 text-center text-slate-600 dark:text-slate-400">
          <Users size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No pilot agents yet</p>
          <p className="text-xs mt-1">Session data will appear as pilots sign up and use the dashboard</p>
        </div>
      )}

      {/* Pilots table */}
      {!error && totalPilots > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Last Login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Sessions (7d)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Top Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pilots.map((pilot) => (
                  <tr
                    key={pilot.agentId}
                    className={`${
                      pilot.atRisk
                        ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    } transition-colors`}
                  >
                    {/* Agent Name + Email */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{pilot.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{pilot.email}</p>
                      </div>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {formatRelativeTime(pilot.lastLogin)}
                    </td>

                    {/* Sessions Last 7 Days */}
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                        {pilot.sessionsLast7d}
                      </span>
                    </td>

                    {/* Top Feature */}
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={14} className="text-slate-400" />
                        {formatPageLabel(pilot.topPage)}
                      </span>
                    </td>

                    {/* Inactivity Status */}
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={`inline-flex items-center gap-1 ${inactivityColor(pilot.inactiveHours)}`}>
                        <Clock size={14} />
                        {formatInactivityStatus(pilot.inactiveHours)}
                      </span>
                      {pilot.atRisk && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold">
                          ⚠️ At Risk (>72h)
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer with metadata */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            Data refreshed at {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      )}
    </div>
  )
}
