'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, SkipForward, RefreshCw, CheckCircle2, AlertCircle, MessageCircle, Bot, User, Clock } from 'lucide-react'

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationState {
  id: string
  session_id: string
  agent_id: string
  status: 'idle' | 'running' | 'inbound_received' | 'ai_responded' | 'success' | 'skipped' | 'timeout' | 'failed'
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: ConversationTurn[]
  lead_name: string
}

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
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  const startSimulation = async () => {
    if (!sessionId) return
    
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: agentData.agentId || 'temp-agent',
          sessionId: sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start simulation')
      }

      setSimulationState(data.state)
      
      // Start polling for status updates
      const interval = setInterval(() => {
        checkSimulationStatus()
      }, 1000)
      setPollInterval(interval)
    } catch (err: any) {
      setError(err.message || 'Failed to start simulation')
    } finally {
      setIsLoading(false)
    }
  }

  const checkSimulationStatus = useCallback(async () => {
    if (!sessionId || !agentData.agentId) return

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: agentData.agentId || 'temp-agent',
          sessionId: sessionId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.state) {
        setSimulationState(data.state)

        // Stop polling if simulation is complete or failed
        if (['success', 'skipped', 'timeout', 'failed'].includes(data.state.status)) {
          if (pollInterval) {
            clearInterval(pollInterval)
            setPollInterval(null)
          }

          // Update agentData with aha moment completion
          if (data.state.status === 'success') {
            setAgentData({
              ...agentData,
              ahaCompleted: true,
              ahaResponseTimeMs: data.state.response_time_ms,
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to check simulation status:', err)
    }
  }, [sessionId, agentData.agentId, pollInterval, agentData, setAgentData])

  const skipSimulation = async () => {
    if (!sessionId) {
      onNext()
      return
    }

    setIsLoading(true)
    
    try {
      await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: agentData.agentId || 'temp-agent',
          sessionId: sessionId,
          reason: 'User chose to skip',
        }),
      })

      setAgentData({
        ...agentData,
        ahaCompleted: false,
        ahaResponseTimeMs: null,
      })
      
      onNext()
    } catch (err) {
      console.error('Failed to skip simulation:', err)
      onNext()
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    onNext()
  }

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return '--'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const isRunning = simulationState && ['running', 'inbound_received', 'ai_responded'].includes(simulationState.status)
  const isComplete = simulationState?.status === 'success'
  const isFailed = simulationState?.status === 'failed' || simulationState?.status === 'timeout'

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">See LeadFlow AI in Action</h2>
          <p className="text-slate-300">
            Watch how our AI responds to a lead in under 30 seconds
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-blue-300 text-sm">
            <p className="font-medium mb-1">This is your "Aha Moment"</p>
            <p>See exactly how LeadFlow AI engages with leads instantly. This simulation shows a real conversation between a lead and our AI.</p>
          </div>
        </div>

        {/* Simulation Display */}
        {simulationState && (
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-8">
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">Lead:</span>
                <span className="text-white font-medium">{simulationState.lead_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="flex items-center gap-2 text-amber-400 text-sm">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    Simulating...
                  </span>
                )}
                {isComplete && (
                  <span className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Failed
                  </span>
                )}
              </div>
            </div>

            {/* Response Time (shown when complete) */}
            {isComplete && simulationState.response_time_ms && (
              <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300">AI responded in</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {formatResponseTime(simulationState.response_time_ms)}
                </span>
                <span className="text-emerald-300">— under 30 seconds!</span>
              </div>
            )}

            {/* Conversation */}
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {simulationState.conversation.length === 0 && isRunning && (
                <div className="text-center py-8 text-slate-500">
                  <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                  Starting simulation...
                </div>
              )}
              
              {simulationState.conversation.map((turn, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${turn.role === 'lead' ? '' : 'flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    turn.role === 'lead' 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {turn.role === 'lead' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    turn.role === 'lead'
                      ? 'bg-slate-700 text-slate-200 rounded-tl-none'
                      : 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                  }`}>
                    <p className="text-sm">{turn.message}</p>
                    <span className="text-xs opacity-50 mt-1 block">
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isRunning && simulationState.conversation.length > 0 && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                  </div>
                  <div className="bg-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 mb-8">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {!simulationState && (
            <button
              onClick={startSimulation}
              disabled={isLoading || !sessionId}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Simulation
                </>
              )}
            </button>
          )}

          {isFailed && (
            <button
              onClick={startSimulation}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          )}

          {isComplete && (
            <button
              onClick={handleContinue}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              Continue to Dashboard
            </button>
          )}

          {/* Skip Option */}
          {!isComplete && (
            <button
              onClick={skipSimulation}
              disabled={isLoading}
              className="w-full py-3 px-4 border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip for Now
            </button>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Clock, label: '< 30s', desc: 'Response time' },
            { icon: Bot, label: '24/7', desc: 'Always on' },
            { icon: CheckCircle2, label: '78%', desc: 'More deals' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-4 bg-slate-700/20 rounded-lg">
              <Icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-emerald-400 font-bold">{label}</div>
              <div className="text-slate-400 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
