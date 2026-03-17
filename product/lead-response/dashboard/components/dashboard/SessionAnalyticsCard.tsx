'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface PilotEngagementMetrics {
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

interface PilotUsageResponse {
  pilots: PilotEngagementMetrics[]
  generatedAt: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a timestamp to a human-readable string.
 * Returns "—" when timestamp is null.
 */
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format page path to a human-readable label.
 * E.g., "/dashboard/conversations" → "Conversations"
 */
function formatPageLabel(page: string | null): string {
  if (!page) return '—'
  const label = page.split('/').pop() || page
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Get inactivity status color and icon.
 * Green: active (less than 72h)
 * Amber: inactive soon (48–72h)
 * Red: at-risk (more than 72h)
 */
function getInactivityColor(inactiveHours: number | null): {
  color: string
  bgColor: string
  icon: React.ReactNode
  label: string
} {
  if (inactiveHours === null) {
    return {
      color: 'text-slate-400 dark:text-slate-500',
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      icon: <Clock size={16} />,
      label: 'No sessions',
    }
  }

  if (inactiveHours > 72) {
    return {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: <AlertTriangle size={16} />,
      label: `${inactiveHours}h inactive`,
    }
  }

  if (inactiveHours > 48) {
    return {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      icon: <Clock size={16} />,
      label: `${inactiveHours}h inactive`,
    }
  }

  return {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: <CheckCircle2 size={16} />,
    label: 'Active',
  }
}

// ============================================
// MAIN COMPONENT: SessionAnalyticsCard
// ============================================

/**
 * Session Analytics Card — Displays pilot engagement metrics.
 *
 * Shows:
 * - A table of all pilot agents
 * - For each pilot: name, email, last login, sessions (7d), top page, inactivity status
 * - Highlights at-risk agents (>72h inactive)
 *
 * Data source: /api/internal/pilot-usage (requires SUPABASE_SERVICE_ROLE_KEY)
 */
export function SessionAnalyticsCard() {
  const [data, setData] = useState<PilotUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPilotUsage() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/analytics/pilot-usage', {
          cache: 'no-store',
        })

        if (res.status === 401) {
          setError('Unauthorized. Admin access required.')
          setLoading(false)
          return
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `HTTP ${res.status}`)
        }

        const json: PilotUsageResponse = await res.json()
        setData(json)
      } catch (err) {
        console.error('[SessionAnalyticsCard] fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load engagement metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchPilotUsage()
  }, [])

  // Unauthorized state — hidden for non-admin users
  if (error === 'Unauthorized. Admin access required.') {
    return null
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="space-y-3">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40 animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || data.pilots.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No pilot agents yet</p>
        </div>
      </div>
    )
  }

  const atRiskPilots = data.pilots.filter((p) => p.atRisk)

  return (
    <div className="space-y-4">
      {/* Header with title and alert summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Pilot Engagement
          </h2>
        </div>
        {atRiskPilots.length > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium">
            <AlertTriangle size={12} />
            {atRiskPilots.length} at-risk
          </div>
        )}
      </div>

      {/* At-risk pilots alert */}
      {atRiskPilots.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
            ⚠️ {atRiskPilots.length} pilot{atRiskPilots.length !== 1 ? 's' : ''} inactive for more than 72 hours
          </p>
          <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
            {atRiskPilots.map((pilot) => (
              <li key={pilot.agentId}>
                {pilot.name} — {pilot.inactiveHours}h inactive
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Table: Pilot engagement metrics */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                Agent
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                Last Login
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                Sessions (7d)
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                Top Feature
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.pilots.map((pilot) => {
              const inactivityStatus = getInactivityColor(pilot.inactiveHours)
              return (
                <tr
                  key={pilot.agentId}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    pilot.atRisk ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{pilot.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{pilot.planTier}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 break-all">
                    {pilot.email}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatTimestamp(pilot.lastLogin)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium text-xs">
                      {pilot.sessionsLast7d}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {formatPageLabel(pilot.topPage)}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${inactivityStatus.bgColor} ${inactivityStatus.color}`}
                    >
                      {inactivityStatus.icon}
                      {inactivityStatus.label}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: Data freshness */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Generated at {new Date(data.generatedAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })}
      </div>
    </div>
  )
}
