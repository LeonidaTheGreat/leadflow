'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Revenue Config Health Types ──────────────────────────────────────────────

interface RevenueConfigHealth {
  stripe: { ok: boolean; keyConfigured: boolean; missing: string[]; invalid: string[] }
  email: { ok: boolean; domain: string | null }
  overall: 'ok' | 'degraded' | 'broken'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NudgeAgent {
  id: string
  name: string
  first_name: string | null
  email: string
  phone_number: string | null
  onboarding_step: number
  created_at: string
  last_activation_sms_at: string | null
}

interface CompletedAgent {
  id: string
  name: string
  first_name: string | null
  email: string
  phone_number: string | null
  plan_tier: string
  has_stripe_customer: boolean
  onboarding_completed_at: string | null
  created_at: string
}

type Tab = 'not_started' | 'in_progress' | 'ready_to_pay'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter ($49/mo)',
  pro: 'Pro ($149/mo)',
  team: 'Team ($399/mo)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivationPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('not_started')

  // Not Started tab state
  const [nudgeAgents, setNudgeAgents] = useState<NudgeAgent[]>([])
  const [nudgeLoading, setNudgeLoading] = useState(false)
  const [nudgeSending, setNudgeSending] = useState<Record<string, boolean>>({})
  const [nudgingAll, setNudgingAll] = useState(false)

  // In Progress tab state
  const [inProgressAgents, setInProgressAgents] = useState<NudgeAgent[]>([])
  const [inProgressLoading, setInProgressLoading] = useState(false)

