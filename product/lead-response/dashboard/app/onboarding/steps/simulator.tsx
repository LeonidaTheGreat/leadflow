'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Play, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Bot, 
  User, 
  AlertCircle,
  ArrowRight,
  SkipForward,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type SimulationStatus = 'idle' | 'running' | 'inbound_received' | 'ai_responded' | 'success' | 'skipped' | 'timeout' | 'failed'

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationState {
  id: string
  status: SimulationStatus
  simulation_started_at: string | null
  inbound_received_at: string | null
  ai_response_received_at: string | null
  response_time_ms: number | null
  conversation: ConversationTurn[]
  lead_name: string
  error_message?: string
}

// ─── Components ──────────────────────────────────────────────────────────────

function ChatBubble({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  return (
    <div className={`flex gap-3 mb-4 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
        isAI 
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' 
          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
      }`}>
        {isAI ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </div>
      <div className={`max-w-[80%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isAI
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-slate-700'
        }`}>
          {message}
        </div>
        <span className="text-xs text-slate-400 px-1">{time}</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: SimulationStatus }) {
  const configs: Record<SimulationStatus, { icon: React.ReactNode; text: string; className: string }> = {
    idle: { 
      icon: <Play className="h-3.5 w-3.5" />, 
      text: 'Ready', 
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
    },
    running: { 
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, 
      text: 'Simulating...', 
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
    },
    inbound_received: { 
      icon: <MessageSquare className="h-3.5 w-3.5" />, 
      text: 'Lead received', 
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
    },
    ai_responded: { 
      icon: <Bot className="h-3.5 w-3.5" />, 
      text: 'AI responding', 
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
    },
    success: { 
      icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
      text: 'Complete!', 
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
    },
    skipped: { 
      icon: <SkipForward className="h-3.5 w-3.5" />, 
      text: 'Skipped', 
      className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' 
    },
    timeout: { 
      icon: <Clock className="h-3.5 w-3.5" />, 
      text: 'Timed out', 
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
    },
    failed: { 
      icon: <AlertCircle className="h-3.5 w-3.5" />, 
      text: 'Failed', 
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
    },
  }
  
  const config = configs[status]
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  )
}

function Timer({ startTime, isRunning }: { startTime: string | null; isRunning: boolean }) {
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    if (!isRunning || !startTime) return
    
    const start = new Date(startTime).getTime()
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 100)
    
    return () => clearInterval(interval)
  }, [startTime, isRunning])
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="h-4 w-4 text-slate-400" />
      <span className="font-mono text-slate-600 dark:text-slate-400">
        {formatTime(elapsed)}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingSimulator({
  onComplete,
  onBack,
  agentData,
  isLoading: parentLoading,
}: {
  onComplete: () => void
  onBack: () => void
  agentData: any
  isLoading: boolean
}) {
  const [status, setStatus] = useState<SimulationStatus>('idle')
  const [state, setState] = useState<SimulationState | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Generate session ID on mount
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])
  
  // Poll for status updates when running
  useEffect(() => {
    if (status === 'running' || status === 'inbound_received') {
      pollIntervalRef.current = setInterval(() => {
        checkStatus()
      }, 500) // Poll every 500ms for responsive UI
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [status])
  
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          agentId: agentData.id || 'temp-agent-id',
          sessionId: sessionIdRef.current,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to check status')
      
      const { state: newState } = await response.json()
      setState(newState)
      setStatus(newState.status)
      
      if (newState.status === 'success') {
        // Success! Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else if (newState.status === 'timeout' || newState.status === 'failed') {
        setError(newState.error_message || 'Simulation failed')
      }
    } catch (err) {
      console.error('Status check error:', err)
    }
  }
  
  const startSimulation = async () => {
    setIsStarting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId: agentData.id || 'temp-agent-id',
          sessionId: sessionIdRef.current,
        }),
      })
      
      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to start simulation')
      }
      
      const { state: newState } = await response.json()
      setState(newState)
      setStatus('running')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsStarting(false)
    }
  }
  
  const skipSimulation = async () => {
    try {
      await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          agentId: agentData.id || 'temp-agent-id',
          sessionId: sessionIdRef.current,
          reason: 'User chose to skip during onboarding',
        }),
      })
      
      onComplete()
    } catch (err) {
      console.error('Skip error:', err)
      onComplete()
    }
  }
  
  const retrySimulation = () => {
    setError(null)
    setState(null)
    setStatus('idle')
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    startSimulation()
  }
  
  const formatResponseTime = (ms: number | null) => {
    if (!ms) return '--'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }
  
  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            See your first AI lead response live
          </h2>
          <p className="text-slate-300 max-w-lg mx-auto">
            Watch how LeadFlow AI responds to a new lead in real-time. This is what your leads will experience.
          </p>
        </div>
        
        {/* Simulation Container */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden mb-8">
          {/* Status Bar */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              {(status === 'running' || status === 'inbound_received') && state?.simulation_started_at && (
                <Timer startTime={state.simulation_started_at} isRunning={true} />
              )}
            </div>
            {status === 'success' && state?.response_time_ms && (
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Responded in {formatResponseTime(state.response_time_ms)}
                </span>
              </div>
            )}
          </div>
          
          {/* Chat Area */}
          <div className="h-80 overflow-y-auto p-4 bg-slate-950/30">
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-400 mb-2">Ready to see the magic?</p>
                <p className="text-sm text-slate-500">
                  Click "Run Simulation" to see how AI responds to a new lead
                </p>
              </div>
            )}
            
            {(status === 'running' || status === 'inbound_received') && !state?.conversation?.length && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-slate-400">Starting simulation...</p>
              </div>
            )}
            
            {state?.conversation?.map((turn, i) => (
              <ChatBubble key={i} {...turn} />
            ))}
            
            {(status === 'running' || status === 'inbound_received') && (state?.conversation?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is typing...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">{error}</p>
                    <button
                      onClick={retrySimulation}
                      className="text-sm text-red-300 hover:text-red-200 mt-2 flex items-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Success State */}
        {status === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-emerald-300 mb-1">
                  That's how fast LeadFlow AI responds!
                </h3>
                <p className="text-emerald-200/80 text-sm mb-4">
                  Your AI assistant responded in {formatResponseTime(state?.response_time_ms ?? null)}. 
                  Every new lead will get an instant, personalized response like this.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onComplete}
                    disabled={parentLoading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {parentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Completing setup...
                      </>
                    ) : (
                      <>
                        Continue to dashboard
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        {status !== 'success' && (
          <div className="flex flex-col sm:flex-row gap-3">
            {status === 'idle' ? (
              <>
                <button
                  onClick={startSimulation}
                  disabled={isStarting}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Run Live Lead Simulation
                    </>
                  )}
                </button>
                <button
                  onClick={skipSimulation}
                  disabled={isStarting}
                  className="px-6 py-4 border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <SkipForward className="h-5 w-5" />
                  Skip for now
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onComplete}
                  disabled={parentLoading || status === 'running' || status === 'inbound_received'}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {parentLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Completing setup...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Complete Setup
                    </>
                  )}
                </button>
                <button
                  onClick={skipSimulation}
                  disabled={parentLoading}
                  className="px-6 py-4 border border-slate-600/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 font-medium rounded-xl transition-all duration-200"
                >
                  Skip & Continue
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium mb-1">What happens next?</p>
              <p className="text-sm text-blue-200/70">
                Once you connect your lead sources (Zillow, Realtor.com, etc.), every new lead will trigger 
                an instant AI response just like the one you saw. No manual work required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
