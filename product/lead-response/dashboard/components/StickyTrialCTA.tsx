'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, Loader2, X, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { trackDemoEvent } from '@/lib/analytics/demo'

interface StickyTrialCTAProps {
  show: boolean
  source: 'demo' | 'simulator'
  sessionId: string
  prefillEmail?: string
}

export default function StickyTrialCTA({ show, source, sessionId, prefillEmail }: StickyTrialCTAProps) {
  const [dismissed, setDismissed] = useState(false)
  const [email, setEmail] = useState(prefillEmail || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasTrackedShown, setHasTrackedShown] = useState(false)

  useEffect(() => {
    if (show && !dismissed && !hasTrackedShown) {
      trackDemoEvent('demo_cta_shown', { session_id: sessionId, cta_target: source })
      setHasTrackedShown(true)
    }
  }, [show, dismissed, hasTrackedShown, sessionId, source])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    trackDemoEvent('demo_cta_clicked', { session_id: sessionId, cta_target: `sticky_${source}` })

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, source }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError('Account exists — sign in instead')
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      trackDemoEvent('demo_trial_started', {
        session_id: sessionId,
        cta_target: `sticky_${source}`,
      })

      if (data.token) {
        try { localStorage.setItem('leadflow_token', data.token) } catch { /* ignore */ }
      }
      if (data.user) {
        try { localStorage.setItem('leadflow_user', JSON.stringify(data.user)) } catch { /* ignore */ }
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = data.redirectTo || '/dashboard/onboarding?demo_source=true'
      }, 1500)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }, [email, password, source, sessionId])

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-500/30 bg-slate-950/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {success ? (
          <div className="flex items-center justify-center gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Account created! Redirecting to your dashboard...</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 text-center sm:text-left">
              <p className="text-white font-semibold text-sm sm:text-base">
                Start your free trial
              </p>
              <p className="text-slate-400 text-xs">No credit card required</p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label htmlFor="sticky-cta-email" className="sr-only">Email</label>
                  <input
                    id="sticky-cta-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    placeholder="Email address"
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1 relative">
                  <label htmlFor="sticky-cta-password" className="sr-only">Password</label>
                  <input
                    id="sticky-cta-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    placeholder="Password (8+ chars)"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full px-3 py-2 pr-9 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Start Free Trial <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-red-400">
                  {error.includes('sign in') ? (
                    <>Account exists — <Link href="/login" className="underline hover:text-red-300">sign in</Link></>
                  ) : error}
                </p>
              )}
            </form>

            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 sm:static p-1.5 text-slate-500 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
