'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react'

interface PhoneStepProps {
  onComplete: (phoneNumber: string, skipped?: boolean) => void
  token: string
  alreadyConfigured?: boolean
}

type PhoneMode = 'choose' | 'new' | 'existing'

export default function PhoneStep({ onComplete, token, alreadyConfigured = false }: PhoneStepProps) {
  const [mode, setMode] = useState<PhoneMode>(alreadyConfigured ? 'existing' : 'choose')
  const [areaCode, setAreaCode] = useState('')
  const [existingNumber, setExistingNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [provisionedNumber, setProvisionedNumber] = useState('')

  const handleProvisionNew = async () => {
    setError('')
    if (areaCode.replace(/\D/g, '').length !== 3) {
      setError('Enter a valid 3-digit area code (e.g. 415)')
      return
    }
    setIsLoading(true)

    try {
      const res = await fetch('/api/agents/onboarding/provision-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ areaCode: areaCode.replace(/\D/g, '') }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to provision phone number.')
        return
      }

      setProvisionedNumber(data.phoneNumber)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigureExisting = async () => {
    setError('')
    const digits = existingNumber.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Enter a valid 10-digit US/Canada phone number.')
      return
    }
    setIsLoading(true)

    try {
      const res = await fetch('/api/agents/onboarding/configure-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber: existingNumber }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to configure phone number.')
        return
      }

      onComplete(data.phoneNumber)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    onComplete('', true)
  }

  if (provisionedNumber) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Phone Number Ready!</h2>
            <p className="text-slate-400 text-sm">Your LeadFlow number has been provisioned.</p>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-6 text-center mb-6">
            <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Your LeadFlow Number</p>
            <p className="text-3xl font-mono font-bold text-white">{provisionedNumber}</p>
            <p className="text-slate-500 text-xs mt-2">Leads will see this number when they receive SMS from you</p>
          </div>

          <button
            onClick={() => onComplete(provisionedNumber)}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
          >
            Continue to SMS Verification →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
            <Phone className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configure Your Phone Number</h2>
          <p className="text-slate-400 text-sm">
            This is the number leads will receive SMS from.
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setMode('new')}
              className="w-full p-5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-emerald-500/50 rounded-xl text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1 group-hover:text-emerald-400 transition-colors">
                    Get a new Twilio number
                  </p>
                  <p className="text-slate-400 text-xs">
                    We'll provision a local number in your area code. ~$1/month billed through LeadFlow.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('existing')}
              className="w-full p-5 bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/50 hover:border-blue-500/50 rounded-xl text-left transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1 group-hover:text-blue-400 transition-colors">
                    Use my existing Twilio number
                  </p>
                  <p className="text-slate-400 text-xs">
                    Already have a Twilio number? Enter it here.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setMode('choose')}
              className="text-slate-400 hover:text-slate-300 text-xs flex items-center gap-1"
            >
              ← Back
            </button>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-blue-300 text-xs">
                A Twilio phone number costs ~$1/month. This is included in your LeadFlow plan.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Preferred Area Code
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                <input
                  type="tel"
                  value={areaCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                    setAreaCode(val)
                    setError('')
                  }}
                  placeholder="e.g. 415"
                  maxLength={3}
                  className="w-full pl-9 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Enter a 3-digit US/Canada area code</p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleProvisionNew}
              disabled={isLoading || areaCode.length !== 3}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Provision Number'
              )}
            </button>
          </div>
        )}

        {mode === 'existing' && (
          <div className="space-y-4 mb-6">
            {!alreadyConfigured && (
              <button
                onClick={() => setMode('choose')}
                className="text-slate-400 hover:text-slate-300 text-xs flex items-center gap-1"
              >
                ← Back
              </button>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Your Twilio Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                <input
                  type="tel"
                  value={existingNumber}
                  onChange={(e) => {
                    setExistingNumber(e.target.value)
                    setError('')
                  }}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-9 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">10-digit US/Canada number</p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleConfigureExisting}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Number →'
              )}
            </button>
          </div>
        )}

        {/* Skip */}
        {mode === 'choose' && (
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
