'use client'

// Onboarding Simulator Step — Aha Moment Lead Simulation
//
// IMPORTANT: Uses ACTUAL API response format (not PRD contract)
//
// PRD Format (incorrect):  { success, sessionId, status, array-of-turns }
// Actual API Format:       { success, state: { id, session_id, agent_id, status, conversation[], response_time_ms, ... } }
//
// Key differences:
//   - PRD named field as turns-array; API returns state.conversation
//   - PRD named field responseTimeMs; API returns state.response_time_ms
//   - PRD named completion status as 'done'; API uses status 'success'
//   - PRD has 3 statuses; API has 8: idle|running|inbound_received|ai_responded|success|skipped|timeout|failed
//
// This component accesses state.conversation via setSimulation(data.state)
// then reads simulation.conversation (which IS data.state.conversation).

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
  RefreshCw
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

type SimulationStatus = 'idle' | 'running' | 'inbound_received' | 'ai_responded' | 'success' | 'skipped' | 'timeout' | 'failed'

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
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatResponseTime(ms: number | null): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Map actual API status values to display info.
 * API returns 8 statuses: idle | running | inbound_received | ai_responded | success | skipped | timeout | failed
 */
function getStatusInfo(status: SimulationStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'idle':              return { label: 'Not started',       color: 'text-slate-500', bg: 'bg-slate-500/10' }
    case 'running':           return { label: 'Simulating...',     color: 'text-blue-500', bg: 'bg-blue-500/10' }
    case 'inbound_received':  return { label: 'Lead arrived',      color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    case 'ai_responded':      return { label: 'AI responding',     color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    case 'success':           return { label: 'Complete ✓',        color: 'text-emerald-600', bg: 'bg-emerald-500/10' }
    case 'skipped':           return { label: 'Skipped',           color: 'text-slate-400', bg: 'bg-slate-500/10' }
    case 'timeout':           return { label: 'Timed out',         color: 'text-orange-500', bg: 'bg-orange-500/10' }
    case 'failed':            return { label: 'Failed',            color: 'text-red-500', bg: 'bg-red-500/10' }
    default:                  return { label: status,              color: 'text-slate-500', bg: 'bg-slate-500/10' }
  }
}

// ─── Chat Bubble Component ───────────────────────────────────────────────────

function ChatBubble({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  return (
    <div className={`flex gap-3 mb-4 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isAI ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
      }`}>
        {isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAI
            ? 'bg-emerald-600 text-white rounded-tr-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
        }`}>
          {message}
        </div>
        <span className="text-xs text-slate-500">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingSimulator({
  onNext,
  onBack,
  agentData,
  setAgentData,
}: {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
}) {
  const [sessionId, setSessionId] = useState<string>('')
  const [simulation, setSimulation] = useState<SimulationState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSkipping, setIsSkipping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const statusInfo = simulation ? getStatusInfo(simulation.status) : getStatusInfo('idle')
  const isSuccess = simulation?.status === 'success'
  const isRunning = simulation?.status === 'running' || simulation?.status === 'inbound_received' || simulation?.status === 'ai_responded'
  const hasFailed = simulation?.status === 'timeout' || simulation?.status === 'failed'
  const isComplete = isSuccess
  const isError = hasFailed

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (simulation?.conversation.length) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [simulation?.conversation])

  // Poll for status updates when simulation is running
  useEffect(() => {
    if (!simulation || simulation.status === 'idle' || isSuccess || simulation.status === 'skipped' || hasFailed) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    // Poll every 1 second while running
    pollingRef.current = setInterval(() => {
      checkSimulationStatus()
    }, 1000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [simulation?.status, sessionId])

  // Update agentData when simulation completes
  useEffect(() => {
    if (simulation?.status === 'success' && simulation.response_time_ms) {
      setAgentData({
        ...agentData,
        ahaCompleted: true,
        ahaResponseTimeMs: simulation.response_time_ms,
      })
    }
  }, [simulation?.status, simulation?.response_time_ms])

  // AC: Start Simulation accepts only agentId — server generates sessionId
  const startSimulation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: agentData.email || 'temp-agent',
          // No sessionId here — server generates and returns it
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start simulation')
      }

      // API returns { success, state: { session_id, ... } }
      // AC: sessionId from start response is used for subsequent status polls
      if (data.state) {
        setSimulation(data.state)
        setSessionId(data.state.session_id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start simulation')
    } finally {
      setIsLoading(false)
    }
  }

  const checkSimulationStatus = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: agentData.email || 'temp-agent',
          sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.state) {
        setSimulation(data.state)
      }
    } catch (err) {
      // Silent fail - will retry on next poll
      console.error('Status check failed:', err)
    }
  }

  const skipSimulation = async () => {
    setIsSkipping(true)
    setError(null)

    try {
      // If simulation hasn't started yet (no sessionId), just advance
      if (!sessionId) {
        setAgentData({
          ...agentData,
          ahaCompleted: false,
          ahaResponseTimeMs: null,
        })
        onNext()
        return
      }

      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: agentData.email || 'temp-agent',
          sessionId,
          reason: 'User chose to skip during onboarding',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to skip simulation')
      }

      setAgentData({
        ...agentData,
        ahaCompleted: false,
        ahaSkipped: true,
      })

      onNext()
    } catch (err: any) {
      setError(err.message || 'Failed to skip simulation')
      setIsSkipping(false)
    }
  }

  const handleContinue = () => {
    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">See the Magic</h2>
          <p className="text-slate-300">
            Watch how LeadFlow AI responds to a lead in under 30 seconds
          </p>
        </div>

        {/* Status Badge */}
        {simulation && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bg} border border-slate-600/30 mb-6`}>
            {isRunning ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isComplete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4" />
            ) : null}
            <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
        )}

        {/* Response Time Badge (when complete) */}
        {isComplete && simulation?.response_time_ms && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Response time: {formatResponseTime(simulation.response_time_ms)}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Chat Area */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl mb-8 overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">
                {simulation?.lead_name || 'Lead Conversation'}
              </span>
            </div>
            {simulation?.response_time_ms && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  Response time: {formatResponseTime(simulation.response_time_ms)}
                </span>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
            {!simulation && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="h-12 w-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">Click &quot;Start Simulation&quot; to see the AI in action</p>
              </div>
            )}

            {isRunning && !simulation?.conversation.length && (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-slate-400">Starting simulation...</p>
              </div>
            )}

            {simulation?.conversation.map((turn, i) => (
              <ChatBubble key={i} {...turn} />
            ))}

            {isRunning && simulation?.conversation.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is typing...
              </div>
            )}

            {isSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Simulation Complete!</span>
                </div>
                <p className="text-emerald-300/80 text-sm">
                  The AI responded in {formatResponseTime(simulation?.response_time_ms || null)} — 
                  that&apos;s under our 30-second target!
                </p>
              </div>
            )}

            {hasFailed && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Simulation Failed</span>
                </div>
                <p className="text-red-300/80 text-sm">
                  Something went wrong. You can skip this step or try again.
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {!simulation || hasFailed ? (
            <button
              onClick={startSimulation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {hasFailed ? 'Try Again' : 'Start Simulation'}
                </>
              )}
            </button>
          ) : isSuccess ? (
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
            >
              <CheckCircle2 className="h-5 w-5" />
              Continue to Confirmation →
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Simulation in progress...
            </div>
          )}

          {/* Skip Button */}
          {(!isSuccess) && (
            <button
              onClick={skipSimulation}
              disabled={isSkipping || isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isSkipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Skipping...
                </>
              ) : (
                <>
                  <SkipForward className="h-4 w-4" />
                  Skip for now
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        {isSuccess && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {formatResponseTime(simulation?.response_time_ms || null)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Response Time</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {simulation?.conversation.filter(t => t.role === 'ai').length || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">AI Messages</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                3
              </div>
              <div className="text-xs text-slate-400 mt-1">Turns</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
