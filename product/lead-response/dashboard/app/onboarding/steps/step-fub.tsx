'use client'

import { useState } from 'react'
import { Key, AlertCircle, CheckCircle2, ExternalLink, Shield, SkipForward } from 'lucide-react'

interface StepFUBProps {
  onComplete: () => void
  onSkip: () => void
  token: string
}

export default function StepFUB({ onComplete, onSkip, token }: StepFUBProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setError('')
    setIsConnecting(true)

    try {
      const res = await fetch('/api/agents/onboarding/fub-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to connect FUB. Please try again.')
        return
      }

      setConnected(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleContinue = () => {
    if (!connected) {
      setError('Please connect FUB first, or skip this step.')
      return
    }
    onComplete()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Connect Follow Up Boss</h2>
          <p className="text-slate-400 text-sm md:text-base">
            Enter your FUB API key so LeadFlow can sync leads automatically and log activity back to your CRM.
          </p>
        </div>

        {/* Security notice */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6 flex gap-3">
          <Shield className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-orange-300 text-sm">
            Your API key is encrypted at rest and only used to sync leads and update contact records.
          </p>
        </div>

        {/* API key input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Follow Up Boss API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setConnected(false)
                  setError('')
                }}
                placeholder="Paste your FUB API key here"
                className="w-full pl-10 pr-16 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Find your API key at{' '}
              <a
                href="https://app.followupboss.com/2/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                FUB Settings → API <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Connect button */}
          {!connected && apiKey.trim().length >= 20 && (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3 px-4 bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-orange-300/30 border-t-orange-300 rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Test Connection &amp; Connect
                </>
              )}
            </button>
          )}

          {/* Connected state */}
          {connected && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">FUB connected!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">
                  Leads will sync automatically and activity will be logged in FUB.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* What you get */}
        <div className="bg-slate-700/20 rounded-lg p-5 mb-6">
          <p className="text-sm font-semibold text-slate-200 mb-3">With FUB connected:</p>
          <ul className="space-y-2">
            {[
              'New leads sync instantly from FUB',
              'AI responses logged as FUB activities',
              'Two-way contact sync',
              'Lead source attribution preserved',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-3 border border-slate-600/50 text-slate-400 hover:text-slate-300 font-medium rounded-lg hover:bg-slate-700/30 transition-all duration-200 text-sm"
          >
            <SkipForward className="w-4 h-4" />
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            disabled={!connected}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
