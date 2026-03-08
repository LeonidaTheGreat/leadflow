'use client'

import { useState } from 'react'
import { MessageSquare, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'

interface SmsVerifyStepProps {
  onComplete: (skipped?: boolean) => void
  token: string
  agentName: string
  phoneConfigured: boolean
  alreadyVerified?: boolean
}

export default function SmsVerifyStep({
  onComplete,
  token,
  agentName,
  phoneConfigured,
  alreadyVerified = false,
}: SmsVerifyStepProps) {
  const [mobileNumber, setMobileNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [smsSent, setSmsSent] = useState(alreadyVerified)
  const [error, setError] = useState('')

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handleSendSms = async () => {
    setError('')
    const digits = mobileNumber.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.')
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
        body: JSON.stringify({ mobileNumber: digits, agentName }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || data.error || 'Failed to send SMS.')
        return
      }

      setSmsSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    onComplete(true)
  }

  // Greyed out if phone is not configured
  if (!phoneConfigured) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10 opacity-70">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-700/50 border border-slate-600/40 flex items-center justify-center mx-auto mb-5">
              <MessageSquare className="w-7 h-7 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Verify SMS</h2>
            <p className="text-slate-500 text-sm">
              Complete Step 2 (phone configuration) to enable SMS verification.
            </p>
          </div>
          <div className="bg-slate-700/20 rounded-lg p-4 text-center">
            <p className="text-slate-500 text-sm">This step is disabled until you configure a phone number.</p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2.5 text-slate-500 text-sm font-medium border border-slate-700 rounded-lg"
              disabled
            >
              Skip for now
            </button>
            <button
              onClick={() => onComplete(true)}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-400 font-semibold rounded-lg text-sm"
              disabled
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
            <MessageSquare className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verify SMS Works</h2>
          <p className="text-slate-400 text-sm">
            Send a test SMS to your mobile to confirm everything is connected.
          </p>
        </div>

        {/* Already verified */}
        {smsSent && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-400 font-medium text-sm">SMS sent! Check your phone. 📱</p>
              <p className="text-emerald-300/70 text-xs mt-0.5">
                You should receive a message from LeadFlow AI shortly.
              </p>
            </div>
          </div>
        )}

        {/* Input section */}
        {!smsSent && (
          <div className="space-y-4 mb-6">
            {/* Preview of SMS */}
            <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/20">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">You'll receive:</p>
              <p className="text-slate-300 text-sm italic">
                "Hi {agentName || 'Agent'}! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Your Mobile Number
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(formatPhone(e.target.value))
                    setError('')
                  }}
                  placeholder="(555) 123-4567"
                  className="w-full pl-9 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">This is just for verification — not stored</p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  <a
                    href="mailto:support@leadflow.ai"
                    className="text-red-300/70 text-xs inline-flex items-center gap-1 mt-1"
                  >
                    Contact support <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={handleSendSms}
              disabled={isLoading || mobileNumber.replace(/\D/g, '').length !== 10}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending test SMS...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Send Test SMS
                </>
              )}
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          {!smsSent && (
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          )}
          {smsSent && (
            <button
              onClick={() => onComplete()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
            >
              Continue to Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
