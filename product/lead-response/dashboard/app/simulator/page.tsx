'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, AlertCircle, CheckCircle2, MessageCircle, ArrowLeft, Play } from 'lucide-react'

function SimulatorPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'
  
  const [agentId, setAgentId] = useState<string | null>(null)
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [conversation, setConversation] = useState<Array<{ role: string; message: string }>>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (!response.ok) {
          router.push('/login')
          return
        }
        const data = await response.json()
        if (!data.agentId) {
          router.push('/login')
          return
        }
        setAgentId(data.agentId)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const startSimulation = async () => {
    if (!agentId) {
      setError('Agent ID not found')
      return
    }

    setError('')
    setSimulationStatus('running')
    setConversation([])

    try {
      const response = await fetch('/api/onboarding/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          agentId,
          sessionId: `standalone-${agentId}-${Date.now()}`
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Simulation failed (${response.status})`)
      }

      const data = await response.json()
      
      // Poll for status updates
      pollSimulationStatus(data.state.session_id, agentId)
    } catch (err: any) {
      setError(err?.message || 'Failed to start simulation. Please try again.')
      setSimulationStatus('idle')
    }
  }

  const pollSimulationStatus = async (sessionId: string, agentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/onboarding/simulator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'status',
            agentId,
            sessionId
          })
        })

        if (!response.ok) {
          clearInterval(pollInterval)
          setError('Failed to get simulation status')
          setSimulationStatus('idle')
          return
        }

        const data = await response.json()
        const state = data.state

        if (state.conversation) {
          setConversation(state.conversation)
        }

        // Check for terminal states
        if (state.status === 'success') {
          clearInterval(pollInterval)
          setSimulationStatus('complete')
        } else if (state.status === 'failed' || state.status === 'timeout') {
          clearInterval(pollInterval)
          setError('Simulation failed. Please try again.')
          setSimulationStatus('idle')
        }
      } catch (err) {
        // Silently fail polling
        console.error('Polling error:', err)
      }
    }, 1000)

    // Clean up interval after 90 seconds (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 90000)
  }

  const handleBack = () => {
    router.push(returnTo)
  }

  const handleContinue = () => {
    router.push(returnTo)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <SimulatorUI
      simulationStatus={simulationStatus}
      conversation={conversation}
      error={error}
      agentId={agentId}
      returnTo={returnTo}
      onStart={startSimulation}
      onBack={handleBack}
      onContinue={handleContinue}
    />
  )
}

interface SimulatorUIProps {
  simulationStatus: 'idle' | 'running' | 'complete'
  conversation: Array<{ role: string; message: string }>
  error: string
  agentId: string | null
  returnTo: string
  onStart: () => void
  onBack: () => void
  onContinue: () => void
}

function SimulatorUI({
  simulationStatus,
  conversation,
  error,
  agentId,
  returnTo,
  onStart,
  onBack,
  onContinue
}: SimulatorUIProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h1 className="text-lg font-semibold text-white">AI Simulator</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
              <div className="mb-8">
                <div className="w-16 h-16 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-white text-center mb-2">See Your AI in Action</h2>
                <p className="text-slate-300 text-center">
                  Watch how the AI responds to a simulated lead — no setup required!
                </p>
              </div>

              {/* Idle State - Start Button */}
              {simulationStatus === 'idle' && (
                <div className="space-y-6 mb-8">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
                    <p className="text-purple-300 text-sm mb-4">
                      We&apos;ll simulate a lead coming in and show you how your AI assistant responds.
                      This takes about 15-30 seconds.
                    </p>
                    <ul className="space-y-2 text-sm text-purple-200/80">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                        See a realistic lead inquiry
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                        Watch the AI generate a response
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                        Experience the speed (under 30 seconds)
                      </li>
                    </ul>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={onStart}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Simulation
                  </button>

                  <button
                    onClick={onBack}
                    className="w-full py-3 px-4 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
                  >
                    Go Back
                  </button>
                </div>
              )}

              {/* Running State - Live Conversation */}
              {simulationStatus === 'running' && (
                <div className="space-y-6 mb-8">
                  <div className="bg-slate-700/50 rounded-lg p-6 h-96 overflow-y-auto space-y-4">
                    {conversation.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-slate-400 text-sm">Simulating lead arrival...</p>
                        </div>
                      </div>
                    ) : (
                      conversation.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}
                        >
                          <div
                            className={`max-w-xs rounded-lg p-3 ${
                              msg.role === 'ai'
                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                                : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <p className="text-center text-slate-400 text-sm">
                    {conversation.length === 0 ? 'Waiting for lead...' : 'AI is responding...'}
                  </p>
                </div>
              )}

              {/* Complete State */}
              {simulationStatus === 'complete' && (
                <div className="space-y-6 mb-8">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 h-96 overflow-y-auto space-y-4">
                    {conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs rounded-lg p-3 ${
                            msg.role === 'ai'
                              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                              : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-emerald-400 font-medium text-sm">Aha moment unlocked! 🎉</p>
                      <p className="text-emerald-300/70 text-xs mt-0.5">
                        You&apos;ve seen how fast and smart your AI is. Ready to handle real leads!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onContinue}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <SimulatorPageContent />
    </Suspense>
  )
}
