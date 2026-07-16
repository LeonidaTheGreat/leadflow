'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AGENT_LOGIN_URL = 'https://leadflow-ai-five.vercel.app/auth/login'

interface Agent {
  id: string
  name: string
  email: string
  created_at: string
}

function fmtDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(iso: string): string {
  const ms = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export default function EmailVerificationPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<Record<string, boolean>>({})
  const [verifyingAll, setVerifyingAll] = useState(false)
  const [verified, setVerified] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/verify-email')
        if (res.status === 401) {
          router.replace('/admin/login?redirect=/admin/email-verification')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setAgents(data.agents ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function verifySingle(agent: Agent) {
    setVerifying(prev => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/email-verification')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Unknown error'}`)
        return
      }
      setVerified(prev => new Set([...prev, agent.id]))
      showToast(`Verified ${agent.email}`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setVerifying(prev => ({ ...prev, [agent.id]: false }))
    }
  }

  async function verifyAll() {
    setVerifyingAll(true)
    try {
      const res = await fetch('/api/admin/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/email-verification')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Unknown error'}`)
        return
      }
      const allIds = new Set(agents.map(a => a.id))
      setVerified(allIds)
      showToast(`Verified all ${agents.length} agent${agents.length !== 1 ? 's' : ''}`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setVerifyingAll(false)
    }
  }

  const pendingCount = agents.filter(a => !verified.has(a.id)).length

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Email Verification Override</h1>
        <p className="mt-4 text-gray-500">Loading unverified agents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Email Verification Override</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Verification Override</h1>
            <p className="text-gray-500 text-sm mt-1">
              Agents with unverified email addresses. Override to unblock them immediately.
            </p>
          </div>
          <button
            onClick={verifyAll}
            disabled={verifyingAll || pendingCount === 0}
            data-testid="verify-all-btn"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verifyingAll ? 'Verifying...' : `Verify All (${pendingCount} pending)`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No unverified agents found. Everyone is verified.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="verify-email-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed Up</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(agent => {
                const isVerified = verified.has(agent.id)
                const isVerifying = verifying[agent.id]

                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-gray-400 text-xs">{agent.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(agent.created_at)}
                      <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                    </td>
                    <td className="px-4 py-3">
                      {isVerified ? (
                        <div>
                          <span className="text-xs text-green-600 font-medium mr-2">Verified</span>
                          <a
                            href={AGENT_LOGIN_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 underline"
                            data-testid={`login-link-${agent.id}`}
                          >
                            Agent login →
                          </a>
                        </div>
                      ) : (
                        <button
                          onClick={() => verifySingle(agent)}
                          disabled={isVerifying}
                          data-testid={`verify-btn-${agent.id}`}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                        >
                          {isVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} — {pendingCount} pending verification
        </div>
      </div>
    </div>
  )
}