  // Ready to Pay tab state
  const [completedAgents, setCompletedAgents] = useState<CompletedAgent[]>([])
  const [completedLoading, setCompletedLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({})
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<{ agentId: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [toast, setToast] = useState<string | null>(null)

  // Revenue config health state
  const [configHealth, setConfigHealth] = useState<RevenueConfigHealth | null>(null)
  const [configHealthLoading, setConfigHealthLoading] = useState(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handle401() {
    router.replace('/admin/login?redirect=/admin/activation')
  }

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadNudgeAgents = useCallback(async (stage: 'not_started' | 'in_progress') => {
    const setter = stage === 'not_started' ? setNudgeAgents : setInProgressAgents
    const loadingSetter = stage === 'not_started' ? setNudgeLoading : setInProgressLoading
    loadingSetter(true)
    try {
      const res = await fetch(`/api/admin/activation?stage=${stage}`)
      if (res.status === 401) { handle401(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setter(data.agents ?? [])
    } catch (e: any) {
      showToast(`Error loading agents: ${e.message}`)
    } finally {
      loadingSetter(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCompletedAgents = useCallback(async () => {
    setCompletedLoading(true)
    try {
      const res = await fetch('/api/admin/activation/completed')
      if (res.status === 401) { handle401(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCompletedAgents(data.agents ?? [])
    } catch (e: any) {
      showToast(`Error loading agents: ${e.message}`)
    } finally {
      setCompletedLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load revenue config health on mount
  useEffect(() => {
    fetch('/api/admin/revenue-config-health', {
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_LEADFLOW_API_KEY ?? '' },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setConfigHealth(data) })
      .catch(() => {/* non-critical — fail silently */})
      .finally(() => setConfigHealthLoading(false))
  }, [])

  // Load tab data on mount and tab switch
  useEffect(() => {
    if (activeTab === 'not_started') loadNudgeAgents('not_started')
    if (activeTab === 'in_progress') loadNudgeAgents('in_progress')
    if (activeTab === 'ready_to_pay') loadCompletedAgents()
  }, [activeTab, loadNudgeAgents, loadCompletedAgents])

  // ─── SMS Nudge actions ───────────────────────────────────────────────────────

  async function sendNudge(agent: NudgeAgent) {
    setNudgeSending(prev => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      })
      if (res.status === 401) { handle401(); return }
      const data = await res.json()
      if (!res.ok) { showToast(`Error: ${data.error ?? 'Unknown error'}`); return }
      const result = data.results?.[0]
      if (result?.status === 'sent') {
        const now = new Date().toISOString()
        setNudgeAgents(prev => prev.map(a => a.id === agent.id ? { ...a, last_activation_sms_at: now } : a))
        showToast(`SMS sent to ${agent.email}`)
      } else if (result?.status === 'skipped') {
        showToast(`Skipped: ${result.error}`)
      } else {
        showToast(`Failed: ${result?.error ?? 'Unknown error'}`)
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setNudgeSending(prev => ({ ...prev, [agent.id]: false }))
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
      if (res.status === 401) { handle401(); return }
      const data = await res.json()
      if (!res.ok) { showToast(`Error: ${data.error ?? 'Unknown error'}`); return }
      const sentNow = new Date().toISOString()
      const sentIds = new Set(
        (data.results ?? []).filter((r: any) => r.status === 'sent').map((r: any) => r.id)
      )
      setNudgeAgents(prev =>
        prev.map(a => sentIds.has(a.id) ? { ...a, last_activation_sms_at: sentNow } : a)
      )
      showToast(`Sent ${data.sent} SMS nudge${data.sent !== 1 ? 's' : ''}`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setNudgingAll(false)
    }
  }

  // ─── Payment link actions ────────────────────────────────────────────────────

  async function generatePaymentLink(agent: CompletedAgent) {
    const tier = selectedTier[agent.id] ?? agent.plan_tier ?? 'starter'
    setGeneratingLink(agent.id)
    try {
      const res = await fetch('/api/admin/sales-cockpit/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, tier }),
      })
      if (res.status === 401) { handle401(); return }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Failed to generate link'}`)
        return
      }
      setGeneratedLink({ agentId: agent.id, url: data.url })
      setCopied(false)
    } catch (e: any) {
      showToast(`Error: ${e.message}`)
    } finally {
      setGeneratingLink(null)
    }
  }

  async function copyLink() {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('Copy failed — select and copy manually')
    }
  }

  // ─── Tab rendering ───────────────────────────────────────────────────────────

  const pendingNudgeCount = nudgeAgents.filter(a => !a.last_activation_sms_at && a.phone_number).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Payment link modal */}
      {generatedLink && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setGeneratedLink(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Link Ready</h2>
            <p className="text-sm text-gray-500 mb-4">
              Send this link via any channel. Agent pays directly — no Checkout Session needed.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 break-all text-sm text-blue-700 font-mono">
              {generatedLink.url}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                data-testid="copy-link-btn"
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => setGeneratedLink(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue config health banner */}
      {!configHealthLoading && configHealth && configHealth.overall !== 'ok' && (
        <div
          data-testid="revenue-config-health-banner"
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            configHealth.overall === 'broken'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <p className="font-semibold mb-1">
            {configHealth.overall === 'broken'
              ? 'Payments are broken — Stripe is not configured'
              : 'Payments degraded — some price IDs are missing'}
          </p>
          {!configHealth.stripe.keyConfigured && (
            <p>STRIPE_SECRET_KEY is not set or invalid (must start with sk_live_ or sk_test_)</p>
          )}
          {configHealth.stripe.missing.length > 0 && (
            <p>Missing Stripe price IDs: {configHealth.stripe.missing.join(', ')}</p>
          )}
          {configHealth.stripe.invalid.length > 0 && (
            <p>Invalid Stripe price IDs (placeholder values): {configHealth.stripe.invalid.join(', ')}</p>
          )}
          {!configHealth.email.ok && (
            <p>RESEND_API_KEY is not configured — welcome emails will not send</p>
          )}
          <p className="mt-1 text-xs opacity-75">
            Set these in Vercel → Project → Settings → Environment Variables. See docs/guides/STRIPE-SETUP.md.
          </p>
        </div>
      )}
      {!configHealthLoading && configHealth?.overall === 'ok' && (
        <div
          data-testid="revenue-config-health-ok"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700"
        >
          Stripe + email configured correctly
          {configHealth.email.domain && ` — sending from @${configHealth.email.domain}`}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activation</h1>
        <p className="text-sm text-gray-500 mt-1">Move agents from signup to paying customer.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {([
            { id: 'not_started', label: 'Not Started', count: nudgeAgents.length },
            { id: 'in_progress', label: 'In Progress', count: inProgressAgents.length },
            { id: 'ready_to_pay', label: 'Ready to Pay', count: completedAgents.length },
          ] as { id: Tab; label: string; count: number }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && tab.count > 0 && (
                <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Not Started ── */}
      {activeTab === 'not_started' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                Email-verified agents who never started onboarding. SMS works when email is broken.
              </p>
            </div>
            <button
              onClick={nudgeAll}
              disabled={nudgingAll || pendingNudgeCount === 0}
              data-testid="nudge-all-btn"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {nudgingAll ? 'Sending...' : `Nudge All (${pendingNudgeCount} unsent)`}
            </button>
          </div>
          <AgentTable
            agents={nudgeAgents}
            loading={nudgeLoading}
            emptyMessage="No stuck agents. Either everyone progressed or there are no verified signups."
            columns={['Agent', 'Phone', 'Signed Up', 'SMS Sent', 'Action']}
            renderRow={(agent: NudgeAgent) => {
              const hasPhone = !!agent.phone_number
              const alreadySent = !!agent.last_activation_sms_at
              const isSending = !!nudgeSending[agent.id]
              return (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-gray-400 text-xs">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {hasPhone ? agent.phone_number : <span className="text-gray-400 italic">None</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(agent.created_at)}
                    <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {alreadySent
                      ? <span className="text-green-600">{fmtDate(agent.last_activation_sms_at)}</span>
                      : <span className="text-gray-400">Never</span>
                    }
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
                      <span className="text-xs text-gray-400 italic" data-testid={`nudge-disabled-${agent.id}`}>
                        No phone on file
                      </span>
                    )}
                  </td>
                </tr>
              )
            }}
          />
        </div>
      )}

      {/* ── Tab: In Progress ── */}
      {activeTab === 'in_progress' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Agents who started onboarding but haven't finished. They may need a nudge to complete setup.
          </p>
          <AgentTable
            agents={inProgressAgents}
            loading={inProgressLoading}
            emptyMessage="No agents currently in progress."
            columns={['Agent', 'Step', 'Signed Up', 'Last SMS']}
            renderRow={(agent: NudgeAgent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{agent.name}</p>
                  <p className="text-gray-400 text-xs">{agent.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-yellow-100 text-yellow-800 font-medium px-2 py-0.5 rounded">
                    Step {agent.onboarding_step}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {fmtDate(agent.created_at)}
                  <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {agent.last_activation_sms_at ? fmtDate(agent.last_activation_sms_at) : <span className="text-gray-400">Never</span>}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* ── Tab: Ready to Pay ── */}
      {activeTab === 'ready_to_pay' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Agents who completed onboarding but haven&apos;t activated a subscription. Send them a direct payment link.
          </p>
          <AgentTable
            agents={completedAgents}
            loading={completedLoading}
            emptyMessage="No completed-onboarding agents awaiting payment."
            columns={['Agent', 'Plan', 'Completed', 'Action']}
            renderRow={(agent: CompletedAgent) => {
              const tier = selectedTier[agent.id] ?? agent.plan_tier ?? 'starter'
              const isGenerating = generatingLink === agent.id
              const hasLink = generatedLink?.agentId === agent.id
              return (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-gray-400 text-xs">{agent.email}</p>
                    {agent.has_stripe_customer && (
                      <span className="text-xs text-emerald-600">✓ Stripe customer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={tier}
                      onChange={e => setSelectedTier(prev => ({ ...prev, [agent.id]: e.target.value }))}
                      data-testid={`tier-select-${agent.id}`}
                      className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="starter">Starter ($49/mo)</option>
                      <option value="pro">Pro ($149/mo)</option>
                      <option value="team">Team ($399/mo)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {agent.onboarding_completed_at
                      ? <>{fmtDate(agent.onboarding_completed_at)} <span className="text-gray-400">({daysSince(agent.onboarding_completed_at)})</span></>
                      : fmtDate(agent.created_at)
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => generatePaymentLink(agent)}
                      disabled={isGenerating}
                      data-testid={`payment-link-btn-${agent.id}`}
                      className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                        hasLink
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isGenerating ? 'Generating...' : hasLink ? 'Regenerate Link' : 'Generate Payment Link'}
                    </button>
                  </td>
                </tr>
              )
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Table wrapper component ─────────────────────────────────────────────────

function AgentTable<T>({
  agents,
  loading,
  emptyMessage,
  columns,
  renderRow,
}: {
  agents: T[]
  loading: boolean
  emptyMessage: string
  columns: string[]
  renderRow: (agent: T) => React.ReactNode
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {agents.length === 0 ? (
        <div className="p-8 text-center text-gray-400">{emptyMessage}</div>
      ) : (
        <table className="w-full text-sm" data-testid="activation-table">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">{agents.map(renderRow)}</tbody>
        </table>
      )}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        {agents.length} agent{agents.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
