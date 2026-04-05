'use client'

import { useEffect, useState } from 'react'

interface Candidate {
  id: string
  name: string
  email: string
  phone: string | null
  plan_tier: string
  onboarding_step: number
  onboarding_completed: boolean
  last_login_at: string | null
  created_at: string
  page_views: number
  sessions: number
  source: string | null
  utm_source: string | null
  engagement_score: number
}

interface Summary {
  trial: number
  pilot: number
  completed_onboarding: number
  high_engagement: number
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-100 text-green-800' :
    score >= 40 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const color = tier === 'pilot' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {tier}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysSince(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export default function OutreachPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'pilot'>('all')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/outreach-candidates?limit=100')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setCandidates(data.candidates ?? [])
        setSummary(data.summary ?? null)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = candidates.filter((c) => {
    if (filter === 'high') return c.engagement_score >= 50
    if (filter === 'pilot') return c.plan_tier === 'pilot'
    return true
  })

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(email)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  function exportCSV() {
    const header = 'Name,Email,Phone,Tier,Onboarding Step,Last Login,Page Views,Sessions,Engagement Score\n'
    const rows = filtered
      .map((c) =>
        [
          c.name,
          c.email,
          c.phone ?? '',
          c.plan_tier,
          c.onboarding_step,
          c.last_login_at ?? '',
          c.page_views,
          c.sessions,
          c.engagement_score,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outreach-candidates-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Pilot Outreach</h1>
        <p className="text-gray-500">Loading candidates…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Pilot Outreach</h1>
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Outreach Candidates</h1>
          <p className="text-gray-500 text-sm mt-1">
            Trial + pilot agents ranked by engagement. Reach out to top scorers first.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          data-testid="export-csv-button"
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Trial Agents</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.trial}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pilot Agents</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary.pilot}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Completed Onboarding</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.completed_onboarding}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">High Engagement (≥50)</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{summary.high_engagement}</p>
          </div>
        </div>
      )}

      {/* Outreach tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800 mb-1">Outreach playbook</p>
        <ul className="text-sm text-blue-700 space-y-0.5 list-disc list-inside">
          <li>Start with <strong>high-engagement</strong> (score ≥ 70) — they already care</li>
          <li>Offer a <strong>15-min Zoom call</strong> + white-glove setup assistance</li>
          <li>Prioritize agents who completed onboarding or are on step 3+</li>
          <li>Use personal email from Stojan, not automated — reference their specific activity</li>
        </ul>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'high', 'pilot'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            data-testid={`filter-${f}`}
          >
            {f === 'all' ? `All (${candidates.length})` : f === 'high' ? `High Engagement (${candidates.filter(c => c.engagement_score >= 50).length})` : `Pilot (${candidates.filter(c => c.plan_tier === 'pilot').length})`}
          </button>
        ))}
      </div>

      {/* Candidate table */}
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No candidates match this filter.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="outreach-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Onboarding</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Views</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <ScoreBadge score={c.engagement_score} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name || '(no name)'}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{c.email}</p>
                    {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={c.plan_tier} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.onboarding_completed ? (
                      <span className="text-green-600 font-medium">Done</span>
                    ) : (
                      <span>Step {c.onboarding_step}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {daysSince(c.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.page_views}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.utm_source ?? c.source ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyEmail(c.email)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      data-testid={`copy-email-${c.id}`}
                      title="Copy email"
                    >
                      {copied === c.email ? 'Copied!' : 'Copy email'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {filtered.length} of {candidates.length} candidates · Sorted by engagement score
          </div>
        </div>
      )}
    </div>
  )
}
