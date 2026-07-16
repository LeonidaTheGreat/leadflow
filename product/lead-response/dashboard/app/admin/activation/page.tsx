'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Copy, Loader2, UserCheck, Users } from 'lucide-react'

interface UnverifiedAgent {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  created_at: string
}

interface VerifiedResult {
  agentId: string
  email: string
  firstName: string | null
  lastName: string | null
  loginUrl: string
}

function fmtDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function agentName(agent: { first_name: string | null; last_name: string | null; email: string }): string {
  const name = [agent.first_name, agent.last_name].filter(Boolean).join(' ')
  return name || agent.email
}

export default function ActivationPage() {
  const [agents, setAgents] = useState<UnverifiedAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verifyingAll, setVerifyingAll] = useState(false)
  const [verified, setVerified] = useState<Map<string, VerifiedResult>>(new Map())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ count: number; loginUrl: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/activation')
      if (res.status === 401) {
        setError('Not authorized. Please log in as admin.')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setAgents(body.agents ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function verifySingle(agent: UnverifiedAgent) {
    setVerifying(agent.id)
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        alert(body.error || 'Verification failed')
        return
      }
      setVerified(prev => new Map(prev).set(agent.id, body as VerifiedResult))
      setAgents(prev => prev.filter(a => a.id !== agent.id))
    } catch {
      alert('Network error — please try again')
    } finally {
      setVerifying(null)
    }
  }

  async function verifyAll() {
    if (!confirm(`Verify all ${agents.length} unverified agents? This cannot be undone.`)) return
    setVerifyingAll(true)
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        alert(body.error || 'Bulk verification failed')
        return
      }
      setBulkResult({ count: body.count, loginUrl: body.loginUrl })
      setAgents([])
    } catch {
      alert('Network error — please try again')
    } finally {
      setVerifyingAll(false)
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const pendingCount = agents.length
  const verifiedCount = verified.size

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Admin / Activation</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Email Verification Override
          </h1>
          <p className="mt-4 text-base text-slate-300">
            Manually verify agents who were locked out because verification emails were never delivered.
            After verifying, copy the login link and send it to the agent directly.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-800 bg-amber-950/40 px-5 py-3">
              <Users className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-medium text-amber-200">
                {pendingCount} agent{pendingCount !== 1 ? 's' : ''} pending verification
              </span>
            </div>
            {verifiedCount > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-5 py-3">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <span className="text-sm font-medium text-emerald-200">
                  {verifiedCount} verified this session
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-800 bg-red-950/60 px-5 py-4 text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading unverified agents...</span>
          </div>
        )}

        {/* Bulk result banner */}
        {bulkResult && (
          <div className="mt-6 rounded-2xl border border-emerald-700 bg-emerald-950/60 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-200">
                  {bulkResult.count} agent{bulkResult.count !== 1 ? 's' : ''} verified
                </p>
                <p className="mt-1 text-sm text-emerald-300">
                  All agents can now log in at:{' '}
                  <span className="font-mono text-white">{bulkResult.loginUrl}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(bulkResult.loginUrl, 'bulk')}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/50 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-800"
            >
              <Copy className="h-4 w-4" />
              {copiedId === 'bulk' ? 'Copied!' : 'Copy login link'}
            </button>
          </div>
        )}

        {/* Verify All + agent list */}
        {!loading && !error && (
          <>
            {pendingCount > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={verifyAll}
                  disabled={verifyingAll || pendingCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-900/60 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifyingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying all...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Verify All ({pendingCount})
                    </>
                  )}
                </button>
              </div>
            )}

            {pendingCount === 0 && !bulkResult && verifiedCount === 0 && (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
                No unverified agents found.
              </div>
            )}

            {pendingCount > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-slate-400">Name</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-slate-400">Email</th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-slate-400">Signed Up</th>
                      <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {agents.map(agent => (
                      <tr key={agent.id} className="bg-slate-950 transition hover:bg-slate-900/60">
                        <td className="px-5 py-4 font-medium text-white">{agentName(agent)}</td>
                        <td className="px-5 py-4 font-mono text-slate-300">{agent.email}</td>
                        <td className="px-5 py-4 text-slate-400">{fmtDate(agent.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => verifySingle(agent)}
                            disabled={verifying === agent.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/50 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {verifying === agent.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per-agent verified results */}
            {verified.size > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm uppercase tracking-widest text-slate-400">Verified this session</h2>
                {Array.from(verified.values()).map(result => (
                  <div
                    key={result.agentId}
                    className="flex flex-col gap-3 rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-emerald-200">
                        {[result.firstName, result.lastName].filter(Boolean).join(' ') || result.email}
                      </p>
                      <p className="mt-0.5 font-mono text-sm text-slate-400">{result.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-300">{result.loginUrl}</span>
                      <button
                        onClick={() => copyToClipboard(result.loginUrl, result.agentId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === result.agentId ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
