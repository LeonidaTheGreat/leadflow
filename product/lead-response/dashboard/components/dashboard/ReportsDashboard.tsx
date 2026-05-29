'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle2, FileText } from 'lucide-react'

type ReportLead = {
  id: string
  name: string
  status: string
  outboundCount: number
  inboundCount: number
  hasReply: boolean
  isBooked: boolean
}

type ReportsPayload = {
  reportRangeDays: number
  generatedAt: string
  headline: string
  totals: {
    activeLeads: number
    leadsWithoutReply: number
    bookedLeads: number
  }
  atRiskLeads: ReportLead[]
  topPerformingLeads: ReportLead[]
  actionItems: string[]
  errors: string[]
}

const RANGE_OPTIONS = [7, 30, 90]

export function ReportsDashboard() {
  const [report, setReport] = useState<ReportsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    void fetchReport()
  }, [days])

  async function fetchReport() {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reports/summary?days=${days}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`Reports request failed with status ${response.status}`)
      }

      const payload = await response.json()
      setReport(payload.data)
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !report) {
    return <div className="text-sm text-slate-500">Loading reports...</div>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{report.headline}. Generated {new Date(report.generatedAt).toLocaleString()}.</p>
        </div>

        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              onClick={() => setDays(range as 7 | 30 | 90)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${days === range ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
            >
              {range}d
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Active Leads" value={report.totals.activeLeads} />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Leads Without Reply" value={report.totals.leadsWithoutReply} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Booked Leads" value={report.totals.bookedLeads} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeadList
          title="At-Risk Leads"
          subtitle="Outbound attempts with no reply"
          leads={report.atRiskLeads}
          emptyState="No at-risk leads in this range."
        />
        <LeadList
          title="Top Performing Leads"
          subtitle="Leads with engagement or bookings"
          leads={report.topPerformingLeads}
          emptyState="No top-performing leads yet."
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Action Items</h2>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          {report.actionItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

function LeadList({ title, subtitle, leads, emptyState }: { title: string; subtitle: string; leads: ReportLead[]; emptyState: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>
      {leads.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">{emptyState}</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="font-medium text-slate-900 dark:text-white">{lead.name}</div>
              <div className="text-slate-600 dark:text-slate-300">
                {lead.status} · outbound {lead.outboundCount} · inbound {lead.inboundCount} {lead.isBooked ? '· booked' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
