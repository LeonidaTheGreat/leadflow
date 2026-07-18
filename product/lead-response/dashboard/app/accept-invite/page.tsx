'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, Lock } from 'lucide-react'

type Status = 'loading' | 'set-password' | 'submitting' | 'success' | 'error' | 'expired'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Missing invite token')
      return
    }

    validateInvite(token)
  }, [token])

  async function validateInvite(inviteToken: string) {
    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 410) {
          setStatus('expired')
          setError(data.error || 'This invite has expired. Please request a new one.')
        } else {
          setStatus('error')
          setError(data.error || 'Failed to validate invite')
        }
        return
      }

      if (data.success) {
        if (data.redirectTo) {
          router?.replace(data.redirectTo)
          return
        }
        setName(data.name || '')
        setStatus('set-password')
      } else {
        setStatus('error')
        setError(data.error || 'Failed to validate invite')
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'An error occurred')
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('set-password')
        setPasswordError(data.error || 'Failed to set password')
        return
      }

      if (data.success) {
        setStatus('success')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setStatus('set-password')
        setPasswordError(data.error || 'Failed to set password')
      }
    } catch (err: any) {
      setStatus('set-password')
      setPasswordError(err.message || 'An error occurred')
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
            <h1 className="text-2xl font-bold text-white mb-2">Validating Your Invite</h1>
            <p className="text-slate-400">Checking your invitation...</p>
          </div>
        )}

        {(status === 'set-password' || status === 'submitting') && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
                <Lock className="text-emerald-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome{name ? `, ${name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-slate-400">Set your password to get started with LeadFlow.</p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Re-enter your password"
                  minLength={8}
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              {passwordError && (
                <p className="text-red-400 text-sm">{passwordError}</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h1>
            <p className="text-slate-400 mb-4">Your account is ready. Redirecting to login...</p>
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Redirecting
            </div>
          </div>
        )}

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
