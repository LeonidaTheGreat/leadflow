'use client'

import { useEffect, useState } from 'react'

interface FunnelData {
  status?: {
    agents: any[]
    total: number
    by_step: Record<string, { count: number; step_name: string }>
    stuck_count: number
    stuck_agents: any[]
    error?: string
  }
  conversions?: any[]
}

export default function FunnelAdminPage() {
  const [data, setData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFunnelData() {
      try {
        const response = await fetch('/api/admin/funnel?view=all')
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch funnel data')
      } finally {
        setLoading(false)
      }
    }

    fetchFunnelData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Onboarding Funnel</h1>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Onboarding Funnel</h1>
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    )
  }

  const status = data?.status
  const conversions = data?.conversions

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Onboarding Funnel Admin</h1>
      <p className="mt-2 text-gray-600">Track where real agents drop off</p>

      {status && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Step Distribution</h2>
          <p className="mt-1 text-gray-600">Total real agents: {status.total}</p>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {Object.entries(status.by_step || {})
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([stepIdx, stepData]: [string, any]) => (
                <div key={stepIdx} className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Step {stepIdx}</div>
                  <div className="mt-1 text-2xl font-bold">{stepData.count}</div>
                  <div className="mt-1 text-xs text-gray-500">{stepData.step_name}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {status && status.stuck_count > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-red-700">
            ⚠️ {status.stuck_count} Agent(s) Stuck &gt;24h
          </h2>

          <div className="mt-4 space-y-2">
            {status.stuck_agents.map((agent: any) => (
              <div
                key={agent.id}
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{agent.email}</p>
                    <p className="text-sm text-gray-600">
                      Stuck on step {agent.onboarding_step} for{' '}
                      {agent.time_at_step_hours} hours
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(agent.last_onboarding_step_update).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conversions && conversions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Conversion Rates</h2>

          <div className="mt-4 space-y-4">
            {conversions.map((row: any) => {
              const rate = row.conversion_rate ? (row.conversion_rate * 100).toFixed(1) : 'N/A'
              return (
                <div key={row.transition} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{row.transition}</p>
                      <p className="text-sm text-gray-600">{row.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{rate}%</p>
                      <p className="text-sm text-gray-600">
                        {row.numerator}/{row.denominator}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
