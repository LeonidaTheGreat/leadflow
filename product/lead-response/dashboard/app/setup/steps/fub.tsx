'use client'

import { useState } from 'react'
import { Key, Shield, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react'

interface Props {
  agentId: string
  onComplete: (apiKey: string) => void
  onSkip: () => void
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('leadflow_token') || sessionStorage.getItem('leadflow_token')
}

export default function SetupFUB({ agentId, onComplete, onSkip }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async () => {
    setError('')
    if (!apiKey.trim() || apiKey.length < 20) {
      setError('Please enter a valid Follow Up Boss API key (at least 20 characters)')
      return
    }

    setIsVerifying(true)
    try {
      const res = await fetch('/api/integrations/fub/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (data.valid) {
        setVerified(true)
      } else {
        setError(data.message || 'Invalid API key. Please check and try again.')
      }
    } catch {
      setError('Failed to verify API key. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConnect = async () => {
    if (!verified) {
      setError('Please verify your API key first.')
      return
    }
    setIsVerifying(true)
    try {
      const token = getToken()
      const res = await fetch('/api/integrations/fub/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-agent-id': agentId,
        },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (data.valid) {
        onComplete(apiKey)
      } else {
        setError(data.message || 'Failed to connect FUB. Please try again.')
      }
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Icon + Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Follow Up Boss</h2>
          <p className="text-slate-400 text-sm">
            Sync your leads automatically so LeadFlow AI can respond in under 30 seconds.
          </p>
        </div>

        {/* How to find API key */}
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-300 font-medium mb-2">How to find your API key:</p>
          <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
            <li>Log in to Follow Up Boss</li>
            <li>
              Go to{' '}
              <a
                href="https://app.followupboss.com/2/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
              >
                Admin → API <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Copy your API key</li>
          </ol>
        </div>

        {/* Security notice */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-6 flex gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">
            Your API key is encrypted in transit and at rest. We only use it to import leads and update contact status.
          </p>
        </div>

        {/* API Key input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Follow Up Boss API Key
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError('')
                setVerified(false)
              }}
              placeholder="Paste your FUB API key here"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Verified badge */}
        {verified && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            API key verified! Click "Connect FUB" to save.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!verified ? (
            <button
              onClick={handleVerify}
              disabled={isVerifying || !apiKey.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isVerifying ? 'Verifying…' : 'Verify API Key'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isVerifying}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {isVerifying ? 'Connecting…' : 'Connect FUB'}
            </button>
          )}
          <button
            onClick={onSkip}
            className="sm:flex-none px-6 py-3 text-slate-400 hover:text-slate-200 font-medium transition-colors text-sm border border-slate-700 rounded-lg hover:border-slate-500"
          >
            Skip for now
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          You can connect FUB later in{' '}
          <span className="text-slate-400">Settings → Integrations</span>
        </p>
      </div>
    </div>
  )
}
