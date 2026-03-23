'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'

interface PilotSignupFormProps {
  compact?: boolean
  className?: string
}

export default function PilotSignupForm({ compact = false, className = '' }: PilotSignupFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [brokerageName, setBrokerageName] = useState('')
  const [fubApiKey, setFubApiKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
      const response = await fetch('/api/auth/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          brokerage_name: brokerageName || undefined,
          fub_api_key: fubApiKey || undefined,
          utm_source: searchParams.get('utm_source') || undefined,
          utm_medium: searchParams.get('utm_medium') || undefined,
          utm_campaign: searchParams.get('utm_campaign') || undefined,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Store auth token + user in localStorage BEFORE navigation (FR-2)
      // This ensures /dashboard/onboarding can render without calling /api/auth/me
      if (data.token) {
        try {
          localStorage.setItem('leadflow_token', data.token)
        } catch {
          // ignore storage errors
        }
      }
      if (data.user) {
        try {
          localStorage.setItem('leadflow_user', JSON.stringify(data.user))
        } catch {
          // ignore storage errors
        }
      }

      setSuccess(true)
      // Redirect after a brief delay to show success state
      setTimeout(() => {
        router.push(data.redirectTo || '/dashboard/onboarding')
      }, 1500)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`w-full max-w-[420px] mx-auto ${className}`}>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to LeadFlow AI!
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Your free 60-day pilot starts now. Redirecting to onboarding...
          </p>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`w-full max-w-md mx-auto ${className}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="pilot-email-compact" className="sr-only">Email address</label>
            <input
              id="pilot-email-compact"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              aria-describedby={error ? 'pilot-error-compact' : undefined}
            />
          </div>
          <div className="flex-1 relative">
            <label htmlFor="pilot-password-compact" className="sr-only">Password</label>
            <input
              id="pilot-password-compact"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="Create password (8+ chars)"
              required
              minLength={8}
              disabled={loading}
              className="w-full px-4 py-3 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Free Pilot <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
        {error && <p id="pilot-error-compact" className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
        <p className="mt-3 text-sm text-white/60 text-center">60 days free · No credit card required</p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full max-w-[420px] mx-auto ${className}`}>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full mb-4">
            <span>🎉</span> 60 Days Free — No Credit Card
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Start Your Free Pilot
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Join 100+ agents using AI to respond to leads 24/7
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="pilot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              id="pilot-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              aria-describedby={error ? 'pilot-error' : undefined}
            />
          </div>

          <div className="relative">
            <label htmlFor="pilot-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="pilot-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="Min 8 characters"
              required
              minLength={8}
              disabled={loading}
              className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <label htmlFor="pilot-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Your name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="pilot-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="pilot-brokerage" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Brokerage name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="pilot-brokerage"
              type="text"
              value={brokerageName}
              onChange={(e) => setBrokerageName(e.target.value)}
              placeholder="e.g., Keller Williams"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="pilot-fub-key" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Follow Up Boss API Key <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="pilot-fub-key"
              type="password"
              value={fubApiKey}
              onChange={(e) => setFubApiKey(e.target.value)}
              placeholder="fub_..."
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional — you can connect this later in settings
            </p>
          </div>
        </div>

        {error && (
          <div id="pilot-error" className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
          ) : (
            <>Create My Free Pilot Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">✓ 60 days free</span>
          <span>·</span>
          <span className="flex items-center gap-1">✓ No credit card</span>
          <span>·</span>
          <span className="flex items-center gap-1">✓ Cancel anytime</span>
        </div>

        <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-500 hover:text-emerald-600 font-medium">Sign in</a>
        </p>
      </div>
    </form>
  )
}
