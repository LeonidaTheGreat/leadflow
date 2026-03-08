'use client'

import { useState } from 'react'
import { Phone, AlertCircle, CheckCircle2, Info, SkipForward, Sparkles, Hash } from 'lucide-react'

interface StepPhoneProps {
  onComplete: (phoneNumber: string) => void
  onSkip: () => void
  token: string
}

type PhoneMode = 'choose' | 'new' | 'existing'

export default function StepPhone({ onComplete, onSkip, token }: StepPhoneProps) {
  const [mode, setMode] = useState<PhoneMode>('choose')
  const [areaCode, setAreaCode] = useState('')
  const [existingPhone, setExistingPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [provisionedNumber, setProvisionedNumber] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const formatPhoneDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handleProvisionNew = async () => {
    setError('')
    if (!/^\d{3}$/.test(areaCode)) {
      setError('Please enter a valid 3-digit area code (e.g. 416, 604, 212)')
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
        body: JSON.stringify({ areaCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to provision phone number. Please try again.')
        return
      }

      setProvisionedNumber(data.phoneNumber)
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveExisting = async () => {
    setError('')
    const digits = existingPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.')
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
        body: JSON.stringify({ phoneNumber: existingPhone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save phone number. Please try again.')
        return
      }

      setProvisionedNumber(data.phoneNumber)
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    onComplete(provisionedNumber)
  }

  if (success) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Phone Number Configured!</h2>
            <p className="text-emerald-400 font-mono text-lg">{provisionedNumber}</p>
            <p className="text-slate-400 text-sm mt-2">
              This number will be used to send AI-powered SMS responses to your leads.
            </p>
          </div>

          <div className="bg-slate-700/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 text-sm">
              A Twilio phone number costs ~$1/month, billed to your LeadFlow account.
              You can change this number anytime in Settings → Integrations.
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
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
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Configure Your Phone Number</h2>
          <p className="text-slate-400 text-sm md:text-base">
            Choose a phone number for sending AI-powered SMS responses to your leads.
          </p>
        </div>

        {/* Cost disclosure */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-300 text-sm">
            A Twilio phone number costs ~$1/month, billed to your LeadFlow account. SMS costs ~$0.01 per message.
          </p>
        </div>

        {/* Mode selection */}
        {mode === 'choose' && (
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setMode('new')}
              className="w-full p-5 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:border-emerald-500/50 hover:bg-slate-700/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Get a new number</p>
                  <p className="text-sm text-slate-400">We'll provision a number in your area code</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('existing')}
              className="w-full p-5 bg-slate-700/30 border border-slate-600/50 rounded-xl hover:border-blue-500/50 hover:bg-slate-700/50 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition">
                  <Hash className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Use an existing number</p>
                  <p className="text-sm text-slate-400">Enter a Twilio number you already own</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Get new number flow */}
        {mode === 'new' && (
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setMode('choose')}
              className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1 mb-2"
            >
              ← Back
            </button>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Desired Area Code (US/Canada)
              </label>
              <input
                type="text"
                value={areaCode}
                onChange={(e) => {
                  setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))
                  setError('')
                }}
                placeholder="e.g. 416, 604, 212"
                maxLength={3}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono text-lg tracking-widest"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter the 3-digit area code for your area (e.g. 416 for Toronto, 212 for NYC)
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleProvisionNew}
              disabled={isLoading || areaCode.length !== 3}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Get My Number →'
              )}
            </button>
          </div>
        )}

        {/* Use existing number flow */}
        {mode === 'existing' && (
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setMode('choose')}
              className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1 mb-2"
            >
              ← Back
            </button>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Your Twilio Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
                <input
                  type="tel"
                  value={existingPhone}
                  onChange={(e) => {
                    setExistingPhone(formatPhoneDisplay(e.target.value))
                    setError('')
                  }}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This number must be a verified Twilio number in your Twilio account
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSaveExisting}
              disabled={isLoading || existingPhone.replace(/\D/g, '').length < 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <button
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-300 text-sm transition"
          >
            <SkipForward className="w-4 h-4" />
            Skip for now — I'll configure this in Settings
          </button>
        )}
      </div>
    </div>
  )
}
