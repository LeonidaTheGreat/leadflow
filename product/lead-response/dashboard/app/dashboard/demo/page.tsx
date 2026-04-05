'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Send,
  User,
  Home,
  MapPin,
  Lock,
} from 'lucide-react'
import Link from 'next/link'

const DEMO_LIMIT = 3

const LEAD_SOURCES = [
  { value: '', label: 'Select source (optional)' },
  { value: 'Zillow', label: 'Zillow' },
  { value: 'Realtor.com', label: 'Realtor.com' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Google', label: 'Google' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
]

interface DemoResult {
  aiResponse: string
  responseTimeMs: number
  demosRemaining: number
}

interface DemoStatus {
  demosUsed: number
  demosRemaining: number
  limitReached: boolean
}

export default function DashboardDemoPage() {
  const [leadName, setLeadName] = useState('Sarah Johnson')
  const [phone, setPhone] = useState('+1 (555) 867-5309')
  const [propertyInterest, setPropertyInterest] = useState('3BR house under $750K in Mississauga')
  const [leadSource, setLeadSource] = useState('Zillow')

  const [stage, setStage] = useState<'input' | 'processing' | 'complete' | 'error' | 'limit'>('input')
  const [result, setResult] = useState<DemoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [demoStatus, setDemoStatus] = useState<DemoStatus>({
    demosUsed: 0,
    demosRemaining: DEMO_LIMIT,
    limitReached: false,
  })
  const [statusLoaded, setStatusLoaded] = useState(false)

  // Fetch current demo status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/demo/status')
        if (res.ok) {
          const data = await res.json()
          setDemoStatus({
            demosUsed: data.demos_used ?? 0,
            demosRemaining: data.demos_remaining ?? DEMO_LIMIT,
            limitReached: data.limit_reached ?? false,
          })
          if (data.limit_reached) setStage('limit')
        }
      } catch {
        // Non-fatal — default to DEMO_LIMIT remaining
      } finally {
        setStatusLoaded(true)
      }
    }
    fetchStatus()
  }, [])

  // Elapsed timer during processing
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (stage === 'processing') {
      const start = Date.now()
      interval = setInterval(() => setElapsedMs(Date.now() - start), 100)
    }
    return () => clearInterval(interval)
  }, [stage])

  const validate = (): boolean => {
    if (!leadName.trim()) { setError('Please enter a lead name'); return false }
    if (!propertyInterest.trim()) { setError('Please enter a property interest'); return false }
    return true
  }

  const handleRunDemo = useCallback(async () => {
    if (!validate() || isSubmitting) return
    setIsSubmitting(true)
    setStage('processing')
    setError(null)

    try {
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            name: leadName.trim(),
            phone: phone.trim() || undefined,
            source: leadSource || undefined,
            property_interest: propertyInterest.trim(),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response')
      }

      if (!data.success && data.error === 'demo_limit_reached') {
        setDemoStatus({ demosUsed: DEMO_LIMIT, demosRemaining: 0, limitReached: true })
        setStage('limit')
        return
      }

      setResult({
        aiResponse: data.ai_response,
        responseTimeMs: data.response_time_ms,
        demosRemaining: data.demos_remaining,
      })
      setDemoStatus(prev => ({
        ...prev,
        demosUsed: prev.demosUsed + 1,
        demosRemaining: data.demos_remaining,
        limitReached: data.demos_remaining === 0,
      }))
      setStage('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('error')
    } finally {
      setIsSubmitting(false)
    }
  }, [leadName, phone, propertyInterest, leadSource, isSubmitting])

  const handleRunAnother = () => {
    setStage('input')
    setResult(null)
    setError(null)
    setElapsedMs(0)
  }

  if (!statusLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          See AI Respond in Seconds
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Enter a fake lead below and watch the AI craft a personalized SMS response — no FUB setup needed.
        </p>
      </div>

      {/* Demo counter badge */}
      {stage !== 'limit' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {demoStatus.demosRemaining} demo{demoStatus.demosRemaining !== 1 ? 's' : ''} remaining
          </span>
          <span className="text-emerald-500">of {DEMO_LIMIT}</span>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {stage === 'processing' && (
          <div className="h-1 bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min((elapsedMs / 8000) * 100, 95)}%` }}
            />
          </div>
        )}

        <div className="p-6">
          {/* Input stage */}
          {(stage === 'input' || stage === 'error') && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Simulate a Lead</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pre-filled with sample data — edit any field</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Lead Name *
                  </label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => { setLeadName(e.target.value); setError(null) }}
                    placeholder="e.g., Sarah Johnson"
                    maxLength={50}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lead Source
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {LEAD_SOURCES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-slate-400" /> Property Interest *
                </label>
                <input
                  type="text"
                  value={propertyInterest}
                  onChange={(e) => { setPropertyInterest(e.target.value); setError(null) }}
                  placeholder="e.g., 3BR house under $750K in Mississauga"
                  maxLength={100}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleRunDemo}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Send className="w-4 h-4" /> Run Demo</>
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                [DEMO] — No real SMS sent. No FUB connection required.
              </p>
            </div>
          )}

          {/* Processing stage */}
          {stage === 'processing' && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">AI is crafting the response...</p>
                <p className="text-sm text-slate-500 mt-1">Analyzing lead intent, budget, and timeline</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          )}

          {/* Complete stage */}
          {stage === 'complete' && result && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                    AI Response Generated in {(result.responseTimeMs / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    This is exactly what your leads would receive — instantly.
                  </p>
                </div>
              </div>

              {/* Conversation preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversation Preview</p>

                {/* Lead message */}
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        Hi, I&apos;m interested in {propertyInterest}. Can you help me?
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{leadName}</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-2.5 flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="bg-emerald-600 rounded-2xl rounded-tr-sm px-3 py-2 max-w-xs shadow-sm">
                      <p className="text-sm text-white">{result.aiResponse}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-emerald-500">AI Agent</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{(result.responseTimeMs / 1000).toFixed(1)}s</span>
                      <span className="text-xs text-amber-500 font-medium">[DEMO]</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {result.demosRemaining > 0 ? (
                  <button
                    onClick={handleRunAnother}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Run Another Demo ({result.demosRemaining} left)
                  </button>
                ) : null}
                <Link
                  href="/dashboard/onboarding#fub"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Connect FUB to go live <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {result.demosRemaining === 0 && (
                <p className="text-center text-xs text-slate-400">
                  You&apos;ve used all {DEMO_LIMIT} demo runs. Connect FUB to respond to real leads.
                </p>
              )}
            </div>
          )}

          {/* Limit reached stage */}
          {stage === 'limit' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Demo Limit Reached</p>
                <p className="text-sm text-slate-500 mt-1">
                  You&apos;ve completed {DEMO_LIMIT} demo runs. Connect Follow Up Boss to start responding to real leads.
                </p>
              </div>
              <Link
                href="/dashboard/onboarding#fub"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                Connect Follow Up Boss to respond to real leads <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-slate-400">
                Once connected, your AI will respond to real leads in under 30 seconds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
