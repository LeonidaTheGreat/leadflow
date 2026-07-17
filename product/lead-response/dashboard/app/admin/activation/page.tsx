'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsAgent {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone_number: string | null
  created_at: string
  last_activation_sms_at: string | null
}

interface PaymentReadyAgent {
  id: string
  name: string
  email: string
  plan_tier: string | null
  stripe_customer_id: string | null
  created_at: string
}

type ActiveTab = 'sms-nudge' | 'payment-ready'

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

// ─── SMS Nudge Tab ─────────────────────────────────────────────────────────────

function SmsNudgeTab() {
  const router = useRouter()
  const [agents, setAgents] = useState<SmsAgent[]>([])
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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function sendNudge(agent: SmsAgent) {
    setSending((prev) => ({ ...prev, [agent.id]: true }))
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
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, last_activation_sms_at: now } : a))
        )
        showToast(`SMS sent to ${agent.email}`)
      } else if (result?.status === 'skipped') {
        showToast(`Skipped: ${result.error}`)
      } else {
        showToast(`Failed: ${result?.error ?? 'Unknown error'}`)
      }
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending((prev) => ({ ...prev, [agent.id]: false }))
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
        (data.results ?? [])
          .filter((r: { status: string }) => r.status === 'sent')
          .map((r: { id: string }) => r.id)
      )
      setAgents((prev) =>
        prev.map((a) => (sentIds.has(a.id) ? { ...a, last_activation_sms_at: sentNow } : a))
      )
      showToast(`Sent ${data.sent} SMS nudge${data.sent !== 1 ? 's' : ''}`)
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setNudgingAll(false)
    }
  }

  const pendingCount = agents.filter((a) => !a.last_activation_sms_at && a.phone_number).length

  if (loading) return <p className="mt-4 text-gray-500">Loading stuck agents...</p>
  if (error) return <p className="mt-4 text-red-600">Error: {error}</p>

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-500 text-sm">
          Email-verified agents who never started onboarding (step 0). SMS works better than email here.
        </p>
        <button
          onClick={nudgeAll}
          disabled={nudgingAll || pendingCount === 0}
          data-testid="nudge-all-btn"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {nudgingAll ? 'Sending...' : `Nudge All (${pendingCount} unsent)`}
        </button>
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
    </>
  )
}

// ─── Payment Link Modal ────────────────────────────────────────────────────────

interface PaymentLinkModalProps {
  url: string
  email: string
  onClose: () => void
}

