'use client'

import { useEffect, useState } from 'react'

// ============================================================
// Pilot Recruitment Blast Panel
// ============================================================

interface BlastStats {
  identified: number
  contacted: number
  responded: number
  signed_up: number
  total: number
}

interface BlastResult {
  sent: number
  skipped: number
  errors: string[]
}

function PilotOutreachBlastPanel() {
  const [stats, setStats] = useState<BlastStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [blasting, setBlasting] = useState(false)
  const [blastResult, setBlastResult] = useState<BlastResult | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) setAdminToken(stored)
  }, [])

  useEffect(() => {
    async function loadStats() {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        setStatsLoading(false)
        return
      }
      try {
        const res = await fetch('/api/admin/outreach/blast', {
          headers: { 'x-admin-token': token },
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats ?? null)
        }
      } catch {
        // Stats are best-effort
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])

  async function handleBlast() {
    let token = adminToken
    if (!token) {
      const entered = prompt('Enter admin token (ADMIN_SECRET):')
      if (!entered) return
      token = entered
      localStorage.setItem('admin_token', token)
      setAdminToken(token)
    }

    const confirmed = window.confirm(
      `This will send outreach emails to all "identified" recruitment targets.\n\nAre you sure?`
    )
    if (!confirmed) return

    setBlasting(true)
    setBlastResult(null)
    try {
      const res = await fetch('/api/admin/outreach/blast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
      })
      const data = await res.json()
      if (res.ok) {
        setBlastResult(data)
        // Refresh stats
        const statsRes = await fetch('/api/admin/outreach/blast', {
          headers: { 'x-admin-token': token },
        })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats ?? null)
        }
      } else {
        alert(`Blast failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setBlasting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pilot Recruitment Blast</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Send personalized outreach emails to all &quot;identified&quot; recruitment targets with a unique demo link.
            Skips targets that already have an initial touchpoint.
          </p>
        </div>
        <button
          onClick={handleBlast}
          disabled={blasting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="send-blast-button"
        >
          {blasting ? 'Sending…' : 'Send Blast'}
        </button>
      </div>

      {/* Campaign stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Identified</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.identified}</p>
          </div>
          <div className="bg-blue-50 rounded-md p-3 text-center">
            <p className="text-xs text-blue-600 uppercase tracking-wide">Contacted</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.contacted}</p>
          </div>
          <div className="bg-yellow-50 rounded-md p-3 text-center">
            <p className="text-xs text-yellow-600 uppercase tracking-wide">Responded</p>
            <p className="text-xl font-bold text-yellow-700 mt-0.5">{stats.responded}</p>
          </div>
          <div className="bg-green-50 rounded-md p-3 text-center">
            <p className="text-xs text-green-600 uppercase tracking-wide">Signed Up</p>
            <p className="text-xl font-bold text-green-700 mt-0.5">{stats.signed_up}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Blast result */}
      {blastResult && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4" data-testid="blast-result">
          <p className="text-sm font-semibold text-gray-900 mb-2">Blast complete</p>
          <div className="flex gap-4 text-sm">
            <span className="text-green-700 font-medium">{blastResult.sent} sent</span>
            <span className="text-gray-500">{blastResult.skipped} skipped</span>
            {blastResult.errors.length > 0 && (
              <span className="text-red-600 font-medium">{blastResult.errors.length} errors</span>
            )}
          </div>
          {blastResult.errors.length > 0 && (
            <ul className="mt-2 text-xs text-red-600 list-disc list-inside space-y-0.5">
              {blastResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Original Outreach Candidates (existing functionality below)
// ============================================================

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
  contacted: boolean
  contacted_at: string | null
  invite_status: string | null
}

interface Summary {
  total_verified: number
  contacted: number
  uncontacted: number
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
  const [filter, setFilter] = useState<'all' | 'uncontacted' | 'high' | 'pilot'>('uncontacted')
  const [copied, setCopied] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<Record<string, 'sent' | 'error'>>({})

  // Load admin token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) setAdminToken(stored)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/outreach-candidates?limit=250')
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
    if (filter === 'uncontacted') return !c.contacted
    if (filter === 'high') return c.engagement_score >= 50 && !c.contacted
    if (filter === 'pilot') return c.plan_tier === 'pilot'
    return true
  })

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(email)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  async function sendInvite(candidate: Candidate) {
    let token = adminToken
    if (!token) {
      const entered = prompt('Enter admin token (ADMIN_SECRET):')
      if (!entered) return
      token = entered
      localStorage.setItem('admin_token', token)
      setAdminToken(token)
    }

    setSending(candidate.id)
    try {
      const res = await fetch('/api/admin/invite-pilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          email: candidate.email,
          name: candidate.name || candidate.email,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSendResult((prev) => ({ ...prev, [candidate.id]: 'sent' }))
        // Update local state to reflect contacted status
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, contacted: true, contacted_at: new Date().toISOString(), invite_status: 'pending' }
              : c
          )
        )
        setSummary((prev) =>
          prev
            ? { ...prev, contacted: prev.contacted + 1, uncontacted: prev.uncontacted - 1 }
            : prev
        )
      } else {
        setSendResult((prev) => ({ ...prev, [candidate.id]: 'error' }))
        alert(`Failed to send invite: ${data.error}`)
      }
    } catch (e: any) {
      setSendResult((prev) => ({ ...prev, [candidate.id]: 'error' }))
      alert(`Error: ${e.message}`)
    } finally {
      setSending(null)
    }
  }

  function exportCSV() {
    const header = 'Name,Email,Phone,Tier,Onboarding Step,Last Login,Page Views,Sessions,Engagement Score,Contacted,Contacted At\n'
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
          c.contacted ? 'Yes' : 'No',
          c.contacted_at ?? '',
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

  const top10Uncontacted = candidates
    .filter((c) => !c.contacted)
    .slice(0, 10)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Pilot Recruitment Blast Panel */}
      <PilotOutreachBlastPanel />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Outreach Candidates</h1>
          <p className="text-gray-500 text-sm mt-1">
            All email-verified signups ranked by engagement. Send personal invites to convert to pilots.
          </p>
        </div>
        <div className="flex gap-2">
          {adminToken && (
            <span className="inline-flex items-center px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md">
              Token set
            </span>
          )}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            data-testid="export-csv-button"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Verified Signups</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_verified}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Not Contacted</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{summary.uncontacted}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Contacted</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.contacted}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">High Engagement</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{summary.high_engagement}</p>
          </div>
        </div>
      )}

      {/* Priority 10 — top uncontacted leads */}
      {top10Uncontacted.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-amber-900 mb-2">
            Priority 10 — Top uncontacted leads to reach out to now
          </p>
          <div className="flex flex-wrap gap-2">
            {top10Uncontacted.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-md px-2 py-1">
                <span className="text-xs font-medium text-gray-900">{c.name || c.email}</span>
                <span className="text-xs text-amber-700 font-semibold">{c.engagement_score}</span>
                <button
                  onClick={() => sendInvite(c)}
                  disabled={sending === c.id || sendResult[c.id] === 'sent'}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  data-testid={`priority-invite-${c.id}`}
                >
                  {sending === c.id ? '…' : sendResult[c.id] === 'sent' ? '✓' : 'Invite'}
                </button>
              </div>
            ))}
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
          <li>Click <strong>Send Invite</strong> to send a personal pilot invite email (requires admin token)</li>
        </ul>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'uncontacted', label: `Uncontacted (${candidates.filter(c => !c.contacted).length})` },
          { key: 'high', label: `High + Uncontacted (${candidates.filter(c => c.engagement_score >= 50 && !c.contacted).length})` },
          { key: 'pilot', label: `Pilot (${candidates.filter(c => c.plan_tier === 'pilot').length})` },
          { key: 'all', label: `All (${candidates.length})` },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              filter === f.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.contacted ? 'opacity-60' : ''}`}>
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
                  <td className="px-4 py-3">
                    {c.contacted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <span>✓</span>
                        <span>Invited {formatDate(c.contacted_at)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not contacted</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!c.contacted && (
                        <button
                          onClick={() => sendInvite(c)}
                          disabled={sending === c.id || sendResult[c.id] === 'sent'}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-medium disabled:opacity-50"
                          data-testid={`send-invite-${c.id}`}
                        >
                          {sending === c.id ? '…' : sendResult[c.id] === 'sent' ? '✓ Sent' : 'Send Invite'}
                        </button>
                      )}
                      <button
                        onClick={() => copyEmail(c.email)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        data-testid={`copy-email-${c.id}`}
                        title="Copy email"
                      >
                        {copied === c.email ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
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
