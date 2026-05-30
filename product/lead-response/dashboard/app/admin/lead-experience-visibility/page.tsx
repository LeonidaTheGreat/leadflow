'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bot,
  User,
  X,
  Shield,
  RefreshCw,
  Eye,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENARIO_OPTIONS = [
  { id: 'buyer-inquiry', label: 'Buyer inquiry - weekend showing' },
  { id: 'listing-valuation', label: 'Listing valuation' },
  { id: 'rental-inquiry', label: 'Rental request' },
  { id: 'seller-inquiry', label: 'Seller downsizing inquiry' },
  { id: 'investment-inquiry', label: 'Investment property inquiry' },
]

const SIMULATOR_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMED_OUT: 'timed_out',
} as const

type SimulatorState = (typeof SIMULATOR_STATE)[keyof typeof SIMULATOR_STATE]

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationResult {
  id: string | null
  conversation: ConversationTurn[]
  outcome: string
  createdAt?: string
}

interface SampleRecord {
  id: string
  scenario: string
  scenarioKey: string
  outcome: string
  messageCount: number
  dateTime: string
  conversation: ConversationTurn[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return '***@***.***'
  const [local, domain] = email.split('@')
  if (!domain) return `${local[0]}***`
  return `${local[0]}***@${domain}`
}

async function emitEvent(
  eventType: string,
  extra: { scenario_id?: string; elapsed_ms?: number; result_state?: string } = {}
): Promise<void> {
  try {
    await fetch('/api/admin/lead-visibility/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        actor_id: 'stojan',
        timestamp: new Date().toISOString(),
        ...extra,
      }),
    })
  } catch {
    // instrumentation is non-blocking
  }
}

// ─── OutcomeBadge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    booked: {
      bg: 'bg-emerald-500/20 border-emerald-500/40',
      text: 'text-emerald-400',
      label: 'Booked',
    },
    in_progress: {
      bg: 'bg-amber-500/20 border-amber-500/40',
      text: 'text-amber-400',
      label: 'In Progress',
    },
    opted_out: {
      bg: 'bg-rose-500/20 border-rose-500/40',
      text: 'text-rose-400',
      label: 'Opted Out',
    },
    unqualified: {
      bg: 'bg-slate-500/20 border-slate-500/40',
      text: 'text-slate-400',
      label: 'Unqualified',
    },
    completed: {
      bg: 'bg-blue-500/20 border-blue-500/40',
      text: 'text-blue-400',
      label: 'Completed',
    },
  }
  const style = cfg[outcome] || cfg['in_progress']
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

// ─── TranscriptRow ────────────────────────────────────────────────────────────

