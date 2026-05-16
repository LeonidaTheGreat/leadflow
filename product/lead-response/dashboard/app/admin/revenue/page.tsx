'use client'

import { useEffect, useState } from 'react'

type RevenueRow = {
  date: string
  active_subscribers: number
  trial_users: number
  mrr_cents: number
  new_subscribers: number
  conversion_rate: number
  data?: {
    fub_activation_rate?: number
    aha_completion_rate?: number
    pilot_contacted_rate?: number
    funnel?: {
      signups?: { count: number; rate: number }
      fub_connected?: { count: number; rate: number }
      aha_moment?: { count: number; rate: number }
      paid?: { count: number; rate: number }
    }
  }
}

export default function AdminRevenuePage() {
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/admin/revenue')
        if (!response.ok) throw new Error('Failed to fetch revenue metrics')
        const result = await response.json()
        setRows(result.rows || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading revenue funnel...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (rows.length === 0) return <div className="p-8">No revenue metrics available yet.</div>

  const today = rows[rows.length - 1]
  const yesterday = rows.length > 1 ? rows[rows.length - 2] : null

  const steps = [
    { label: 'Signups', count: today.data?.funnel?.signups?.count || 0, rate: 1 },
    { label: 'FUB Connected', count: today.data?.funnel?.fub_connected?.count || 0, rate: today.data?.fub_activation_rate || 0 },
    { label: 'Aha Moment', count: today.data?.funnel?.aha_moment?.count || 0, rate: today.data?.aha_completion_rate || 0 },
    { label: 'Paid', count: today.data?.funnel?.paid?.count || today.active_subscribers || 0, rate: today.data?.funnel?.paid?.rate || 0 },
  ]

  function pct(v: number) {
    return `${Math.round((v || 0) * 100)}%`
  }

  function delta(current: number, prev?: number) {
    if (typeof prev !== 'number') return 'n/a'
    const diff = current - prev
    return `${diff > 0 ? '+' : ''}${diff}`
  }

  function sparkline(values: number[]) {
    if (values.length === 0) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    return values
      .map((v) => {
        if (max === min) return '▇'
        const ratio = (v - min) / (max - min)
        if (ratio < 0.2) return '▁'
        if (ratio < 0.4) return '▂'
        if (ratio < 0.6) return '▄'
        if (ratio < 0.8) return '▆'
        return '▇'
      })
      .join('')
  }

  const spark = {
    subscribers: sparkline(rows.map((r) => r.active_subscribers || 0)),
    trialUsers: sparkline(rows.map((r) => r.trial_users || 0)),
    mrr: sparkline(rows.map((r) => r.mrr_cents || 0)),
    fub: sparkline(rows.map((r) => r.data?.fub_activation_rate || 0)),
    aha: sparkline(rows.map((r) => r.data?.aha_completion_rate || 0)),
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Revenue Funnel</h1>
        <p className="text-gray-600 mt-2">Landing → Signup → FUB Connected → Aha Moment → Paid</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step) => (
          <div key={step.label} className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">{step.label}</div>
            <div className="text-2xl font-bold mt-1">{step.count}</div>
            <div className="text-sm text-gray-500 mt-1">{pct(step.rate)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="font-semibold">Today vs Yesterday</div>
          <div className="mt-2 text-sm text-gray-700">Active subscribers: {today.active_subscribers} ({delta(today.active_subscribers, yesterday?.active_subscribers)})</div>
          <div className="text-sm text-gray-700">Trial users: {today.trial_users} ({delta(today.trial_users, yesterday?.trial_users)})</div>
          <div className="text-sm text-gray-700">MRR: ${(today.mrr_cents / 100).toFixed(2)} ({delta(today.mrr_cents, yesterday?.mrr_cents)} cents)</div>
          <div className="text-sm text-gray-700">FUB activation: {pct(today.data?.fub_activation_rate || 0)}</div>
          <div className="text-sm text-gray-700">Aha completion: {pct(today.data?.aha_completion_rate || 0)}</div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="font-semibold">7-Day Sparklines</div>
          <div className="mt-2 text-sm">Active: <span className="font-mono">{spark.subscribers}</span></div>
          <div className="text-sm">Trial: <span className="font-mono">{spark.trialUsers}</span></div>
          <div className="text-sm">MRR: <span className="font-mono">{spark.mrr}</span></div>
          <div className="text-sm">FUB rate: <span className="font-mono">{spark.fub}</span></div>
          <div className="text-sm">Aha rate: <span className="font-mono">{spark.aha}</span></div>
        </div>
      </div>
    </div>
  )
}
