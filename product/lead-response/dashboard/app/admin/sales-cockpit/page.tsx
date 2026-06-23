'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  plan_tier: string
  onboarding_step: number
  created_at: string
  last_login_at: string | null
  outreach_status: 'new' | 'contacted' | 'interested' | 'declined' | 'closed'
  last_contacted_at: string | null
  last_channel: string | null
  outreach_history: OutreachEntry[]
}

interface OutreachEntry {
  id: string
  channel: string
  notes: string | null
  status: string
  contacted_at: string
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  closed: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  declined: 'Declined',
  closed: 'Closed',
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysSince(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export default function SalesCockpitPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Agent | null>(null)
  const [logChannel, setLogChannel] = useState<string>('email')
  const [logNotes, setLogNotes] = useState('')
  const [logStatus, setLogStatus] = useState<string>('contacted')
  const [submitting, setSubmitting] = useState(false)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/sales-cockpit')
        if (res.status === 401) {
          router.replace('/admin/login?redirect=/admin/sales-cockpit')
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

  async function generatePaymentLink(agent: Agent) {
    setGeneratingLink(agent.id)
    try {
      const res = await fetch('/api/admin/sales-cockpit/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentEmail: agent.email }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/sales-cockpit')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      await navigator.clipboard.writeText(data.url)
      setCopiedLink(agent.id)
      setTimeout(() => setCopiedLink(null), 2500)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setGeneratingLink(null)
    }
  }

  async function logContact() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/sales-cockpit/outreach-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selected.id,
          channel: logChannel,
          notes: logNotes || null,
          status: logStatus,
        }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/sales-cockpit')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      const updatedEntry: OutreachEntry = {
        id: data.log.id,
        channel: logChannel,
        notes: logNotes || null,
        status: logStatus,
        contacted_at: data.log.contacted_at ?? new Date().toISOString(),
      }
      const updatedAgent: Agent = {
        ...selected,
        outreach_status: logStatus as Agent['outreach_status'],
        last_contacted_at: updatedEntry.contacted_at,
        last_channel: logChannel,
        outreach_history: [updatedEntry, ...selected.outreach_history],
      }
      setAgents(prev => prev.map(a => a.id === selected.id ? updatedAgent : a))
      setSelected(updatedAgent)
      setLogNotes('')
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(agent: Agent, status: string) {
    setStatusUpdating(agent.id)
    try {
      const res = await fetch('/api/admin/sales-cockpit/outreach-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, status }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/sales-cockpit')
        return
      }
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed')
      }
      const updatedAgent: Agent = { ...agent, outreach_status: status as Agent['outreach_status'] }
      setAgents(prev => prev.map(a => a.id === agent.id ? updatedAgent : a))
      if (selected?.id === agent.id) setSelected(updatedAgent)
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setStatusUpdating(null)
    }
  }

  const filtered = agents.filter(a =>
    filterStatus === 'all' ? true : a.outreach_status === filterStatus
  )

  const counts = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.outreach_status] = (acc[a.outreach_status] ?? 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Sales Cockpit</h1>
        <p className="mt-4 text-gray-500">Loading warm leads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Sales Cockpit</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Cockpit</h1>
        <p className="text-gray-500 text-sm mt-1">
          Email-verified inactive agents — identify, reach out, generate payment links, close.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'new', 'contacted', 'interested', 'declined', 'closed'] as const).map(s => {
          const count = s === 'all' ? agents.length : (counts[s] ?? 0)
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No agents match this filter.</div>
            ) : (
              <table className="w-full text-sm" data-testid="sales-cockpit-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(agent => (
                    <tr
                      key={agent.id}
                      onClick={() => setSelected(agent)}
                      className={`hover:bg-gray-50 cursor-pointer ${selected?.id === agent.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-gray-400 text-xs">{agent.email}</p>
                        {agent.phone && <p className="text-gray-400 text-xs">{agent.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {agent.plan_tier}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">Step {agent.onboarding_step}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{daysSince(agent.last_login_at)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={agent.outreach_status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(agent, e.target.value)}
                          disabled={statusUpdating === agent.id}
                          className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${STATUS_STYLES[agent.outreach_status]}`}
                          data-testid={`status-select-${agent.id}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); generatePaymentLink(agent) }}
                          disabled={generatingLink === agent.id}
                          className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                          data-testid={`payment-link-btn-${agent.id}`}
                        >
                          {generatingLink === agent.id
                            ? '...'
                            : copiedLink === agent.id
                            ? '✓ Copied!'
                            : 'Payment Link'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
              {filtered.length} of {agents.length} agents
            </div>
          </div>
        </div>

        {/* Detail / Log Contact panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-900">{selected.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.email}</p>
                <p className="text-xs text-gray-400">Signed up {fmtDate(selected.created_at)}</p>
                <span className={`inline-flex mt-2 items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[selected.outreach_status]}`}>
                  {STATUS_LABELS[selected.outreach_status]}
                </span>
              </div>

              {/* Log Contact form */}
              <div className="border-t pt-4 mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Log Contact</h3>
                <div className="space-y-2">
                  <select
                    value={logChannel}
                    onChange={e => setLogChannel(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="sms">SMS</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                  <select
                    value={logStatus}
                    onChange={e => setLogStatus(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5"
                  >
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="declined">Declined</option>
                    <option value="closed">Closed (Won)</option>
                  </select>
                  <textarea
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 h-20 resize-none"
                  />
                  <button
                    onClick={logContact}
                    disabled={submitting}
                    className="w-full bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                    data-testid="log-contact-btn"
                  >
                    {submitting ? 'Saving...' : 'Log Contact'}
                  </button>
                </div>
              </div>

              {/* Outreach history */}
              {selected.outreach_history.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">History</h3>
                  <ul className="space-y-2">
                    {selected.outreach_history.map(entry => (
                      <li key={entry.id} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium capitalize">{entry.channel}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_STYLES[entry.status]}`}>
                            {STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                        </div>
                        <p className="text-gray-400">{fmtDate(entry.contacted_at)}</p>
                        {entry.notes && <p className="mt-0.5 text-gray-600">{entry.notes}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Select an agent to log contact or generate a payment link.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
