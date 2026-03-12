'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  RefreshCw,
  Send,
  Smartphone,
  User,
  Home,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { trackDemoEvent, generateDemoSessionId, getResponseTimeBucket } from '@/lib/analytics/demo'

// Demo stages
type DemoStage = 'input' | 'processing' | 'responding' | 'complete' | 'error'

interface DemoState {
  stage: DemoStage
  leadName: string
  propertyInterest: string
  leadSource: string
  aiResponse: string
  responseTimeMs: number
  error: string | null
  sessionId: string
}

const LEAD_SOURCES = [
  { value: '', label: 'Select source (optional)' },
  { value: 'Zillow', label: 'Zillow' },
  { value: 'Realtor.com', label: 'Realtor.com' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Google', label: 'Google' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
]

const PROPERTY_TYPES = [
  'Single Family Home',
  'Condo',
  'Townhouse',
  'Investment Property',
  'Luxury Home',
  'First-time Buyer Home',
]

export default function DemoPage() {
  const router = useRouter()
  const [state, setState] = useState<DemoState>({
    stage: 'input',
    leadName: '',
    propertyInterest: '',
    leadSource: '',
    aiResponse: '',
    responseTimeMs: 0,
    error: null,
    sessionId: '',
  })
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize session ID on mount
  useEffect(() => {
    const sessionId = generateDemoSessionId()
    setState(prev => ({ ...prev, sessionId }))
    
    // Track demo started
    trackDemoEvent('demo_started', {
      entry_point: window.location.pathname,
      session_id: sessionId,
    })
  }, [])

  // Timer for processing state
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state.stage === 'processing' || state.stage === 'responding') {
      const startTime = Date.now()
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [state.stage])

  const handleInputChange = (field: keyof DemoState, value: string) => {
    setState(prev => ({ ...prev, [field]: value, error: null }))
  }

  const validateInputs = (): boolean => {
    if (!state.leadName.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a lead name' }))
      return false
    }
    if (!state.propertyInterest.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a property interest' }))
      return false
    }
    return true
  }

  const handleSubmit = useCallback(async () => {
    if (!validateInputs() || isSubmitting) return
    
    setIsSubmitting(true)
    setState(prev => ({ ...prev, stage: 'processing', error: null }))

    const requestStartTime = Date.now()

    try {
      const response = await fetch('/api/demo/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: state.leadName,
          propertyInterest: state.propertyInterest,
          leadSource: state.leadSource || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate response')
      }

      const responseTimeMs = Date.now() - requestStartTime

      // Track response generated
      trackDemoEvent('demo_response_generated', {
        session_id: state.sessionId,
        response_time_ms: responseTimeMs,
        response_time_bucket: getResponseTimeBucket(responseTimeMs),
        personalization_present: true,
        property_type: state.propertyInterest,
        lead_source: state.leadSource || undefined,
      })

      // Show responding animation briefly
      setState(prev => ({ ...prev, stage: 'responding' }))
      
      await new Promise(resolve => setTimeout(resolve, 800))

      // Track demo completed
      trackDemoEvent('demo_completed', {
        session_id: state.sessionId,
        response_time_ms: responseTimeMs,
        cta_visible: true,
      })

      setState(prev => ({
        ...prev,
        stage: 'complete',
        aiResponse: data.response,
        responseTimeMs: responseTimeMs,
      }))
    } catch (err) {
      console.error('Demo error:', err)
      
      trackDemoEvent('demo_error', {
        session_id: state.sessionId,
        error_type: err instanceof Error ? err.message : 'unknown',
      })

      setState(prev => ({
        ...prev,
        stage: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [state.leadName, state.propertyInterest, state.leadSource, state.sessionId, isSubmitting])

  const handleRetry = () => {
    setState(prev => ({
      ...prev,
      stage: 'input',
      aiResponse: '',
      responseTimeMs: 0,
      error: null,
    }))
    setElapsedTime(0)
  }

  const handleCTAClick = (ctaTarget: string) => {
    trackDemoEvent('demo_cta_clicked', {
      session_id: state.sessionId,
      cta_target: ctaTarget,
      entry_point: '/demo',
    })
  }

  const formatElapsedTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}s`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">▶</span>
            </div>
            <h1 className="text-lg font-semibold text-white">LeadFlow AI</h1>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup?mode=trial"
              onClick={() => handleCTAClick('header_signup')}
              className="text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Live AI Demo</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See AI Respond in Under 30 Seconds
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Experience how LeadFlow AI instantly qualifies and responds to your leads. 
            No signup required.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Progress Bar */}
          {(state.stage === 'processing' || state.stage === 'responding') && (
            <div className="h-1 bg-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse"
                style={{ width: `${Math.min((elapsedTime / 5000) * 100, 100)}%` }}
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Input Stage */}
            {state.stage === 'input' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Simulate a Lead</h2>
                    <p className="text-sm text-slate-400">Enter lead details to see AI in action</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="leadName" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      Lead Name *
                    </label>
                    <input
                      id="leadName"
                      type="text"
                      value={state.leadName}
                      onChange={(e) => handleInputChange('leadName', e.target.value)}
                      placeholder="e.g., Sarah Johnson"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="leadSource" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      Lead Source
                    </label>
                    <select
                      id="leadSource"
                      value={state.leadSource}
                      onChange={(e) => handleInputChange('leadSource', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {LEAD_SOURCES.map(source => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="propertyInterest" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Home className="w-4 h-4 text-slate-500" />
                    Property Interest *
                  </label>
                  <input
                    id="propertyInterest"
                    type="text"
                    value={state.propertyInterest}
                    onChange={(e) => handleInputChange('propertyInterest', e.target.value)}
                    placeholder="e.g., 3-bedroom home in Austin, TX"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    maxLength={100}
                    list="property-suggestions"
                  />
                  <datalist id="property-suggestions">
                    {PROPERTY_TYPES.map(type => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500">
                    Try: "4-bedroom house in Denver", "Condo in Miami", "Investment property in Phoenix"
                  </p>
                </div>

                {state.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{state.error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Send className="w-5 h-5" /> Send Lead & Watch AI Respond</>
                  )}
                </button>
              </div>
            )}

            {/* Processing Stage */}
            {(state.stage === 'processing' || state.stage === 'responding') && (
              <div className="py-12 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {state.stage === 'processing' ? (
                      <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                    ) : (
                      <Send className="w-8 h-8 text-emerald-400" />
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  {state.stage === 'processing' ? 'AI is analyzing the lead...' : 'Sending personalized response...'}
                </h3>
                <p className="text-slate-400 mb-4">
                  {state.stage === 'processing' 
                    ? 'Qualifying intent, budget, and timeline' 
                    : 'Crafting personalized SMS message'}
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-mono font-semibold">
                    {formatElapsedTime(elapsedTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Complete Stage */}
            {state.stage === 'complete' && (
              <div className="space-y-6">
                {/* Success Header */}
                <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Response Generated!</h3>
                    <p className="text-emerald-400">
                      Responded in {(state.responseTimeMs / 1000).toFixed(1)} seconds
                    </p>
                  </div>
                </div>

                {/* Conversation Preview */}
                <div className="bg-slate-950 rounded-xl p-6 space-y-4">
                  <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Conversation Preview</h4>
                  
                  {/* Lead Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                        <p className="text-slate-300 text-sm">
                          Hi, I'm interested in {state.propertyInterest}. Can you help me?
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 mt-1 block">{state.leadName}</span>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 flex flex-col items-end">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
                        <p className="text-white text-sm">{state.aiResponse}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-emerald-400">AI Agent</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-500">{(state.responseTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400">{(state.responseTimeMs / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-slate-500">Response Time</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400">100%</div>
                    <div className="text-xs text-slate-500">Personalized</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400">24/7</div>
                    <div className="text-xs text-slate-500">Availability</div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Ready to Automate Your Lead Responses?
                  </h4>
                  <p className="text-slate-400 mb-4">
                    Join thousands of agents who never miss a lead with AI-powered instant responses.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/signup?mode=trial"
                      onClick={() => handleCTAClick('trial_cta_primary')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Start Free Trial <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Try Another Lead
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    No credit card required • 30 days free • Cancel anytime
                  </p>
                </div>
              </div>
            )}

            {/* Error Stage */}
            {state.stage === 'error' && (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
                <p className="text-slate-400 mb-6">{state.error || 'Failed to generate response'}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Retrying...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> Try Again</>
                    )}
                  </button>
                  <Link
                    href="/signup?mode=trial"
                    onClick={() => handleCTAClick('error_fallback_cta')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Start Free Trial
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-medium mb-1">Under 30 Seconds</h3>
            <p className="text-sm text-slate-400">AI responds to every lead instantly, 24/7</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-medium mb-1">SMS & Email</h3>
            <p className="text-sm text-slate-400">Multi-channel responses that feel human</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-medium mb-1">No Setup Required</h3>
            <p className="text-sm text-slate-400">Works with your existing CRM and calendar</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/signup?mode=trial" onClick={() => handleCTAClick('footer_signup')} className="hover:text-white transition-colors">Start Trial</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
