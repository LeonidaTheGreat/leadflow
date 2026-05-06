'use client'

import { useEffect, useState } from 'react'
import { Mail, RefreshCw, UserCheck, Users } from 'lucide-react'

interface ReactivationStats {
  eligible: number
  sent: number
  opened_via_utm: number
  reactivated: number
}

function StatCard(props: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{props.title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{props.value}</p>
        </div>
        <div className={`rounded-xl border border-slate-700 bg-slate-950 p-3 ${props.color}`}>
          {props.icon}
        </div>
      </div>
    </div>
  )
}

export default function ReactivationAdminPage() {
  const [stats, setStats] = useState<ReactivationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/reactivation-stats')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!body.success) throw new Error(body.error || 'Unknown error')
        setStats(body.stats)
      } catch (err: any) {
        setError(err.message || 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        <h1 className="text-3xl font-semibold">Reactivation Campaign</h1>
        <p className="mt-3 text-slate-400">Loading stats...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        <h1 className="text-3xl font-semibold">Reactivation Campaign</h1>
        <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">
          {error || 'Failed to load stats'}
        </div>
      </div>
    )
  }

  const conversionRate = stats.sent > 0
    ? ((stats.reactivated / stats.sent) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <h1 className="text-3xl font-semibold">Reactivation Campaign</h1>
      <p className="mt-2 text-slate-400">
        Win back cold signups — agents with expired trials who never hit the aha moment
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Eligible"
          value={stats.eligible}
          icon={<Users size={22} />}
          color="text-slate-300"
        />
        <StatCard
          title="Sent"
          value={stats.sent}
          icon={<Mail size={22} />}
          color="text-blue-400"
        />
        <StatCard
          title="Opened (UTM)"
          value={stats.opened_via_utm}
          icon={<RefreshCw size={22} />}
          color="text-amber-400"
        />
        <StatCard
          title="Reactivated"
          value={stats.reactivated}
          icon={<UserCheck size={22} />}
          color="text-emerald-400"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-white">Funnel Summary</h2>
        <div className="mt-4 space-y-3">
          <FunnelRow label="Eligible (unsent)" value={stats.eligible} total={stats.eligible + stats.sent} />
          <FunnelRow label="Email sent" value={stats.sent} total={stats.eligible + stats.sent} />
          <FunnelRow label="Opened via UTM" value={stats.opened_via_utm} total={stats.sent || 1} />
          <FunnelRow label="Reactivated (paid)" value={stats.reactivated} total={stats.sent || 1} />
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Conversion rate: {conversionRate}% of sent emails led to reactivation
        </p>
      </div>
    </div>
  )
}

function FunnelRow(props: { label: string; value: number; total: number }) {
  const pct = props.total > 0 ? (props.value / props.total) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{props.label}</span>
        <span className="text-slate-400">{props.value} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
