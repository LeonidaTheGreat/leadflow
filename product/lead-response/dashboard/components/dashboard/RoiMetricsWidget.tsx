'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface RoiMetrics {
  leadsResponded: number
  avgResponseTimeSeconds: number
  appointmentsBookedThisMonth: number
  estimatedRevenueProtected: number
  bookingRate: number
  hasData: boolean
}

export function RoiMetricsWidget() {
  const [metrics, setMetrics] = useState<RoiMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      setLoading(true)
      const response = await fetch('/api/metrics/roi')

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`)
      }

      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching ROI metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800 animate-pulse">
        <div className="h-6 bg-emerald-200 dark:bg-emerald-800 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded p-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-6 border border-red-200 dark:border-red-800">
        <p className="text-red-800 dark:text-red-200">Failed to load ROI metrics: {error}</p>
      </div>
    )
  }

  // Empty state: No leads responded yet
  if (!metrics?.hasData) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📊</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ROI Metrics Coming Soon
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
              Connect your Follow Up Boss account to start seeing ROI metrics. Once leads come in, you'll see:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside mb-4">
              <li>Total leads responded to</li>
              <li>Average response time</li>
              <li>Appointments booked</li>
              <li>Estimated revenue protected</li>
            </ul>
            <Link
              href="/settings"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              data-testid="connect-fub-button"
            >
              Connect Follow Up Boss
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Format revenue as USD
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format time as readable string
  const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        📈 ROI Metrics — Value You're Delivering
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads Responded */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Leads Responded
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.leadsResponded}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Total leads you've responded to
          </p>
        </div>

        {/* Average Response Time */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Avg Response Time
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatSeconds(metrics.avgResponseTimeSeconds)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            How fast you respond
          </p>
        </div>

        {/* Appointments This Month */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Appointments Booked
          </p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {metrics.appointmentsBookedThisMonth}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            This month
          </p>
        </div>

        {/* Estimated Revenue Protected */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
            Revenue Protected
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(metrics.estimatedRevenueProtected)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Estimated value saved
          </p>
        </div>
      </div>

      {/* Booking Rate Info */}
      <div className="mt-4 p-3 bg-white dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium">Booking Rate:</span> {metrics.bookingRate.toFixed(1)}% of your leads convert to appointments.
        </p>
      </div>
    </div>
  )
}
