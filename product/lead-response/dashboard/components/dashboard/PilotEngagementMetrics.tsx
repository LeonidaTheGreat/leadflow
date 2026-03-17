'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, LogIn, TrendingUp, Users } from 'lucide-react'

interface PilotMetric {
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

export function PilotEngagementMetrics() {
  const [pilots, setPilots] = useState<PilotMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchPilotData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPilotData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPilotData() {
    try {
      setError(null)
      setLoading(true)

      // Get the service role key from environment
      const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

      const response = await fetch('/api/internal/pilot-usage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Unauthorized: Service role key required')
        } else {
          setError(`Failed to fetch pilot data: ${response.statusText}`)
        }
        return
      }

      const data = await response.json()
      setPilots(data.pilots || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching pilot engagement data:', err)
      setError('Failed to load pilot engagement metrics')
    } finally {
      setLoading(false)
    }
  }

  if (error && pilots.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Unable to Load Pilot Metrics</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">{error}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              Note: Pilot engagement metrics require SUPABASE_SERVICE_ROLE_KEY. Access via API: <br />
              <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded text-amber-900 dark:text-amber-100">
                curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" /api/internal/pilot-usage
              </code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pilot Engagement</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time monitoring of pilot agent activity and engagement
          </p>
        </div>

        {lastUpdated && (
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Last updated</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {pilots.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            title="Total Pilots"
            value={pilots.length}
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Active This Week"
            value={pilots.filter((p) => p.sessionsLast7d > 0).length}
            color="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            title="At Risk"
            value={pilots.filter((p) => p.atRisk).length}
            color="bg-amber-50 dark:bg-amber-900/20"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            title="Sessions (7d)"
            value={pilots.reduce((sum, p) => sum + p.sessionsLast7d, 0)}
            color="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>
      )}

      {/* Loading State */}
      {loading && pilots.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Pilots List */}
      {!loading && pilots.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pilots.map((pilot) => (
            <PilotCard key={pilot.agentId} pilot={pilot} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && pilots.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No pilot agents yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Pilots will appear here once they join
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Monitoring Insights:</strong> &quot;At Risk&quot; pilots are inactive for {'>'}72 hours.
          Sessions are counted from the past 7 days. Top page shows most frequently visited dashboard page.
        </p>
      </div>
    </div>
  )
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode
  title: string
  value: number
  color: string
}) {
  return (
    <div className={`${color} border border-slate-200 dark:border-slate-800 rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className="text-slate-400 dark:text-slate-600">{icon}</div>
      </div>
    </div>
  )
}

function PilotCard({ pilot }: { pilot: PilotMetric }) {
  const lastLoginDate = pilot.lastLogin ? new Date(pilot.lastLogin) : null
  const daysAgo = lastLoginDate ? Math.floor((Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div
      className={`rounded-lg border p-6 transition-all ${
        pilot.atRisk
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{pilot.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{pilot.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {pilot.atRisk && (
            <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs font-semibold px-3 py-1 rounded-full">
              At Risk
            </span>
          )}
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-1 rounded-full">
            {pilot.planTier}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <MetricItem
          icon={<LogIn className="w-4 h-4" />}
          label="Last Login"
          value={
            lastLoginDate
              ? daysAgo === 0
                ? 'Today'
                : daysAgo === 1
                  ? 'Yesterday'
                  : `${daysAgo}d ago`
              : 'Never'
          }
        />
        <MetricItem
          icon={<TrendingUp className="w-4 h-4" />}
          label="Sessions (7d)"
          value={pilot.sessionsLast7d}
        />
        {pilot.topPage && (
          <MetricItem icon={<Users className="w-4 h-4" />} label="Top Page" value={pilot.topPage} />
        )}
        {pilot.inactiveHours !== null && (
          <MetricItem
            icon={<Clock className="w-4 h-4" />}
            label="Inactive"
            value={pilot.inactiveHours < 24 ? `${pilot.inactiveHours}h` : `${Math.floor(pilot.inactiveHours / 24)}d`}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${pilot.sessionsLast7d > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {pilot.sessionsLast7d > 0 ? '✓ Active' : '— Inactive'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">ID: {pilot.agentId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  )
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 dark:text-slate-600 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}
