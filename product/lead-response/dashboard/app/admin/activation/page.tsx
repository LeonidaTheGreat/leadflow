'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone_number: string | null
  created_at: string
  last_activation_sms_at: string | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Never'
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

export default function ActivationNudgePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState<Record<string, boolean>>({})
  const [nudgingAll, setNudgingAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/activation')
        if (res.status === 401) {
          router.replace('/admin/login?redirect=/admin/activation')
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

  async function sendNudge(agent: Agent) {
    setSending(prev => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/activation')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Unknown error'}`)
        return
      }
      const result = data.results?.[0]
      if (result?.status === 'sent') {
        const now = new Date().toISOString()
        setAgents(prev =>
          prev.map(a => a.id === agent.id ? { ...a, last_activation_sms_at: now } : a)
        )
        showToast(`SMS sent to ${agent.email}`)
      } else if (result?.status === 'skipped') {
        showToast(`Skipped: ${result.error}`)
      } else {
        showToast(`Failed: ${result?.error ?? 'Unknown error'}`)
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setSending(prev => ({ ...prev, [agent.id]: false }))
    }
  }

  async function nudgeAll() {
    setNudgingAll(true)
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkAll: true }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/activation')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Unknown error'}`)
        return
      }
      const sentNow = new Date().toISOString()
      const sentIds = new Set(
        (data.results ?? []).filter((r: any) => r.status === 'sent').map((r: any) => r.id)
      )
      setAgents(prev =>
        prev.map(a => sentIds.has(a.id) ? { ...a, last_activation_sms_at: sentNow } : a)
      )
      showToast(`Sent ${data.sent} SMS nudge${data.sent !== 1 ? 's' : ''}`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setNudgingAll(false)
    }
  }

  const pendingCount = agents.filter(a => !a.last_activation_sms_at && a.phone_number).length

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">SMS Activation Nudge</h1>
        <p className="mt-4 text-gray-500">Loading stuck agents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">SMS Activation Nudge</h1>
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
            <h1 className="text-2xl font-bold text-gray-900">SMS Activation Nudge</h1>
            <p className="text-gray-500 text-sm mt-1">
              Email-verified agents who never started onboarding (step 0). Email is broken — SMS works.
            </p>
          </div>
          <button
            onClick={nudgeAll}
            disabled={nudgingAll || pendingCount === 0}
            data-testid="nudge-all-btn"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nudgingAll ? 'Sending...' : `Nudge All (${pendingCount} unsent)`}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          &ldquo;Nudge All&rdquo; only targets agents with a phone on file who have never been nudged.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No stuck agents found. Either everyone has progressed or there are no verified signups yet.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="activation-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed Up</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SMS Sent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(agent => {
                const hasPhone = !!agent.phone_number
                const alreadySent = !!agent.last_activation_sms_at
                const isSending = sending[agent.id]

                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-gray-400 text-xs">{agent.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {hasPhone ? agent.phone_number : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(agent.created_at)}
                      <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {alreadySent ? (
                        <span className="text-green-600">{fmtDate(agent.last_activation_sms_at)}</span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasPhone ? (
                        <button
                          onClick={() => sendNudge(agent)}
                          disabled={isSending}
                          data-testid={`nudge-btn-${agent.id}`}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                        >
                          {isSending ? 'Sending...' : alreadySent ? 'Resend SMS' : 'Send SMS Nudge'}
                        </button>
                      ) : (
                        <span
                          title="No phone on file"
                          className="text-xs text-gray-400 cursor-not-allowed select-none"
                          data-testid={`nudge-disabled-${agent.id}`}
                        >
                          No phone on file
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} — {pendingCount} eligible for nudge
        </div>
      </div>
    </div>
  )
}
