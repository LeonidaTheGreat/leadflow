'use client'

/*
 * Task Spec: c8cd1b56-5ebd-45af-9053-a02bfe2ba544
 * What:
 * - Change product/lead-response/dashboard/app/admin/payment-links/page.tsx:
 *   align PaymentLinksPage with the existing dashboard admin API by loading
 *   candidates from /api/admin/payment-ready and posting plan tiers accepted by
 *   app/api/admin/create-payment-link/route.ts.
 * - Change product/lead-response/dashboard/__tests__/admin-create-payment-link.test.ts:
 *   add static regression coverage for the dashboard payment-link page endpoint
 *   and plan tier contract.
 * Verify:
 * - npx jest tests/admin-payment-link.test.js should pass 17/17 when local
 *   dependencies are installed.
 * - cd product/lead-response/dashboard && npm test -- __tests__/admin-create-payment-link.test.ts
 *   should pass when local dependencies are installed.
 * - npm run build and cd product/lead-response/dashboard && npm run build should exit 0.
 * Boundaries:
 * - Do not modify /api/billing/create-checkout or checkout-session flows.
 * - Do not change Stripe webhook behavior, pricing amounts, database schema, or
 *   root Express API contracts beyond the already-shipped payment-link feature.
 * - Do not touch protected generated project docs/config.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  plan_tier: string | null
  stripe_customer_id: string | null
  created_at: string
}

type PlanTier = 'starter' | 'pro' | 'team'

interface ModalState {
  agentEmail: string
  url: string
}

const PLAN_TIERS: PlanTier[] = ['starter', 'pro', 'team']
const PLAN_PRICES: Record<PlanTier, string> = {
  starter: '$49/mo',
  pro: '$149/mo',
  team: '$399/mo',
}
const PLAN_LABELS: Record<PlanTier, string> = {
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
}

function agentName(agent: Agent): string {
  if (agent.first_name || agent.last_name) {
    return [agent.first_name, agent.last_name].filter(Boolean).join(' ')
  }
  return agent.email.split('@')[0]
}

function fmtDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PaymentLinksPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [selectedTier, setSelectedTier] = useState<Record<string, PlanTier>>({})
  const [modal, setModal] = useState<ModalState | null>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payment-ready')
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/payment-links')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const agentList: Agent[] = data.agents ?? []
      setAgents(agentList)
      const defaults: Record<string, PlanTier> = {}
      agentList.forEach(a => {
        defaults[a.id] = (PLAN_TIERS.includes(a.plan_tier as PlanTier) ? a.plan_tier : 'starter') as PlanTier
      })
      setSelectedTier(defaults)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  async function generateLink(agent: Agent) {
    const tier = selectedTier[agent.id] ?? 'starter'
    setGenerating(prev => ({ ...prev, [agent.id]: true }))
    try {
      const res = await fetch('/api/admin/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: agent.id, planTier: tier }),
      })
      if (res.status === 401) {
        router.replace('/admin/login?redirect=/admin/payment-links')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        showToast(`Error: ${data.error ?? 'Unknown error'}`)
        return
      }
      setModal({ agentEmail: agent.email, url: data.url })
      setCopied(false)
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setGenerating(prev => ({ ...prev, [agent.id]: false }))
    }
  }

  async function copyUrl() {
    if (!modal) return
    try {
      await navigator.clipboard.writeText(modal.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('Copy failed — select and copy manually')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Direct Payment Links</h1>
        <p className="mt-4 text-gray-500">Loading candidates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Direct Payment Links</h1>
        <p className="mt-4 text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Payment Link Generated</h2>
            <p className="text-sm text-gray-500 mb-4">
              Send this link to <span className="font-medium text-gray-700">{modal.agentEmail}</span> via any channel.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
              <span
                className="block text-sm text-blue-700 break-all font-mono select-all"
                data-testid="payment-link-url"
              >
                {modal.url}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyUrl}
                data-testid="copy-link-btn"
                className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="py-2 px-4 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Direct Payment Links</h1>
        <p className="text-gray-500 text-sm mt-1">
          Agents who completed onboarding but cannot pay via standard checkout. Generate a Stripe Payment Link to send directly.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No eligible agents. All completed-onboarding agents have an active subscription.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="payment-link-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed Up</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(agent => {
                const tier = selectedTier[agent.id] ?? 'starter'
                const isGenerating = generating[agent.id]
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agentName(agent)}</p>
                      <p className="text-gray-400 text-xs">{agent.email}</p>
                      {agent.stripe_customer_id && (
                        <p className="text-gray-300 text-xs font-mono">{agent.stripe_customer_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(agent.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={tier}
                        onChange={e => setSelectedTier(prev => ({ ...prev, [agent.id]: e.target.value as PlanTier }))}
                        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        data-testid={`tier-select-${agent.id}`}
                      >
                        {PLAN_TIERS.map(t => (
                          <option key={t} value={t}>
                            {PLAN_LABELS[t]} — {PLAN_PRICES[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => generateLink(agent)}
                        disabled={isGenerating}
                        data-testid={`generate-btn-${agent.id}`}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
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
          {agents.length} agent{agents.length !== 1 ? 's' : ''} eligible for direct payment link
        </div>
      </div>
    </div>
  )
}
