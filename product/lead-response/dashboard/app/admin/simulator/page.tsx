'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Play,
  Loader2,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bot,
  User,
} from 'lucide-react'

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

interface ConversationRecord {
  id: string
  leadName: string
  maskedPhone: string
  date: string
  messageCount: number
  outcome: 'booked' | 'in-progress' | 'opted-out'
  messages: Array<{ id: string; direction: string; body: string; timestamp: string }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, string> = {
    booked: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
    'in-progress': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    'opted-out': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    completed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  }
  const labels: Record<string, string> = {
    booked: '✅ Booked',
    'in-progress': '🔄 In Progress',
    'opted-out': '🚫 Opted Out',
    completed: '✅ Simulation Complete',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[outcome] || styles['in-progress']}`}>
      {labels[outcome] || outcome}
    </span>
  )
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  return (
    <div className={`flex gap-2 mb-3 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isAI ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
      }`}>
        {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isAI
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
        }`}>
          {message}
        </div>
        <span className="text-xs text-slate-400">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}

// ─── Simulator Panel ─────────────────────────────────────────────────────────

function SimulatorPanel() {
  const [leadName, setLeadName] = useState('')
  const [propertyInterest, setPropertyInterest] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoLinkState, setDemoLinkState] = useState<'idle' | 'loading' | 'copied'>('idle')
  const [demoUrl, setDemoUrl] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [result])

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    if (!leadName.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/simulate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: leadName.trim(),
          propertyInterest: propertyInterest.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Simulation failed')
        return
      }

      setResult(data)
    } catch (err: any) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateDemoLink() {
    setDemoLinkState('loading')
    try {
      const res = await fetch('/api/admin/demo-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Pilot pitch demo' }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        setDemoUrl(data.url)
        await navigator.clipboard.writeText(data.url)
        setDemoLinkState('copied')
        setTimeout(() => setDemoLinkState('idle'), 3000)
      } else {
        setDemoLinkState('idle')
      }
    } catch {
      setDemoLinkState('idle')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Input form */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sticky top-0">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Lead Simulator</h2>
              <p className="text-xs text-slate-500">Dry-run • No SMS sent</p>
            </div>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Property Interest <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={propertyInterest}
                onChange={(e) => setPropertyInterest(e.target.value)}
                placeholder="e.g. 3-bedroom detached home"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !leadName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Simulating…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </button>
          </form>

          {/* Demo link section */}
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Share for pilot pitches (24h link)</p>
            <button
              onClick={handleGenerateDemoLink}
              disabled={demoLinkState === 'loading'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              {demoLinkState === 'loading' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
              ) : demoLinkState === 'copied' ? (
                <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied to clipboard!</>
              ) : (
                <><Share2 className="h-3.5 w-3.5" /> Generate Demo Link</>
              )}
            </button>
            {demoUrl && (
              <p className="mt-1.5 text-xs text-slate-400 truncate">{demoUrl}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Conversation output */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-full min-h-96 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Conversation Preview
              </span>
            </div>
            {result && <OutcomeBadge outcome={result.outcome} />}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {!result && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Enter lead details and click Run Simulation</p>
                <p className="text-xs text-slate-400 mt-1">No real SMS will be sent</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Running simulation…</p>
                <p className="text-xs text-slate-400 mt-1">Generating AI responses</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-1">
                {result.conversation.map((turn, i) => (
                  <ChatBubble key={i} {...turn} />
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {result && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">
                Simulation complete • {result.conversation.length} turns •{' '}
                {result.id ? `Saved (${result.id.slice(0, 8)}…)` : 'Not saved'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Conversations Viewer ─────────────────────────────────────────────────────

function ConversationsViewer() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')

  async function fetchConversations(outcome: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/conversations?outcome=${outcome}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load conversations')
        return
      }
      setConversations(data.conversations || [])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations(outcomeFilter)
  }, [outcomeFilter])

  const OUTCOME_FILTERS = [
    { label: 'All', value: 'all' },
    { label: '✅ Booked', value: 'booked' },
    { label: '🔄 In Progress', value: 'in-progress' },
    { label: '🚫 Opted Out', value: 'opted-out' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {OUTCOME_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setOutcomeFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              outcomeFilter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-2" />
            <span className="text-sm text-slate-500">Loading conversations…</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No conversations found</p>
            <p className="text-xs text-slate-400 mt-1">
              {outcomeFilter !== 'all' ? 'Try changing the filter' : 'Conversations will appear as leads engage'}
            </p>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                      {conv.leadName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {conv.leadName}
                        </span>
                        <span className="text-xs text-slate-400">{conv.maskedPhone}</span>
                        <OutcomeBadge outcome={conv.outcome} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{formatDate(conv.date)}</span>
                        <span className="text-xs text-slate-400">{conv.messageCount} messages</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-slate-400">
                      {expanded === conv.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>

                {expanded === conv.id && (
                  <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      {conv.messages.map((msg) => (
                        <ChatBubble
                          key={msg.id}
                          role={msg.direction === 'inbound' ? 'lead' : 'ai'}
                          message={msg.body}
                          timestamp={msg.timestamp}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Page wrapper that reads demo token ──────────────────────────────────────

function SimulatorPageContent() {
  const searchParams = useSearchParams()
  const demoToken = searchParams.get('demo')
  const [activeTab, setActiveTab] = useState<'simulator' | 'conversations'>('simulator')
  const [demoValid, setDemoValid] = useState<boolean | null>(demoToken ? null : true)

  useEffect(() => {
    if (!demoToken) return
    fetch(`/api/admin/demo-link?token=${demoToken}`)
      .then((r) => r.json())
      .then((d) => setDemoValid(d.valid))
      .catch(() => setDemoValid(false))
  }, [demoToken])

  if (demoToken && demoValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (demoToken && demoValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-sm">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Link Expired</h2>
          <p className="text-sm text-slate-500">This demo link has expired or is invalid. Ask Stojan for a new link.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'simulator' as const, label: '🤖 Simulator' },
    { id: 'conversations' as const, label: '💬 Conversations' },
  ]

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${demoToken ? '' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                LeadFlow AI — Lead Experience Simulator
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {demoToken ? '🔗 Demo mode — read-only preview' : 'Admin tool • Dry-run only • No real SMS sent'}
              </p>
            </div>
            {demoToken && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                🔗 Demo Link
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'simulator' && <SimulatorPanel />}
        {activeTab === 'conversations' && <ConversationsViewer />}
      </div>
    </div>
  )
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    }>
      <SimulatorPageContent />
    </Suspense>
  )
}
