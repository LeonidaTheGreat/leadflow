'use client'

import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
  Send,
  User,
} from 'lucide-react'

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
  const [leadName, setLeadName] = useState('Sarah Johnson')
  const [propertyInterest, setPropertyInterest] = useState('3BR house under $750K in Mississauga')
  const [leadSource, setLeadSource] = useState('Zillow')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limit'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(3)
  const [aiResponse, setAiResponse] = useState('')

  const handleSend = async () => {
    if (!leadName.trim()) {
      setErrorMsg('Please enter a lead name')
      return
    }
    if (!propertyInterest.trim()) {
      setErrorMsg('Please enter a property interest')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    try {
      const token = getToken()
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          lead: {
            name: leadName.trim(),
            source: leadSource || undefined,
            property_interest: propertyInterest.trim(),
          },
        }),
      })

      const data = await res.json()

      if (data?.error === 'demo_limit_reached') {
        setStatus('limit')
        setRemaining(0)
        return
      }
      if (!res.ok || !data.success) {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to run demo')
        return
      }

      setStatus('sent')
      setResponseTimeMs(data.response_time_ms)
      setRemaining(data.demos_remaining)
      setAiResponse(data.ai_response || '')
      setAgentData({
        ...agentData,
        ahaCompleted: true,
        ahaResponseTimeMs: data.response_time_ms,
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
          <h2 className="text-2xl font-bold text-white mb-2">AI response generated</h2>
          <p className="text-slate-400">
            This is what your real leads would receive automatically.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">AI Demo Response [DEMO]</p>
          <p className="text-slate-100 text-base">{aiResponse}</p>
          <p className="text-slate-400 text-sm">
            Response time:{' '}
            <span className="text-emerald-400 font-semibold">
              {responseTimeMs ? `${(responseTimeMs / 1000).toFixed(1)}s` : '<30s'}
            </span>
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

        {remaining !== null && (
          <p className="text-xs text-slate-500 text-center">
            {remaining} demo run{remaining === 1 ? '' : 's'} remaining
          </p>
        )}
      </div>
    )
  }

  if (status === 'limit') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Demo limit reached</h2>
          <p className="text-slate-400">
            You&apos;ve used all 3 demo runs. Connect Follow Up Boss to respond to real leads.
          </p>
        </div>

        <a
          href="/dashboard/onboarding#fub"
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Connect Follow Up Boss
          <ArrowRight className="w-4 h-4" />
        </a>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Continue setup
          </button>
        </div>
      </div>
    )
  }

  // Input form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">See AI in action instantly</h2>
        <p className="text-slate-400">
          Enter a test lead and watch LeadFlow generate a personalized response in under 30 seconds.
          No FUB setup required.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="demo-lead-name" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            Lead name
          </label>
          <input
            id="demo-lead-name"
            type="text"
            placeholder="Sarah Johnson"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            disabled={status === 'sending'}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="demo-source" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            Lead source (optional)
          </label>
          <select
            id="demo-source"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            disabled={status === 'sending'}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
          >
            <option value="Zillow">Zillow</option>
            <option value="Realtor.com">Realtor.com</option>
            <option value="Google">Google</option>
            <option value="Facebook">Facebook</option>
            <option value="Referral">Referral</option>
          </select>
        </div>

        <div>
          <label htmlFor="demo-interest" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-500" />
            Property interest
          </label>
          <input
            id="demo-interest"
            type="text"
            placeholder="3BR house under $750K in Mississauga"
            value={propertyInterest}
            onChange={(e) => setPropertyInterest(e.target.value)}
            disabled={status === 'sending'}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all disabled:opacity-50"
          />
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={status === 'sending' || !leadName.trim() || !propertyInterest.trim()}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running demo...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Run demo
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
