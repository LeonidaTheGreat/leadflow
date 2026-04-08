'use client'

import { useState } from 'react'
import { Smartphone, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

interface TryAiProps {
  onNext: () => void
  onBack: () => void
  agentData: any
  setAgentData: (data: any) => void
}

function getToken(): string | null {
  try {
    return localStorage.getItem('leadflow_token') || sessionStorage.getItem('leadflow_token') || null
  } catch {
    return null
  }
}

export default function OnboardingTryAi({ onNext, onBack, agentData, setAgentData }: TryAiProps) {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const handleSend = async () => {
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    try {
      const token = getToken()
      const res = await fetch('/api/demo/send-aha-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to send SMS')
        return
      }

      setStatus('sent')
      setResponseTimeMs(data.responseTimeMs)
      setRemaining(data.remaining)
      setAgentData({
        ...agentData,
        ahaCompleted: true,
        ahaResponseTimeMs: data.responseTimeMs,
      })
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  const handleSkip = () => {
    setAgentData({ ...agentData, ahaSkipped: true })
    onNext()
  }

  // After SMS sent — show upgrade CTA
  if (status === 'sent') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your phone!</h2>
          <p className="text-slate-400">
            We just sent an AI lead response to your number.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center space-y-3">
          <p className="text-slate-300 text-lg font-medium">
            That&apos;s what your leads experience in under{' '}
            <span className="text-emerald-400 font-bold">
              {responseTimeMs ? `${(responseTimeMs / 1000).toFixed(1)}s` : '30 seconds'}
            </span>.
          </p>
          <p className="text-slate-400 text-sm">
            Every lead. Every time. 24/7. No missed opportunities.
          </p>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Start your free trial — no credit card required
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Set up your CRM integration next to start responding to real leads automatically.
          </p>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
          >
            Continue setup
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {remaining !== null && remaining < 2 && (
          <p className="text-xs text-slate-500 text-center">
            {remaining} demo SMS remaining today
          </p>
        )}
      </div>
    )
  }

  // Input form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See AI in action — on your phone</h2>
        <p className="text-slate-400">
          Enter your mobile number and we&apos;ll send you a sample AI lead response.
          No CRM setup needed.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="aha-phone" className="block text-sm font-medium text-slate-300 mb-2">
            Your mobile number
          </label>
          <input
            id="aha-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={status === 'sending'}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
          />
          <p className="text-xs text-slate-500 mt-1">
            US/Canada numbers only. Standard messaging rates may apply.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={status === 'sending' || !phone.trim()}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" />
              Send me a sample AI response
            </>
          )}
        </button>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSkip}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