function PaymentLinkModal({ url, email, onClose }: PaymentLinkModalProps) {
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Link Generated</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Share this link with <span className="font-medium text-gray-700">{email}</span>:
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 break-all text-xs text-gray-700 font-mono">
          {url}
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            data-testid="copy-payment-link-btn"
            className="flex-1 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Ready Tab ─────────────────────────────────────────────────────────

function PaymentReadyTab() {
  const router = useRouter()
  const [agents, setAgents] = useState<PaymentReadyAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({})
  const [modal, setModal] = useState<{ url: string; email: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/payment-ready')
        if (res.status === 401) {
          router.replace('/admin/login?redirect=/admin/activation')
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setAgents(data.agents ?? [])
        // Pre-select tier from agent's current plan_tier
        const defaults: Record<string, string> = {}
        for (const a of (data.agents ?? [])) {
          defaults[a.id] = a.plan_tier ?? 'pro'
        }
        setSelectedTier(defaults)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const generateLink = useCallback(async (agent: PaymentReadyAgent) => {
    const planTier = selectedTier[agent.id] ?? 'pro'
    setGenerating((prev) => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, planTier }),
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
      setModal({ url: data.url, email: agent.email })
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setGenerating((prev) => ({ ...prev, [agent.id]: false }))
    }
  }, [selectedTier, router])

  if (loading) return <p className="mt-4 text-gray-500">Loading ready-to-pay agents...</p>
  if (error) return <p className="mt-4 text-red-600">Error: {error}</p>

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {modal && (
        <PaymentLinkModal
          url={modal.url}
          email={modal.email}
          onClose={() => setModal(null)}
        />
      )}

      <p className="text-gray-500 text-sm mb-4">
        Agents who completed onboarding but haven&apos;t subscribed. Generate a Stripe Payment Link and share it directly.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No agents are ready to pay right now. Check back after more agents complete onboarding.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="payment-ready-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed Up</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Stripe Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(agent => {
                const isGenerating = generating[agent.id]
                const tier = selectedTier[agent.id] ?? 'pro'

                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-gray-400 text-xs">{agent.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={tier}
                        onChange={(e) => setSelectedTier((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                        data-testid={`tier-select-${agent.id}`}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="starter">Starter ($49/mo)</option>
                        <option value="pro">Pro ($149/mo)</option>
                        <option value="team">Team ($399/mo)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(agent.created_at)}
                      <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {agent.stripe_customer_id ? (
                        <span className="text-green-600 font-mono truncate block max-w-[120px]" title={agent.stripe_customer_id}>
                          {agent.stripe_customer_id.substring(0, 14)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => generateLink(agent)}
                        disabled={isGenerating}
                        data-testid={`generate-link-btn-${agent.id}`}
                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isGenerating ? 'Generating...' : 'Generate Payment Link'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} ready to pay
        </div>
      </div>
    </>
  )
}

// ─── Revenue Config Banner ────────────────────────────────────────────────────

interface RevenueHealth {
  stripe: {
    ok: boolean
    secretKey: string
    webhookSecret: string
    prices: { valid: string[]; missing: string[]; placeholder: string[] }
  }
  email: { ok: boolean; resendApiKey: string; domain: string | null }
  overall: 'ok' | 'degraded' | 'broken'
}

function RevenueConfigBanner() {
  const [health, setHealth] = useState<RevenueHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/revenue-config-health')
        if (!res.ok) {
          setError(`HTTP ${res.status}`)
          return
        }
        setHealth(await res.json())
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return null
  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Failed to load revenue config: {error}
      </div>
    )
  }
  if (!health) return null
  if (health.overall === 'ok') {
    return (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700" data-testid="revenue-config-banner">
        <span className="font-semibold">Revenue config OK</span> — Stripe keys, price IDs, and email are all configured.
      </div>
    )
  }

  const issues: string[] = []
  if (health.stripe.secretKey !== 'valid') issues.push('STRIPE_SECRET_KEY missing or invalid format (need sk_live_* or sk_test_*)')
  if (health.stripe.webhookSecret !== 'set') issues.push('STRIPE_WEBHOOK_SECRET not set')
  if (health.stripe.prices.missing.length > 0) issues.push(`Missing price IDs: ${health.stripe.prices.missing.join(', ')}`)
  if (health.stripe.prices.placeholder.length > 0) issues.push(`Placeholder price IDs (not real Stripe IDs): ${health.stripe.prices.placeholder.join(', ')}`)
  if (health.email.resendApiKey !== 'set') issues.push('RESEND_API_KEY not set')
  if (!health.email.domain) issues.push('FROM_EMAIL not configured')

  const bg = health.overall === 'broken' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'

  return (
    <div className={`mb-6 p-4 border rounded-lg text-sm ${bg}`} data-testid="revenue-config-banner">
      <p className="font-semibold mb-2">
        Revenue config: {health.overall === 'broken' ? 'BROKEN — payments will fail' : 'DEGRADED — some features unavailable'}
      </p>
      <ul className="list-disc list-inside space-y-1">
        {issues.map((issue, i) => (
          <li key={i}>{issue}</li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivationPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sms-nudge')

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'sms-nudge', label: 'SMS Nudge' },
    { id: 'payment-ready', label: 'Ready to Pay' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <RevenueConfigBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage agent activation nudges and payment collection.
        </p>
      </div>

      {/* Tab nav */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 pb-3 text-sm font-semibold text-indigo-600'
                  : 'pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'sms-nudge' && <SmsNudgeTab />}
      {activeTab === 'payment-ready' && <PaymentReadyTab />}
    </div>
  )
}
