'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'

interface TrialSignupFormProps {
  compact?: boolean
  className?: string
}

export default function TrialSignupForm({ compact = false, className = '' }: TrialSignupFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch('/api/auth/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
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
      router.push(data.redirectTo || '/dashboard/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`w-full max-w-md mx-auto ${className}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="trial-email-compact" className="sr-only">Email address</label>
            <input
              id="trial-email-compact"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              aria-describedby={error ? 'trial-error-compact' : undefined}
            />
          </div>
          <div className="flex-1 relative">
            <label htmlFor="trial-password-compact" className="sr-only">Password</label>
            <input
              id="trial-password-compact"
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Free Trial <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
        {error && <p id="trial-error-compact" className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
        <p className="mt-3 text-sm text-white/60 text-center">Free for 30 days · No credit card · Cancel anytime</p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full max-w-[420px] mx-auto ${className}`}>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
          Start Your Free Trial
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
          No credit card required · 30 days free
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="trial-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              id="trial-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              aria-describedby={error ? 'trial-error' : undefined}
            />
          </div>

          <div className="relative">
            <label htmlFor="trial-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="trial-password"
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
            <label htmlFor="trial-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Your name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="trial-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div id="trial-error" className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
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
            <>Create My Free Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Free for 30 days · No credit card · Cancel anytime
        </p>

        <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-500 hover:text-emerald-600 font-medium">Sign in</a>
        </p>
      </div>
    </form>
  )
}
