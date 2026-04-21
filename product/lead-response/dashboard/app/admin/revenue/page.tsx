'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, TrendingUp, Users, Zap } from 'lucide-react'

interface RevenueData {
  success: boolean
  metrics: Array<any>
  funnel: Record<string, any>
  today: any
  yesterday: any
}

export default function RevenueAdminPage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRevenueData() {
      try {
        const response = await fetch('/api/admin/revenue?days=7')
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch revenue data')
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Revenue Funnel Dashboard</h1>
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Revenue Funnel Dashboard</h1>
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </div>
    )
  }

  const { metrics = [], funnel = {}, today, yesterday } = data || {}

  // Get funnel steps in order
  const steps = [
    { key: 'signups', data: funnel.signups },
    { key: 'fub_connected', data: funnel.fub_connected },
    { key: 'aha_moment', data: funnel.aha_moment },
    { key: 'paid', data: funnel.paid },
  ].filter(s => s.data)

  // Calculate sparkline data
  const metricsByStep = {
    signups: metrics.map((m: any) => m.data?.funnel?.signups?.count || 0),
    fub_connected: metrics.map((m: any) => m.data?.funnel?.fub_connected?.count || 0),
    aha_moment: metrics.map((m: any) => m.data?.funnel?.aha_moment?.count || 0),
    paid: metrics.map((m: any) => m.data?.funnel?.paid?.count || 0),
  }

  // Calculate deltas
  const todayValue = (step: string) => {
    if (!today) return 0
    if (step === 'mrr') return today.mrr_cents || 0
    if (step === 'trial') return today.trial_users || 0
    if (step === 'conversion') return today.conversion_rate || 0
    return today.data?.funnel?.[step]?.count || 0
  }

  const yesterdayValue = (step: string) => {
    if (!yesterday) return 0
    if (step === 'mrr') return yesterday.mrr_cents || 0
    if (step === 'trial') return yesterday.trial_users || 0
    if (step === 'conversion') return yesterday.conversion_rate || 0
    return yesterday.data?.funnel?.[step]?.count || 0
  }

  const getDelta = (step: string, format: 'number' | 'percent' = 'number') => {
    const today = todayValue(step)
    const yesterday = yesterdayValue(step)
    const diff = today - yesterday

    if (format === 'percent') {
      const rate = today / (today + (today?.extended?.trial_users || 0))
      return isFinite(rate) ? (rate * 100).toFixed(1) : '0'
    }

    return diff
  }

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const getSparklineMin = (values: number[]) => Math.min(...values.filter(v => v > 0), 0)
  const getSparklineMax = (values: number[]) => Math.max(...values)

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Revenue Funnel Dashboard</h1>
        <p className="mt-2 text-gray-600">Track signups to MRR conversion</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          title="MRR"
          value={`$${(today?.mrr_cents || 0) / 100}`}
          delta={getDelta('mrr')}
          icon={<TrendingUp size={24} />}
        />
        <MetricCard
          title="Active Subscribers"
          value={today?.active_subscribers || 0}
          delta={getDelta('paid')}
          icon={<Users size={24} />}
        />
        <MetricCard
          title="Trial Users"
          value={today?.trial_users || 0}
          delta={getDelta('trial')}
          icon={<Zap size={24} />}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${((today?.conversion_rate || 0) * 100).toFixed(1)}%`}
          delta={null}
          icon={<TrendingUp size={24} />}
        />
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-semibold">Conversion Funnel</h2>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const stepData = step.data
            const count = stepData?.count || 0
            const rate = stepData?.rate || 0
            const sparklineData = metricsByStep[step.key as keyof typeof metricsByStep] || []

            return (
              <div key={step.key}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{stepData?.label || step.key}</h3>
                    <p className="text-sm text-gray-600">
                      {count} ({(rate * 100).toFixed(1)}% of signups)
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">
                      {rate > 0 ? `↓ ${(rate * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Funnel bar */}
                <div className="mt-2 h-8 overflow-hidden rounded-lg bg-gray-100">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{ width: `${Math.max(rate * 100, 5)}%` }}
                  />
                </div>

                {/* Sparkline */}
                {sparklineData.length > 0 && (
                  <div className="mt-2 flex items-end gap-1">
                    {sparklineData.map((value: number, i: number) => {
                      const min = getSparklineMin(sparklineData)
                      const max = getSparklineMax(sparklineData)
                      const range = max - min || 1
                      const height = ((value - min) / range) * 40
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-blue-200"
                          style={{ height: `${Math.max(height, 2)}px` }}
                          title={`${value}`}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Extended Metrics */}
      {today?.data?.extended && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-2xl font-semibold">Extended Metrics</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-100 p-4">
              <div className="text-sm text-gray-600">FUB Activation Rate</div>
              <div className="mt-1 text-2xl font-bold">
                {((today.data.extended.fub_activation_rate || 0) * 100).toFixed(1)}%
              </div>
              {(today.data.extended.fub_activation_rate || 0) < 0.2 && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircle size={16} className="mr-1" />
                  Below 20% threshold
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 p-4">
              <div className="text-sm text-gray-600">Aha Completion Rate</div>
              <div className="mt-1 text-2xl font-bold">
                {((today.data.extended.aha_completion_rate || 0) * 100).toFixed(1)}%
              </div>
              {(today.data.extended.aha_completion_rate || 0) < 0.3 && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircle size={16} className="mr-1" />
                  Below 30% threshold
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Data Table */}
      {metrics.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-2xl font-semibold">Historical Data (Last 7 Days)</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-right">Signups</th>
                  <th className="px-4 py-2 text-right">FUB Connected</th>
                  <th className="px-4 py-2 text-right">Aha</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">MRR</th>
                  <th className="px-4 py-2 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 7).map((m: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {new Date(m.date).toLocaleDateString()}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      {m.data?.funnel?.signups?.count || 0}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      {m.data?.funnel?.fub_connected?.count || 0}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      {m.data?.funnel?.aha_moment?.count || 0}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      {m.data?.funnel?.paid?.count || 0}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      ${(m.mrr_cents || 0) / 100}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2 text-right">
                      {((m.conversion_rate || 0) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard(props: { title: string; value: string | number; delta: number | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">{props.title}</p>
          <p className="mt-2 text-2xl font-bold">{props.value}</p>
          {props.delta !== null && (
            <p className="mt-1 text-sm font-semibold text-gray-600">
              {props.delta > 0 ? '+' : ''}{props.delta}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-400">
          {props.icon}
        </div>
      </div>
    </div>
  )
}
