'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sparkles, AlertCircle, CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react'

export default function StandaloneSimulatorPage() {
  const router = useRouter()
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [conversation, setConversation] = useState<Array<{ role: string; message: string }>>([])
  const [error, setError] = useState('')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Check auth and get agent info on mount
  useEffect(() => {
    async function fetchAgentStatus() {
      try {
        const authRes = await fetch('/api/auth/trial-status')
        if (!authRes.ok) {
          router.replace('/login')
          return
        }
        const authData = await authRes.json()

        if (!authData.agentId) {
          router.replace('/login')
          return
        }

        setAgentId(authData.agentId)
        if (authData.firstName) setAgentName(authData.firstName)
        
        // Check if simulator already completed
        const simRes = await fetch(`/api/onboarding/simulator/status?agentId=${authData.agentId}`)
        if (simRes.ok) {
          const simData = await simRes.json()
          if (simData.hasCompleted) {
            // Already completed, redirect to dashboard
            router.push('/dashboard')
            return
          }
        }
      } catch (err) {
        console.error('Failed to fetch agent status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgentStatus()
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
      const messages = data.state.conversation || []

      // Animate messages appearing one by one
      for (let i = 0; i < messages.length; i++) {
        const randomDelay = i === 0 ? 800 : 1200 + (crypto.getRandomValues(new Uint8Array(1))[0] / 255) * 800
        await new Promise(r => setTimeout(r, randomDelay))
        setConversation(prev => [...prev, messages[i]])
      }

      // Mark complete
      setSimulationStatus('complete')
      
      // Mark simulator as completed in wizard state
      await fetch('/api/setup/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulatorCompleted: true,
          currentStep: 'complete'
        })
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to start simulation. Please try again.')
      setSimulationStatus('idle')
    }
  }

  const handleContinue = () => {
    router.push('/dashboard')
  }

  const handleBack = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                onClick={handleBack}
                className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">&#9658;</span>
              </div>
              <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="animate-in fade-in-up duration-500">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white text-center mb-2">
                    {agentName ? `Hi ${agentName},` : 'Welcome!'} 
                  </h2>
                  <h3 className="text-2xl font-bold text-white text-center mb-2">
                    See Your AI in Action
                  </h3>
                  <p className="text-slate-300 text-center">
                    No setup required — watch how the AI responds to a lead in under 30 seconds
                  </p>
                </div>

                {/* Idle State - Start Button */}
                {simulationStatus === 'idle' && (
                  <div className="space-y-6 mb-8">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
                      <p className="text-purple-300 text-sm mb-4">
                        We'll simulate a realistic lead inquiry and show you exactly how your AI assistant responds. 
                        No FUB connection or phone number needed.
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
                      onClick={startSimulation}
                      data-testid="standalone-simulator-start"
                      className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-lg"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Start 30-Second Demo
                    </button>

                    <p className="text-center text-slate-500 text-sm">
                      No credit card required • No setup needed • Instant demo
                    </p>
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
                          You've seen how fast and smart your AI is. Ready to handle real leads!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleContinue}
                      data-testid="standalone-simulator-continue"
                      className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-lg"
                    >
                      Continue to Dashboard →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
