'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, CheckCircle2, AlertCircle, Clock, SkipForward, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SimulationStatus =
  | 'idle'
  | 'running'
  | 'inbound_received'
  | 'ai_responded'
  | 'success'
  | 'skipped'
  | 'timeout'
  | 'failed'

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationState {
  id: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatResponseTime(ms: number | null): string {
  if (ms === null || ms === undefined) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function generateTempId(): string {
  return 'onboarding-' + Math.random().toString(36).slice(2, 11)
}

const STATUS_LABELS: Record<SimulationStatus, string> = {
  idle: 'Ready',
  running: 'Starting simulation…',
  inbound_received: 'Lead inbound — AI is responding…',
  ai_responded: 'AI responded — finishing up…',
  success: 'Simulation complete!',
  skipped: 'Skipped',
  timeout: 'Timed out',
  failed: 'Failed',
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ turn }: { turn: ConversationTurn }) {
  const isLead = turn.role === 'lead'
  return (
    <div className={`flex ${isLead ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isLead
            ? 'bg-slate-700/60 text-slate-200 rounded-bl-sm'
            : 'bg-emerald-600/80 text-white rounded-br-sm'
        }`}
      >
        <div className="font-medium text-xs mb-1 opacity-60">
          {isLead ? '👤 Lead' : '🤖 LeadFlow AI'}
        </div>
        {turn.message}
      </div>
    </div>
  )
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-end mb-3">
      <div className="bg-emerald-600/50 rounded-2xl rounded-br-sm px-4 py-3">
        <div className="font-medium text-xs mb-1 opacity-60 text-white">🤖 LeadFlow AI</div>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingSimulator({
  onNext,
  onBack,
  agentData,
  setAgentData,
  onComplete,
}: {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
  onComplete?: () => void
}) {
  const [status, setStatus] = useState<SimulationStatus>('idle')
  const [simState, setSimState] = useState<SimulationState | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const tempAgentId = useRef<string>(generateTempId())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  const isRunning = ['running', 'inbound_received', 'ai_responded'].includes(status)
  const isTerminal = ['success', 'timeout', 'failed'].includes(status)
  const conversation = simState?.conversation ?? []

  // Auto-scroll chat to bottom as messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [])

  // ── Start Simulation ────────────────────────────────────────────────────────

  const startSimulation = async () => {
    setError('')
    setStatus('running')
    setSimState(null)
    setElapsed(0)
    setIsLoading(true)
    startTimeRef.current = Date.now()

    // Elapsed timer
    elapsedRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: tempAgentId.current,
          // sessionId intentionally omitted — server generates it (FR-8 bug fix)
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.state) {
        setError(data.error || 'Failed to start simulation. Please try again.')
        setStatus('failed')
        stopTimers()
        setIsLoading(false)
        return
      }

      const state: SimulationState = data.state
      setSimState(state)
      setSessionId(state.session_id)
      setStatus(state.status)
      setIsLoading(false)

      // Begin polling
      pollRef.current = setInterval(() => {
        pollStatus(state.session_id)
      }, 2000)
    } catch {
      setError('Connection error. Please check your network and try again.')
      setStatus('failed')
      stopTimers()
      setIsLoading(false)
    }
  }

  // ── Poll Status ─────────────────────────────────────────────────────────────

  const pollStatus = async (sid: string) => {
    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: tempAgentId.current,
          sessionId: sid,
        }),
      })

      const data = await response.json()

      if (data.state) {
        setSimState(data.state)
        setStatus(data.state.status)

        if (['success', 'timeout', 'failed'].includes(data.state.status)) {
          stopTimers()
        }
      }
    } catch {
      // Non-fatal — keep polling
    }
  }

  // ── Skip ────────────────────────────────────────────────────────────────────

  const handleSkip = async () => {
    stopTimers()

    if (sessionId) {
      try {
        await fetch('/api/onboarding/simulator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'skip',
            agentId: tempAgentId.current,
            sessionId,
            reason: 'User skipped Aha Moment during onboarding',
          }),
        })
      } catch {
        // Non-fatal
      }
    }

    setAgentData({
      ...agentData,
      simulatorCompleted: false,
      simulatorSkipped: true,
      simulatorResponseTimeMs: null,
    })

    onNext()
  }

  // ── Continue ────────────────────────────────────────────────────────────────

  const handleContinue = () => {
    setAgentData({
      ...agentData,
      simulatorCompleted: status === 'success',
      simulatorSkipped: false,
      simulatorResponseTimeMs: simState?.response_time_ms ?? null,
    })
    onNext()
  }

  // ── Retry (on timeout/failure) ──────────────────────────────────────────────

  const handleRetry = () => {
    setStatus('idle')
    setSimState(null)
    setSessionId(null)
    setError('')
    setElapsed(0)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const stopTimers = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Your AI in action</h2>
          </div>
          <p className="text-slate-300">
            Watch LeadFlow AI respond to a simulated lead — this is exactly what your leads
            experience when they contact you.
          </p>
        </div>

        {/* ── Idle State ── */}
        {status === 'idle' && (
          <div className="mb-8">
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wide">
                What you'll see
              </h3>
              <ul className="space-y-2">
                {[
                  'A simulated lead sends an inquiry message',
                  'LeadFlow AI responds in real-time (under 30 seconds)',
                  'The full qualifying conversation plays out',
                  'You see response time and AI quality firsthand',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={startSimulation}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              Run Live Simulation
            </button>
          </div>
        )}

        {/* ── Running / Active State ── */}
        {(isRunning || isTerminal) && (
          <div className="mb-8">
            {/* Status bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isRunning && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {(status === 'timeout' || status === 'failed') && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    status === 'success'
                      ? 'text-emerald-400'
                      : status === 'timeout' || status === 'failed'
                      ? 'text-red-400'
                      : 'text-slate-300'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {status === 'success' && simState?.response_time_ms ? (
                  <span className="text-emerald-400 font-medium">
                    {formatResponseTime(simState.response_time_ms)}
                  </span>
                ) : (
                  <span>{elapsed}s</span>
                )}
              </div>
            </div>

            {/* Chat window */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 min-h-[280px] max-h-[400px] overflow-y-auto">
              {conversation.length === 0 && isRunning && (
                <div className="flex items-center justify-center h-full py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Connecting simulated lead…</p>
                  </div>
                </div>
              )}

              {conversation.map((turn, i) => (
                <ChatBubble key={i} turn={turn} />
              ))}

              {/* Show typing indicator when AI should respond next */}
              {isRunning &&
                conversation.length > 0 &&
                conversation[conversation.length - 1].role === 'lead' && (
                  <TypingIndicator />
                )}

              <div ref={chatBottomRef} />
            </div>

            {/* Success response time badge */}
            {status === 'success' && simState?.response_time_ms && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-emerald-300">
                  AI responded in{' '}
                  <strong>{formatResponseTime(simState.response_time_ms)}</strong> — well under the
                  30-second target 🎉
                </span>
              </div>
            )}

            {/* Timeout / failure */}
            {(status === 'timeout' || status === 'failed') && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm font-medium text-red-300">
                    {status === 'timeout' ? 'Simulation timed out' : 'Simulation failed'}
                  </span>
                </div>
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 text-sm text-red-300 hover:text-red-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Error (before run) ── */}
        {status === 'failed' && error && conversation.length === 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-medium">Could not start simulation</p>
              <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Optional note ── */}
        {status === 'idle' && (
          <p className="text-xs text-slate-500 mb-6">
            ⚡ No real SMS is sent — this is a safe, dry-run simulation for demonstration only.
          </p>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex gap-3">
          {/* Back (always available when idle or failed) */}
          {(status === 'idle' || status === 'failed') && (
            <button
              onClick={onBack}
              className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
            >
              ← Back
            </button>
          )}

          {/* Skip (visible while running) */}
          {isRunning && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-3 border border-slate-600/40 text-slate-400 hover:text-slate-300 rounded-lg transition-all duration-200 text-sm"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}

          {/* Continue (after success or on idle for skip) */}
          {status === 'success' && (
            <button
              onClick={handleContinue}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Continue →
            </button>
          )}

          {/* Skip entirely (idle state) */}
          {status === 'idle' && (
            <button
              onClick={handleSkip}
              className="px-4 py-3 text-slate-500 hover:text-slate-400 text-sm transition-all duration-200"
            >
              Skip for now
            </button>
          )}

          {/* Retry button doubles as continue on timeout/failed */}
          {(status === 'timeout' || status === 'failed') && (
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
            >
              Skip & Continue →
            </button>
          )}
        </div>
      </div>

      {/* Social proof blurb */}
      {status === 'idle' && (
        <div className="mt-6 bg-slate-800/50 border border-slate-700/30 rounded-lg p-5 text-center">
          <p className="text-slate-300 italic text-sm mb-2">
            "The first time I saw it respond to a test lead in under 10 seconds, I knew this was
            going to change my business."
          </p>
          <p className="text-xs text-slate-500">— Pilot agent, Texas</p>
        </div>
      )}
    </div>
  )
}
