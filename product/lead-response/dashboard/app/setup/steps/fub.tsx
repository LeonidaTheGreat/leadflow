'use client'

import { useState } from 'react'
import { Key, AlertCircle, CheckCircle2, ExternalLink, Shield, Building2 } from 'lucide-react'

interface SetupFUBProps {
  onNext: () => void
  setupData: {
    fubConnected: boolean
    fubApiKey: string
  }
  setSetupData: (data: any) => void
}

export default function SetupFUB({ onNext, setupData, setSetupData }: SetupFUBProps) {
  const [apiKey, setApiKey] = useState(setupData.fubApiKey || '')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(setupData.fubConnected || false)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleVerifyKey = async () => {
    setError('')
    setIsVerifying(true)

    try {
      // Validate API key format (FUB API keys are typically alphanumeric)
      if (!apiKey.trim() || apiKey.length < 20) {
        setError('Please enter a valid Follow Up Boss API key')
        return
      }

      const response = await fetch('/api/integrations/fub/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError(data.message || 'Invalid API key. Please check and try again.')
        return
      }

      setVerified(true)
      setSetupData({ ...setupData, fubConnected: true, fubApiKey: apiKey })
      
      // Log event
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'wizard_step_completed',
          properties: { step_name: 'fub', success: true }
        })
      }).catch(() => {})
    } catch (err) {
      setError('Failed to verify API key. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleContinue = () => {
    if (!verified && apiKey.trim()) {
      setError('Please verify your API key first')
      return
    }

    setSetupData({
      ...setupData,
      fubConnected: verified,
      fubApiKey: apiKey.trim(),
    })

    onNext()
  }

  const handleSkip = () => {
    // Allow skipping this step
    onNext()
  }

  return (
    <div className="animate-in fade-in-up duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-12">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-3xl font-bold text-white text-center mb-2">Connect Follow Up Boss</h2>
          <p className="text-slate-300 text-center">
            Sync your leads automatically from FUB
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-orange-300 text-sm space-y-2">
              <p>
                Your API key is encrypted and stored securely. We only use it to sync leads
                and update contact information.
              </p>
            </div>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Follow Up Boss API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setVerified(false)
                }}
                placeholder="Enter your FUB API key"
                className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-300 text-sm"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Don't have an API key?{' '}
              <a
                href="https://followupboss.com/account/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                Get one from FUB <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Verify Button */}
          {apiKey.trim() && !verified && (
            <button
              onClick={handleVerifyKey}
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-orange-300/30 border-t-orange-300 rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Verify API Key
                </>
              )}
            </button>
          )}

          {/* Verified State */}
          {verified && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-medium text-sm">API key verified!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">Leads will sync automatically</p>
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

        {/* Features */}
        <div className="bg-slate-700/20 rounded-lg p-6 mb-8">
          <p className="text-sm font-semibold text-slate-200 mb-4">With FUB connected, you get:</p>
          <ul className="space-y-2">
            {[
              'Automatic lead syncing from FUB',
              'Instant AI responses to new leads',
              'Two-way contact sync',
              'Activity logging in FUB',
              'Lead source attribution',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 border border-slate-600/50 text-slate-300 font-semibold rounded-lg hover:bg-slate-700/30 transition-all duration-200"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}
