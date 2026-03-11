'use client'

/**
 * SetupSimulator — Aha Moment step in the post-login setup wizard.
 *
 * Connects to /api/onboarding/simulator to run a live AI lead simulation.
 * The user watches the AI respond to a demo lead in real-time, creating the
 * "aha moment" before they complete their setup.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Bot,
  User,
  Zap,
  Clock,
  MessageSquare,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

type SimulationStatus =
  | 'idle'
  | 'running'
  | 'inbound_received'
  | 'ai_responded'
  | 'success'
  | 'skipped'
  | 'timeout'
  | 'failed'

interface SimulationState {
  id: string | null
  session_id: string
  agent_id: string
  status: SimulationStatus
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: ConversationTurn[]
  lead_name: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatResponseTime(ms: number | null): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function generateSessionId(): string {
  return `setup_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  return (
    <div className={`flex gap-3 mb-4 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
          isAI
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
        }`}
      >
        {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? 'bg-emerald-600 text-white rounded-tr-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
          }`}
        >
          {message}
        </div>
        <span className="text-xs text-slate-500">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SetupSimulatorProps {
  agentId: string
  onComplete: (responseTimeMs: number | null) => void
  onSkip: () => void
  onBack: () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupSimulator({
  agentId,
  onComplete,
  onSkip,
  onBack,
}: SetupSimulatorProps) {
  const [sessionId] = useState(() => generateSessionId())
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSkipping, setIsSkipping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll when conversation updates
  useEffect(() => {
    if (simulation?.conversation.length) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [simulation?.conversation])

  // Poll for status while simulation is active
  useEffect(() => {
    const isTerminal =
      !simulation ||
      simulation.status === 'idle' ||
      simulation.status === 'success' ||
      simulation.status === 'skipped' ||
      simulation.status === 'timeout' ||
      simulation.status === 'failed'

    if (isTerminal) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(() => {
      checkStatus()
    }, 1000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation?.status])

  const startSimulation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: agentId || 'setup-agent',
          sessionId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start simulation')
      setSimulation(data.state)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation')
    } finally {
      setIsLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: agentId || 'setup-agent',
          sessionId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.state) setSimulation(data.state)
    } catch {
      // Silent retry
    }
  }

  const skipSimulation = async () => {
    setIsSkipping(true)
    setError(null)
    try {
      await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: agentId || 'setup-agent',
          sessionId,
          reason: 'Skipped during post-login setup wizard',
        }),
      })
      onSkip()
    } catch {
      setIsSkipping(false)
    }
  }

  const isSuccess = simulation?.status === 'success'
  const isRunning =
    simulation?.status === 'running' ||
    simulation?.status === 'inbound_received' ||
    simulation?.status === 'ai_responded'
  const hasFailed =
    simulation?.status === 'timeout' || simulation?.status === 'failed'

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">See LeadFlow in Action</h2>
          <p className="text-slate-300 text-sm">
            Watch the AI respond to a real lead inquiry in under 30 seconds
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-6 flex gap-3">
          <Bot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-emerald-300 text-sm">
            <span className="font-medium">Live Simulation — </span>
            Watch the AI handle a lead conversation automatically, the same way it will work for your real leads.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Chat Area */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl mb-6 overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">
                {simulation?.lead_name || 'Demo Lead Conversation'}
              </span>
            </div>
            {simulation?.response_time_ms && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  {formatResponseTime(simulation.response_time_ms)}
                </span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="p-4 min-h-[250px] max-h-[360px] overflow-y-auto">
            {!simulation && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="h-12 w-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">
                  Click &quot;Run Simulation&quot; to see the AI in action
                </p>
              </div>
            )}

            {isRunning && !simulation?.conversation.length && (
              <div className="flex flex-col items-center justify-center h-full py-10">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm text-slate-400">Starting simulation…</p>
              </div>
            )}

            {simulation?.conversation.map((turn, i) => (
              <ChatBubble key={i} {...turn} />
            ))}

            {isRunning && (simulation?.conversation.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is responding…
              </div>
            )}

            {isSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium text-sm">
                    Simulation complete!
                  </span>
                </div>
                <p className="text-emerald-300/80 text-xs">
                  The AI responded in{' '}
                  {formatResponseTime(simulation?.response_time_ms ?? null)} — well under
                  the 30-second target.
                </p>
              </div>
            )}

            {hasFailed && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">Simulation timed out</span>
                </div>
                <p className="text-red-300/80 text-xs">
                  No problem — you can try again or skip this step.
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Stats on success */}
        {isSuccess && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">
                {formatResponseTime(simulation?.response_time_ms ?? null)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Response Time</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-400">
                {simulation?.conversation.filter((t) => t.role === 'ai').length || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">AI Messages</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-400">3</div>
              <div className="text-xs text-slate-400 mt-1">Turns</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {isSuccess ? (
            <button
              onClick={() => onComplete(simulation?.response_time_ms ?? null)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
            >
              <CheckCircle2 className="h-5 w-5" />
              Complete Setup →
            </button>
          ) : !simulation || hasFailed ? (
            <button
              onClick={startSimulation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {hasFailed ? 'Try Again' : 'Run Simulation'}
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Simulation in progress…
            </div>
          )}

          {!isSuccess && (
            <button
              onClick={skipSimulation}
              disabled={isSkipping || isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Skipping…
                </>
              ) : (
                <>
                  <SkipForward className="h-4 w-4" />
                  Skip this step
                </>
              )}
            </button>
          )}

          <button
            onClick={onBack}
            className="w-full text-sm text-slate-500 hover:text-slate-400 transition-colors py-1"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
