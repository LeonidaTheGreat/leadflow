'use client'

import { useState } from 'react'
import { MessageSquare, AlertCircle, CheckCircle2, Phone, RefreshCw, SkipForward } from 'lucide-react'

interface StepVerifySMSProps {
  onComplete: () => void
  onSkip: () => void
  token: string
  agentName: string
  phoneDisabled: boolean // true if Step 2 was skipped
}

export default function StepVerifySMS({
  onComplete,
  onSkip,
  token,
  agentName,
  phoneDisabled,
}: StepVerifySMSProps) {
  const [mobileNumber, setMobileNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [error, setError] = useState('')

  const formatDisplay = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handleSendSMS = async () => {
    setError('')
    const digits = mobileNumber.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/agents/onboarding/verify-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobileNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send SMS. Please try again.')
        return
      }

      setSmsSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (phoneDisabled) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-slate-700/50 border border-slate-600/50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">SMS Verification</h2>
            <p className="text-slate-400">
              This step requires a configured phone number (Step 2).
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
            <p className="text-amber-300 text-sm text-center">
              ⚠️ You skipped Step 2 — phone number not configured yet.
              Complete Step 2 first to send an SMS verification.
            </p>
          </div>

          <button
            onClick={onSkip}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            Skip &amp; Finish Setup →
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
          <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Verify SMS</h2>
          <p className="text-slate-400 text-sm md:text-base">
            Send a test SMS to your mobile to confirm everything is working.
          </p>
        </div>

        {/* Preview of what they'll receive */}
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-5 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-medium">
            Preview — what you'll receive:
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-emerald-300 text-sm leading-relaxed">
              Hi {agentName.split(' ')[0] || 'there'}! 👋 Your LeadFlow setup is complete.
              You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI
            </p>
          </div>
        </div>

        {/* Mobile number input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Your Personal Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(formatDisplay(e.target.value))
                  setError('')
                  setSmsSent(false)
                }}
                placeholder="(555) 123-4567"
                disabled={smsSent}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Enter your mobile number — this is where the test SMS will go</p>
          </div>

          {/* Send button */}
          {!smsSent && (
            <button
              onClick={handleSendSMS}
              disabled={isLoading || mobileNumber.replace(/\D/g, '').length < 10}
              className="w-full py-3 px-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Send Test SMS
                </>
              )}
            </button>
          )}

          {/* Success */}
          {smsSent && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-emerald-400 font-medium text-sm">SMS sent! Check your phone.</p>
              </div>
              <button
                onClick={() => setSmsSent(false)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 mt-1"
              >
                <RefreshCw className="w-3 h-3" /> Didn't get it? Send again
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-red-400 text-sm">{error}</p>
                <a
                  href="mailto:support@leadflow.ai"
                  className="text-xs text-red-300/70 hover:text-red-300 mt-1 block"
                >
                  Contact support →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-3 border border-slate-600/50 text-slate-400 hover:text-slate-300 font-medium rounded-lg hover:bg-slate-700/30 transition-all duration-200 text-sm"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={onComplete}
            disabled={!smsSent}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {smsSent ? 'Continue →' : 'Send SMS to Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
