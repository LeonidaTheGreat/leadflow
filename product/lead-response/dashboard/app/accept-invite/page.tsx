'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'

type Status = 'password-form' | 'loading' | 'success' | 'error' | 'expired'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('password-form')
  const [error, setError] = useState<string>('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Missing invite token')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!token) {
      setError('Missing invite token')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setStatus('loading')

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 410) {
          setStatus('expired')
          setError(data.error || 'This invite has expired. Please request a new one.')
        } else {
          setStatus('error')
          setError(data.error || 'Failed to accept invite')
        }
        return
      }

      if (data.success) {
        // Store session token in localStorage so OnboardingGuard finds it on subsequent page loads
        if (data.token) {
          try {
            localStorage.setItem('leadflow_token', data.token)
            if (data.user) {
              localStorage.setItem('leadflow_user', JSON.stringify(data.user))
            }
          } catch {
            // localStorage unavailable — HTTP-only session cookie will still authenticate the user
          }
        }

        setStatus('success')
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/onboarding')
        }, 2000)
      } else {
        setStatus('error')
        setError(data.error || 'Failed to accept invite')
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Password Setup Form */}
        {status === 'password-form' && token && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
                <Lock className="text-emerald-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Set Your Password</h1>
              <p className="text-slate-400">Create a password to activate your LeadFlow AI account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-12"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
              >
                Activate My Account
              </button>
            </form>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <Loader2 className="text-emerald-400 animate-spin" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Activating Your Account</h1>
            <p className="text-slate-400">Please wait...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to LeadFlow!</h1>
            <p className="text-slate-400 mb-4">Your account is ready. Let&apos;s get you set up...</p>
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Redirecting to dashboard
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </a>
          </div>
        )}

        {/* Expired State */}
        {status === 'expired' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-6">
              <AlertCircle className="text-yellow-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invite Expired</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <p className="text-slate-500 text-sm mb-6">
              Contact Stojan to request a new invite.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <Loader2 className="text-emerald-400 animate-spin" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
