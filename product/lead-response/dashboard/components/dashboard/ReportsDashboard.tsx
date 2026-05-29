'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Gauge, Loader2, TrendingUp } from 'lucide-react'

type AnalyticsPayload = {
  messagesPerDay: Array<{ date: string; count: number }>
  deliveryStats: { sent: number; delivered: number; failed: number; pending: number }
  responseRate: { totalSent: number; totalResponded: number; responseRate: number }
  sequenceCompletion: { started: number; completed: number; completionRate: number }
  leadConversion: { totalLeads: number; convertedLeads: number; conversionRate: number }
  responseTime: { avgResponseTime: number; medianResponseTime: number }
}

function getPerformanceVerdict(conversionRate: number, responseRate: number, avgResponseTime: number) {
  if (conversionRate >= 20 && responseRate >= 35 && avgResponseTime <= 2) {
    return 'Strong funnel performance with healthy lead engagement and fast follow-up.'
  }

  if (conversionRate >= 10 && responseRate >= 20) {
    return 'Stable conversion baseline; improving response speed should unlock more appointments.'
  }

  return 'Funnel underperforming; prioritize response speed and follow-up completion this week.'
}

export function ReportsDashboard() {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/analytics/dashboard?days=${timeRange}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Reports request failed with status ${response.status}`)
        }

        const payload = await response.json()
        setData(payload.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report data.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [timeRange])

  const report = useMemo(() => {
    if (!data) {
      return null
    }

    const totalMessages = data.messagesPerDay.reduce((sum, item) => sum + item.count, 0)
    const deliveryRate = data.deliveryStats.sent > 0
      ? Math.round((data.deliveryStats.delivered / data.deliveryStats.sent) * 100)
      : 0

    const verdict = getPerformanceVerdict(
      data.leadConversion.conversionRate,
      data.responseRate.responseRate,
      data.responseTime.avgResponseTime
    )

    const risks: string[] = []
    if (deliveryRate < 95) risks.push('Delivery reliability dropped below 95%. Audit carrier errors and sender reputation.')
    if (data.responseRate.responseRate < 25) risks.push('Reply rate is below target. Review opening message quality and send timing.')
    if (data.sequenceCompletion.completionRate < 60) risks.push('Follow-up sequences are not completing. Check stop triggers and automation fallbacks.')
    if (data.responseTime.avgResponseTime > 3) risks.push('Average response time exceeded 3 minutes. Tighten handoff between intake and AI workflow.')

    const actions = [
      'Review the top 20 unconverted leads and relaunch personalized follow-up within 24 hours.',
      'A/B test first-message copy on new leads to improve reply rate.',
      'Confirm Twilio delivery error handling for failed or pending messages.',
    ]

    return {
      totalMessages,
      deliveryRate,
      verdict,
      risks,
      actions,
      generatedAt: new Date().toLocaleString(),
      trailingDays: timeRange,
      conversionRate: data.leadConversion.conversionRate,
      responseRate: data.responseRate.responseRate,
      avgResponseTime: data.responseTime.avgResponseTime,
      sequenceCompletionRate: data.sequenceCompletion.completionRate,
      leadVolume: data.leadConversion.totalLeads,
      convertedLeads: data.leadConversion.convertedLeads,
    }
  }, [data, timeRange])

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex items-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading report snapshot...
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-red-700 dark:text-red-300">
        <p className="font-semibold">Unable to load report</p>
        <p className="text-sm mt-1">{error ?? 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Narrative performance report for weekly reviews and planning.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range as 7 | 30 | 90)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${range === timeRange
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Executive Summary</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{report.verdict}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Generated {report.generatedAt} for trailing {report.trailingDays} days.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard icon={<Gauge className="h-5 w-5" />} label="Lead Volume" value={report.leadVolume.toString()} />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Conversion Rate" value={`${report.conversionRate}%`} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Delivery Rate" value={`${report.deliveryRate}%`} />
        <MetricCard icon={<FileText className="h-5 w-5" />} label="Messages Sent" value={report.totalMessages.toString()} />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Response Rate" value={`${report.responseRate}%`} />
        <MetricCard icon={<Gauge className="h-5 w-5" />} label="Avg Response Time" value={`${report.avgResponseTime} min`} />
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Operational Risks</h2>
        {report.risks.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">No critical risks detected in this time window.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.risks.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommended Actions</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-5">
          {report.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Report Detail</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Metric</th>
                <th className="py-2 pr-4 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="text-slate-800 dark:text-slate-200">
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4">Total leads</td><td className="py-2 pr-4">{report.leadVolume}</td></tr>
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4">Converted leads</td><td className="py-2 pr-4">{report.convertedLeads}</td></tr>
              <tr className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4">Sequence completion</td><td className="py-2 pr-4">{report.sequenceCompletionRate}%</td></tr>
              <tr><td className="py-2 pr-4">Total outbound messages</td><td className="py-2 pr-4">{report.totalMessages}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
