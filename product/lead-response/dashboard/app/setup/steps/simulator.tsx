'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react'

interface SetupSimulatorProps {
  onNext: () => void
  onBack: () => void
  setupData: {
    simulatorCompleted: boolean
  }
  setSetupData: (data: any) => void
  agentId: string | null
}

export default function SetupSimulator({ 
  onNext, 
  onBack, 
  setupData, 
  setSetupData,
  agentId 
}: SetupSimulatorProps) {
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [conversation, setConversation] = useState<Array<{ role: string; message: string }>>([])
  const [error, setError] = useState('')

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
          sessionId: `setup-${agentId}-${Date.now()}`
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
        await new Promise(r => setTimeout(r, i === 0 ? 800 : 1200 + Math.random() * 800))
        setConversation(prev => [...prev, messages[i]])
      }

      // Mark complete
      setSimulationStatus('complete')
      setSetupData({ ...setupData, simulatorCompleted: true })
    } catch (err: any) {
      setError(err?.message || 'Failed to start simulation. Please try again.')
      setSimulationStatus('idle')
    }
  }

  const handleContinue = () => {
    onNext()
  }

  const handleSkip = () => {
    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2">See Your AI in Action</h2>
          <p className="text-slate-300 text-center">
            Watch how the AI responds to a simulated lead
          </p>
        </div>

        {/* Idle State - Start Button */}
        {simulationStatus === 'idle' && (
          <div className="space-y-6 mb-8">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
              <p className="text-purple-300 text-sm mb-4">
                We'll simulate a lead coming in and show you how your AI assistant responds.
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
              onClick={startSimulation}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Start Simulation
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 px-4 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
            >
              Skip this for now
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
                  You've seen how fast and smart your AI is. Ready to handle real leads!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            ← Back
          </button>
          {simulationStatus === 'complete' && (
            <button
              onClick={handleContinue}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
