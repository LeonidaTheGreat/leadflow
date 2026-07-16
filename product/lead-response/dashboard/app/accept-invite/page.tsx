'use client'

import { Suspense, useEffect, useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

type Status = 'loading' | 'password-form' | 'submitting' | 'success' | 'error' | 'expired' | 'already-accepted'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>('')
  const [agentName, setAgentName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<string>('')

  const validateToken = useCallback(async (inviteToken: string | null) => {
    if (!inviteToken) {
      setStatus('error')
      setError('Missing invite token. Please use the link from your invitation email.')
      return
    }

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      })

      const data = await response.json()

      if (response.status === 410) {
        setStatus('expired')
        setError(data.error || 'This invite has expired. Please request a new one.')
        return
      }

      if (response.status === 409) {
        setStatus('already-accepted')
        return
      }

      if (!response.ok) {
        setStatus('error')
        setError(data.error || 'Invalid invite link. Please request a new one.')
        return
      }

      setAgentName(data.agentName || '')
      setEmail(data.email || '')
      setStatus('password-form')
    } catch {
      setStatus('error')
      setError('An error occurred. Please try again.')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    validateToken(token)
  }, [token, validateToken])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('password-form')
        setPasswordError(data.error || 'Failed to set password. Please try again.')
        return
      }

      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard/onboarding')
      }, 2000)
    } catch {
      setStatus('password-form')
      setPasswordError('An error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <Loader2 className="text-emerald-400 animate-spin" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Invite</h1>
            <p className="text-slate-400">Just a moment...</p>
          </div>
        )}

        {status === 'password-form' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome{agentName ? `, ${agentName.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-slate-400">
                {email && <span className="text-slate-300">{email}</span>}
                {email && <br />}
                Set a password to activate your LeadFlow account.
              </p>
            </div>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    required
                    className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
              >
                Activate My Account
              </button>
            </form>
          </div>
        )}

        {status === 'submitting' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <Loader2 className="text-emerald-400 animate-spin" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Activating Your Account</h1>
            <p className="text-slate-400">Setting up your password...</p>
          </div>
        )}

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

        {status === 'already-accepted' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Already Activated</h1>
            <p className="text-slate-400 mb-6">
              This invite has already been accepted. Log in with your email and password.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </Link>
          </div>
        )}

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
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition"
            >
              Back to Home
            </Link>
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
