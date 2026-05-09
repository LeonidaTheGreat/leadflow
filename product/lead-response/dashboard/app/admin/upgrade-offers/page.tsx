'use client'

import { useEffect, useState, useCallback } from 'react'
import { Link2, Copy, CheckCircle, Clock, Loader2 } from 'lucide-react'

const VALID_TIERS = ['starter', 'pro', 'team'] as const
type Tier = typeof VALID_TIERS[number]

interface Agent {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  plan_tier: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  created_at: string
}

interface GeneratedLink {
  agentId: string
  tier: Tier
  url: string
  sessionId: string
  expiresAt: string
  discountPercent?: number
}

function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}

function promptForToken(): string | null {
  const entered = prompt('Enter admin token (ADMIN_SECRET):')
  if (entered) {
    localStorage.setItem('admin_token', entered)
  }
  return entered
}

function getStatusBadge(agent: Agent): { label: string; className: string } {
  const status = agent.subscription_status?.toLowerCase()
  const tier = agent.plan_tier?.toLowerCase()

  if (status === 'active') {
    return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' }
  }
  if (tier === 'pilot' || status === 'trialing' || status === 'trial') {
    return { label: 'Pilot / Trial', className: 'bg-blue-100 text-blue-700' }
  }
  return { label: tier || status || 'Free', className: 'bg-slate-100 text-slate-600' }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getExpiryCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 0) return `Expires in ${hours}h ${mins}m`
  return `Expires in ${mins}m`
}

// ─── Per-agent row ────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  generatedLink,
  onGenerate,
}: {
  agent: Agent
  generatedLink: GeneratedLink | undefined
  onGenerate: (agentId: string, tier: Tier, discountPercent?: number) => Promise<void>
}) {
  const [tier, setTier] = useState<Tier>('starter')
  const [discount, setDiscount] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const badge = getStatusBadge(agent)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const d = discount ? Number(discount) : undefined
      await onGenerate(agent.id, tier, d)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <tr className="hover:bg-slate-800/40">
      {/* Agent */}
      <td className="px-4 py-3">
        <p className="font-medium text-white text-sm">
          {[agent.first_name, agent.last_name].filter(Boolean).join(' ') || '(no name)'}
        </p>
        <p className="text-slate-400 text-xs mt-0.5">{agent.email}</p>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(agent.created_at)}</td>

      {/* Tier picker */}
      <td className="px-4 py-3">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          data-testid={`tier-select-${agent.id}`}
        >
          {VALID_TIERS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </td>

      {/* Discount */}
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          max={99}
          placeholder="None"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="w-20 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
          data-testid={`discount-input-${agent.id}`}
        />
        {discount && <span className="text-slate-400 text-xs ml-1">%</span>}
      </td>

      {/* Generate button */}
      <td className="px-4 py-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid={`generate-link-${agent.id}`}
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Link2 className="h-3 w-3" />
          )}
          {generating ? 'Generating…' : 'Generate Link'}
        </button>
      </td>

      {/* Generated link */}
      <td className="px-4 py-3">
        {generatedLink ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition"
                data-testid={`copy-link-${agent.id}`}
              >
                {copied ? (
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={generatedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 truncate max-w-[160px]"
                data-testid={`open-link-${agent.id}`}
              >
                Open
              </a>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {getExpiryCountdown(generatedLink.expiresAt)}
            </div>
            {generatedLink.discountPercent && (
              <span className="text-xs text-amber-400">{generatedLink.discountPercent}% off</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-600">No link yet</span>
        )}
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UpgradeOffersPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState<string>('')
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, GeneratedLink>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getAdminToken()
    if (stored) setAdminToken(stored)
  }, [])

  useEffect(() => {
    if (!adminToken) {
      setLoading(false)
      return
    }

    async function loadCandidates() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/payment-links', {
          headers: { 'x-admin-token': adminToken },
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        setAgents(data.candidates ?? [])
      } catch (err: any) {
        setError(err.message || 'Failed to load candidates')
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [adminToken])

  const handleGenerate = useCallback(
    async (agentId: string, tier: Tier, discountPercent?: number) => {
      let token = adminToken
      if (!token) {
        const entered = promptForToken()
        if (!entered) return
        token = entered
        setAdminToken(entered)
      }

      setGlobalError(null)
      try {
        const res = await fetch('/api/admin/payment-links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token,
          },
          body: JSON.stringify({ agentId, tier, discountPercent }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        setGeneratedLinks((prev) => ({
          ...prev,
          [agentId]: { agentId, tier, discountPercent, ...data },
        }))
      } catch (err: any) {
        setGlobalError(err.message || 'Failed to generate link')
      }
    },
    [adminToken]
  )

  // Auth gate — prompt for token
  if (!adminToken && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        <h1 className="text-3xl font-semibold">Payment Links</h1>
        <p className="mt-3 text-slate-400">Generate shareable Stripe Checkout URLs for pilot agents.</p>
        <div className="mt-6">
          <button
            onClick={() => {
              const t = promptForToken()
              if (t) setAdminToken(t)
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
          >
            Enter Admin Token
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.15),_transparent_40%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Admin / Conversion</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Payment Links</h1>
          <p className="mt-3 text-base text-slate-300">
            Generate shareable Stripe Checkout URLs to send via iMessage, WhatsApp, LinkedIn — no login required.
            Links expire in 24 hours.
          </p>
        </div>

        {/* Global error */}
        {globalError && (
          <div className="rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200 text-sm">
            {globalError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400 text-sm flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading upgrade candidates…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Agents table */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Upgrade Candidates</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {agents.length} pilot/trial agents — select tier, set optional discount, generate link.
                </p>
              </div>
              <span className="text-xs text-slate-500 border border-slate-700 rounded px-2 py-1">
                Token set
              </span>
            </div>

            {agents.length === 0 ? (
              <div className="px-6 py-8 text-slate-500 text-sm">
                No pilot or trial agents found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="upgrade-candidates-table">
                  <thead className="bg-slate-900 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {agents.map((agent) => (
                      <AgentRow
                        key={agent.id}
                        agent={agent}
                        generatedLink={generatedLinks[agent.id]}
                        onGenerate={handleGenerate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-base font-semibold text-white">How it works</h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-400 list-decimal list-inside">
            <li>Select a tier and optional discount for the agent.</li>
            <li>Click &quot;Generate Link&quot; — creates a Stripe Checkout session with the agent&apos;s email prefilled.</li>
            <li>Copy the link and share it via iMessage, WhatsApp, LinkedIn, or any channel.</li>
            <li>When the agent pays, the webhook automatically upgrades their account.</li>
            <li>Links expire after 24 hours — generate a new one if needed.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
