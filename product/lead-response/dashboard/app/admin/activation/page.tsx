'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

interface PaymentAgent {
  id: string
  email: string
  full_name: string | null
  plan_tier: string | null
  stripe_customer_id: string | null
  created_at: string
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

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter — $49/mo' },
  { value: 'pro', label: 'Pro — $149/mo' },
  { value: 'team', label: 'Team — $399/mo' },
]

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
      {msg}
    </div>
  )
}

function PaymentLinkModal({
  url,
  agentEmail,
  onClose,
}: {
  url: string
  agentEmail: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Link Ready</h2>
        <p className="text-sm text-gray-500 mb-4">
          Send this link to <span className="font-medium text-gray-700">{agentEmail}</span> via
          email, SMS, or any channel. When they pay, their account activates automatically.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <span className="text-sm text-gray-700 break-all font-mono">{url}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            data-testid="copy-link-btn"
            className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

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

  if (loading) return <p className="text-gray-500 mt-4">Loading stuck agents...</p>
  if (error) return <p className="text-red-600 mt-4">Error: {error}</p>

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-500 text-sm">
          Email-verified agents who never started onboarding (step 0). Email is broken — SMS works.
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
      <p className="text-xs text-gray-400 mb-4">
        &ldquo;Nudge All&rdquo; only targets agents with a phone on file who have never been nudged.
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No stuck agents found. Either everyone has progressed or there are no verified signups
            yet.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="activation-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Signed Up
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  SMS Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => {
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
                      {hasPhone ? (
                        agent.phone_number
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(agent.created_at)}
                      <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {alreadySent ? (
                        <span className="text-green-600">
                          {fmtDate(agent.last_activation_sms_at)}
                        </span>
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
                          {isSending
                            ? 'Sending...'
                            : alreadySent
                              ? 'Resend SMS'
                              : 'Send SMS Nudge'}
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

function PaymentLinksTab() {
  const router = useRouter()
  const [agents, setAgents] = useState<PaymentAgent[]>([])
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

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payment-link')
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
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function generateLink(agent: PaymentAgent) {
    const tier = selectedTier[agent.id] || agent.plan_tier || 'starter'
    setGenerating((prev) => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, planTier: tier }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/activation')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Failed to create link'}`)
        return
      }
      setModal({ url: data.url, email: agent.email })
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setGenerating((prev) => ({ ...prev, [agent.id]: false }))
    }
  }

  if (loading) return <p className="text-gray-500 mt-4">Loading completed-onboarding agents...</p>
  if (error) return <p className="text-red-600 mt-4">Error: {error}</p>

  return (
    <>
      {toast && <Toast msg={toast} />}
      {modal && (
        <PaymentLinkModal
          url={modal.url}
          agentEmail={modal.email}
          onClose={() => setModal(null)}
        />
      )}
      <p className="text-gray-500 text-sm mb-4">
        Agents who completed onboarding but cannot pay because the Checkout Session flow is broken.
        Generate a Stripe Payment Link and send it via any channel — no ENV price IDs required.
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No agents found. Either all onboarded agents are already paying, or no one has completed
            onboarding yet.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="payment-link-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Current Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Signed Up
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Link Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => {
                const isGenerating = generating[agent.id]
                const tier = selectedTier[agent.id] || agent.plan_tier || 'starter'
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agent.full_name || agent.email}</p>
                      <p className="text-gray-400 text-xs">{agent.email}</p>
                      {agent.stripe_customer_id && (
                        <p className="text-gray-300 text-xs font-mono">{agent.stripe_customer_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs capitalize">
                      {agent.plan_tier || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {fmtDate(agent.created_at)}
                      <span className="ml-1 text-gray-400">({daysSince(agent.created_at)})</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={tier}
                        onChange={(e) =>
                          setSelectedTier((prev) => ({ ...prev, [agent.id]: e.target.value }))
                        }
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
                        data-testid={`tier-select-${agent.id}`}
                      >
                        {PLAN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => generateLink(agent)}
                        disabled={isGenerating}
                        data-testid={`generate-link-btn-${agent.id}`}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isGenerating ? 'Generating...' : 'Generate Link'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} ready for payment link
        </div>
      </div>
    </>
  )
}

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

type Tab = 'sms' | 'payment-links'

export default function ActivationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sms')

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'sms', label: 'SMS Nudge' },
    { id: 'payment-links', label: 'Payment Links' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <RevenueConfigBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tools to manually activate agents stuck in the funnel.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sms' && <SmsNudgeTab />}
      {activeTab === 'payment-links' && <PaymentLinksTab />}
    </div>
  )
}