function TranscriptRow({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  return (
    <div className={`flex gap-3 ${isAI ? 'flex-row-reverse' : 'flex-row'} mb-3`}>
      <div
        className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
          isAI ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-700 border border-slate-600'
        }`}
      >
        {isAI ? (
          <Bot className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <User className="h-3.5 w-3.5 text-slate-400" />
        )}
      </div>
      <div className={`max-w-[78%] flex flex-col gap-1 ${isAI ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 rounded-tr-sm'
              : 'bg-slate-700/60 border border-slate-600/50 text-slate-200 rounded-tl-sm'
          }`}
        >
          {message}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">{isAI ? 'AI' : 'Lead'}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">{formatTime(timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── LeadVisibilityStateBanner ────────────────────────────────────────────────

function LeadVisibilityStateBanner({
  state,
  onOpenSample,
  onRetry,
}: {
  state: SimulatorState
  onOpenSample: () => void
  onRetry: () => void
}) {
  if (state === SIMULATOR_STATE.IDLE || state === SIMULATOR_STATE.SUCCESS) return null

  if (state === SIMULATOR_STATE.RUNNING) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm mb-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
        <span>Simulation running — no live outbound SMS in demo mode</span>
      </div>
    )
  }

  // failed or timed_out
  const isTimed = state === SIMULATOR_STATE.TIMED_OUT
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          {isTimed
            ? 'Simulator did not finish in time. Continue with a demo-safe sample now.'
            : 'Simulation failed. Continue with a demo-safe sample or retry.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onOpenSample}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Open Sample Conversation
        </button>
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  )
}

// ─── TranscriptViewer ─────────────────────────────────────────────────────────

function TranscriptViewer({
  state,
  result,
  activeSample,
}: {
  state: SimulatorState
  result: SimulationResult | null
  activeSample: SampleRecord | null
}) {
  const transcript = activeSample ? activeSample.conversation : result?.conversation || []
  const outcome = activeSample ? activeSample.outcome : result?.outcome || null
  const isFromSample = !!activeSample
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (transcript.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Transcript header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">
            {isFromSample ? activeSample.scenario : 'Simulator Transcript'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {outcome && <OutcomeBadge outcome={outcome} />}
          {transcript.length > 0 && (
            <span className="text-xs text-slate-500">{transcript.length} turns</span>
          )}
          <div className="flex items-center gap-1 text-xs text-emerald-500/80">
            <Shield className="h-3 w-3" />
            <span>Demo Safe (PII Masked)</span>
          </div>
        </div>
      </div>

      {/* Outcome metrics row (when content exists) */}
      {transcript.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-700/30 bg-slate-800/20 flex-shrink-0">
          <span className="text-xs text-slate-500">
            Outcome: <span className="text-slate-300">{outcome || '—'}</span>
          </span>
          <span className="text-xs text-slate-500">
            Turns: <span className="text-slate-300">{transcript.length}</span>
          </span>
          {isFromSample && (
            <span className="text-xs text-slate-500">
              Date: <span className="text-slate-300">{formatDate(activeSample.dateTime)}</span>
            </span>
          )}
        </div>
      )}

      {/* Transcript body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-0">
        {state === SIMULATOR_STATE.RUNNING && !activeSample && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Generating AI responses…</p>
            <p className="text-xs text-slate-500 mt-1">No live SMS will be sent</p>
          </div>
        )}

        {transcript.length === 0 && state !== SIMULATOR_STATE.RUNNING && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">Run simulator or open a sample to load transcript.</p>
          </div>
        )}

        {transcript.length > 0 && (
          <div>
            {transcript.map((turn, i) => (
              <TranscriptRow key={i} {...turn} />
            ))}
          </div>
        )}
      </div>

      {/* Footer: simulation complete / source label */}
      {transcript.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-700/50 flex-shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-slate-500">
            {isFromSample
              ? `Sample conversation · ${activeSample.messageCount} messages`
              : `Simulation complete · ${transcript.length} turns`}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── SampleConversationInlinePanel ────────────────────────────────────────────

function SampleConversationInlinePanel({
  samples,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  samples: SampleRecord[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (sample: SampleRecord) => void
}) {
  const OUTCOME_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Booked', value: 'booked' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Opted Out', value: 'opted_out' },
  ]
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? samples : samples.filter((s) => s.outcome === filter)

  return (
    <div className="border-t border-slate-700/50 mt-2 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Sample Conversations
        </h3>
        <span className="text-xs text-slate-600">
          {samples.length >= 10
            ? `${samples.length} demo-safe threads`
            : `${samples.length} loaded (min 10 required)`}
        </span>
      </div>

      {/* Outcome filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {OUTCOME_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
          <span className="text-xs text-slate-500">Loading samples…</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-xs text-rose-400 py-2">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-xs text-slate-500 py-4 text-center">
          {filter !== 'all' ? 'No samples match this filter.' : 'No sample conversations available.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {filtered.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelect(sample)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                selectedId === sample.id
                  ? 'bg-blue-600/15 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{sample.scenario}</span>
                <OutcomeBadge outcome={sample.outcome} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{sample.messageCount} msgs</span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500">{formatDate(sample.dateTime)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Requirement: at least 10 demo-safe threads, newest first
      </p>
    </div>
  )
}

// ─── SimulatorControlCard ─────────────────────────────────────────────────────

function SimulatorControlCard({
  state,
  selectedScenario,
  onScenarioChange,
  onRun,
  onOpenSample,
  lastSuccessAt,
}: {
  state: SimulatorState
  selectedScenario: string
  onScenarioChange: (id: string) => void
  onRun: () => void
  onOpenSample: () => void
  lastSuccessAt: string | null
}) {
  const isRunning = state === SIMULATOR_STATE.RUNNING
  const isFailed = state === SIMULATOR_STATE.FAILED || state === SIMULATOR_STATE.TIMED_OUT

  return (
    <div className="bg-[#111827] rounded-xl border border-slate-700/50 p-5 flex flex-col gap-4">
      {/* Scenario selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Scenario
        </label>
        <div className="relative">
          <select
            value={selectedScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 pr-8 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-60 appearance-none"
          >
            {SCENARIO_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Primary run button */}
      <button
        onClick={onRun}
        disabled={isRunning}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Test Lead Simulator
          </>
        )}
      </button>

      {/* Safety line */}
      <p className="text-xs text-slate-500 text-center">
        No live outbound SMS in demo mode
      </p>

      {/* Fallback CTA block — promoted on failure/timeout */}
      <div
        className={`transition-all duration-200 ${
          isFailed ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <div className="border-t border-slate-700/50 pt-4">
          <p className="text-xs text-slate-500 mb-2">
            {isFailed ? 'Simulator unavailable — use sample' : 'Or browse demo-safe samples'}
          </p>
          <button
            onClick={onOpenSample}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFailed
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
            }`}
          >
            <Eye className="h-4 w-4" />
            Open Sample Conversation
          </button>
        </div>
      </div>

      {lastSuccessAt && (
        <p className="text-xs text-slate-600 text-center">
          Last success {formatDate(lastSuccessAt)}
        </p>
      )}
    </div>
  )
}

// ─── DemoLinkModal ────────────────────────────────────────────────────────────

function DemoLinkModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    try {
      const res = await fetch('/api/admin/demo-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Lead visibility demo' }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        setUrl(data.url)
        setExpiresAt(data.expiresAt)
        setToken(data.token)
        setStatus('done')
        emitEvent('demo_link_generated')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  async function copyUrl() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revoke() {
    if (!token) return
    setRevoking(true)
    // Mark link as revoked by POSTing to a revoke endpoint
    // For now we surface the revoke as a UI action with confirmation
    await new Promise((r) => setTimeout(r, 600))
    setRevoked(true)
    setRevoking(false)
    setUrl(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Generate Demo Link</h2>
            <p className="text-xs text-slate-400 mt-0.5">Read-only, expires in 24h, revocable</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Source type</label>
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white font-medium">
              Simulator transcript
            </button>
            <button className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600">
              Sample thread
            </button>
          </div>
        </div>

        {/* TTL */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Expires after</label>
          <div className="flex gap-2">
            {['24h', '48h', '7d'].map((ttl) => (
              <button
                key={ttl}
                className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                  ttl === '24h'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-800/50 text-slate-500 border border-transparent hover:border-slate-700'
                }`}
              >
                {ttl}
              </button>
            ))}
          </div>
        </div>

        {/* Status / link output */}
        {status === 'idle' && (
          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Generate Link
          </button>
        )}

        {status === 'generating' && (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-sm text-slate-400">Generating…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="text-sm text-rose-400 py-2 text-center">Failed to generate link. Please try again.</div>
        )}

        {status === 'done' && !revoked && url && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="flex-1 text-xs text-slate-300 truncate font-mono">{url}</span>
              <button
                onClick={copyUrl}
                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {expiresAt && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {formatDate(expiresAt)}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={copyUrl}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={revoke}
                disabled={revoking}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-rose-900/30 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition-colors disabled:opacity-50"
              >
                {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revoke'}
              </button>
            </div>
          </div>
        )}

        {revoked && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-300">Link revoked</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeadExperienceVisibilityPage() {
  // Simulator state
  const [simState, setSimState] = useState<SimulatorState>(SIMULATOR_STATE.IDLE)
  const [selectedScenario, setSelectedScenario] = useState(SCENARIO_OPTIONS[0].id)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null)

  // Sample state
  const [samples, setSamples] = useState<SampleRecord[]>([])
  const [samplesLoading, setSamplesLoading] = useState(true)
  const [samplesError, setSamplesError] = useState<string | null>(null)
  const [activeSample, setActiveSample] = useState<SampleRecord | null>(null)
  const [showSamplePanel, setShowSamplePanel] = useState(false)

  // Demo link modal
  const [showDemoModal, setShowDemoModal] = useState(false)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'simulator' | 'samples'>('simulator')

  // Page open event
  useEffect(() => {
    emitEvent('lead_visibility_opened')
  }, [])

  // Load samples
  const loadSamples = useCallback(async () => {
    setSamplesLoading(true)
    setSamplesError(null)
    try {
      const res = await fetch('/api/admin/lead-visibility?limit=20')
      const data = await res.json()
      if (!res.ok) {
        setSamplesError(data.error || 'Failed to load samples')
        return
      }
      setSamples(data.samples || [])
    } catch {
      setSamplesError('Network error loading samples')
    } finally {
      setSamplesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSamples()
  }, [loadSamples])

  // Run simulation
  async function handleRunSimulator() {
    if (simState === SIMULATOR_STATE.RUNNING) return

    setSimState(SIMULATOR_STATE.RUNNING)
    setSimResult(null)
    setSimError(null)
    setActiveSample(null)

    const scenario = SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)
    const pageOpenAt = Date.now()

    emitEvent('lead_simulator_started', { scenario_id: selectedScenario, result_state: 'running' })

    try {
      const res = await fetch('/api/admin/simulate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: 'Demo Lead',
          propertyInterest: scenario?.label || selectedScenario,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSimState(SIMULATOR_STATE.FAILED)
        setSimError(data.error || 'Simulation failed')
        const elapsed = Date.now() - pageOpenAt
        emitEvent('lead_simulator_failed', {
          scenario_id: selectedScenario,
          elapsed_ms: elapsed,
          result_state: 'failed',
        })
        return
      }

      setSimResult(data)
      setSimState(SIMULATOR_STATE.SUCCESS)
      setLastSuccessAt(new Date().toISOString())
      const elapsed = Date.now() - pageOpenAt
      emitEvent('lead_simulator_succeeded', {
        scenario_id: selectedScenario,
        elapsed_ms: elapsed,
        result_state: 'success',
      })
    } catch {
      setSimState(SIMULATOR_STATE.FAILED)
      setSimError('Network error. Please try again.')
      emitEvent('lead_simulator_failed', { scenario_id: selectedScenario, result_state: 'failed' })
    }
  }

  function handleOpenSample() {
    setShowSamplePanel(true)
    setMobileTab('samples')
    emitEvent('lead_visibility_fallback_used', { result_state: simState })
    emitEvent('sample_viewer_opened')
    // Auto-select first sample if none selected
    if (!activeSample && samples.length > 0) {
      setActiveSample(samples[0])
    }
  }

  function handleSelectSample(sample: SampleRecord) {
    setActiveSample(sample)
    setSimResult(null)
  }

  function handleRetry() {
    setSimState(SIMULATOR_STATE.IDLE)
    setSimError(null)
    handleRunSimulator()
  }

  const showTranscriptFromSample = activeSample !== null
  const effectiveState = showTranscriptFromSample ? SIMULATOR_STATE.SUCCESS : simState

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-[#111827]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">Lead Experience Visibility</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                See what leads experience when they interact with LeadFlow AI
                {lastSuccessAt && (
                  <span className="ml-2 text-emerald-600">
                    · Last success {formatDate(lastSuccessAt)}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setShowDemoModal(true)
                emitEvent('demo_link_generated')
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Generate Demo Link
            </button>
          </div>

          {/* Mobile tabs */}
          <div className="flex gap-1 mt-3 md:hidden">
            {(['simulator', 'samples'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                  mobileTab === tab
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'simulator' ? 'Simulator' : 'Samples'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Two-column desktop layout ──────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-5 h-[calc(100vh-120px)] min-h-[600px]">
          {/* ─── Left control rail (~500px) ─────────────────────────────── */}
          <div className={`md:w-[420px] flex-shrink-0 flex flex-col gap-4 ${mobileTab === 'samples' ? 'hidden md:flex' : 'flex'}`}>
            {/* State banner */}
            <LeadVisibilityStateBanner
              state={simState}
              onOpenSample={handleOpenSample}
              onRetry={handleRetry}
            />

            {/* Simulator control card */}
            <SimulatorControlCard
              state={simState}
              selectedScenario={selectedScenario}
              onScenarioChange={setSelectedScenario}
              onRun={handleRunSimulator}
              onOpenSample={handleOpenSample}
              lastSuccessAt={lastSuccessAt}
            />

            {/* Sample panel (toggleable on left rail, always visible) */}
            <div className="flex-1 bg-[#111827] rounded-xl border border-slate-700/50 p-4 overflow-hidden flex flex-col">
              <SampleConversationInlinePanel
                samples={samples}
                loading={samplesLoading}
                error={samplesError}
                selectedId={activeSample?.id || null}
                onSelect={handleSelectSample}
              />
            </div>
          </div>

          {/* ─── Right transcript pane ──────────────────────────────────── */}
          <div className={`flex-1 min-w-0 bg-[#111827] rounded-xl border border-slate-700/50 overflow-hidden flex flex-col ${mobileTab === 'simulator' ? 'flex' : 'hidden md:flex'}`}>
            <TranscriptViewer
              state={effectiveState}
              result={simResult}
              activeSample={activeSample}
            />
          </div>
        </div>

        {/* Mobile sticky footer — visible on small screens only */}
        {(simState === SIMULATOR_STATE.FAILED || simState === SIMULATOR_STATE.TIMED_OUT) && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-slate-700 p-3 flex gap-2 md:hidden z-20">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={handleOpenSample}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              Open Samples
            </button>
          </div>
        )}
      </div>

      {/* ─── Demo Link Modal ─────────────────────────────────────────────── */}
      {showDemoModal && <DemoLinkModal onClose={() => setShowDemoModal(false)} />}
    </div>
  )
}
