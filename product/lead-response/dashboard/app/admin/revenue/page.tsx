'use client'

import { useEffect, useState } from 'react'

type FunnelStep = { step: string; count: number; conversion: number }

type RevenueResponse = {
  success: boolean
  asOfDate: string | null
  funnel: FunnelStep[]
  sparklines: Record<string, number[]>
  deltas: Record<string, number>
  today: any
}

function Sparkline({ points }: { points: number[] }) {
  if (!points || points.length === 0) return <span className="text-xs text-gray-400">no data</span>
  const max = Math.max(...points, 1)
  return (
    <div className="flex h-8 items-end gap-1">
      {points.map((p, i) => (
        <div key={i} className="w-2 rounded-sm bg-sky-500" style={{ height: `${Math.max(10, Math.round((p / max) * 100))}%` }} />
      ))}
    </div>
  )
}

export default function RevenueAdminPage() {
  const [data, setData] = useState<RevenueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch('/api/admin/revenue')
        if (!res.ok) throw new Error(`API failed: ${res.status}`)
        setData(await res.json())
      } catch (err: any) {
        setError(err.message || 'Failed to load revenue dashboard')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) return <div className="p-8">Loading revenue funnel…</div>
  if (error) return <div className="p-8 text-red-700">{error}</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Revenue Funnel</h1>
      <p className="mt-2 text-sm text-gray-600">As of: {data?.asOfDate || 'No snapshot yet'}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {(data?.funnel || []).map((step) => (
          <div key={step.step} className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{step.step}</div>
            <div className="mt-1 text-2xl font-semibold">{step.count}</div>
            <div className="text-sm text-sky-700">{step.conversion.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-semibold">7-day Trends</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {Object.entries(data?.sparklines || {}).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="mt-2"><Sparkline points={v} /></div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-xl font-semibold">Today vs Yesterday</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-4">
        {Object.entries(data?.deltas || {}).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">{k}</div>
            <div className={`mt-1 text-xl font-semibold ${v >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {v >= 0 ? '+' : ''}{typeof v === 'number' ? v.toFixed(4).replace(/\.0000$/, '') : v}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
