'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, SkipForward, RefreshCw, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react'

// Types matching the ACTUAL API response format (not PRD)
// API returns: { success, state: { id, session_id, agent_id, status, conversation[], response_time_ms, ... } }

type ConversationTurn = {
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

type SimulationState = {
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

interface SimulatorProps {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
}

export default function OnboardingSimulator({
  onNext,
  onBack,
  agentData,
  setAgentData,
}: SimulatorProps) {
  const [sessionId, setSessionId] = useState<string>('')
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Generate a session ID on mount using crypto.getRandomValues()
  useEffect(() => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(6))
    const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const newSessionId = `sim_${Date.now()}_${randomHex}`
    setSessionId(newSessionId)
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Start the simulation
  const startSimulation = async () => {
    if (!sessionId) return
    
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: agentData.email || 'unknown',
          sessionId: sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start simulation')
      }

      const data = await response.json()
      
      // API returns { success, state: {...} }
      // Use state.conversation (not turns), state.response_time_ms (not responseTimeMs)
      if (data.state) {
        setSimulationState(data.state)
        startPolling()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start simulation')
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for status updates
  const startPolling = () => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    // Poll every 1 second
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/onboarding/simulator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'status',
            agentId: agentData.email || 'unknown',
            sessionId: sessionId,
          }),
        })

        if (!response.ok) return

        const data = await response.json()
        
        // API returns { state: {...} }
        if (data.state) {
          setSimulationState(data.state)

          // Stop polling if terminal state reached
          // API uses 'success' (not 'complete') as the completion status
          if (['success', 'skipped', 'timeout', 'failed'].includes(data.state.status)) {
            clearInterval(interval)
            setPollingInterval(null)

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
        // Silently fail polling - don't show error to user
        console.error('Polling error:', err)
      }
    }, 1000)

    setPollingInterval(interval)
  }

  // Skip the simulation
  const skipSimulation = async () => {
    if (!sessionId) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: agentData.email || 'unknown',
          sessionId: sessionId,
          reason: 'User chose to skip during onboarding',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to skip simulation')
      }

      // Update agentData to mark aha as skipped
      setAgentData({
        ...agentData,
        ahaCompleted: false,
        ahaResponseTimeMs: null,
      })

      onNext()
    } catch (err: any) {
      setError(err.message || 'Failed to skip simulation')
    } finally {
      setIsLoading(false)
    }
  }

  // Format response time for display
  const formatResponseTime = (ms: number | null): string => {
    if (!ms) return '--'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Get status display info
  const getStatusInfo = (status: SimulationStatus) => {
    switch (status) {
      case 'idle':
        return { label: 'Ready to start', color: 'text-slate-400', bg: 'bg-slate-500/10' }
      case 'running':
        return { label: 'Starting simulation...', color: 'text-blue-400', bg: 'bg-blue-500/10' }
      case 'inbound_received':
        return { label: 'Lead message received', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
      case 'ai_responded':
        return { label: 'AI responding...', color: 'text-purple-400', bg: 'bg-purple-500/10' }
      case 'success':
        return { label: 'Simulation complete!', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
      case 'skipped':
        return { label: 'Skipped', color: 'text-slate-400', bg: 'bg-slate-500/10' }
      case 'timeout':
        return { label: 'Timed out', color: 'text-orange-400', bg: 'bg-orange-500/10' }
      case 'failed':
        return { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' }
      default:
        return { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-500/10' }
    }
  }

  const statusInfo = simulationState ? getStatusInfo(simulationState.status) : getStatusInfo('idle')
  const isComplete = simulationState?.status === 'success'
  const isError = simulationState?.status === 'timeout' || simulationState?.status === 'failed'

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">See LeadFlow in Action</h2>
          <p className="text-slate-300">
            Watch how our AI responds to a lead in under 30 seconds
          </p>
        </div>

        {/* Status Badge */}
        {simulationState && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bg} border border-${statusInfo.color.split('-')[1]}-500/30 mb-6`}>
            {simulationState.status === 'running' || simulationState.status === 'inbound_received' || simulationState.status === 'ai_responded' ? (
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
        {isComplete && simulationState?.response_time_ms && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Response time: {formatResponseTime(simulationState.response_time_ms)}
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

        {/* Conversation Display */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-8 min-h-[300px]">
          {!simulationState || simulationState.conversation.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 mb-2">Ready to see the magic?</p>
              <p className="text-sm text-slate-500">
                Click "Start Simulation" to watch a live lead conversation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {simulationState.conversation.map((turn, index) => (
                <div
                  key={index}
                  className={`flex ${turn.role === 'lead' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      turn.role === 'lead'
                        ? 'bg-slate-700 text-slate-200 rounded-bl-none'
                        : 'bg-emerald-600 text-white rounded-br-none'
                    }`}
                  >
                    <p className="text-sm">{turn.message}</p>
                    <p className={`text-xs mt-1 ${turn.role === 'lead' ? 'text-slate-400' : 'text-emerald-200'}`}>
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {(simulationState.status === 'running' || simulationState.status === 'inbound_received' || simulationState.status === 'ai_responded') && (
                <div className="flex justify-end">
                  <div className="bg-emerald-600/50 rounded-2xl rounded-br-none px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-200 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!simulationState || simulationState.status === 'idle' ? (
            <>
              <button
                onClick={startSimulation}
                disabled={isLoading || !sessionId}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Simulation
                  </>
                )}
              </button>
              <button
                onClick={skipSimulation}
                disabled={isLoading}
                className="flex-1 sm:flex-initial px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Skip
              </button>
            </>
          ) : isComplete ? (
            <button
              onClick={onNext}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Continue to Dashboard
            </button>
          ) : isError ? (
            <>
              <button
                onClick={startSimulation}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={skipSimulation}
                disabled={isLoading}
                className="flex-1 sm:flex-initial px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Skip
              </button>
            </>
          ) : (
            <>
              <button
                disabled
                className="flex-1 py-3 px-4 bg-slate-700/50 text-slate-400 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" />
                Simulation in progress...
              </button>
              <button
                onClick={skipSimulation}
                disabled={isLoading}
                className="flex-1 sm:flex-initial px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <SkipForward className="w-5 h-5" />
                Skip
              </button>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-200/80">
            <strong className="text-blue-300">What you&apos;re seeing:</strong> This is a simulated conversation 
            between a potential home buyer and the LeadFlow AI. In a real scenario, this entire exchange 
            happens automatically via SMS in under 30 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}
