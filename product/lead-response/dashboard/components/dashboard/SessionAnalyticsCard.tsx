'use client'

import { useEffect, useState } from 'react'
import { Clock, Calendar, AlertCircle, TrendingUp } from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface PilotData {
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
  pilots: PilotData[]
  generatedAt: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Format last login time relative to now.
 */
function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return 'Never logged in'
  
  const now = new Date()
  const loginTime = new Date(lastLogin)
  const hours = Math.floor((now.getTime() - loginTime.getTime()) / (1000 * 60 * 60))
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1w ago'
  if (weeks < 4) return `${weeks}w ago`
  
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Format page URL to a human-readable label.
 */
function formatPageLabel(page: string | null): string {
  if (!page) return '—'
  
  // Simple mapping of common paths to labels
  const labels: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/conversations': 'Conversations',
    '/dashboard/leads': 'Leads',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/settings': 'Settings',
    '/onboarding': 'Onboarding',
    '/': 'Home',
  }
  
  return labels[page] || page
}

/**
 * Risk status color coding:
 *   atRisk: true → red
 *   inactiveHours > 48 → amber
 *   otherwise → green
 */
function getStatusColor(pilot: PilotData): string {
  if (pilot.atRisk) return 'text-red-600 dark:text-red-400'
  if (pilot.inactiveHours !== null && pilot.inactiveHours > 48) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function getStatusLabel(pilot: PilotData): string {
  if (pilot.atRisk) return 'At Risk (>72h inactive)'
  if (pilot.inactiveHours !== null && pilot.inactiveHours > 48) return 'Low Activity (>48h)'
  return 'Active'
}

// ============================================
// SUB-COMPONENT: Pilot Card
// ============================================

interface PilotCardProps {
  pilot: PilotData
}

function PilotCard({ pilot }: PilotCardProps) {
  const statusColor = getStatusColor(pilot)
  const statusLabel = getStatusLabel(pilot)
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{pilot.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{pilot.email}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          pilot.atRisk 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            : pilot.inactiveHours !== null && pilot.inactiveHours > 48
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        }`}>
          {statusLabel}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Last Login</p>
          <p className="text-slate-700 dark:text-slate-300">{formatLastLogin(pilot.lastLogin)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Sessions (7d)</p>
          <p className="text-slate-700 dark:text-slate-300">{pilot.sessionsLast7d}</p>
        </div>
        <div className="col-span-2">
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Top Page</p>
          <p className="text-slate-700 dark:text-slate-300">{formatPageLabel(pilot.topPage)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT: SessionAnalyticsCard
// ============================================

/**
 * Session Analytics Card — displays pilot agent engagement metrics.
 * 
 * Fetches data from /api/dashboard/session-analytics (wrapper for /api/internal/pilot-usage).
 * Displays:
 * - Last login time per pilot
 * - Sessions in last 7 days
 * - Top page visited
 * - Inactivity status (at risk if > 72h)
 * 
 * Auth: Requires authenticated session (any logged-in user).
 */
export function SessionAnalyticsCard() {
  const [pilots, setPilots] = useState<PilotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetchSessionData()
  }, [])

  async function fetchSessionData() {
    setLoading(true)
    setError(null)
    try {
      // Call the dashboard wrapper API (which handles service role authentication server-side)
      const res = await fetch('/api/dashboard/session-analytics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 401) {
          throw new Error('Unauthorized: Unable to access pilot usage data')
        }
        throw new Error(body?.error || `HTTP ${res.status}`)
      }

      const data: PilotUsageResponse = await res.json()
      setPilots(data.pilots || [])
      setLastUpdated(data.generatedAt)
    } catch (err) {
      console.error('[SessionAnalyticsCard] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session analytics')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Pilot Engagement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && pilots.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Pilot Engagement
        </h2>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Unable to Load Session Analytics</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (pilots.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Pilot Engagement
        </h2>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-4 py-6 text-center">
          <TrendingUp className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No pilot agents yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Session analytics will appear once pilots sign up</p>
        </div>
      </div>
    )
  }

  // Render pilots
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Pilot Engagement
        </h2>
        <button
          onClick={fetchSessionData}
          disabled={loading}
          className="text-xs px-2 py-1 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {lastUpdated && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pilots.map((pilot) => (
          <PilotCard key={pilot.agentId} pilot={pilot} />
        ))}
      </div>
    </div>
  )
}
