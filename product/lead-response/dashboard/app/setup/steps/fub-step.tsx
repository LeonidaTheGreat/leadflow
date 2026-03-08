'use client'

import { useState } from 'react'
import { Key, AlertCircle, CheckCircle2, ExternalLink, Shield, Loader2 } from 'lucide-react'

interface FubStepProps {
  onComplete: (skipped?: boolean) => void
  token: string
  alreadyConnected?: boolean
}

export default function FubStep({ onComplete, token, alreadyConnected = false }: FubStepProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(alreadyConnected)
  const [error, setError] = useState('')
  const [fubUser, setFubUser] = useState<{ name?: string; email?: string } | null>(null)

  const handleVerify = async () => {
    setError('')
    setIsVerifying(true)

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

      if (!res.ok || !data.valid) {
        setError(data.message || data.error || 'Failed to connect Follow Up Boss.')
        return
      }

      setVerified(true)
      setFubUser(data.fubUser)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    if (!verified && apiKey.trim()) {
      setError('Please verify your API key first.')
      return
    }
    onComplete(false)
  }

  const handleSkip = () => {
    onComplete(true)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Follow Up Boss</h2>
          <p className="text-slate-400 text-sm">
            Sync leads automatically so LeadFlow can respond within 30 seconds.
          </p>
        </div>

        {/* Security notice */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-6 flex gap-3">
          <Shield className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-orange-300 text-xs">
            Your API key is encrypted and stored securely. We only use it to sync leads and update contacts.
          </p>
        </div>

        {/* Already connected state */}
        {alreadyConnected && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-400 font-medium text-sm">Follow Up Boss is already connected!</p>
              <p className="text-emerald-300/70 text-xs mt-0.5">Click Continue to proceed.</p>
            </div>
          </div>
        )}

        {/* Input section */}
        {!alreadyConnected && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Follow Up Boss API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setVerified(false)
                    setError('')
                  }}
                  placeholder="Paste your FUB API key here"
                  className="w-full pl-9 pr-14 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-300 text-xs"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <a
                href="https://app.followupboss.com/2/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 mt-2"
              >
                Get your API key from FUB <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Verify button */}
            {apiKey.trim() && !verified && (
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-2.5 px-4 bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying with Follow Up Boss...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Verify & Connect
                  </>
                )}
              </button>
            )}

            {/* Verified state */}
            {verified && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-400 font-medium text-sm">Connected!</p>
                  {fubUser?.name && (
                    <p className="text-emerald-300/70 text-xs mt-0.5">
                      Logged in as {fubUser.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSkip}
            className="px-4 py-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
