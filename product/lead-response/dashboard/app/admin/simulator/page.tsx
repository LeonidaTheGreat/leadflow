'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MessageCircle,
  Play,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Clock,
  Filter,
} from 'lucide-react'

// ===================== Types =====================
interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationResult {
  simulationId: string | null
  leadName: string
  propertyInterest: string | null
  conversation: ConversationTurn[]
  outcome: string
  note: string
}

interface ConversationSummary {
  id: string
  firstName: string
  phone: string
  date: string
  messageCount: number
  outcome: 'booked' | 'in-progress' | 'opted-out'
}

interface ThreadMessage {
  id: string
  role: 'lead' | 'ai'
  message: string
  timestamp: string
  status?: string
}

// ===================== Outcome Badge =====================
function OutcomeBadge({ outcome }: { outcome: 'booked' | 'in-progress' | 'opted-out' }) {
  const styles = {
    booked: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'opted-out': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  const labels = {
    booked: '✓ Booked',
    'in-progress': '⟳ In Progress',
    'opted-out': '✗ Opted Out',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[outcome]}`}>
      {labels[outcome]}
    </span>
  )
}

// ===================== Chat Bubble =====================
function ChatBubble({ turn }: { turn: ConversationTurn }) {
  const isAI = turn.role === 'ai'
  return (
    <div className={`flex items-start gap-2 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
        ${isAI
          ? 'bg-blue-600 text-white'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`max-w-[75%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className={`rounded-2xl px-3 py-2 text-sm ${
          isAI
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
        }`}>
          {turn.message}
        </div>
        <span className="text-[10px] text-slate-400">
          {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ===================== Simulator Panel =====================
function SimulatorPanel() {
  const [leadName, setLeadName] = useState('')
  const [propertyInterest, setPropertyInterest] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoLinkCopied, setDemoLinkCopied] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [visibleMessages, setVisibleMessages] = useState<ConversationTurn[]>([])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leadName.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)
    setVisibleMessages([])

    try {
      const resp = await fetch('/api/admin/simulate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadName, propertyInterest }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Simulation failed')
        return
      }
      setResult(data)
      // Animate messages one by one
      animateMessages(data.conversation)
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function animateMessages(messages: ConversationTurn[]) {
    let index = 0
    const interval = setInterval(() => {
      if (index >= messages.length) {
        clearInterval(interval)
        return
      }
      setVisibleMessages(prev => [...prev, messages[index]])
      index++
    }, 600)
  }

  async function handleGenerateLink() {
    setGeneratingLink(true)
    try {
      const resp = await fetch('/api/admin/demo-link', { method: 'POST' })
      const data = await resp.json()
      if (data.demoUrl) {
        await navigator.clipboard.writeText(data.demoUrl)
        setDemoLinkCopied(true)
        setTimeout(() => setDemoLinkCopied(false), 3000)
      }
    } catch {
      // Silently fail
    } finally {
      setGeneratingLink(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            Lead Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Dry-run only — no SMS sent</p>
        </div>
        <button
          onClick={handleGenerateLink}
          disabled={generatingLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 
            text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {generatingLink ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : demoLinkCopied ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          {demoLinkCopied ? 'Copied!' : 'Demo Link'}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Lead Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={leadName}
            onChange={e => setLeadName(e.target.value)}
            placeholder="e.g. John Smith"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Property Interest <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={propertyInterest}
            onChange={e => setPropertyInterest(e.target.value)}
            placeholder="e.g. 3BR condo downtown"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !leadName.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
            bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Simulation
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 
          text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Chat Output */}
      {(visibleMessages.length > 0 || result) && (
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Conversation
            </span>
            {result && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                Simulation complete
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px] p-3 rounded-xl 
            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {visibleMessages.map((turn, i) => (
              <ChatBubble key={i} turn={turn} />
            ))}
            <div ref={chatEndRef} />
          </div>
          {result && (
            <p className="text-[11px] text-slate-400 text-center">{result.note}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ===================== Conversations Panel =====================
function ConversationsPanel() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [thread, setThread] = useState<Record<string, ThreadMessage[]>>({})
  const [loadingThread, setLoadingThread] = useState<string | null>(null)

  useEffect(() => {
    fetchConversations()
  }, [filter])

  async function fetchConversations() {
    setLoading(true)
    try {
      const resp = await fetch(`/api/admin/conversations?outcome=${filter}`)
      const data = await resp.json()
      setConversations(data.conversations || [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!thread[id]) {
      setLoadingThread(id)
      try {
        const resp = await fetch(`/api/admin/conversations/${id}`)
        const data = await resp.json()
        setThread(prev => ({ ...prev, [id]: data.thread || [] }))
      } catch {
        setThread(prev => ({ ...prev, [id]: [] }))
      } finally {
        setLoadingThread(null)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Real Conversations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Anonymized — last 10 threads</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 
              bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="booked">Booked</option>
            <option value="in-progress">In Progress</option>
            <option value="opted-out">Opted Out</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No conversations found.
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="ml-1 text-blue-500 underline">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(convo => (
            <div key={convo.id} className="rounded-xl border border-slate-200 dark:border-slate-800 
              bg-white dark:bg-slate-900 overflow-hidden">
              <button
                onClick={() => toggleExpand(convo.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 
                  text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">
                  {convo.firstName.charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {convo.firstName}
                    </span>
                    <span className="text-xs text-slate-400">{convo.phone}</span>
                    <OutcomeBadge outcome={convo.outcome} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(convo.date).toLocaleDateString()}
                    </span>
                    <span>{convo.messageCount} messages</span>
                  </div>
                </div>
                {expandedId === convo.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded thread */}
              {expandedId === convo.id && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 
                  bg-slate-50 dark:bg-slate-900/50 max-h-[350px] overflow-y-auto space-y-3">
                  {loadingThread === convo.id ? (
                    <div className="flex items-center justify-center py-6 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading thread...
                    </div>
                  ) : (thread[convo.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No messages found.</p>
                  ) : (
                    (thread[convo.id] || []).map((msg, i) => (
                      <ChatBubble key={i} turn={msg} />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===================== Demo Banner =====================
function DemoBanner({ token }: { token: string }) {
  const [valid, setValid] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`/api/admin/demo-validate?token=${token}`)
      .then(r => r.json())
      .then(d => setValid(d.valid))
      .catch(() => setValid(false))
  }, [token])

  if (valid === null) return null
  if (!valid) {
    return (
      <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 
        text-red-700 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        This demo link has expired or is invalid. Please request a new one.
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 
      text-blue-700 dark:text-blue-400 text-sm border border-blue-200 dark:border-blue-800">
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      You're viewing LeadFlow AI in demo mode. Simulations are read-only — no SMS is sent.
    </div>
  )
}

// ===================== Main Page (wrapped for useSearchParams) =====================
function SimulatorContent() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'conversations'>('simulator')
  const searchParams = useSearchParams()
  const demoToken = searchParams.get('demo')

  return (
    <div className="max-w-6xl mx-auto">
      {/* Demo banner */}
      {demoToken && <DemoBanner token={demoToken} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Lead Experience Simulator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Simulate lead conversations and review real interaction threads.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'simulator'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Play className="w-4 h-4" />
            Simulator
          </span>
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'conversations'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            Conversations
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        {activeTab === 'simulator' ? <SimulatorPanel /> : <ConversationsPanel />}
      </div>
    </div>
  )
}

// ===================== Page Export =====================
export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading simulator...
      </div>
    }>
      <SimulatorContent />
    </Suspense>
  )
}
