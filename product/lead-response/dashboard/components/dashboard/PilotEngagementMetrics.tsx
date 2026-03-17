'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Users, Zap, Clock } from 'lucide-react'

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
  error?: string
}

export function PilotEngagementMetrics() {
  const [pilots, setPilots] = useState<PilotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceKey, setServiceKey] = useState<string>('')

  useEffect(() => {
    // Get the service key from environment or localStorage
    const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || localStorage.getItem('supabase_service_key') || ''
    setServiceKey(key)
  }, [])

  useEffect(() => {
    if (!serviceKey) {
      setError('Service key not configured. Use CLI: curl -H "Authorization: Bearer <key>" ...')
      setLoading(false)
      return
    }

    fetchPilotData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPilotData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [serviceKey])

  async function fetchPilotData() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/internal/pilot-usage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to fetch pilot data (${response.status})`)
      }

      const data: PilotUsageResponse = await response.json()
      setPilots(data.pilots || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pilot engagement data'
      setError(message)
      console.error('[PilotEngagementMetrics]', message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Pilot Metrics Unavailable</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{error}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded">
              curl -H "Authorization: Bearer YOUR_SERVICE_KEY" https://your-app.vercel.app/api/internal/pilot-usage
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (pilots.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pilot Engagement</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No pilot agents currently active. Metrics will appear once pilots start using the dashboard.
        </p>
      </div>
    )
  }

  const atRiskPilots = pilots.filter((p) => p.atRisk)

  return (
    <div className="space-y-6">
      {/* Pilot Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Active Pilots"
          value={pilots.length}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <SummaryCard
          icon={<Zap className="w-5 h-5" />}
          label="Total Sessions (7d)"
          value={pilots.reduce((sum, p) => sum + p.sessionsLast7d, 0)}
          color="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <SummaryCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="At Risk"
          value={atRiskPilots.length}
          subText={`${atRiskPilots.length > 0 ? '⚠️' : '✓'} ${atRiskPilots.length} inactive >72h`}
          color="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Risk Alert */}
      {atRiskPilots.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            Inactive Pilots Detected
          </h3>
          <div className="space-y-2">
            {atRiskPilots.map((pilot) => (
              <p key={pilot.agentId} className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{pilot.name}</strong> — inactive for {pilot.inactiveHours} hours
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Pilots Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pilot Engagement Details</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Email</th>
                <th className="px-6 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Sessions (7d)</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Top Page</th>
                <th className="px-6 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Inactive Hours</th>
                <th className="px-6 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {pilots.map((pilot) => (
                <tr key={pilot.agentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                    <div className="flex items-center gap-2">
                      {pilot.atRisk && (
                        <span className="w-2 h-2 rounded-full bg-red-500" title="At risk - inactive" />
                      )}
                      {pilot.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{pilot.email}</td>
                  <td className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">
                    {pilot.sessionsLast7d}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                    {pilot.topPage ? <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{pilot.topPage}</code> : '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-900 dark:text-white">
                    {pilot.inactiveHours !== null ? (
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {pilot.inactiveHours}h
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        pilot.atRisk
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {pilot.atRisk ? '⚠️ At Risk' : '✓ Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 CLI Access:</strong> Retrieve pilot metrics programmatically with your service role key:
        </p>
        <pre className="mt-2 text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
          {`curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \\
  https://your-app.vercel.app/api/internal/pilot-usage`}
        </pre>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  subText,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  subText?: string
  color: string
}) {
  return (
    <div className={`${color} border border-slate-200 dark:border-slate-800 rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
          {subText && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subText}</p>}
        </div>
        <div className="text-slate-400 dark:text-slate-600">{icon}</div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-24" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-6 h-64" />
    </div>
  )
}
